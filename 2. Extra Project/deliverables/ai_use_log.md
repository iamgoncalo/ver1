# AI-Use Log

**Tools and roles.** *Claude Code (Anthropic):* repository work — data
acquisition scripts, pipeline code, tests, verification tooling,
AI-assisted review of outputs, and this document's prose. *ChatGPT
(OpenAI):* used by the case owner to draft brief interpretation and the
structured repair/review instructions given to Claude Code. *Human (case
owner):* accountable for the case, final interpretation and acceptance of
every recommendation, and the (still pending) hand labels.

**Authority boundaries.** AI proposed code, queries, taxonomy logic and
opportunity structures. AI could not and did not: create consumer
evidence, invent source facts, fill human labels, convert missing evidence
into numbers, or grant final acceptance.

**Rejected AI suggestion 1 — wrong Amazon category.** First attempt
streamed the "Appliances" category ("purifiers are appliances"). Returned
32 candidates, dominated by replacement-filter accessories. Rejected after
inspection of the actual rows; "Home_and_Kitchen" yielded the real 237
products / 10,547 reviews.

**Rejected AI suggestion 2 — first-pass classifier accepted as final.**
The title+description keyword classifier was proposed as done. Inspection
of actual matches found vacuum cleaners and wearable ionizers matched via
cross-sell copy in *descriptions*. Rejected; title-only matching plus
exclusion regexes produced the frozen 237.

**Failed AI check.** Q3's classifier first ran without a polarity gate:
"Ozone / smell" scored 22% prevalence with a *positive* CSAT impact —
"great at eliminating odors" counted as a complaint. Programmatic re-check
against raw text exposed it; keywords now only count inside
negative-polarity sentences, and the rerun produced the published figures.

**Integrity incident (disclosed).** An earlier file presented as a
hand-labelled sample failed provenance validation — its review texts did
not match the real corpus for their review IDs (traced to a synthetic
fixture's template pool). It was deleted; regression tests now verify
every sample row against the real corpus by id, product and exact text,
and Q3 validation remains **blocked pending genuine human labels** — no
label was ever substituted.

**Verification.** AI-derived work was checked by: programmatic checks
(59-row evidence table, 229-check verifier, 49-test discovery suite,
negative tests that corrupt a trace and expect failure), deterministic
re-runs of the offline pipeline, source retrieval against archived pages,
and a genuine fresh-clone reproduction (`FRESH_CLONE_REPORT.md`).
