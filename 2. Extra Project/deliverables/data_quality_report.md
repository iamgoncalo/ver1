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
minimum 5-real-rating threshold. The verifiable chain, each step a
committed file: 32 Appliances candidates + the reclassified
Home_and_Kitchen pool → 309 merged candidates
(`purifier_products_final.jsonl`) → **237 final**
(`purifier_products_frozen.jsonl`), re-inspected by hand at each step.
**Effect of not catching it.** The corpus would have included hundreds of
replacement-filter and vacuum-cleaner reviews under an "air purifier"
label, corrupting every downstream prevalence and CSAT figure.

## Defect: rating/text sentiment contradictions
**Detection.** Negation-aware polarity scoring (rating==5 with strongly
negative text, or rating==1 with strongly positive text).
**Detected: 239 / 10,547 (2.27%).**
**Remedy.** Quarantined (`rating_trusted=false`), not deleted — the text is
real experience, only the star label is untrusted.
**Quantified same-corpus consequence (computed, not asserted — see
`quantified_consequence` in the JSON report).** The corpus mean star
rating — the baseline every Q3 CSAT Impact is measured against — is
**4.148★ without the remedy** (all rows) and **4.172★ with it** (trusted
rows only): an absolute shift of **+0.024★ (+0.59%)**, driven entirely by
the 239 quarantined rows (their own mean is 3.09★). Deliberately small
and reported at its true size — but it moves the baseline under every
per-theme CSAT figure in Q3/Q6.
**Detector-development note.** The first detector version had no negation
handling and misread "I cannot recommend this product" as *positive*;
an 18-character negation window plus a real-vocabulary term list landed
at the final 239. Useful debugging history — kept separate from the
same-corpus consequence above, which is the number that answers Q2.

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
| Product misclassification (pre-corpus) | 309 merged candidates → 237 final (72 dropped by threshold + exclusions) | classifier tightened, re-inspected by hand |
| Sentiment/rating conflicts | 239 / 10,547 (2.27%) | quarantined (`rating_trusted=false`) |
| Empty/trivial text | 18 / 10,547 (0.17%) | removed |
| Duplicate-text bursts | 0 (real finding) | none needed |
| Volume anomalies | 0 (real finding) | none needed |
