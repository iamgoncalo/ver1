"""Build data/manifest.json - the provenance record for every file in data/raw/.

Records, per file: origin (vendor / method), record counts, retrieval and build
timestamps, byte size, SHA-256 checksum, schema version and known defects.
The checksum is what makes the raw layer immutable in practice: any downstream
step can assert the bytes it read are the bytes that were catalogued here.

Run:  python3 src/build_manifest.py   (run AFTER the three generators)
"""
import csv
import hashlib
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config as C

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "data", "manifest.json")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def csv_stats(path):
    with open(path, newline="", encoding="utf-8") as fh:
        r = csv.reader(fh)
        header = next(r)
        n = sum(1 for _ in r)
    return header, n


def main():
    built_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    reviews = os.path.join(RAW, "consumer_reviews.csv")
    metrics = os.path.join(RAW, "market_metrics.json")
    corpus = os.path.join(RAW, "trend_corpus.json")
    after = os.path.join(RAW, "aftermarket_signals.csv")
    for p in (reviews, metrics, corpus, after):
        if not os.path.exists(p):
            raise SystemExit("missing {} - run the generators first".format(p))

    header, n_reviews = csv_stats(reviews)
    metrics_doc = json.load(open(metrics, encoding="utf-8"))
    corpus_doc = json.load(open(corpus, encoding="utf-8"))

    gt_path = os.path.join(ROOT, "tests", "fixtures", "defect_ground_truth.json")
    gt = json.load(open(gt_path, encoding="utf-8")) if os.path.exists(gt_path) else {"defects": {}}

    def entry(path, **kw):
        st = os.stat(path)
        base = {
            "filename": os.path.basename(path),
            "relative_path": os.path.relpath(path, ROOT),
            "bytes": st.st_size,
            "sha256": sha256(path),
            "retrieved_at": C.RETRIEVAL_TS,
            "generated_at": built_at,
            "immutable": True,
        }
        base.update(kw)
        return base

    manifest = {
        "_provenance": C.PROVENANCE_BANNER,
        "_synthetic": True,
        "schema_version": "1.0.0",
        "manifest_of": "data/raw",
        "category": C.CATEGORY,
        "business_unit": C.BUSINESS_UNIT,
        "repository": "versuni-connected-air-treatment",
        "built_at": built_at,
        "built_by": "src/build_manifest.py",
        "generator_seed": C.SEED,
        "reproducible": True,
        "reproduce_with": [
            "python3 src/generate_reviews.py",
            "python3 src/generate_market_metrics.py",
            "python3 src/generate_trend_corpus.py",
            "python3 src/generate_aftermarket_signals.py",
            "python3 src/build_manifest.py",
        ],
        "file_count": 4,
        "total_bytes": sum(os.stat(p).st_size for p in (reviews, metrics, corpus, after)),
        "files": [
            entry(reviews,
                  format="csv",
                  origin={
                      "type": "consumer_review_scrape_simulation",
                      "described_as": "marketplace review sell-out feed",
                      "vendors_simulated": sorted({m[0] for m in C.MARKETPLACES}),
                      "collection_method": "synthetic generation (src/generate_reviews.py)",
                      "real_world_equivalent": "licensed marketplace review API / panel feed",
                      "pii": "none - reviewer_id values are synthetic surrogates",
                  },
                  record_count=n_reviews,
                  column_count=len(header),
                  columns=header,
                  period_covered=list(C.REVIEW_PERIOD),
                  encoding="utf-8",
                  known_defects=[
                      {"defect_id": "a", "type": "burst_duplicate_reviews",
                       "count": gt["defects"].get("a_burst_duplicate", {}).get("count", 0),
                       "window": list(C.BURST_WINDOW), "affected_sku": C.BURST_SKU,
                       "severity": "high",
                       "impact": "inflates rating and volume for one SKU in one 3-day window",
                       "detection": "duplicate review_text + near-sequential reviewer_id + daily volume z-score"},
                      {"defect_id": "b", "type": "rating_text_sentiment_conflict",
                       "count": gt["defects"].get("b_sentiment_rating_conflict", {}).get("count", 0),
                       "severity": "medium",
                       "impact": "star rating is an unreliable label for text sentiment models",
                       "detection": "sentiment score vs star rating disagreement beyond threshold"},
                      {"defect_id": "c", "type": "malformed_date_string",
                       "count": gt["defects"].get("c_malformed_date", {}).get("count", 0),
                       "severity": "medium",
                       "impact": "silent row loss or mis-bucketing in any time series",
                       "detection": "strict ISO-8601 parse with explicit failure bucket"},
                  ],
                  ground_truth_ref="tests/fixtures/defect_ground_truth.json"),

            entry(metrics,
                  format="json",
                  origin={
                      "type": "syndicated_market_research_extract",
                      "vendors_simulated": [s["vendor"] for s in metrics_doc["sources"]],
                      "collection_method": "synthetic generation (src/generate_market_metrics.py)",
                      "real_world_equivalent": "Euromonitor Passport / Statista Market Insights export",
                      "licence_note": "Figures are illustrative placeholders, NOT licensed vendor data.",
                  },
                  record_count=len(metrics_doc["sources"]),
                  supporting_metric_count=len(metrics_doc["supporting_metrics"]),
                  known_defects=[
                      {"defect_id": "m1", "type": "unreconciled_source_conflict",
                       "count": 1, "severity": "high",
                       "impact": "5.4pp CAGR spread between two sources labelled as the same category",
                       "detection": "compare sources[*].metric.value under differing scope blocks",
                       "resolution_ref": "reconciliation.recommended_planning_basis",
                       "question_ref": "Q5"}
                  ]),

            entry(corpus,
                  format="json",
                  origin={
                      "type": "desk_research_corpus_metadata",
                      "publishers_simulated": sorted({a["publisher"] for a in corpus_doc["articles"]}),
                      "collection_method": "synthetic generation (src/generate_trend_corpus.py)",
                      "real_world_equivalent": "manual desk research / news API harvest",
                      "copyright_note": corpus_doc["copyright_note"],
                  },
                  record_count=corpus_doc["article_count"],
                  date_range=corpus_doc["coverage"]["date_range"],
                  known_defects=[
                      {"defect_id": "t1", "type": "unverified_urls",
                       "count": sum(1 for a in corpus_doc["articles"] if not a["url_verified"]),
                       "severity": "high",
                       "impact": "URLs are placeholders and resolve to nothing; citing them would fabricate a source",
                       "detection": "url_verified == false",
                       "resolution": "resolve each URL against the live publisher and re-stamp the record"}
                  ]),
            entry(after,
                  format="csv",
                  origin={
                      "type": "consumable_sell_through_and_panel_simulation",
                      "described_as": "per-SKU filter repurchase and third-party attach behaviour",
                      "collection_method": "synthetic generation (src/generate_aftermarket_signals.py)",
                      "real_world_equivalent": "OEM consumable sell-through + retail panel share data",
                      "pii": "none - aggregate SKU level only",
                  },
                  record_count=csv_stats(after)[1],
                  column_count=len(csv_stats(after)[0]),
                  columns=csv_stats(after)[0],
                  period_covered=["2025-09-01", "2026-08-20"],
                  encoding="utf-8",
                  known_defects=[
                      {"defect_id": "w1", "type": "small_n_and_low_confidence",
                       "count": 9, "severity": "medium",
                       "impact": "9 SKUs cannot support a regression; Q4 is directional only",
                       "detection": "record_count == 9; confidence field == 'low' on every row",
                       "resolution": "replace with licensed consumable sell-through, or a "
                                     "conjoint / Gabor-Granger study measuring WTP directly"}
                  ]),
        ],
        "downstream_contract": {
            "raw_is_read_only": True,
            "rule": "Nothing in data/raw is ever edited in place. Cleaning writes to "
                    "data/processed and records which defect ids it addressed.",
            "checksum_gate": "Re-run src/build_manifest.py and diff the sha256 values "
                             "to prove the raw layer is unchanged.",
        },
    }

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print("wrote {}".format(OUT))
    for f in manifest["files"]:
        print("  {:<24} {:>7} rec  {:>9} B  sha256:{}".format(
            f["filename"], f["record_count"], f["bytes"], f["sha256"][:12]))
    return manifest


if __name__ == "__main__":
    main()
