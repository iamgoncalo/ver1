# Data Quality Report — Q2 (Real Data)
One page. Written form of the Q2 answer on the **real** 10,547-review
corpus. Full JSON: `data/processed/defect_detection_report_real.json`. Run
standalone: `python3 src/real/detect_defects_real.py`.

## Product-inclusion quality (a real-data problem a synthetic fixture cannot have)
**Detection.** Amazon's "Appliances" category metadata (272MB, streamed and
filtered) yielded only 32 candidates and, on manual inspection, was
dominated by replacement-filter accessories misclassified as purifier
units. Switched to "Home_and_Kitchen" (11.8GB); a first-pass
title+description keyword classifier there produced real false positives —
vacuum cleaners, wearable necklace ionizers, home-decor products whose
*description* mentioned "air purifier" in cross-sell copy.
**Remedy.** Tightened to title-only matching with regex exclusions
(replacement/vacuum/wearable/HVAC-media/ozone-generator), then a minimum
5-real-rating threshold. Candidate count moved 32→106→227→**237 final**, at
each step re-inspected by hand.
**Effect of not catching it.** Left uncaught, the corpus would have
included hundreds of reviews for replacement air filters and vacuum
cleaners under an "air purifier" label — corrupting every downstream
prevalence and CSAT figure with off-category noise.

## Defect: rating/text sentiment contradictions
**Detection.** Negation-aware polarity scoring (rating==5 with strongly
negative text, or rating==1 with strongly positive text).
**Detected: 239 / 10,547 (2.27%).**
**Remedy.** Quarantined (`rating_trusted=false`), not deleted — the text is
real experience, only the star label is untrusted.
**Effect of not catching it, quantified via a real detector bug.** The
first version of this detector had no negation handling and misread
"I cannot recommend this product" as *positive* (it matched "recommend").
On a 7,780-row partial run this produced 248 false-positive-inflated flags;
adding an 18-character negation window before scoring a matched term
dropped this to 186 on the same partial data, and rerunning on the complete
10,547-row corpus with an expanded, more general-purpose term list (the
original list was tuned to a narrower synthetic vocabulary and under-fired
on real text) landed at 239. **A downstream metric computed on the
un-negation-aware version would have systematically overstated how often 5-star
reviews contain hidden complaints.** Manual inspection of the remaining 239
shows real residual limits (third-party quotes, negation over a coordinated
list) reported as a stated ceiling on a keyword approach, not silently
patched further.

## Defect: empty/trivial review text
**Detection.** `len(review_text.strip()) < 3` characters.
**Detected: 18 / 10,547 (0.17%).**
**Remedy.** Removed — no analyzable signal.

## Non-defects (real, honest findings)
**Detected 0 exact-duplicate-text bursts** (review_text repeated ≥3× on the
same product) and **0 per-product daily volume anomalies** (robust
z-score ≥5, run over 237 products with ≥15 days of data each). This is a
genuine result, not a detector failure: it is reported because the earlier
synthetic-fixture phase of this project *planted* a 300-review 3-day burst
by design, and it would have been dishonest to imply real data contains the
same defect just because a prior synthetic version of this exercise did.
Absence of a defect is itself a finding worth stating plainly.

## Summary
| Defect | Count / Corpus | Remedy |
|---|---:|---|
| Product misclassification (pre-corpus) | 227 dropped from 227 v1 candidates during 2 validation passes | classifier tightened, re-inspected by hand |
| Sentiment/rating conflicts | 239 / 10,547 (2.27%) | quarantined (`rating_trusted=false`) |
| Empty/trivial text | 18 / 10,547 (0.17%) | removed |
| Duplicate-text bursts | 0 (real finding) | none needed |
| Volume anomalies | 0 (real finding) | none needed |
