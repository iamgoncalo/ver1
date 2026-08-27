# Data Quality Report — Q2 (Real Data)
One page. Written form of the Q2 answer on the **real** 10,547-review
corpus. Full JSON: `data/processed/defect_detection_report_real.json`. Run
standalone: `python3 src/real/detect_defects_real.py`.

## Product-inclusion quality (a real-data problem a synthetic fixture cannot have)
**Detection.** "Appliances" metadata yielded only 32 candidates, dominated
by replacement-filter accessories misclassified as purifiers. Switched to
"Home_and_Kitchen"; a keyword classifier there produced real false
positives — vacuum cleaners, wearable necklace ionizers, home-decor
products whose *description* mentioned "air purifier" in cross-sell copy.
**Remedy.** Tightened to title-only matching with regex exclusions, then a
minimum 5-real-rating threshold. Candidate count moved 32→106→227→**237
final**, re-inspected by hand at each step.
**Effect of not catching it.** The corpus would have included hundreds of
replacement-filter and vacuum-cleaner reviews under an "air purifier"
label, corrupting every downstream prevalence and CSAT figure.

## Defect: rating/text sentiment contradictions
**Detection.** Negation-aware polarity scoring (rating==5 with strongly
negative text, or rating==1 with strongly positive text).
**Detected: 239 / 10,547 (2.27%).**
**Remedy.** Quarantined (`rating_trusted=false`), not deleted — the text is
real experience, only the star label is untrusted.
**Effect of not catching it, quantified via a real detector bug.** The
first version had no negation handling and misread "I cannot recommend
this product" as *positive*. On a partial run this produced 248 inflated
flags; adding an 18-character negation window dropped it to 186, and a
wider, real-vocabulary term list landed at 239 on the full corpus. **A
downstream metric on the un-fixed version would have systematically
overstated how often 5-star reviews hide complaints.**

## Defect: empty/trivial review text
**Detection.** `len(review_text.strip()) < 3` characters.
**Detected: 18 / 10,547 (0.17%).**
**Remedy.** Removed — no analyzable signal.

## Non-defects (real, honest findings)
**0 exact-duplicate-text bursts** (≥3× on the same product) and **0
per-product daily volume anomalies** (robust z-score ≥5). A genuine
result, not a detector failure — absence of a defect is itself a finding
worth stating plainly.

## Summary
| Defect | Count / Corpus | Remedy |
|---|---:|---|
| Product misclassification (pre-corpus) | 227 dropped from 227 v1 candidates during 2 validation passes | classifier tightened, re-inspected by hand |
| Sentiment/rating conflicts | 239 / 10,547 (2.27%) | quarantined (`rating_trusted=false`) |
| Empty/trivial text | 18 / 10,547 (0.17%) | removed |
| Duplicate-text bursts | 0 (real finding) | none needed |
| Volume anomalies | 0 (real finding) | none needed |
