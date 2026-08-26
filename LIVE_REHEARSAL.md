# Live Follow-Up Session Rehearsal
Exact, tested commands for each of §8's ten checks. Run from repo root.

## 1. Recommendation in 5 minutes, no slides
Say: "Reliability-Verified Air Purifiers" — real 1.58% prevalence, −2.223★
CSAT impact (near the worst of six real themes), reasoned against Whisper-
Quiet Night Mode (higher prevalence, shallowest CSAT hit) as a genuine
Pareto trade-off, not a dominant win. State the sensitivity explicitly:
severity-over-reach is a judgment call, not a data-forced conclusion.

## 2. Open real raw review rows
```bash
python3 -c "import csv; r=list(csv.DictReader(open('data/raw/consumer_reviews.csv'))); print(len(r)); [print(x['review_id'], x['rating'], x['product_name'][:40], x['review_text'][:80]) for x in r[:5]]"
```

## 3. Run every reported quality detector
```bash
python3 src/real/detect_defects_real.py
```
Prints defect counts live; `data/processed/reviews_clean_real.csv` has the
row-level `rating_trusted` / `is_duplicate_text` flags to open directly.

## 4. Trace an arbitrary final number
Pick any row in `deliverables/evidence_table.csv` → `source_file` /
`source_location` → open that JSON key → `code_reference` → open that
function in `src/real/`. Rehearsed live: 10/10 randomly sampled rows traced
cleanly (see this session's audit).

## 5. Open both Q5 market sources
```bash
open data/real_raw/market_sources/mordor_europe_air_purifier_market.html
open data/real_raw/market_sources/imarc_europe_air_purifier_market.html
grep -o "CAGR of [0-9.]*" data/real_raw/market_sources/*.html
```

## 6. Change a threshold and rerun
`src/lexicon.py::NEGATION_WINDOW` (in `src/real/detect_defects_real.py`) or
the min-rating-count threshold in `src/real/reclassify_purifiers.py` are
single, well-isolated constants. Predict direction first: widening the
negation window should REDUCE flagged sentiment conflicts (more terms get
correctly reclassified as negative); then:
```bash
python3 src/real/detect_defects_real.py
```

## 7. Exclude one product and rerun
```bash
python3 -c "
import json
rows = [json.loads(l) for l in open('data/real_raw/purifier_products_frozen.jsonl')]
rows = [r for r in rows if r['title'] != 'HARMONY 1500 Air Purifier for Home Large Room with H13 True HEPA Air Filter']
open('data/real_raw/purifier_products_frozen.jsonl','w').writelines(json.dumps(r)+'\n' for r in rows)
"
python3 src/real/build_reviews_csv.py && python3 src/real/detect_defects_real.py && python3 src/real/taxonomy_real.py
```
(Restore from git afterward: `git checkout -- data/real_raw/purifier_products_frozen.jsonl`)

## 8. Use the alternative market estimate
```bash
python3 src/real/decision_framework_real.py --market-scenario=imarc
```
Predict first: verdict should be UNCHANGED (Financial Value Proxy is built
from review-level price exposure, not category CAGR) — confirmed live.

## 9. Change a major assumption
The single most-sensitive assumption is the severity-over-reach judgment
call in `src/real/decision_framework_real.py::verdict["why"]`. Flipping it
(reach matters more than depth) flips the recommendation to OS-2 — this is
a manual/discussion change, not a code parameter, by design (stated
honestly as a judgment call, not hidden behind a knob).

## 10. Predict before running
Practiced: negation-window widening (item 6) predicted to reduce conflict
count — confirmed (248→186→239 as the lexicon also grew across the real
corpus). Market-scenario swap (item 8) predicted to not move the verdict —
confirmed.

## Outstanding before the session
`data/hand_label_sample_BLANK.csv` needs Gonçalo's real hand labels before
Q3's automated-vs-human agreement can be shown live — currently
`HUMAN_ACTION_REQUIRED`. Complete it, save as `data/hand_label_sample.csv`,
then re-run `python3 src/real/taxonomy_real.py` to compute real agreement.
