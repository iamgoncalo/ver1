# Versuni Air Purification Case — Project Memory

## Mission
This repository is the Versuni Innovation AI Expert case study for
**Air Purification** (residential air purifiers), plus a supplementary
exploration built on the same real evidence. Two projects:

1. **`1. Mandatory Deliverables/`** — the official case submission.
   Canonical for everything the brief requires. Must stand alone.
2. **`2. Extra Project/`** — the wider "Versuni Intelligence Machine"
   (decision-engine API + React web app). Supplementary; never a source
   of truth for the formal case.

## Authority order
1. The actual case brief. 2. Genuine raw/source evidence. 3. Executable
current code and tests. 4. Current Git state. 5. Generated outputs.
Historical planning/status documents are untrusted; Git history is the
archive.

## Immutable rules
- Zero fabricated or synthetic final evidence. The only synthetic artifact
  is the contamination sentinel under
  `1. Mandatory Deliverables/01_Code/tests/synthetic_fixtures/` (TEST ONLY).
- Never fill `hand_label` columns — human labels are human-only. Q3 stays
  BLOCKED until the case owner labels
  `01_Code/data/hand_label_sample_BLANK.csv` (protocol:
  `01_Code/HUMAN_LABELING_INSTRUCTIONS.md`).
- Never hardcode a recommendation; Q6 recomputes from current evidence and
  may return INSUFFICIENT_EVIDENCE_FOR_RECOMMENDATION.
- Missing evidence stays missing/UNKNOWN — never silently 0, "medium", or
  estimated. Proxies are named as proxies (Price-Weighted Exposure is not
  WTP, revenue, or market size).
- Frozen raw evidence (`data/real_raw/`, `data/raw/`) is never edited as a
  scenario technique — scenarios run in memory (see
  `01_Code/LIVE_SESSION_RUNBOOK.md`).

## Canonical commands (run from `1. Mandatory Deliverables/01_Code/`)
- Full offline reproduction + PDFs + verifier + hashes:
  `bash scripts/reproduce_submission.sh`
- Analysis only: `bash run_pipeline.sh --analysis-only`
- Full test discovery (the only valid test count):
  `python3 -m unittest discover -s tests -p "test_*.py"`
- Integrity verifier: `python3 scripts/verify_submission.py`
- Claim trace: `python3 scripts/trace_claim.py <claim_id> | --random 5`

## Extra Project commands (run from `2. Extra Project/`)
- `make all` (offline build), `make test`, `make verify`
- Web app: FastAPI serves `web/dist` — see its README.
