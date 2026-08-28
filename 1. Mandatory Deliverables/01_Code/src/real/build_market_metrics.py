"""Build data/raw/market_metrics.json from REAL, individually verified market
figures for the Europe Air Purifier Market (Q5). Both sources were fetched
live during this repair, the cited figures confirmed present in the archived
HTML itself (grep-verified), and the archived copies live in
data/real_raw/market_sources/.

This replaces the fully synthetic Euromonitor/Statista fabrication this file
previously contained.

Run:  python3 src/real/build_market_metrics.py
"""
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import config as C

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data", "raw", "market_metrics.json")

ACCESS_DATE = "2026-08-26"

DOC = {
    "_provenance": "REAL sources - both fetched live and archived during this repair "
                   "(2026-08-26); figures grep-verified present in the archived HTML. "
                   "Supersedes a fully fabricated Euromonitor/Statista placeholder.",
    "_synthetic": False,
    "schema_version": "2.0.0-real",
    "category": C.CATEGORY,
    "business_unit": C.BUSINESS_UNIT,
    "compiled_by": "Innovation Data Science - Versuni (repair pass)",
    "compiled_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    "currency_note": "Both sources report in USD; no EUR conversion applied here.",

    "conflict_summary": {
        "status": "RESOLVED_BY_ANALYST_JUDGMENT",
        "question_ref": "Q5",
        "headline": (
            "Same segment, same scope — still 1.17pp apart. "
            "Different forecast windows and base years."
        ),
        "spread_pp": 1.17,
        "root_cause": "different_forecast_period_and_proprietary_methodology",
        "conflicting_metric": "cagr_pct",
        "source_ids": ["mordor_2026_europe_air_purifier", "imarc_2026_europe_air_purifier"],
        "note_on_realism": (
            "A small spread despite matching scope. Real disagreement."
        ),
    },

    "sources": [
        {
            "source_id": "mordor_2026_europe_air_purifier",
            "vendor": "Mordor Intelligence",
            "product_title": "Europe Air Purifier Market Size & Share Outlook to 2030",
            "url": "https://www.mordorintelligence.com/industry-reports/europe-air-purifier-market",
            "archive_file": "data/real_raw/market_sources/mordor_europe_air_purifier_market.html",
            "retrieved_at": ACCESS_DATE,
            "publication_note": "Report updated as of January 2026 per the page's stated "
                                "methodology framework date.",
            "metric": {
                "name": "cagr_pct", "value": 5.37, "unit": "percent_per_annum",
                "period": {"start_year": 2025, "end_year": 2030, "years": 5},
                "basis": "revenue", "price_basis": "current_prices", "currency": "USD",
            },
            "market_size": {
                "base_year": 2025, "base_value_usd_b": 4.86,
                "forecast_year": 2030, "forecast_value_usd_b": 6.32,
            },
            "scope": {
                "geography": "Europe (Germany, UK, France, Italy, Spain, Turkey, Nordic "
                             "Region, Russia, Rest of Europe)",
                "connectivity": "ALL air purifiers - not connectivity-segmented",
                "product_types": ["stand-alone air purifiers", "in-duct air purifiers"],
                "channel": "not specified on the extracted page",
                "aftermarket_included": None,
                "aftermarket_note": "Not addressed on the extracted summary page.",
                "b2b_included": True,
                "end_user_segments": ["residential", "commercial", "industrial"],
            },
            "methodology_note": ("Mordor Intelligence's own proprietary estimation "
                                 "framework; revenue-based (USD) valuation."),
            "quote": "The Europe Air Purifier Market size is estimated at USD 4.86 billion "
                    "in 2025, and is expected to reach USD 6.32 billion by 2030, at a CAGR "
                    "of 5.37% during the forecast period (2025-2030).",
        },
        {
            "source_id": "imarc_2026_europe_air_purifier",
            "vendor": "IMARC Group",
            "product_title": "Europe Air Purifier Market Size & Outlook, 2025-2033",
            "url": "https://www.imarcgroup.com/europe-air-purifier-market",
            "archive_file": "data/real_raw/market_sources/imarc_europe_air_purifier_market.html",
            "retrieved_at": ACCESS_DATE,
            "publication_note": None,
            "metric": {
                "name": "cagr_pct", "value": 6.54, "unit": "percent_per_annum",
                "period": {"start_year": 2026, "end_year": 2034, "years": 8},
                "basis": "revenue", "price_basis": "current_prices", "currency": "USD",
            },
            "market_size": {
                "base_year": 2025, "base_value_usd_b": 4.8,
                "forecast_year": 2034, "forecast_value_usd_b": 8.7,
            },
            "scope": {
                "geography": "Europe (Germany, France, UK, Italy, Spain, Others)",
                "connectivity": "ALL air purifiers - not connectivity-segmented",
                "product_types": ["standalone", "in-duct", "others"],
                "channel": "not specified on the extracted page",
                "aftermarket_included": None,
                "aftermarket_note": "Not addressed on the extracted summary page.",
                "b2b_included": True,
                "end_user_segments": ["residential", "commercial", "industrial"],
            },
            "methodology_note": "IMARC Group's own proprietary methodology; revenue-based "
                                "(USD) valuation. Methodology detail beyond this is not "
                                "public on the free summary page.",
            "quote": "The Europe air purifier market size was valued at USD 4.8 Billion in "
                    "2025. IMARC Group estimates the market to reach USD 8.7 Billion by "
                    "2034, exhibiting a CAGR of 6.54% from 2026-2034.",
        },
    ],

    "reconciliation": {
        "verdict": (
            "Unlike a scope mismatch (different geography/connectivity/aftermarket "
            "definitions), these two sources claim nominally IDENTICAL scope - same region, "
            "same product-type coverage, same end-user segments, same revenue basis - yet "
            "still disagree by 1.17pp. The base-year (2025) market-size estimates are close "
            "(4.86 vs 4.8, ~1.2% apart), so the CAGR gap is not primarily a base-year "
            "disagreement."
        ),
        "divergence_axes": [
            {"axis": "forecast_period", "mordor": "2025-2030 (5 years)",
             "imarc": "2026-2034 (8 years, starting one year later)",
             "direction": "ambiguous_but_plausibly_inflates_imarc",
             "rationale": ("A longer forecast horizon in a category still expanding its "
                          "connected/premium mix can show a higher CAGR if growth is "
                          "assumed to compound or accelerate later in the window - this is "
                          "a real, common source of CAGR divergence between vendors using "
                          "different forecast windows, not a definitional scope mismatch.")},
            {"axis": "proprietary_methodology", "mordor": "Mordor's own estimation "
             "framework (undisclosed in detail on the public page)",
             "imarc": "IMARC's own estimation framework (undisclosed in detail on the "
             "public page)",
             "direction": "unknown_magnitude",
             "rationale": ("Neither firm publishes its full model on the free summary page "
                          "used here. This is itself a limitation: without the paid full "
                          "report, the CAGR gap cannot be decomposed further than 'different "
                          "proprietary models, similar stated scope.'")},
        ],
        "recommended_planning_basis": {
            "metric": "cagr_pct", "value": 5.37,
            "scope": "Europe Air Purifier Market, all connectivity/technology types, "
                    "residential+commercial+industrial, revenue basis",
            "derivation": ("Chose Mordor Intelligence's 5.37% (2025-2030) over IMARC's "
                          "6.54% (2026-2034) because its forecast window (5 years) is closer "
                          "to Q6's own 2-5 year opportunity-evaluation horizon, and its more "
                          "conservative figure is the safer planning assumption for an "
                          "internal investment case."),
            "confidence": "medium",
            "caveat": ("Both figures are proprietary vendor estimates without full "
                      "published methodology - neither is independently audited. Using "
                      "IMARC's 6.54% instead would scale any category-wide prize estimate "
                      "up by roughly (6.54-5.37)/5.37 = 21.8% relative, compounded over the "
                      "longer window, but does NOT change which opportunity space wins in "
                      "Q6 (see src/real/decision_framework_real.py --market-scenario), "
                      "because the Q6 Price-Weighted Exposure is anchored on installed-base "
                      "and friction-prevalence figures that do not depend on category CAGR."),
        },
        "analyst_actions": [
            "Do not average the two CAGRs - averaging two different-methodology, "
            "different-window estimates manufactures false precision.",
            "If this recommendation goes to an investment committee, budget for the paid "
            "full reports from both vendors to see the underlying assumptions before the "
            "figure carries real financial weight.",
            "Re-run with --market-scenario=imarc before the live session to have the "
            "alternative number ready on demand (see Q5 sensitivity script).",
        ],
    },
}


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(DOC, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote {} (spread {} pp, real sources: {})".format(
        OUT, DOC["conflict_summary"]["spread_pp"],
        [s["vendor"] for s in DOC["sources"]]))


if __name__ == "__main__":
    main()
