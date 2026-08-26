# Versuni Air Treatment Case — Project Memory

## PROJECT 1 ONLY

This repository is the Versuni Innovation AI Expert case study for
**Connected Air Treatment / Air Purifier**. It is a standalone deliverable,
not a component of any larger platform.

## Mission
Finish the Versuni Air Treatment / Air Purifier case to submission and
live-interview quality, on real evidence only.

## Do NOT
- Build the separate "Freedom Intelligence Machine" project (different repo,
  different scope) in this repository.
- Broaden the category beyond Connected Air Treatment / Air Purifier.
- Reintroduce synthetic data as final evidence. Synthetic fixtures may exist
  only inside `tests/synthetic_fixtures/`, clearly labelled, excluded from
  `data/raw/` and every deliverable.
- Fabricate human labels. `data/hand_label_sample_BLANK.csv` /
  `data/manual/hand_labels.csv` are filled by a human only — never by Claude,
  never by copying an automated prediction into the human column.
- Fabricate AI-use-log events. Log only what genuinely happened this session.
- Invent a willingness-to-pay figure. If direct WTP evidence doesn't exist,
  say so — see `deliverables/data_quality_report.md` §Q4.
- Force the current recommendation to remain the winner. Recompute Q6 from
  whatever the real evidence actually supports; if it changes, let it change.
- Create unnecessary production infrastructure (no cloud deployment, no
  auth layer, no vector DB, no autonomous agents, no LLM-API dependency in
  the final case pipeline). The dashboard is a local inspection tool only.

## Required
- Real evidence for all three families (consumer, trend, market/price).
- Q1–Q6 answered, each traceable to real data.
- Exactly three fixed decision measures (see `src/config.py::DECISION_METRICS`).
- Insight pack ≤5 slides; technical note ≤2 pages.
- The three appendices (evidence table, data-quality report, AI-use log).
- Complete claim traceability — every number in the pack/note has an
  `evidence_table.csv` row, verified end to end.
- Frozen offline reproduction — `make all` must never touch the network.
- Live-interview robustness — see `LIVE_REHEARSAL.md`.
- A localhost control room (`dashboard/app.py`, `make app`) that reads
  frozen local outputs only and calls production analysis functions — it is
  a viewer, never a second source of calculation.

## Where things live
- Real pipeline: `src/real/`
- Real raw data: `data/raw/`, archived source material: `data/real_raw/`
- Real processed outputs: `data/processed/*_real.json`
- Synthetic engineering demo (isolated, not evidence): `tests/synthetic_fixtures/`
- Audit trail: `AUDIT_CURRENT_PROJECT.md`, `FINISH_PLAN.md`
- Requirements ledger: `CASE_REQUIREMENTS.yaml`
- Current state at a glance: `STATUS.md`
- Command surface: `Makefile` (`refresh`, `all`, `test`, `verify`, `app`, `live-check`)
- Verification engine: `scripts/verify_submission.py`
- Shared claim-trace logic (CLI + dashboard both call this): `scripts/trace_claim.py`

## Read before changing anything
`STATUS.md` for current state, `CASE_REQUIREMENTS.yaml` for what's still
open, `AUDIT_CURRENT_PROJECT.md` for why this repair exists at all.
