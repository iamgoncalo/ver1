# Live-session runbook

Every command below runs from `1. Mandatory Deliverables/01_Code/` and works
offline against the committed frozen evidence. Nothing here edits frozen raw
data — scenario work happens in memory or in regenerated processed outputs.

## The recommendation, in five minutes
```
python3 src/real/decision_framework_real.py
```
Prints the gate results, Pareto step, the named judgment rule, the
recommendation (currently Reliability-Verified Air Purifiers) and both kill
reasons. The full verdict object is `data/processed/decision_framework_real.json`.

## Open a genuine raw review
```
python3 - <<'PY'
import csv
rows = list(csv.DictReader(open("data/processed/reviews_clean_real.csv", encoding="utf-8")))
r = next(x for x in rows if x["review_id"] == "CR-000121")   # any id works
print(r["review_id"], "|", r["product_name"], "|", r["rating"], "stars")
print(r["review_text"][:600])
PY
```

## Run the defect detector live
```
python3 src/real/detect_defects_real.py
```
Re-detects on the real corpus and rewrites
`data/processed/defect_detection_report_real.json` — the report lists the
exact affected rows per defect class.

## Trace any final figure to its source
```
python3 scripts/trace_claim.py --list          # all claim ids
python3 scripts/trace_claim.py --random 5      # sample and trace five
python3 scripts/trace_claim.py q6_recommendation
```

## Open both Q5 market sources (archived)
```
open data/real_raw/market_sources/mordor_europe_air_purifier_market.html
open data/real_raw/market_sources/imarc_europe_air_purifier_market.html
```

## Swap the market source (executable sensitivity)
```
python3 src/real/decision_framework_real.py --market-scenario=imarc
```
Prediction to state before running: the verdict is unchanged — Q6's
Price-Weighted Exposure is built from review-level price exposure, not
category CAGR, so the CAGR swap changes the category-sizing narrative only.

## Exclude one product — temporary, in memory
```
python3 - <<'PY'
import sys, csv
sys.path.insert(0, "src"); sys.path.insert(0, "src/real")
import decision_framework_real as dfr
rows = list(csv.DictReader(open("data/processed/reviews_clean_real.csv", encoding="utf-8")))
biggest = max({r["product_sku"] for r in rows}, key=lambda s: sum(1 for r in rows if r["product_sku"] == s))
subset = [r for r in rows if r["product_sku"] != biggest]
out = dfr.compute(rows=subset)
print("excluded", biggest, "->", len(rows) - len(subset), "reviews removed")
print("recommendation now:", out["verdict"].get("recommended_name") or out["verdict"]["decision_type"])
PY
```
Nothing on disk changes — `compute(rows=...)` is a pure function.

## Change the sensitive threshold — temporary, via parameter
```
python3 - <<'PY'
import sys
sys.path.insert(0, "src"); sys.path.insert(0, "src/real")
import decision_framework_real as dfr
dfr.MATERIALITY_FLOOR_PCT = 3.0        # default 0.5 - state predicted effect first
out = dfr.compute()
print("floor=3.0 ->", out["verdict"].get("recommended_name") or out["verdict"]["decision_type"])
PY
```
Raising the floor far enough (e.g. 101.0) demonstrates the honest
no-recommendation path: `INSUFFICIENT_EVIDENCE_FOR_RECOMMENDATION`, never a
silently restored winner (covered by `tests/test_dynamic_winner.py`).

## Rerun everything, then verify
```
bash scripts/reproduce_submission.sh
```
Full offline pipeline, PDF regeneration, 49-test discovery, 301-check
verifier, SHA-256 hashes of the five final artifacts.

## Open the current AI-use log
```
open ../05_Mandatory_Appendices/ai_use_log.pdf     # rendered
open deliverables/ai_use_log.md                     # source of truth
```
