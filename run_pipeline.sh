#!/usr/bin/env bash
# End-to-end reproduction of the REAL Connected Air Treatment case study:
# real raw data -> real defect detection -> real taxonomy -> real WTP ->
# real decision framework -> deliverables, from a clean checkout, in one
# command.
#
#   bash run_pipeline.sh
#
# Two steps re-fetch real source data over the network (product metadata,
# reviews) and can take significant time (~15-20 min on an ordinary
# connection) - see data/manifest.json's reproducibility_caveat for what is
# already bundled (the FILTERED, purifier-only review subset) vs. what must
# be re-streamed from HuggingFace. If you only want to re-run the analysis
# on the already-bundled real data (fast, no network needed beyond nothing),
# pass --analysis-only.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

ANALYSIS_ONLY=0
for arg in "$@"; do
  [ "$arg" = "--analysis-only" ] && ANALYSIS_ONLY=1
done

if [ "$ANALYSIS_ONLY" -eq 0 ] && [ ! -s data/real_raw/purifier_products_frozen.jsonl ]; then
  echo "== stage 1/9: fetch + classify real purifier products (Appliances) =="
  curl -sL --max-time 900 "https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023/resolve/main/raw/meta_categories/meta_Appliances.jsonl" \
    | python3 src/real/filter_purifier_products.py > data/real_raw/purifier_products.jsonl
  echo "== stage 2/9: fetch + classify real purifier products (Home_and_Kitchen) =="
  curl -sL --max-time 1800 "https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023/resolve/main/raw/meta_categories/meta_Home_and_Kitchen.jsonl" \
    | python3 src/real/filter_purifier_products.py > data/real_raw/purifier_products_hk.jsonl
  python3 src/real/reclassify_purifiers.py data/real_raw/purifier_products.jsonl data/real_raw/purifier_products_hk.jsonl \
    > data/real_raw/purifier_products_final.jsonl
  python3 - <<'PY'
import json, re
SMOKE_PERSONAL = re.compile(r"smoke\s*buddy|smokebuddy|sound machine", re.I)
WEARABLE_TYPO = re.compile(r"wareable|neck.{0,10}mini air purifier", re.I)
rows = [json.loads(l) for l in open("data/real_raw/purifier_products_final.jsonl")]
kept = [r for r in rows if not (SMOKE_PERSONAL.search(r.get("title") or "") or WEARABLE_TYPO.search(r.get("title") or "") or (r.get("rating_number") or 0) < 5)]
with open("data/real_raw/purifier_products_frozen.jsonl", "w") as fh:
    for r in kept: fh.write(json.dumps(r) + "\n")
print("frozen:", len(kept), "real products")
PY

  echo "== stage 3/9: fetch + filter real reviews (Appliances) =="
  curl -sL --max-time 900 "https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023/resolve/main/raw/review_categories/Appliances.jsonl" \
    | python3 src/real/filter_reviews_by_asin.py data/real_raw/purifier_products_frozen.jsonl > data/real_raw/reviews_appliances.jsonl
  echo "== stage 4/9: fetch + filter real reviews (Home_and_Kitchen, ~31GB streamed, longest step) =="
  curl -sL --max-time 3600 "https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023/resolve/main/raw/review_categories/Home_and_Kitchen.jsonl" \
    | python3 src/real/filter_reviews_by_asin.py data/real_raw/purifier_products_frozen.jsonl > data/real_raw/reviews_hk.jsonl
else
  echo "== stages 1-4/9: real product/review source files already bundled, skipping network fetch =="
fi

echo "== stage 5/9: build real consumer_reviews.csv =="
python3 src/real/build_reviews_csv.py

echo "== stage 6/9: build real market_metrics.json and trend_corpus.json, manifest =="
python3 src/real/build_market_metrics.py
python3 src/real/build_trend_corpus.py
python3 src/real/build_manifest_real.py

echo "== stage 7/9: Q2 defect detection (real) =="
python3 src/real/detect_defects_real.py

echo "== stage 8/9: Q3 taxonomy (real) + Q4 WTP (real) + Q6 decision framework (real) =="
python3 src/real/taxonomy_real.py --emit-sample
python3 src/real/taxonomy_real.py
python3 src/real/wtp_real.py
python3 src/real/decision_framework_real.py

echo "== stage 9/9: evidence table + tests =="
python3 src/real/build_evidence_table_real.py
python3 -m unittest tests.test_real_pipeline -v

echo
echo "Done. See deliverables/insight_pack.md, technical_note.md,"
echo "data_quality_report.md, ai_use_log.md, evidence_table.csv."
echo
echo "HUMAN ACTION STILL REQUIRED: data/hand_label_sample_BLANK.csv needs a"
echo "human to fill in its hand_label column before Q3 validation is complete."
