# AI-Use Log
Half a page. Tools used: Claude (Anthropic), used throughout for code,
real-data acquisition scripts, analysis, and this document's own prose, in
an agentic session with direct network/tool access. Every number in the pack
traces to `data/processed/*.json` built from real, individually verified
sources — `deliverables/evidence_table.csv`.

**Material correction to an earlier version of this log:** an earlier pass
of this project generated a fully synthetic dataset and a "hand-labelled"
Q3 validation sample that was actually AI-authored, not labelled by an
independent human — both were caught by a self-audit
(`AUDIT_CURRENT_PROJECT.md`) and are the reason this repair exists. That
finding belongs here, not hidden: presenting AI-generated labels as human
labels was a real misrepresentation risk this project came close to
shipping, corrected before submission by regenerating the sample with its
`hand_label` column left genuinely blank
(`data/hand_label_sample_BLANK.csv`, `HUMAN_ACTION_REQUIRED`).

## Rejected suggestion 1 — wrong Amazon category for the real corpus
First attempt at real-data acquisition streamed and filtered Amazon's
"Appliances" category (272MB metadata), on the reasoning that "air
purifiers are appliances." It returned only 32 candidates, dominated by
replacement-filter accessories on manual inspection.
**Rejected because it was the wrong category** — real air purifiers are
merchandised under "Home_and_Kitchen" on Amazon, not "Appliances". Switching
categories (11.8GB metadata, streamed and filtered the same way) produced
237 real validated products and, eventually, 10,547 real reviews.

## Rejected suggestion 2 — treating a first-pass product classifier as final
The first title+description keyword classifier over Home_and_Kitchen
metadata was accepted as "done" after it returned 106 candidates. Manual
inspection (required by §3.2 of the brief) found real false positives:
vacuum cleaners, wearable necklace ionizers, and home-decor items matched
because their *description* text mentioned "air purifier" in cross-sell
copy. **Rejected because description-text matching conflates "this product
is cross-sold near a purifier" with "this product is a purifier"** — the
same category error, one level up, as the polarity bug in rejected
suggestion 3 below. Fixed with title-only matching plus explicit
accessory/vacuum/wearable exclusion regexes, raising the validated count to
237.

## One check that failed (and a second instance of the *same* failure mode)
Q3's automated theme classifier was first run without a polarity gate — a
keyword counted regardless of whether the sentence containing it was
positive or negative. On real text, this scored "Ozone / smell /
irritation" at 22% prevalence with a **positive** CSAT impact — incoherent
for something reported as a friction, because "great at eliminating odors"
was being counted as an odor complaint. **This is the identical bug already
found and fixed once during the earlier synthetic-fixture phase of this
project** (documented in `src/taxonomy.py`'s history) — it reappeared
independently on real text because the real-data taxonomy module was
written fresh rather than inheriting the earlier fix, which is itself the
finding worth logging: a validated fix from one part of a project does not
automatically propagate to a parallel implementation, and checking output
against data caught it a second time rather than assuming the earlier fix
still applied.
