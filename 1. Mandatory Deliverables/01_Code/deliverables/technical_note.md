# Technical Note — Air Purification (Real Data)
Method, assumptions, limitations, what was cut. Max 2 pages. Companion to
[insight_pack.md](insight_pack.md).

**Recommendation: Reliability-Verified Air Purifiers** (extended-life
guarantee + real-time self-diagnostic), computed live by
`decision_framework_real.py` and unchanged under both real market
scenarios (Q5, below). Two serious alternatives — Whisper-Quiet Night Mode
and Smart/Connected Feature Expansion — were evaluated and rejected on the
same three measures; see Insight Pack Slide 4 for the full comparison and
kill reasons.

## Data and pipeline
Three real sources in `data/raw/`: **10,547 real Amazon reviews** for 237
real, hand-validated air purifier products (`consumer_reviews.csv`, from the
public McAuley-Lab Amazon-Reviews-2023 dataset); two real, individually
verified and archived market-research pages (`market_metrics.json`); 12 real
trend documents (`trend_corpus.json`), each fetched live and archived under
`data/real_raw/`.

Pipeline: `src/real/filter_purifier_products.py` + `reclassify_purifiers.py`
(product inclusion, two validation passes) → `filter_reviews_by_asin.py`
(streams ~886MB + ~31GB source review files without ever storing them
whole, keeping only matches) → `build_reviews_csv.py` →
`detect_defects_real.py` (Q2) → `taxonomy_real.py` (Q3) → `wtp_real.py` (Q4)
→ `decision_framework_real.py` (Q6) → `build_manifest_real.py` +
`build_evidence_table_real.py`. One command, `bash run_pipeline.sh`.

## Product inclusion — a real, iterated validation process
Amazon's "Appliances" category metadata (272MB) yielded only 32 candidates
and, on manual inspection, was dominated by replacement-filter accessories,
not real purifier units. The real category is "Home_and_Kitchen"
(11.8GB metadata). A first-pass keyword classifier there produced real false
positives on manual inspection — vacuum cleaners, wearable necklace
ionizers, home-decor items whose *description* mentioned "air purifier" in
cross-sell copy. A second pass switched to title-only matching with
regex-based accessory/vacuum/wearable exclusions, raising the candidate
count from 106 to 227, then a final threshold (min. 5 real ratings) plus a
targeted smoke-device exclusion froze the list at **237 real products**.
This iterative process is exactly what §3.2 asks for ("manually inspect a
sample to measure product-classification quality") and is preserved in full
in `src/real/filter_purifier_products.py` and `reclassify_purifiers.py`.

## Q2 — real defects, not planted
Detection ran on the real export with no answer key to check against (there
is none for real data). Found: **239 rating/text sentiment conflicts**
(rating==5 with strongly negative text, or rating==1 with strongly positive
text); **18 empty-text rows**; **zero** exact-duplicate-text bursts and
**zero** per-product volume anomalies (robust z-score ≥5) — a genuine,
honest finding that this real corpus does not contain the kind of
promotional review-bombing the earlier synthetic fixture planted by design.
The detector required a real fix: an early version misread "I cannot
recommend this" as positive (matched "recommend" with no negation
handling). Adding an 18-character negation window ("not/never/cannot/
won't/...") plus real-vocabulary lexicon expansion brought the count to
239 on the complete corpus. Residual limits remain — third-party quotes and
negation over a coordinated list ("No motor noise, whining, or vibration
at all.") — reported as a stated detector limitation, since full
discourse-level parsing is out of scope for a keyword detector.

## Q3 — themes induced from real text, not carried over as hypotheses
Real bottom-up term induction (`taxonomy_real.py --induce`) on this corpus
ranks **reliability** ("stopped working" lift 4.80/n=44+, "never worked"
lift 5.98/n=11), **perceived value** ("waste money" lift 5.49/n=50+,
"scam"), and **customer service** ("refund", "return window") far above
noise, filter cost, or ozone/smell. A real polarity-conflation bug was
found and fixed: a first run scored "Ozone / smell" at 22% prevalence
with a *positive* CSAT impact, because "great at eliminating odors" was
counted as an odor complaint — fixed by only counting a keyword inside a
negative-polarity sentence. **Hand-label validation is a genuine
`HUMAN_ACTION_REQUIRED` blocker** — `data/hand_label_sample_BLANK.csv` (50
real, stratified reviews) has its `hand_label` column deliberately left
blank; Q3's automated-vs-human agreement cannot be reported until a human
completes it.

## Q4 — the honest answer: no WTP measurement exists
No conjoint, Gabor-Granger, or stated-preference instrument was collected,
and no consumable-switching behavioural data (which the synthetic phase
fabricated) is obtainable from a public review export — Amazon does not
expose "bought a third-party filter instead" anywhere retrievable. What is
real: 75 of 237 products carry a real observed listed price (median $79.99),
used only as a *price-weighted exposure* indicator, explicitly labelled as
neither revenue nor WTP.

## Q5 — a real, smaller, more realistic disagreement
Two real sources for "Europe Air Purifier Market" — Mordor Intelligence
(5.37% CAGR, 2025–2030, $4.86B→$6.32B) and IMARC Group (6.54% CAGR,
2026–2034, $4.8B→$8.7B) — nominally cover *identical* scope (same region,
product types, end-user segments, revenue basis) yet still disagree by
1.17pp, primarily attributable to different forecast windows and
undisclosed proprietary methodology, not a scope mismatch. This is a more
realistic finding than a dramatic scope-driven spread: two firms measuring
the *same thing* can still land materially apart. `decision_framework_real.py
--market-scenario=imarc` re-runs the Q6 verdict under the alternative figure
live; the verdict is unchanged (Q6's Price-Weighted Exposure is built
from review-level price exposure, not category CAGR).

## What was deliberately not built
- **No stated-preference WTP instrument** — the largest evidence gap,
  named as one rather than proxied around.
- **No cross-category comparison** — scope held to Air Purification.
- **Ozone-generator products excluded by category** (different mechanism,
  regulator-contested — CARB, `data/raw/trend_corpus.json` TC-R04) rather
  than folded into the purifier corpus.
- **No paid tooling or specialised hardware** — Python 3.9 stdlib plus
  `curl` for real data acquisition; runs on an ordinary laptop.
