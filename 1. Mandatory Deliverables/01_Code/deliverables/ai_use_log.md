# AI-Use Log
Tools used: Claude (Anthropic), throughout, for code, real-data acquisition
scripts, analysis, and this document's own prose, in an agentic session
with direct network/tool access. Every number traces to
`data/processed/*.json` — see `deliverables/evidence_table.csv`. Checking:
every AI-proposed number or claim was re-derived from the real data and
re-run, not accepted on assertion.

## Rejected suggestion 1 — wrong Amazon category
First attempt streamed Amazon's "Appliances" category, reasoning "air
purifiers are appliances." Returned only 32 candidates, dominated by
replacement-filter accessories. **Rejected** — real purifiers are
merchandised under "Home_and_Kitchen". Switching categories produced 237
real validated products and 10,547 real reviews.

## Rejected suggestion 2 — treating a first-pass classifier as final
The first title+description keyword classifier was accepted as "done" at
106 candidates. Manual inspection found real false positives — vacuum
cleaners, wearable necklace ionizers — matched because their *description*
mentioned "air purifier" in cross-sell copy. **Rejected**: description-text
matching conflates "cross-sold near a purifier" with "is a purifier."
Fixed with title-only matching plus exclusion regexes, raising the count
to 237.

## One check that failed
Q3's automated theme classifier first ran without a polarity gate — a
keyword counted regardless of sentence polarity. On real text this scored
"Ozone / smell / irritation" at 22% prevalence with a **positive** CSAT
impact — incoherent for a friction, since "great at eliminating odors" was
counted as a complaint. Fixed by only counting a keyword inside a
negative-polarity sentence.
