# Versuni Intelligence Machine — Extra Project

A self-directed exploration built on the same real Air Purification
evidence base as the formal case. **The official submission is
[`../1. Mandatory Deliverables/`](<../1. Mandatory Deliverables/README.md>)**
— that folder is canonical for everything the brief requires; this project
is the wider machine around it.

## What it is

A live decision-engine API (FastAPI) plus a five-world React/TypeScript
web app that lets you interactively walk the machine's reasoning:

```
PRODUCT UNIVERSE → RADAR (signal + competitor evidence) → PATHS + FIELD → MAGIC BOX (concept generation)
        →  CRITERIA (how intelligence decides)  →  INNOVATIONS
        →  CRITIC  →  FINALISTS
```

All evidence is real: 10,547 real Amazon reviews across 237 hand-validated
purifier products, 22 verified research documents (12 peer-reviewed via
PubMed identifiers), 12 archived trend/regulatory documents, and two
archived, genuinely disagreeing market sources. Missing evidence is shown
as missing — the app renders honest gaps, never invented numbers.

## Run it

```bash
make all          # offline build: regenerate every processed output from frozen real data
make test         # full test discovery (Python)
make verify       # submission-integrity verifier
make app          # build web/ and serve app+API on http://localhost:8000
make app-dev      # vite dev server (5173) + API (8000)
make live-check   # smoke-test every live-session command
```

Playwright suite for the web app: `cd web && npx playwright test`.

## Evidence families

| Family | Source | Where |
|---|---|---|
| Consumer voice | McAuley-Lab Amazon-Reviews-2023, filtered to the frozen 237-product allowlist | `data/raw/consumer_reviews.csv` + `data/real_raw/` |
| Research | PubMed-verified papers + technical/regulatory docs | `data/raw/research/`, `data/processed/research_index.json` |
| Trends | 12 archived documents (EPA, ENERGY STAR, AHAM, CARB, WHO, Matter, …) | `data/raw/trend_corpus.json` + `data/real_raw/trend_sources/` |
| Market | Mordor Intelligence vs. IMARC Group (5.37% vs. 6.54% CAGR, both archived) | `data/raw/market_metrics.json` + `data/real_raw/market_sources/` |

## Known gaps (stated, not smoothed over)

- **No direct WTP evidence** — Price-Weighted Exposure is a labelled
  diagnostic, never presented as willingness to pay.
- **Q3 human validation is blocked** on genuine hand labels (see the
  formal case's `HUMAN_LABELING_INSTRUCTIONS.md`); no AI label
  substitution, ever.
- **No Versuni-internal data** (capability, margins, installed base) —
  feasibility ratings are labelled analyst judgments citing external
  precedent only.
- Google-Trends-style search-interest data: honestly `NOT_IMPLEMENTED`
  (see `/api/sources`).

## Current state

48/48 Python tests pass (`make test`); the compliance ledger is
[`CASE_COMPLIANCE.yaml`](CASE_COMPLIANCE.yaml). The formal case's own
reproduction, tests, verifier and fresh-clone proof live in
[`../1. Mandatory Deliverables/`](<../1. Mandatory Deliverables/README.md>).
