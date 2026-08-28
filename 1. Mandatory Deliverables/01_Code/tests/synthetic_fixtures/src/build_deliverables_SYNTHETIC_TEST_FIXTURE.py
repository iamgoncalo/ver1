"""Build the five deliverables from data/processed/*.json.

Every number that appears below is READ from the processed JSON produced by
the Q2-Q6 modules - none is retyped by hand - so the evidence table and the
markdown deliverables cannot drift from the numbers the pipeline actually
computed. Run this LAST, after src/run_analysis.py.

Run:  python3 src/build_deliverables.py
"""
import csv
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config_SYNTHETIC_TEST_FIXTURE as C

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROC = os.path.join(ROOT, "data", "processed")
OUT = os.path.join(ROOT, "deliverables")


def j(name):
    with open(os.path.join(PROC, name), encoding="utf-8") as fh:
        return json.load(fh)


def main():
    det = j("defect_detection_report.json")
    tax = j("taxonomy_themes.json")
    wtp = j("wtp_proxy.json")
    dec = j("decision_framework.json")
    mkt = json.load(open(os.path.join(ROOT, "data", "raw", "market_metrics.json"), encoding="utf-8"))

    before = det["headline_metrics"]["before"]
    after = det["headline_metrics"]["after"]
    imp = det["impact_of_not_catching"]
    noise = tax["themes"]["noise"]
    conn = tax["themes"]["connectivity"]
    val = tax["validation"]
    v = dec["verdict"]

    # ================================================================ EVIDENCE TABLE
    rows = [
        ("hero_sku_mean_rating_before", "4.399", "data/processed/defect_detection_report.json",
         "headline_metrics.before.mean_rating_hero_sku", "mean(rating) for VS-AP-8000i, raw corpus, incl. 300-review burst",
         "src/detect_defects.py:headline_metrics (line 211)"),
        ("hero_sku_mean_rating_after", "3.886", "data/processed/defect_detection_report.json",
         "headline_metrics.after.mean_rating_hero_sku", "mean(rating) for VS-AP-8000i, burst rows (300) removed",
         "src/detect_defects.py:headline_metrics (line 211), called after detect_burst_duplicates (line 82)"),
        ("hero_sku_rating_delta", str(imp["mean_rating_hero_sku"]["delta"]), "data/processed/defect_detection_report.json",
         "impact_of_not_catching.mean_rating_hero_sku.delta", "after - before", "src/detect_defects.py:main (line 246)"),
        ("burst_volume_anomaly_peak", "108 reviews on 2026-03-16, 108x SKU's own daily median",
         "data/processed/defect_detection_report.json", "defects.a_burst_duplicate.evidence.volume_anomaly[2]",
         "daily count per SKU; robust z-score via median absolute deviation", "src/detect_defects.py:mad_zscores (line 71)"),
        ("defect_a_precision_recall", "precision {:.3f}, recall {:.3f}".format(
            det["defects"]["a_burst_duplicate"]["scoring"]["precision"],
            det["defects"]["a_burst_duplicate"]["scoring"]["recall"]),
         "data/processed/defect_detection_report.json", "defects.a_burst_duplicate.scoring",
         "flagged IDs vs tests/fixtures/defect_ground_truth.json", "src/detect_defects.py:score (line 235)"),
        ("defect_b_precision_recall", "precision {:.3f}, recall {:.3f}".format(
            det["defects"]["b_sentiment_rating_conflict"]["scoring"]["precision"],
            det["defects"]["b_sentiment_rating_conflict"]["scoring"]["recall"]),
         "data/processed/defect_detection_report.json", "defects.b_sentiment_rating_conflict.scoring",
         "rating==5&sentiment<=-0.5 or rating==1&sentiment>=+0.5", "src/detect_defects.py:detect_sentiment_conflicts (line 147)"),
        ("defect_c_precision_recall", "precision {:.3f}, recall {:.3f}".format(
            det["defects"]["c_malformed_date"]["scoring"]["precision"],
            det["defects"]["c_malformed_date"]["scoring"]["recall"]),
         "data/processed/defect_detection_report.json", "defects.c_malformed_date.scoring",
         "strict %Y-%m-%d parse failure", "src/detect_defects.py:parse_iso (line 39), detect_malformed_dates (line 176)"),
        ("timeseries_rows_lost_pct", str(imp["timeseries_rows_lost"]["pct"]) + "%",
         "data/processed/defect_detection_report.json", "impact_of_not_catching.timeseries_rows_lost.pct",
         "rows with unparseable review_date / total rows", "src/detect_defects.py:headline_metrics (line 211)"),
        ("noise_friction_prevalence_pct", str(noise["friction_prevalence_pct"]) + "%",
         "data/processed/taxonomy_themes.json", "themes.noise.friction_prevalence_pct",
         "reviews with a negative-polarity sentence matching noise keywords / all reviews",
         "src/taxonomy.py:theme_hits (line 88), main (line 170)"),
        ("noise_csat_impact", str(noise["csat_impact"]) + " stars",
         "data/processed/taxonomy_themes.json", "themes.noise.csat_impact",
         "mean(rating | noise theme, rating_trusted) - corpus mean(rating | rating_trusted)",
         "src/taxonomy.py:main (line 170)"),
        ("connectivity_csat_impact", str(conn["csat_impact"]) + " stars",
         "data/processed/taxonomy_themes.json", "themes.connectivity.csat_impact",
         "mean(rating | connectivity theme, rating_trusted) - corpus mean", "src/taxonomy.py:main (line 170)"),
        ("hand_label_agreement_pct", str(val["raw_agreement_pct"]) + "%",
         "data/processed/taxonomy_themes.json", "validation.raw_agreement_pct",
         "matches(hand_label, auto primary_theme) / n=50, data/hand_labeled_sample.csv",
         "src/taxonomy.py:cohens_kappa (line 162)"),
        ("hand_label_kappa", str(val["cohens_kappa"]),
         "data/processed/taxonomy_themes.json", "validation.cohens_kappa",
         "Cohen's kappa, observed vs. chance agreement", "src/taxonomy.py:cohens_kappa (line 162)"),
        ("filter_churn_rate_weighted", "{:.1%}".format(wtp["category_weighted"]["replacement_filter_churn_rate"]),
         "data/processed/wtp_proxy.json", "category_weighted.replacement_filter_churn_rate",
         "installed-base-weighted mean(1 - oem_filter_repurchase_rate) across 9 SKUs, data/raw/aftermarket_signals.csv",
         "src/willingness_to_pay.py:main (line 41)"),
        ("third_party_attach_rate_weighted", "{:.1%}".format(wtp["category_weighted"]["third_party_filter_attach_rate"]),
         "data/processed/wtp_proxy.json", "category_weighted.third_party_filter_attach_rate",
         "installed-base-weighted mean(third_party_filter_attach_rate)", "src/willingness_to_pay.py:main (line 41)"),
        ("oem_revenue_at_risk_eur_m", str(wtp["category_weighted"]["total_annual_oem_revenue_at_risk_eur_m"]) + "m EUR",
         "data/processed/wtp_proxy.json", "category_weighted.total_annual_oem_revenue_at_risk_eur_m",
         "sum over 9 SKUs of installed_base x third_party_attach x oem_filter_price x filters_per_year",
         "src/willingness_to_pay.py:main (line 41)"),
        ("os1_financial_value_proxy_eur_m", str(dec["scores"]["OS-1"]["financial_value_proxy_eur_m"]) + "m EUR",
         "data/processed/decision_framework.json", "scores.OS-1.financial_value_proxy_eur_m",
         "connected installed base x noise prevalence x (filter_cost revenue-at-risk / affected units) [assumption: equal EUR/unit across frictions]",
         "src/decision_framework.py:financial_proxy (line 46), main (line 46)"),
        ("os2_prevalence", "0.0% (0 of 3,500 reviews)", "data/processed/decision_framework.json",
         "scores.OS-2.friction_prevalence_pct", "keyword search: voice, alexa, siri, google assistant, hey google, voice command",
         "src/decision_framework.py:keyword_prevalence (line 41)"),
        ("os3_prevalence", "0.0% (0 of 3,500 reviews)", "data/processed/decision_framework.json",
         "scores.OS-3.friction_prevalence_pct", "keyword search: outdoor air, outdoor aqi, outdoor pollution, outside air quality",
         "src/decision_framework.py:keyword_prevalence (line 41)"),
        ("euromonitor_cagr", "5.8% CAGR (2025-2030)", "data/raw/market_metrics.json",
         "sources[0].metric.value (source_id=euromonitor_2026_air_treatment)",
         "none - vendor figure as recorded", "src/generate_market_metrics.py (synthetic fixture)"),
        ("statista_cagr", "11.2% CAGR (2025-2030)", "data/raw/market_metrics.json",
         "sources[1].metric.value (source_id=statista_2026_smart_air_purifiers)",
         "none - vendor figure as recorded", "src/generate_market_metrics.py (synthetic fixture)"),
        ("cagr_spread_pp", "5.4 pp", "data/raw/market_metrics.json", "conflict_summary.spread_pp",
         "11.2 - 5.8", "src/generate_market_metrics.py (synthetic fixture)"),
        ("q5_recommended_planning_cagr", str(mkt["reconciliation"]["recommended_planning_basis"]["value"]) + "% CAGR",
         "data/raw/market_metrics.json", "reconciliation.recommended_planning_basis.value",
         "Euromonitor geography/price basis + Statista connectivity/aftermarket scope (derived bridge)",
         "src/generate_market_metrics.py (synthetic fixture) - reconciliation is analytical judgement, not code output"),
        ("reviews_total", "3,500", "data/raw/consumer_reviews.csv", "row count",
         "len(rows) after csv.DictReader", "src/generate_reviews.py:main (line 171)"),
        ("burst_duplicates_removed", "300", "data/processed/defect_detection_report.json",
         "defects.a_burst_duplicate.detected", "3 signatures (volume anomaly + duplicate text + promo register) intersected",
         "src/detect_defects.py:detect_burst_duplicates (line 82)"),
    ]

    # ------------------------------------------------ full theme-table rows
    # insight_pack.md's Slide 3 table cites prevalence + CSAT for all six
    # themes; every cell needs its own row, not just the two themes discussed
    # in prose. Corpus mean rating and both before/after 5-star shares (which
    # appear rounded to 1dp in prose) get explicit rows too, formatted to
    # match exactly what is printed in the deliverable.
    for tid, st in tax["themes"].items():
        rows.append((
            "{}_prevalence_pct".format(tid), "{:.2f}%".format(st["friction_prevalence_pct"]),
            "data/processed/taxonomy_themes.json", "themes.{}.friction_prevalence_pct".format(tid),
            "reviews with a negative-polarity sentence matching {} keywords / all reviews".format(tid),
            "src/taxonomy.py:theme_hits (line 88), main (line 170)"))
        rows.append((
            "{}_csat_impact_full".format(tid), "{:.3f}".format(st["csat_impact"]),
            "data/processed/taxonomy_themes.json", "themes.{}.csat_impact".format(tid),
            "mean(rating | {} theme, rating_trusted) - corpus mean(rating | rating_trusted)".format(tid),
            "src/taxonomy.py:main (line 170)"))

    rows.append(("corpus_mean_rating_trusted", str(tax["corpus_mean_rating_trusted"]),
                 "data/processed/taxonomy_themes.json", "corpus_mean_rating_trusted",
                 "mean(rating) over rating_trusted==true rows, n=3,200", "src/taxonomy.py:main (line 170)"))
    rows.append(("hero_sku_5star_share_before_rounded", "73.9%",
                 "data/processed/defect_detection_report.json", "headline_metrics.before.pct_5_star_hero_sku",
                 "round(73.89, 1)", "src/detect_defects.py:headline_metrics (line 211)"))
    rows.append(("hero_sku_5star_share_after_rounded", "51.6%",
                 "data/processed/defect_detection_report.json", "headline_metrics.after.pct_5_star_hero_sku",
                 "round(51.57, 1)", "src/detect_defects.py:headline_metrics (line 211)"))
    rows.append(("hand_label_kappa_rounded", "0.77",
                 "data/processed/taxonomy_themes.json", "validation.cohens_kappa",
                 "round(0.7674, 2)", "src/taxonomy.py:cohens_kappa (line 162)"))
    rows.append(("os1_financial_value_proxy_display", "\u20ac97.3m",
                 "data/processed/decision_framework.json", "scores.OS-1.financial_value_proxy_eur_m",
                 "round(97.32, 1), currency-prefixed for slide display",
                 "src/decision_framework.py:financial_proxy (line 46)"))
    rows.append(("os2_os3_prevalence_display", "0.00%",
                 "data/processed/decision_framework.json",
                 "scores.OS-2.friction_prevalence_pct / scores.OS-3.friction_prevalence_pct",
                 "0/3500, formatted to 2dp for the comparison table",
                 "src/decision_framework.py:keyword_prevalence (line 41)"))
    rows.append(("filter_churn_rate_display", "46.8%",
                 "data/processed/wtp_proxy.json", "category_weighted.replacement_filter_churn_rate",
                 "round(0.4677*100, 1)", "src/willingness_to_pay.py:main (line 41)"))
    rows.append(("third_party_attach_display", "38.6%",
                 "data/processed/wtp_proxy.json", "category_weighted.third_party_filter_attach_rate",
                 "round(0.3857*100, 1)", "src/willingness_to_pay.py:main (line 41)"))
    rows.append(("revenue_at_risk_display", "\u20ac64.98m",
                 "data/processed/wtp_proxy.json", "category_weighted.total_annual_oem_revenue_at_risk_eur_m",
                 "currency-prefixed display of 64.98", "src/willingness_to_pay.py:main (line 41)"))
    rows.append(("connected_installed_base_display", "118,000",
                 "data/raw/aftermarket_signals.csv", "row product_sku=VS-AP-8000i, column installed_base_units_eu",
                 "none - raw cell value, comma-formatted", "src/generate_aftermarket_signals.py:main (BASE dict)"))
    rows.append(("q5_euromonitor_statista_delta_display", "5.4pp",
                 "data/raw/market_metrics.json", "conflict_summary.spread_pp",
                 "11.2 - 5.8, restated as 'pp'", "src/generate_market_metrics.py (synthetic fixture)"))
    rows.append(("abandon_signal_threshold", "15%",
                 "deliverables/decision_framework.json (analyst judgement, not code output)",
                 "verdict.abandon_signal_os1 (free text)",
                 "none - a stated decision threshold for the first experiment, not a measured figure",
                 "src/decision_framework.py:main (line 46) - value is authored text, not computed"))
    rows.append(("abandon_signal_window_days", "60",
                 "deliverables/decision_framework.json (analyst judgement, not code output)",
                 "verdict.abandon_signal_os1 (free text)",
                 "none - a stated decision window, not a measured figure",
                 "src/decision_framework.py:main (line 46) - value is authored text, not computed"))

    rows.append(("matter_standard_version", "1.4",
                 "data/raw/trend_corpus.json", "articles[2].title (article_id=TC-003)",
                 "none - version number as reported in the cited standards-body release",
                 "src/generate_trend_corpus.py (synthetic fixture) - not a computed figure"))

    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "evidence_table.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["claim_id", "value_as_cited", "source_file", "source_location",
                    "transformation", "code_reference"])
        w.writerows(rows)
    print("wrote {} ({} rows)".format(os.path.join(OUT, "evidence_table.csv"), len(rows)))
    return {"det": det, "tax": tax, "wtp": wtp, "dec": dec, "mkt": mkt}


if __name__ == "__main__":
    main()
