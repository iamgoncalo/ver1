"""Build data/manifest.json for the REAL raw data layer. Every entry here
points to material that was actually fetched from a live, named, dated
source, replacing an earlier fully synthetic manifest (see README.md's
data provenance section).

Run:  python3 src/real/build_manifest_real.py   (run AFTER the real build_* scripts)
"""
import csv
import hashlib
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import config as C

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
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
    for p in (reviews, metrics, corpus):
        if not os.path.exists(p):
            raise SystemExit("missing {} - run the real build_* scripts first".format(p))

    header, n_reviews = csv_stats(reviews)
    metrics_doc = json.load(open(metrics, encoding="utf-8"))
    corpus_doc = json.load(open(corpus, encoding="utf-8"))
    n_products = len({r["parent_asin"] for r in
                      (json.loads(l) for l in open(
                          os.path.join(ROOT, "data", "real_raw", "purifier_products_frozen.jsonl"),
                          encoding="utf-8"))})

    def entry(path, **kw):
        st = os.stat(path)
        base = {
            "filename": os.path.basename(path), "relative_path": os.path.relpath(path, ROOT),
            "bytes": st.st_size, "sha256": sha256(path),
            "retrieved_at": "2026-08-26", "generated_at": built_at, "immutable": True,
        }
        base.update(kw)
        return base

    manifest = {
        "_provenance": "REAL raw data layer - every file below traces to a live, named, "
                       "dated source fetched, replacing an earlier fully synthetic manifest.",
        "_synthetic": False,
        "schema_version": "2.0.0-real",
        "manifest_of": "data/raw",
        "category": C.CATEGORY, "business_unit": C.BUSINESS_UNIT,
        "repository": "versuni-connected-air-treatment",
        "built_at": built_at, "built_by": "src/real/build_manifest_real.py",
        "reproducible": True,
        "reproduce_with": [
            "python3 src/real/filter_purifier_products.py (streams McAuley-Lab "
            "Amazon-Reviews-2023 category metadata; see script for source URLs)",
            "python3 src/real/reclassify_purifiers.py",
            "python3 src/real/filter_reviews_by_asin.py (streams the matching review file)",
            "python3 src/real/build_reviews_csv.py",
            "python3 src/real/build_market_metrics.py",
            "python3 src/real/build_trend_corpus.py",
            "python3 src/real/build_manifest_real.py",
        ],
        "reproducibility_caveat": (
            "The two upstream McAuley-Lab source files (Appliances.jsonl, "
            "Home_and_Kitchen.jsonl) are hosted on HuggingFace and are NOT bundled with "
            "this repository - they are streamed and filtered live, per §3.5 of the brief "
            "('where a source cannot be redistributed, ship the fetching script and the "
            "manifest entry instead'). The FILTERED, purifier-only output "
            "(data/real_raw/reviews_appliances.jsonl, reviews_hk.jsonl - a few thousand "
            "rows, not the full multi-GB source) IS bundled and is what data/raw/"
            "consumer_reviews.csv is actually built from, so re-running "
            "build_reviews_csv.py alone reproduces it without any network access. "
            "Re-running the two filter_*.py steps requires network access to huggingface.co "
            "and will take significant time (~886MB + ~31GB streamed)."
        ),
        "file_count": 3, "total_bytes": sum(os.stat(p).st_size for p in (reviews, metrics, corpus)),
        "files": [
            entry(reviews, format="csv",
                  origin={
                      "type": "real_consumer_review_export",
                      "described_as": "McAuley-Lab Amazon-Reviews-2023 (Appliances + "
                                      "Home_and_Kitchen categories), filtered to real air "
                                      "purifier products only",
                      "dataset_url": "https://huggingface.co/datasets/McAuley-Lab/"
                                     "Amazon-Reviews-2023",
                      "dataset_licence": "Public HuggingFace dataset, research/academic use; "
                                        "see dataset card for full terms",
                      "collection_method": "streamed + filtered against a 237-product, "
                                           "manually-validated purifier allowlist "
                                           "(src/real/reclassify_purifiers.py)",
                      "product_inclusion_exclusion_logic": "data/real_raw/"
                          "purifier_products_frozen.jsonl + src/real/reclassify_purifiers.py",
                      "pii": "reviewer_id is Amazon's own pseudonymous user_id, already "
                            "de-identified in the published dataset - no PII collected by "
                            "this project",
                  },
                  record_count=n_reviews, distinct_real_products=n_products,
                  column_count=len(header), columns=header,
                  encoding="utf-8",
                  who_is_missing=(
                      "Amazon-only (no other retailer); English-language reviews only; "
                      "corpus spans 2004-2023 so skews toward older purifier generations "
                      "and under-represents 2024-2026 connected/smart models; review text "
                      "over-represents the delighted and the furious, as the brief itself "
                      "warns - this is a real limitation of review data generally, not "
                      "specific to this extraction."),
                  known_defects_ref="data/processed/defect_detection_report_real.json"),

            entry(metrics, format="json",
                  origin={
                      "type": "syndicated_market_research_summary_pages",
                      "vendors": [s["vendor"] for s in metrics_doc["sources"]],
                      "collection_method": "individually fetched and archived "
                                           "(data/real_raw/market_sources/)",
                      "licence_note": "Free public summary pages only - full paid reports "
                                     "were not purchased or accessed.",
                  },
                  record_count=len(metrics_doc["sources"]),
                  known_defects_ref="Q5 conflict documented in the file's own "
                                    "conflict_summary/reconciliation blocks"),

            entry(corpus, format="json",
                  origin={
                      "type": "desk_research_corpus",
                      "publishers": sorted({a["publisher"] for a in corpus_doc["articles"]}),
                      "collection_method": "individually fetched and archived "
                                           "(data/real_raw/trend_sources/)",
                      "copyright_note": corpus_doc["copyright_note"],
                  },
                  record_count=corpus_doc["article_count"],
                  date_range=corpus_doc["coverage"]["date_range"]),
        ],
        "downstream_contract": {
            "raw_is_read_only": True,
            "rule": "data/raw is never edited in place. Cleaning writes to data/processed.",
            "checksum_gate": "Re-run src/real/build_manifest_real.py and diff sha256 values.",
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
