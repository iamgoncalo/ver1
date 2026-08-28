"""Generate data/raw/market_metrics.json.

Holds two CONFLICTING market growth figures for Connected Air Treatment that a
downstream analyst must reconcile (Q5):

    Euromonitor  5.8% CAGR   vs   Statista  11.2% CAGR

The conflict is not an error - it is a scope-definition artefact. Every axis on
which the two definitions differ is captured explicitly in `scope`, and the
bridge between them is laid out in `reconciliation`, so the discrepancy is
solvable from the file alone rather than by guesswork.

Run:  python3 src/generate_market_metrics.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config_SYNTHETIC_TEST_FIXTURE as C

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "data", "raw", "market_metrics.json")

DOC = {
    "_provenance": C.PROVENANCE_BANNER,
    "_synthetic": True,
    "schema_version": "1.0.0",
    "category": C.CATEGORY,
    "business_unit": C.BUSINESS_UNIT,
    "compiled_by": "Innovation Data Science - Versuni",
    "compiled_at": C.RETRIEVAL_TS,
    "currency_note": "All values in EUR unless the source record states otherwise.",

    "conflict_summary": {
        "status": "UNRESOLVED_BY_SOURCE",
        "question_ref": "Q5",
        "headline": (
            "Two licensed syndicated sources report growth rates for what both "
            "label 'air treatment' that differ by 5.4 percentage points."
        ),
        "spread_pp": 5.4,
        "root_cause": "scope_definition_mismatch",
        "conflicting_metric": "cagr_pct",
        "source_ids": ["euromonitor_2026_air_treatment", "statista_2026_smart_air_purifiers"],
    },

    "sources": [
        {
            "source_id": "euromonitor_2026_air_treatment",
            "vendor": "Euromonitor International",
            "product_title": "Consumer Appliances / Air Treatment Products - Western Europe",
            "edition": "2026 edition",
            "licence": "Versuni enterprise subscription",
            "retrieved_at": C.RETRIEVAL_TS,
            "metric": {
                "name": "cagr_pct",
                "value": 5.8,
                "unit": "percent_per_annum",
                "period": {"start_year": 2025, "end_year": 2030, "years": 5},
                "basis": "retail_value_rsp",
                "price_basis": "constant_2025_prices",
                "currency": "EUR",
            },
            "market_size": {
                "base_year": 2025, "base_value_eur_m": 2140.0,
                "forecast_year": 2030, "forecast_value_eur_m": 2836.0,
            },
            "scope": {
                "geography": "Western Europe (17 markets)",
                "connectivity": "ALL units - connected and non-connected combined",
                "product_types": ["air purifiers", "humidifiers", "dehumidifiers",
                                  "air-treatment combination units"],
                "channel": "retail sell-out only",
                "aftermarket_included": False,
                "aftermarket_note": "Replacement filters and consumables are excluded.",
                "b2b_included": False,
            },
            "methodology_note": (
                "Store audit plus trade interviews, reported at retail selling price "
                "in constant prices. Non-connected units still represent the majority "
                "of category volume and dilute the growth rate."
            ),
        },
        {
            "source_id": "statista_2026_smart_air_purifiers",
            "vendor": "Statista Market Insights",
            "product_title": "Smart Air Purifiers - Worldwide",
            "edition": "2026 update",
            "licence": "Versuni team account",
            "retrieved_at": C.RETRIEVAL_TS,
            "metric": {
                "name": "cagr_pct",
                "value": 11.2,
                "unit": "percent_per_annum",
                "period": {"start_year": 2025, "end_year": 2030, "years": 5},
                "basis": "revenue",
                "price_basis": "current_prices",
                "currency": "USD",
            },
            "market_size": {
                "base_year": 2025, "base_value_usd_m": 4980.0,
                "forecast_year": 2030, "forecast_value_usd_m": 8470.0,
            },
            "scope": {
                "geography": "Worldwide (APAC and North America are the growth engines)",
                "connectivity": "CONNECTED units only - Wi-Fi / app-enabled SKUs",
                "product_types": ["smart air purifiers"],
                "channel": "all channels including DTC e-commerce",
                "aftermarket_included": True,
                "aftermarket_note": "Includes filter subscriptions and consumable revenue.",
                "b2b_included": True,
            },
            "methodology_note": (
                "Top-down model anchored on e-commerce panel data, in current prices "
                "and USD. Connected-only scope on a low base in fast-growing regions."
            ),
        },
    ],

    "reconciliation": {
        "verdict": (
            "Both figures can be simultaneously correct. They measure different "
            "markets, not the same market differently."
        ),
        "divergence_axes": [
            {"axis": "connectivity", "euromonitor": "connected + non-connected",
             "statista": "connected only",
             "direction": "inflates Statista",
             "est_contribution_pp": 2.6,
             "rationale": "The connected sub-segment is the fast-growing minority "
                          "inside a slower total category; isolating it removes the drag."},
            {"axis": "geography", "euromonitor": "Western Europe",
             "statista": "Worldwide",
             "direction": "inflates Statista",
             "est_contribution_pp": 1.5,
             "rationale": "APAC and North America grow well above Western Europe, "
                          "which is the most mature air-treatment region."},
            {"axis": "price_basis", "euromonitor": "constant 2025 prices",
             "statista": "current prices",
             "direction": "inflates Statista",
             "est_contribution_pp": 0.7,
             "rationale": "Current-price series carry inflation that constant-price "
                          "series strip out."},
            {"axis": "aftermarket", "euromonitor": "hardware only",
             "statista": "hardware + filter subscription revenue",
             "direction": "inflates Statista",
             "est_contribution_pp": 0.6,
             "rationale": "Consumable and subscription revenue compounds off an "
                          "installed base that is itself growing."},
        ],
        "bridge": {
            "from_source": "euromonitor_2026_air_treatment",
            "from_value_pp": 5.8,
            "steps_pp": [2.6, 1.5, 0.7, 0.6],
            "to_value_pp": 11.2,
            "residual_pp": 0.0,
            "note": "Bridge is illustrative and additive; contributions are analyst "
                    "estimates, not vendor-published decomposition.",
        },
        "recommended_planning_basis": {
            "metric": "cagr_pct",
            "value": 8.9,
            "scope": "Connected Air Treatment, connected units only, Western Europe, "
                     "constant prices, hardware + aftermarket",
            "derivation": "Euromonitor geography and price basis, Statista "
                          "connectivity and aftermarket scope.",
            "confidence": "medium",
            "caveat": "Derived, not vendor-published. Restate against licensed data "
                      "before any external or investment-committee use.",
        },
        "analyst_actions": [
            "Never quote the two headline CAGRs side by side without the scope caveat.",
            "Fix one scope definition in the category charter and hold every "
            "downstream model to it.",
            "Request the connected-only Western Europe cut directly from Euromonitor "
            "to remove the derived bridge.",
        ],
    },

    "supporting_metrics": [
        {"metric": "connected_share_of_category_units_pct", "value": 23.4,
         "year": 2025, "geography": "Western Europe",
         "source_id": "euromonitor_2026_air_treatment", "confidence": "medium"},
        {"metric": "connected_share_of_category_units_pct_forecast", "value": 41.0,
         "year": 2030, "geography": "Western Europe",
         "source_id": "euromonitor_2026_air_treatment", "confidence": "low"},
        {"metric": "avg_selling_price_eur", "value": 268.0, "year": 2025,
         "geography": "Western Europe", "scope": "connected units",
         "source_id": "euromonitor_2026_air_treatment", "confidence": "medium"},
        {"metric": "app_attach_rate_pct", "value": 58.0, "year": 2025,
         "scope": "share of connected units ever paired to the app",
         "source_id": "internal_telemetry_placeholder", "confidence": "low"},
        {"metric": "filter_subscription_attach_rate_pct", "value": 12.5, "year": 2025,
         "geography": "Western Europe",
         "source_id": "statista_2026_smart_air_purifiers", "confidence": "low"},
    ],
}


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(DOC, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote {} ({} sources, spread {} pp)".format(
        OUT, len(DOC["sources"]), DOC["conflict_summary"]["spread_pp"]))


if __name__ == "__main__":
    main()
