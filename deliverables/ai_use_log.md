# AI-Use Log
Half a page. Tools used: Claude (Anthropic), used throughout for code,
analysis design, and this document's own prose, in an agentic coding session
with direct access to run and inspect the data. Every number in the pack was
produced by code in this repository and re-verified against
`data/processed/*.json` before being written into a deliverable — see
`deliverables/evidence_table.csv`.

## Rejected suggestion 1 — sentiment/rating conflict threshold too loose
First draft of `detect_sentiment_conflicts` (Q2, defect b) flagged any review
with rating ≥4 and a clearly negative polarity score, symmetrically for
rating ≤2. Run against the corpus, it returned 12 false positives, and all 12
were 4-star reviews. **Rejected because a 4-star rating means "good, with
reservations" — mixed-negative language inside a 4-star review is the
expected shape of that rating, not a contradiction.** The rule was tightened
to the true extremes only (rating==5 with negative text, rating==1 with
positive text; `src/detect_defects.py:detect_sentiment_conflicts`), which
removed all 12 false positives at no cost to recall.

## Rejected suggestion 2 — taxonomy classifier scored topic mentions, not frictions
First draft of the Q3 theme classifier (`src/taxonomy.py:classify`) matched a
theme's keywords anywhere in the review text regardless of the sentence's own
polarity. Run against the corpus, "Noise at night" came back with a
**positive** CSAT impact — incoherent for something being reported as a
friction, since a friction should depress satisfaction by construction.
**Rejected because it was conflating "this review mentions noise" with "this
review complains about noise";** a review praising the sleep-mode volume
mentions the same keyword as one complaining about turbo-mode noise. Fixed
with a polarity gate (a keyword only counts inside a negative-polarity
sentence) and a first-mention tie-break for the primary theme, matching the
hand-labelling codebook's own rule.

## One check that failed
Before touching the hand-labelled sample, the working assumption was that the
keyword classifier would land close to the 85% agreement target used
elsewhere in this note — a fairly typical over-optimistic reading of a simple
heuristic's own output. Checking the classifier's automated labels against
`data/hand_labeled_sample.csv` **failed this assumption directly: raw
agreement was 60% (Cohen's κ 0.53)** on the first pass, which is what
surfaced both rejected suggestions above. After both fixes, agreement rose to
82% (κ 0.77) — still short of 85%. Rather than close the remaining 3 points by
adding keywords tuned to the specific 9 disagreeing rows in the same 50-row
sample used to validate the classifier — which would make the validation
measure the fit, not the method — the 82% is reported as-is, with the
residual gap named as a keyword-classifier ceiling (implicit complaints with
no literal keyword overlap, e.g. "average software") in
`deliverables/technical_note.md`.
