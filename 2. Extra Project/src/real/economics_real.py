"""Dutch economics truth layer - real, verified anchors (see economics.md
for the full verification log, sources, and honest confidence notes) plus
a per-product TCO/affordability computation.

No network calls happen here - the anchors below were verified via live
web search/fetch in-session against CBS, APPLiA Nederland, and Eurostat,
and are hardcoded with their source/confidence/year, exactly as
economics.md documents them. This module only applies the already-verified
anchors to the already-real product price data.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")

ANCHORS = {
    "mean_disposable_household_income_eur": {
        "value": 60200, "year": 2024, "status": "preliminary", "class": "OBSERVED",
        "source": "CBS - Financial position of households",
        "source_url": "https://www.cbs.nl/en-gb/figures/detail/83739eng",
        "confidence": "HIGH",
    },
    "mean_equivalised_income_eur": {
        "value": 41900, "year": 2024, "status": "preliminary", "class": "OBSERVED",
        "source": "CBS - Financial position of households",
        "source_url": "https://www.cbs.nl/en-gb/figures/detail/83739eng",
        "confidence": "HIGH",
    },
    "median_household_income_eur": {
        "value": 36500, "year": 2024, "class": "OBSERVED",
        "source": "CBS (secondary aggregation - likely equivalised, not independently confirmed on the same primary page as the mean figures)",
        "source_url": "https://www.cbs.nl/en-gb/figures/detail/83739eng",
        "confidence": "MEDIUM",
        "flag": "Likely median EQUIVALISED income, not raw median disposable - needs direct StatLine confirmation.",
    },
    "median_gross_hourly_wage_eur": {
        "value": 23.51, "year": 2025, "class": "OBSERVED",
        "source": "CBS (secondary aggregation, not independently re-confirmed on a single primary CBS StatLine page this session)",
        "source_url": "https://www.cbs.nl/nl-nl/nieuws/2025/18/loonverschil-tussen-mannen-en-vrouwen-steeds-kleiner",
        "confidence": "MEDIUM",
        "flag": "Two different CBS-attributed pages gave two different MEAN hourly wage figures (26.59 vs 30) for the "
                "same year - likely different populations (all employees vs. CAO-covered FTE). Median chosen here as "
                "more robust to that ambiguity, but re-verify against CBS StatLine table 85517NED/86355NED before "
                "treating as final.",
    },
    "electricity_price_eur_per_kwh": {
        "value": 0.2342, "year": 2025, "period": "H1", "band": "2500-5000 kWh", "class": "OBSERVED",
        "source": "Eurostat (via Statista) - Dutch household electricity price",
        "source_url": "https://www.statista.com/statistics/418106/electricity-prices-for-households-in-netherlands/",
        "confidence": "MEDIUM_HIGH",
        "cross_check": "CBS reports an average annual household energy bill of EUR 2,065 (Jan 2025 prices, "
                       "1706 kWh electricity + 987 m3 gas) - directionally consistent, different framing.",
    },
    "private_households": {
        "value": 8400000, "year": 2025, "as_of": "2025-01-01", "class": "OBSERVED",
        "source": "CBS - Huishoudens nu",
        "source_url": "https://www.cbs.nl/nl-nl/visualisaties/dashboard-bevolking/woonsituatie/huishoudens-nu",
        "confidence": "HIGH",
    },
    "appliance_market_turnover_eur": {
        "value_2024": 3712000000, "value_2025": 3759000000, "change_pct": 1.3, "class": "OBSERVED",
        "source": "APPLiA Nederland - Jaarcijfers 2025",
        "source_url": "https://applianederland.nl/applia-nederland-jaarcijfers-2025/",
        "confidence": "HIGH",
    },
    "eur_usd_spot_rate": {
        "eur_per_usd": round(1 / 1.1664, 4), "usd_per_eur": 1.1664, "as_of": "2026-08-26", "class": "OBSERVED",
        "source": "Trading Economics / Federal Reserve H.10", "source_url": "https://tradingeconomics.com/euro-area/currency",
        "confidence": "HIGH",
        "note": "Used only to convert the real-corpus USD product prices (Amazon US) to EUR for the Dutch "
                "affordability frame - a spot-rate snapshot, not a currency forecast.",
    },
    "sda_premiumisation": {
        "unit_change_pct": -2.2, "revenue_change_pct": 5.0, "class": "OBSERVED",
        "note": "Small domestic appliance units fell 2.2% but revenue rose 5% - real premiumisation, driven by "
                "robot vacuums (+61% revenue) and premium coffee machines (+7%).",
        "source": "APPLiA Nederland - Jaarcijfers 2025",
        "source_url": "https://applianederland.nl/applia-nederland-jaarcijfers-2025/",
        "confidence": "HIGH",
    },
}

ASSUMED_DAILY_HOURS = 8  # MODELLED assumption - stated explicitly, not observed usage


# EUR/USD = 1.1664 on 2026-08-26 (Trading Economics / Federal Reserve H.10,
# verified via web search this session) -> 1 USD = 1/1.1664 = 0.8574 EUR.
USD_TO_EUR = round(1 / 1.1664, 4)


def compute_product_economics(price_usd, price_eur_per_usd=USD_TO_EUR):
    """MODELLED affordability/TCO for one product. Returns None fields where
    inputs are missing rather than guessing. price_eur_per_usd is the
    verified 2026-08-26 EUR/USD spot rate, not a guess."""
    if not price_usd:
        return None
    price_eur = round(price_usd * price_eur_per_usd, 2)
    wage = ANCHORS["median_gross_hourly_wage_eur"]["value"]
    mean_income = ANCHORS["mean_disposable_household_income_eur"]["value"]
    equiv_income = ANCHORS["mean_equivalised_income_eur"]["value"]
    # No per-product power/filter data exists in the real 237-product corpus
    # (Amazon listings don't carry max_power_w or filter cost reliably) -
    # energy/filter TCO stays UNKNOWN rather than invented.
    return {
        "price_eur_modelled": price_eur,
        "price_eur_fx_assumption": price_eur_per_usd,
        "gross_work_hours": round(price_eur / wage, 1),
        "share_of_mean_disposable_income_pct": round(price_eur / mean_income * 100, 2),
        "share_of_mean_equivalised_income_pct": round(price_eur / equiv_income * 100, 2),
        "annual_energy_cost_eur": "UNKNOWN - no verified per-product power draw in this corpus",
        "annual_filter_cost_eur": "UNKNOWN - no verified per-product filter price in this corpus",
        "year_1_tco_eur": "UNKNOWN - requires energy + filter cost, both unavailable per-product",
        "note": "Affordability context only - NOT willingness to pay.",
    }


def main():
    doc = {
        "_provenance": "Dutch economic anchors verified via live web search/fetch this session against "
                       "CBS, APPLiA Nederland, and Eurostat - see economics.md for the full log, exact quotes, "
                       "and honest confidence/conflict notes (the hourly-wage anchor in particular has a "
                       "documented cross-source conflict, not silently resolved).",
        "generated_by": "src/real/economics_real.py",
        "anchors": ANCHORS,
        "assumed_daily_hours_for_energy_modelling": ASSUMED_DAILY_HOURS,
        "derived": {
            "appliance_market_turnover_per_household_eur": round(
                ANCHORS["appliance_market_turnover_eur"]["value_2025"] / ANCHORS["private_households"]["value"], 2),
        },
    }
    os.makedirs(PROC, exist_ok=True)
    with open(os.path.join(PROC, "economics_real.json"), "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote economics_real.json ({} anchors, turnover/household=EUR{})".format(
        len(ANCHORS), doc["derived"]["appliance_market_turnover_per_household_eur"]))
    return doc


if __name__ == "__main__":
    main()
