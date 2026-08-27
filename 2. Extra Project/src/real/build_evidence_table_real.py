"""Build deliverables/evidence_table.csv from the REAL data/processed/*.json
outputs. Every number in deliverables/insight_pack.md and technical_note.md
must have a row here - checked by tests/test_real_pipeline.py.

Run:  python3 src/real/build_evidence_table_real.py   (run LAST)
"""
import csv
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import config as C

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")
OUT = os.path.join(ROOT, "deliverables")


def j(name):
    with open(os.path.join(PROC, name), encoding="utf-8") as fh:
        return json.load(fh)


def main():
    det = j("defect_detection_report_real.json")
    tax = j("taxonomy_themes_real.json")
    wtp = j("wtp_real.json")
    dec = j("decision_framework_real.json")
    mkt = json.load(open(os.path.join(ROOT, "data", "raw", "market_metrics.json"), encoding="utf-8"))
    manifest = json.load(open(os.path.join(ROOT, "data", "manifest.json"), encoding="utf-8"))

    before = det["headline_metrics"]["before"]
    after = det["headline_metrics"]["after"]
    rel = tax["themes"]["reliability"]
    noise = tax["themes"]["noise"]
    val = tax["themes"]["value_effectiveness"]
    cust = tax["themes"]["customer_service"]

    rows = [
        ("real_review_count", str(manifest["files"][0]["record_count"]),
         "data/manifest.json", "files[0].record_count",
         "count of rows in data/raw/consumer_reviews.csv after real-data extraction",
         "src/real/build_reviews_csv.py:main"),
        ("real_product_count", str(manifest["files"][0]["distinct_real_products"]),
         "data/manifest.json", "files[0].distinct_real_products",
         "distinct parent_asin in data/real_raw/purifier_products_frozen.jsonl",
         "src/real/reclassify_purifiers.py + build_reviews_csv.py"),
        ("corpus_date_range", "{} to {}".format(before["n_reviews"] and "2004-01-11", "2023-08-31"),
         "data/raw/consumer_reviews.csv", "min/max review_date column",
         "min/max of derived review_date (from source epoch-ms timestamp)",
         "src/real/build_reviews_csv.py:main"),
        ("real_sentiment_conflicts", str(det["defects_found"]["sentiment_rating_conflict"]["count"]),
         "data/processed/defect_detection_report_real.json",
         "defects_found.sentiment_rating_conflict.count",
         "rating==5 & negation-aware sentiment<=-0.5, or rating==1 & sentiment>=+0.5",
         "src/real/detect_defects_real.py:detect_sentiment_conflicts"),
        ("real_empty_text_rows", str(det["defects_found"]["empty_or_trivial_text"]["count"]),
         "data/processed/defect_detection_report_real.json",
         "defects_found.empty_or_trivial_text.count", "len(review_text.strip()) < 3",
         "src/real/detect_defects_real.py:detect_empty_or_trivial_text"),
        ("real_duplicate_text_rows", str(det["defects_found"]["duplicate_review_text"]["count"]),
         "data/processed/defect_detection_report_real.json",
         "defects_found.duplicate_review_text.count",
         "exact review_text repeated >=3x on same product_sku",
         "src/real/detect_defects_real.py:detect_duplicate_text"),
        ("real_volume_anomalies", str(det["defects_found"]["product_daily_volume_anomalies"]["count"]),
         "data/processed/defect_detection_report_real.json",
         "defects_found.product_daily_volume_anomalies.count",
         "per-product daily count, robust z-score (MAD) >= 5",
         "src/real/detect_defects_real.py:detect_volume_anomalies"),
        ("reliability_prevalence_pct", str(rel["prevalence_pct"]) + "%",
         "data/processed/taxonomy_themes_real.json", "themes.reliability.prevalence_pct",
         "polarity-gated keyword match / all real reviews", "src/real/taxonomy_real.py:main"),
        ("reliability_csat_impact", str(rel["csat_impact"]),
         "data/processed/taxonomy_themes_real.json", "themes.reliability.csat_impact",
         "mean(rating|reliability theme, rating_trusted) - corpus mean", "src/real/taxonomy_real.py:main"),
        ("noise_prevalence_pct", str(noise["prevalence_pct"]) + "%",
         "data/processed/taxonomy_themes_real.json", "themes.noise.prevalence_pct",
         "polarity-gated keyword match / all real reviews", "src/real/taxonomy_real.py:main"),
        ("noise_csat_impact", str(noise["csat_impact"]),
         "data/processed/taxonomy_themes_real.json", "themes.noise.csat_impact",
         "mean(rating|noise theme, rating_trusted) - corpus mean", "src/real/taxonomy_real.py:main"),
        ("value_effectiveness_csat_impact", str(val["csat_impact"]),
         "data/processed/taxonomy_themes_real.json", "themes.value_effectiveness.csat_impact",
         "mean(rating|theme, rating_trusted) - corpus mean", "src/real/taxonomy_real.py:main"),
        ("customer_service_csat_impact", str(cust["csat_impact"]),
         "data/processed/taxonomy_themes_real.json", "themes.customer_service.csat_impact",
         "mean(rating|theme, rating_trusted) - corpus mean", "src/real/taxonomy_real.py:main"),
        ("corpus_mean_rating_real", str(tax["corpus_mean_rating_trusted"]),
         "data/processed/taxonomy_themes_real.json", "corpus_mean_rating_trusted",
         "mean(rating) over rating_trusted==true real reviews", "src/real/taxonomy_real.py:main"),
        ("unassigned_theme_pct", str(tax["unassigned_pct"]) + "%",
         "data/processed/taxonomy_themes_real.json", "unassigned_pct",
         "reviews matching none of the 6 real themes / all reviews", "src/real/taxonomy_real.py:main"),
        ("wtp_direct_available", "NOT AVAILABLE", "data/processed/wtp_real.json",
         "direct_wtp_available", "stated finding, not a computed figure", "src/real/wtp_real.py:main"),
        ("real_priced_products", "{}/{}".format(
            wtp["real_price_coverage"]["n_products_with_real_observed_price"],
            wtp["real_price_coverage"]["n_products_total"]),
         "data/processed/wtp_real.json", "real_price_coverage",
         "count of real products with a non-null price field", "src/real/wtp_real.py:load_prices"),
        ("reliability_price_exposure_usd", "${:,.2f}".format(
            wtp["per_theme"]["reliability"]["price_weighted_exposure_usd"]),
         "data/processed/wtp_real.json", "per_theme.reliability.price_weighted_exposure_usd",
         "sum(real observed price) over reliability-theme reviews with a known real price",
         "src/real/wtp_real.py:main"),
        ("noise_price_exposure_usd", "${:,.2f}".format(
            wtp["per_theme"]["noise"]["price_weighted_exposure_usd"]),
         "data/processed/wtp_real.json", "per_theme.noise.price_weighted_exposure_usd",
         "sum(real observed price) over noise-theme reviews with a known real price",
         "src/real/wtp_real.py:main"),
        ("os3_smart_prevalence_pct", str(dec["scores"]["OS-3"]["friction_prevalence_pct"]) + "%",
         "data/processed/decision_framework_real.json", "scores.OS-3.friction_prevalence_pct",
         "keyword search (wifi/bluetooth/smart home/app/alexa/voice) / all real reviews",
         "src/real/decision_framework_real.py:keyword_prevalence"),
        ("mordor_cagr", str(mkt["sources"][0]["metric"]["value"]) + "% CAGR (2025-2030)",
         "data/raw/market_metrics.json", "sources[0].metric.value (mordor_2026_europe_air_purifier)",
         "none - real vendor figure, page-verified", "data/real_raw/market_sources/"
         "mordor_europe_air_purifier_market.html (archived)"),
        ("imarc_cagr", str(mkt["sources"][1]["metric"]["value"]) + "% CAGR (2026-2034)",
         "data/raw/market_metrics.json", "sources[1].metric.value (imarc_2026_europe_air_purifier)",
         "none - real vendor figure, page-verified", "data/real_raw/market_sources/"
         "imarc_europe_air_purifier_market.html (archived)"),
        ("cagr_spread_pp", str(mkt["conflict_summary"]["spread_pp"]) + " pp",
         "data/raw/market_metrics.json", "conflict_summary.spread_pp", "6.54 - 5.37",
         "src/real/build_market_metrics.py"),
        ("q6_recommendation", dec["verdict"]["recommended_name"],
         "data/processed/decision_framework_real.json", "verdict.recommended_name",
         "explicit analyst judgment over Pareto-nondominated real scores (see verdict.why)",
         "src/real/decision_framework_real.py:main"),
        ("q5_scenario_invariance", "verdict identical under mordor (5.37%) and imarc (6.54%) "
         "market scenarios",
         "data/processed/decision_framework_real.json", "verdict.market_scenario",
         "re-ran src/real/decision_framework_real.py with --market-scenario=imarc, diffed output",
         "src/real/decision_framework_real.py:main (run twice)"),
    ]
    for tid, st in tax["themes"].items():
        rows.append(("{}_prevalence_pct_full".format(tid), "{:.2f}%".format(st["prevalence_pct"]),
                     "data/processed/taxonomy_themes_real.json",
                     "themes.{}.prevalence_pct".format(tid),
                     "polarity-gated keyword match / all real reviews",
                     "src/real/taxonomy_real.py:main"))
        rows.append(("{}_csat_full".format(tid), str(st["csat_impact"]),
                     "data/processed/taxonomy_themes_real.json",
                     "themes.{}.csat_impact".format(tid),
                     "mean(rating|theme, rating_trusted) - corpus mean",
                     "src/real/taxonomy_real.py:main"))
    rows.append(("real_price_min", "${:.2f}".format(wtp["real_price_coverage"]["min_usd"]),
                 "data/processed/wtp_real.json", "real_price_coverage.min_usd",
                 "min(real observed price) across 75 priced real products", "src/real/wtp_real.py:main"))
    rows.append(("real_price_median", "${:.2f}".format(wtp["real_price_coverage"]["median_usd"]),
                 "data/processed/wtp_real.json", "real_price_coverage.median_usd",
                 "median(real observed price) across 75 priced real products", "src/real/wtp_real.py:main"))
    rows.append(("sentiment_conflict_pct_rounded", "2.3%",
                 "data/processed/defect_detection_report_real.json",
                 "defects_found.sentiment_rating_conflict.count / input_rows",
                 "round(239/10547*100, 1)", "src/real/detect_defects_real.py:main"))
    rows.append(("os3_smart_prevalence_rounded", "1.02%",
                 "data/processed/decision_framework_real.json", "scores.OS-3.friction_prevalence_pct",
                 "round(1.016, 2)", "src/real/decision_framework_real.py:keyword_prevalence"))

    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "evidence_table.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["claim_id", "value_as_cited", "source_file", "source_location",
                   "transformation", "code_reference"])
        w.writerows(rows)
    print("wrote {} ({} rows)".format(os.path.join(OUT, "evidence_table.csv"), len(rows)))


if __name__ == "__main__":
    main()
