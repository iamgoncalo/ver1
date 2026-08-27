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

## PATHS — "See where reality is moving."

Two real, structurally distinct kinds of path, never blended:
- **TENSION** — one per `research_tensions.json` entry. `from`/`to` are parsed from the tension's
  own real "X vs. Y" name (not invented). `what_opens` = the tension's real `design_consequence`.
- **ASSUMPTION** — one per `category_assumptions.json` entry. `from` = the real current assumption
  text, `to` = its own real `counterfactual` field.

Every path also carries `evidence` (real paper IDs) and a `nature_analogue`, which is always
`NO VERIFIED NATURE ANALOGUE` in this pipeline. `driver`, `blocker`, `what_closes`, and
`distortion` have no real source anywhere in this pipeline and are reported as `NO VERIFIED DATA`.

## FIELD — "Understand the emerging world."

A 1:1 relabelling of the real `decision_framework_real.json` verdict — every sub-field below is
an existing real field, not synthesized here: `now` = `recommended_name`, `moving` = `sensitivity`,
`because` = `why`, `opens` = `first_experiment`, `blocked_by` = `killed[]`, `wrong_if` =
`abandon_signal`.

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
