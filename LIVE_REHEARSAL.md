# Live Follow-Up Session Rehearsal
Every command below was actually executed this session (CLI) or actually
clicked through in a real browser against the running dashboard (localhost) —
not just written and assumed to work. Run `make app` first for the localhost
column; http://localhost:8501.

## 1. Recommendation in 5 minutes, no slides
Say: "Reliability-Verified Air Purifiers" — real 1.58% prevalence, −2.223★
CSAT impact (near the worst of six real themes), reasoned against Whisper-
Quiet Night Mode (higher prevalence, shallowest CSAT hit) as a genuine
Pareto trade-off, not a dominant win. State the sensitivity explicitly:
severity-over-reach is a judgment call, not a data-forced conclusion.
**Localhost:** EXECUTIVE tab shows this exact framing on load.

## 2. Open real raw review rows
**CLI:**
```bash
python3 -c "import csv; r=list(csv.DictReader(open('data/raw/consumer_reviews.csv'))); print(len(r)); [print(x['review_id'], x['rating'], x['product_name'][:40], x['review_text'][:80]) for x in r[:5]]"
```
**Localhost:** DATA tab → search box + rating-range slider, browses all
10,547 real reviews live.

## 3. Show a real defect / run the defect detector
**CLI:**
```bash
python3 src/real/detect_defects_real.py
```
**Localhost:** DATA QUALITY tab — each defect type in its own expander with
rule, count, and example rows; the two zero-count defects (duplicate text,
volume anomalies) are explicitly labelled as genuine findings, not gaps.

## 4. Trace any quantitative claim
**CLI:**
```bash
python3 scripts/trace_claim.py real_review_count
python3 scripts/trace_claim.py --random 10
```
**Localhost:** EVIDENCE / SYSTEM HEALTH tab → claim_id dropdown, or
"Trace 10 random claims" button — calls the identical `scripts/trace_claim.py`
function, not a re-implementation.

## 5. Open both Q5 market sources
**CLI:**
```bash
open data/real_raw/market_sources/mordor_europe_air_purifier_market.html
open data/real_raw/market_sources/imarc_europe_air_purifier_market.html
grep -o "CAGR of [0-9.]*" data/real_raw/market_sources/*.html
```
**Localhost:** MARKET / PRICE / WTP tab — both sources side by side with
live links to the source URL and archive file path.

## 6. Switch Q5 scenario
**CLI:**
```bash
python3 src/real/decision_framework_real.py                     # Mordor, primary
python3 src/real/decision_framework_real.py --market-scenario=imarc   # IMARC, alternative
```
**Localhost:** SCENARIO LAB tab → radio button (Mordor / IMARC), then
"Run scenario" once a prediction is entered. Actually run this session:
BASELINE winner OS-1, SCENARIO winner OS-1, WINNER CHANGED: NO — matches
the CLI exactly, confirmed via `test_market_scenario_does_not_change_verdict`
in `tests/test_real_pipeline.py`.

## 7. Exclude one product and rerun
**CLI:**
```bash
python3 -c "
import json
rows = [json.loads(l) for l in open('data/real_raw/purifier_products_frozen.jsonl')]
rows = [r for r in rows if r['title'] != 'HARMONY 1500 Air Purifier for Home Large Room with H13 True HEPA Air Filter']
open('data/real_raw/purifier_products_frozen.jsonl','w').writelines(json.dumps(r)+'\n' for r in rows)
"
python3 src/real/build_reviews_csv.py && python3 src/real/detect_defects_real.py && python3 src/real/taxonomy_real.py
git checkout -- data/real_raw/purifier_products_frozen.jsonl   # restore after
```
**Localhost:** SCENARIO LAB tab → "Exclude one product" dropdown. This path
never touches `data/real_raw/` at all — it filters in memory and writes only
to `data/runtime/scenario_result.json`, confirmed via `git status` showing
zero changes to `data/raw`/`data/processed` after a real run this session.

## 8. Change one threshold
`src/real/detect_defects_real.py::NEGATION_WINDOW` (currently 18 characters)
or the minimum-rating-count threshold in `src/real/reclassify_purifiers.py`.
Predict direction first: widening the negation window should REDUCE flagged
sentiment conflicts. Rerun: `python3 src/real/detect_defects_real.py`.
**Localhost:** SCENARIO LAB tab's rating-floor slider is the safe, pre-wired
equivalent for a live threshold change without editing source.

## 9. Change the most-sensitive assumption
The single most-sensitive assumption is the severity-over-reach judgment
call in `src/real/decision_framework_real.py::compute()`'s `verdict["why"]`
and `verdict["sensitivity"]` strings. This is a discussion/manual change by
design, not a numeric knob — flip it and the recommendation flips to OS-2.

## 10. Predict direction before rerunning
Practiced this session: negation-window fix predicted to reduce sentiment
conflicts (confirmed, 248→186→239 as corpus size and lexicon both grew);
Q5 scenario swap predicted to not move the Q6 winner (confirmed, both CLI
and localhost). The SCENARIO LAB tab enforces this — "Run scenario" stays
disabled until a prediction is typed.

## 11. Show the AI-use log
```bash
cat deliverables/ai_use_log.md
```
Includes the session's own self-caught misrepresentation (an earlier
"hand-labelled" file that was actually AI-authored) as the log's own
opening item — not smoothed over.

## Outstanding before the session
`data/hand_label_sample_BLANK.csv` needs Gonçalo's real hand labels —
Q3's automated-vs-human agreement cannot be reported honestly until a human
completes it, either via the dashboard's CONSUMERS tab (blinded — no
automated label shown before a row is saved) or by hand in the CSV, saved
as `data/manual/hand_labels.csv` with `labelled_by=human_user`. Then:
```bash
python3 src/real/taxonomy_real.py
make all && make verify
```
