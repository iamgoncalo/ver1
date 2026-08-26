# Data Quality Report — Q2
One page. Written form of the Q2 answer; each defect maps to code in
`src/detect_defects.py`, run standalone with `python3 src/detect_defects.py`.
Full JSON: `data/processed/defect_detection_report.json`.

## Defect (a): 300-review promotional burst, one SKU, 3 days
**Detection.** Plotted daily review counts per SKU (`mad_zscores`, line 71) and
flagged days at a robust z-score ≥5 against that SKU's own median — median
absolute deviation, not mean/SD, because a 300-review spike drags the mean
enough to partially hide itself. VS-AP-8000i hit **96×, 99×, then 108× its own
daily median** on 2026-03-14/15/16. Two more independent signatures were
required before condemning a row: exact duplicate `review_text` occurring ≥10
times, and promotional-register phrasing ("highly recommend to everyone!!!").
All three had to intersect (`detect_burst_duplicates`, line 82) — any one
alone would risk misclassifying a genuine viral launch as fraud.
**Detected 300/300** (precision 1.00, recall 1.00 against the planted set).
**Remedy.** Removed — a bot-authored review carries no product-experience
information to preserve.
**Effect of not catching it.** VS-AP-8000i's headline rating was **4.399★
inflated from 3.886★** (+0.513 stars), and its 5-star share **73.9% inflated
from 51.6%** (+22.3pp) — this is the ≥1 quantified difference the brief asks
for.

## Defect (b): rating/text sentiment contradictions
**Detection.** A crude but fully inspectable polarity score
(`sentiment_score`, line 54; positive/negative term lists in `src/lexicon.py`)
flagged rows where rating and text polarity disagree at the **extremes only**
— 5-star with clearly negative text, or 1-star with clearly positive text. An
earlier version tested ≥4/≤2 and returned 12 false positives, every one a
4-star review — a 4-star rating means "good, with reservations," so mixed
text there is congruent, not contradictory; narrowing to the true extremes
(5/1) was a domain correction, documented in `deliverables/ai_use_log.md`
because an AI-drafted first pass used the looser ≥4/≤2 rule.
**Detected 49/50** (precision 1.00, recall 0.98; one contradiction phrased too
subtly for the term list to catch — see `ai_use_log.md` for the specific
example the check failed on).
**Remedy.** Quarantined, not deleted: `rating_trusted=false`. The review text
is genuine experience; only the star label is untrustworthy, so a downstream
sentiment model should keep the text and a rating model should drop the row.
**Effect of not catching it.** These 49 rows sit inside the same corpus as the
burst and are removed from the "after" figures above; isolated, a naive
average-rating metric computed on them alone would read close to 5★ while the
underlying text is markedly negative — exactly the corruption a star-rating
KPI is blind to without this check.

## Defect (c): malformed date strings
**Detection.** Strict `%Y-%m-%d` parsing (`parse_iso`, line 39) with **no
coercion and no day-first/month-first guessing** — a permissive parser is how
a corpus acquires a fake April. Failures are bucketed by pattern
(`detect_malformed_dates`, line 176): slash-ambiguous, dotted two-digit-year,
long-text month, null/empty literal, epoch seconds, impossible month/day,
unpadded ISO, trailing junk.
**Detected 118/120** (precision 1.00, recall 0.983). The 2 misses are a known,
named ceiling, not a detector failure: an unpadded ISO date is
byte-identical to a valid one whenever month *and* day are both ≥10
(`2025-12-20`) — no string-level check can distinguish it, and no downstream
pipeline should try; only an upstream format contract removes it.
**Remedy.** Rows retained, excluded from any time-series aggregation
(`date_parseable=false`).
**Effect of not catching it.** 118 rows (3.37% of the corpus) would either be
silently dropped by a naive `pd.to_datetime` call or, worse, coerced into the
wrong month/day by a locale-guessing parser — a burst-detection routine run
on that corrupted series would find a materially different (or missing) spike
on VS-AP-8000i.

## Summary
| Defect | Detected / Planted | Precision | Recall | Remedy |
|---|---:|---:|---:|---|
| (a) burst duplicates | 300 / 300 | 1.00 | 1.00 | removed |
| (b) sentiment conflicts | 49 / 50 | 1.00 | 0.98 | quarantined (`rating_trusted=false`) |
| (c) malformed dates | 118 / 120 | 1.00 | 0.983 | retained, excluded from time series |
