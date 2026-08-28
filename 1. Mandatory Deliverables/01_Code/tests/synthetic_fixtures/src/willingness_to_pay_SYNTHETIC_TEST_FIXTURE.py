"""Q4 - which friction would consumers pay the most to have solved.

No stated-preference data exists in this repository (no conjoint, no
Gabor-Granger, no purchase-intent survey), so this module builds a PROXY and
names it as one throughout: it reads what owners DID about the filter
consumable - stayed on OEM, or defected to third-party - as a revealed signal
of how much friction/cost they will tolerate before switching away from the
manufacturer's own economics.

What the proxy measures: consumable-switching behaviour, i.e. willingness to
defect from OEM filters.
What Q4 actually asks: willingness to PAY for a friction to be REMOVED.
The distance between the two is the entire limitation section below - this
proxy cannot rank the six review-derived friction themes from taxonomy.py by
WTP, because filter behaviour is only really informative about filter_cost.
It is used here for what it can support: sizing the filter_cost friction, and
as a directional cross-check on the connectivity/reliability frictions via the
revenue-at-risk they put on the aftermarket base they threaten to churn out of.

Run:  python3 src/willingness_to_pay.py
"""
import csv
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config_SYNTHETIC_TEST_FIXTURE as C

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AFTER = os.path.join(ROOT, "data", "raw", "aftermarket_signals.csv")
THEMES_JSON = os.path.join(ROOT, "data", "processed", "taxonomy_themes.json")
PROC = os.path.join(ROOT, "data", "processed")


def load_after():
    with open(AFTER, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def main():
    rows = load_after()
    themes = json.load(open(THEMES_JSON, encoding="utf-8"))["themes"]

    per_sku = []
    total_at_risk = 0.0
    total_installed = 0
    for r in rows:
        churn = 1.0 - float(r["oem_filter_repurchase_rate"])
        third_party_rate = float(r["third_party_filter_attach_rate"])
        installed = int(r["installed_base_units_eu"])
        oem_price = float(r["oem_filter_price_eur"])
        filters_yr = float(r["filters_per_year"])
        # Revenue at risk = units already leaking to third party * what OEM
        # would have earned from them on filters this year. This is CURRENT
        # leakage, not projected - a floor, not a forecast.
        annual_revenue_at_risk = installed * third_party_rate * oem_price * filters_yr
        total_at_risk += annual_revenue_at_risk
        total_installed += installed
        per_sku.append({
            "product_sku": r["product_sku"], "product_name": r["product_name"],
            "installed_base_units_eu": installed,
            "oem_filter_repurchase_rate": round(1.0 - churn, 4),
            "replacement_filter_churn_rate": round(churn, 4),
            "third_party_filter_attach_rate": round(third_party_rate, 4),
            "oem_filter_price_eur": oem_price,
            "annual_oem_revenue_at_risk_eur": round(annual_revenue_at_risk, 0),
        })

    weighted_churn = sum(float(r["installed_base_units_eu"]) *
                         (1.0 - float(r["oem_filter_repurchase_rate"])) for r in rows) / total_installed
    weighted_third_party = sum(float(r["installed_base_units_eu"]) *
                               float(r["third_party_filter_attach_rate"]) for r in rows) / total_installed

    filter_cost_theme = themes.get("filter_cost", {})

    ranking = [
        {
            "friction": "filter_cost", "friction_name": "Filter cost & availability",
            "wtp_signal": "DIRECT - third-party filter attach rate is a revealed WTP signal "
                          "for this specific friction (owners pay a competitor rather than "
                          "tolerate OEM filter pricing).",
            "friction_prevalence_pct": filter_cost_theme.get("friction_prevalence_pct"),
            "annual_oem_revenue_at_risk_eur_m": round(total_at_risk / 1_000_000, 2),
            "evidence_strength": "medium - behavioural, category-wide, but proxy not stated-preference",
        },
        {
            "friction": "connectivity", "friction_name": "Connectivity & pairing loss",
            "wtp_signal": "INDIRECT - no consumable-behaviour signal exists for this friction; "
                          "inferred only from CSAT impact (-2.38 stars, the single largest "
                          "in the taxonomy) and prevalence (6.7% of reviews).",
            "friction_prevalence_pct": themes.get("connectivity", {}).get("friction_prevalence_pct"),
            "annual_oem_revenue_at_risk_eur_m": None,
            "evidence_strength": "low - no behavioural or stated-preference measurement at all",
        },
        {
            "friction": "app_software", "friction_name": "App & firmware quality",
            "wtp_signal": "INDIRECT - same limitation as connectivity.",
            "friction_prevalence_pct": themes.get("app_software", {}).get("friction_prevalence_pct"),
            "annual_oem_revenue_at_risk_eur_m": None,
            "evidence_strength": "low",
        },
    ]

    out = {
        "_provenance": C.PROVENANCE_BANNER,
        "generated_by": "src/willingness_to_pay.py",
        "proxy_definition": {
            "name": "aftermarket_defection_proxy",
            "measures": "Willingness to abandon OEM filter economics (churn + third-party attach)",
            "does_not_measure": "Willingness to PAY for a friction to be solved - that requires "
                                "stated-preference data this repository does not contain",
            "inputs": ["oem_filter_repurchase_rate", "third_party_filter_attach_rate",
                      "oem_filter_price_eur", "filters_per_year", "installed_base_units_eu"],
            "source_file": "data/raw/aftermarket_signals.csv",
        },
        "category_weighted": {
            "replacement_filter_churn_rate": round(weighted_churn, 4),
            "third_party_filter_attach_rate": round(weighted_third_party, 4),
            "total_installed_base_units_eu": total_installed,
            "total_annual_oem_revenue_at_risk_eur_m": round(total_at_risk / 1_000_000, 2),
        },
        "per_sku": per_sku,
        "friction_ranking_by_wtp_evidence": ranking,
        "what_would_replace_the_proxy": [
            "A Gabor-Granger or conjoint study asking owners to trade euros against "
            "each friction directly (removes the proxy entirely).",
            "A/B priced pilot: offer a quieter night-mode SKU at a premium and observe "
            "actual take-up (behavioural, but on the real question).",
            "Support-ticket cost-to-serve data linked to churn, to size connectivity and "
            "app frictions the way filter behaviour sizes filter_cost.",
        ],
        "limitation_statement": (
            "This proxy can rank ONE friction (filter_cost) with behavioural evidence. "
            "For the other five themes in the taxonomy, no consumer has 'voted with money' "
            "in any dataset assembled here, so their position in the ranking rests on "
            "CSAT impact and prevalence alone, not on willingness to pay. Q6 treats this "
            "gap explicitly rather than silently upgrading CSAT into a price signal."
        ),
    }
    os.makedirs(PROC, exist_ok=True)
    with open(os.path.join(PROC, "wtp_proxy.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print("Q4 willingness-to-pay proxy")
    print("  category-weighted replacement filter churn rate: {:.1%}".format(weighted_churn))
    print("  category-weighted third-party filter attach rate: {:.1%}".format(weighted_third_party))
    print("  annual OEM filter revenue at risk (EU installed base): EUR {:.2f}m".format(total_at_risk / 1e6))
    print("  -> only filter_cost is directly WTP-ranked; connectivity/app_software are CSAT-only proxies")
    return out


if __name__ == "__main__":
    main()
