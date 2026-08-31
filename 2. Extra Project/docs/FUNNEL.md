# The Versuni Innovation Funnel Machine — homepage

One canonical funnel state, computed once in `src/real/funnel_real.py::compute_homepage_funnel()`,
served at `GET /api/funnel` under the `homepage_funnel` key, rendered by `web/src/worlds/FunnelWorld.tsx`.
It is a pure regrouping of already-real objects computed elsewhere in this pipeline — no new
analysis, no new evidence, nothing invented. Where a real source doesn't exist for a field, the
value is `NO VERIFIED DATA` / `NO VERIFIED NATURE ANALOGUE`, never inferred.

RADAR → PATHS → FIELD → MAGIC BOX → INNOVATIONS → NEW PRODUCTS

## RADAR — "See reality."

Every real evidence family this pipeline has, as a count: `RESEARCH`, `TRENDS`, `CONSUMERS`,
`MARKET`, `TECHNOLOGY_AI` (from `compute_signal_families()`), `PRODUCTS` (`products_real.json`),
`RIVALS` (`rivals_real.json`), `ECONOMICS` (`economics_real.json` anchor count). `PATENTS` and
`NATURE` are real zeros with an honest note — no patent register or biomimicry dataset exists
in this pipeline.

## PATHS — "Where is reality actually moving?"

Pass 2 epistemic ontology — three explicit classes (`epistemic_class`), never blended:
- **TRAJECTORY** — "reality appears to be moving from X toward Y"; requires observed temporal AND
  directional evidence. This corpus contains none (paper years are literature accumulating, the
  trend corpus self-disqualifies trend claims, market figures are forward forecasts, the
  review-share yearly series is non-stationary), so the bucket is honestly EMPTY and
  `path_ontology.trajectory_note` states exactly why and what observation would create one.
- **TENSION** — credible evidence genuinely pulls in different directions. One per qualifying
  `research_tensions.json` entry; `relation: TRADE_OFF`, poles rendered as a two-way pull, never a
  directional arrow. `evidence_state` distinguishes contested-multi-source from a single-source
  trade-off.
- **ASSUMPTION_TO_TEST** — the category behaves as though X were true; we test what changes if it
  is not. One per `category_assumptions.json` entry, plus records reclassified out of TENSION
  (T4: its evidence agrees, the signals layer says CONVERGING; T5: its own record says the
  deciding test was never run). Reclassifications are labelled method choices whose
  machine-checkable signal-state conditions are re-verified at build time; each carries its
  `reclassification_why`.

Every path carries a typed `test` instead of the old `NO VERIFIED DATA` slots: `FALSIFIER` /
`RESOLUTION_QUESTION` / `CHALLENGE_TEST` derive deterministically from stored evidence-card or
corpus fields (live `source_quotes` / `current_value` attached), and `TEST_PROPOSAL` (A2/A7 only)
is an explicitly unverified grounded LLM proposal, never presented as observed evidence. The old
public fallback sentence ("no falsifier established…") is deleted and its absence is asserted by
tests.

## FIELD — per-path grounding, never one reused brief.

Each path owns `path.field`, built by `src/real/field_grounding_real.py` from the one honest join
in this corpus (path evidence → signals → taxonomy themes → reviews/products/economics/rivals).
Fields render only where evidence exists (A4/A7 are honestly empty); Versuni capabilities,
household behaviour, and physical constraints are declared UNAVAILABLE. Frictions open real
review excerpts (`GET /api/reviews?theme=`); products, papers, competitors, and signals
deep-link into their own worlds. The former global brief survives as `formal_case_brief` —
honestly named as the Air case's decision verdict, not field grounding.

## MAGIC BOX — "Reveal what could exist."

The real pattern totals from `compute_patterns()` (9 pattern types: CONVERGENCE, TENSION,
CONTRADICTION, ASSUMPTION, CAPABILITY_TRANSFER, WHITE_SPACE, ANOMALY, TEMPORAL_SHIFT,
CROSS_SCALE_LINK), unchanged.

## INNOVATIONS — "Build and test possibilities."

Every real Magic Box possibility (`magic_box_real.json["possibilities"]`), each annotated with
its real Critic verdict where one exists (`critic_real.json`).

## NEW PRODUCTS — "Make possibility physical."

Only the real finalists that survived the full funnel (`magic_box_real.json["finalists"]`) —
never a single hardcoded winner. `bet` is the real current recommendation
(`decision_framework_real.json["verdict"]["recommended_name"]`), shown alongside, not merged in —
see `FunnelWorld.tsx` / `InnovationsWorld.tsx` for the documented, honest naming mismatch between
the Magic Box funnel and the separate decision-framework bet pipeline.
