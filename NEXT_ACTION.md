# NEXT ACTION — resume point

Written 2026-08-26T22:15:00Z, after the research-truth correction pass.
Read this + STATUS.md + CHECKLIST.md before continuing if context has
compacted or this is a new session — do not rely on memory.

## CURRENT HEAD (before this session's commit)

`0ea634a` on branch `design/innovation-explorer` — "feat: build V1
Innovation Explorer - five-world React frontend"

This session adds ONE new commit on top containing the research-truth
correction (12 new peer-reviewed papers verified, corpus audit, rebuilt
Signals, new API endpoints, updated Signals world UI, new tests). Check
`git log --oneline -3` to see whether it already landed.

## WHAT JUST PASSED THIS SESSION

- Verified 10 candidate peer-reviewed papers live against the PubMed API
  (`mcp__plugin_bio-research_pubmed`) — every title/author/journal/year/
  DOI matched, all 10/10 real. Audited the existing 12-document corpus
  (0 quarantined — all previously fetched/archived and re-confirmed).
- Built `src/real/research_corpus_real.py` producing
  `data/raw/research/research_manifest.csv`,
  `data/processed/{research_index,evidence_cards,research_tensions,research_clusters}.json`.
- Wrote `research.md`, `research-clusters.md`, `research-quality.md`.
- Built `src/real/signals_from_research_real.py`, which REBUILDS
  `signals_real.json` from the current verified evidence (not preserving
  the old 6 signals by default): 10 signals, 2 genuinely upgraded to
  CONVERGING, 4 new pure-research signals, 1 correctly CONTESTED.
- Updated `web/src/worlds/SignalsWorld.tsx` + `lib/types.ts` to render the
  new richer/nullable signal schema — browser-verified no crash, no
  console error, real content rendering (including the CONTESTED card).
- Added `api/main.py` endpoints: `/api/research`, `/api/research/evidence`,
  `/api/research/tensions`, `/api/research/clusters`.
- Added `tests/test_research_corpus.py` (14 tests) and wired it into
  `make test`. Re-ran `make test` (36/36), `make verify` (229/229),
  `make live-check` (11/11) — all still green.
- Wired the two new generators into `run_pipeline.sh` stage 8c so
  `make all` reproduces the research layer offline.

## WHAT DID NOT HAPPEN (explicitly deferred, not silently dropped)

Per the brief's own P0/P1/P2 ordering, this session covered P0 (research
truth) only. NOT built:

- **The 9 signature illustrations** (Science Constellation, Air Mechanism,
  Performance Tension, Sensor Trust Ladder, Floor↔Air, Science Says/Does
  Not Say, Versuni Capability Universe, Air Portfolio Evolution,
  Category Assumption Map, Counterfactual Engine + Idea Evolution, The
  Bet/Pareto Decision). The research data IS live and browsable (Signals
  world card grid + focus panel), but not through these dedicated visuals.
- **Model B (TF-IDF emergent clustering)** — reported honestly as
  `NOT_IMPLEMENTED` in `research_clusters.json` rather than faked.
- **Dutch economics rebuild** (CBS wage/income verification, APPLiA
  market data, electricity anchor, Dutch Wallet illustration).
- **Products cluster overhaul** — the 6 lenses (Architecture/Performance/
  Intelligence/Generation/Economics/Assumptions), official Versuni/Philips
  SKU verification and imagery. Products world still shows only the
  existing 237-product Amazon-corpus dataset with 2 lenses.
- **Counterfactual Engine UI** — 5 real chains are documented in
  `research-clusters.md`, but no interactive engine consumes them.
- **Playwright automated tests** — still not authored (see prior
  NEXT_ACTION.md entry, still true).
- **Independent hostile visual-critic review of V1** — was cut off by a
  session usage limit in the previous session; not re-run this session
  either (this session's focus was research truth, per explicit priority
  order in the governing prompt: P0 research before more visual polish).

## EXACT NEXT TASK (in order, per the brief's own P1/P2)

1. `research.md` §"How research flows into counterfactuals" — the 5
   documented chains exist in `research-clusters.md`, but no UI
   "Counterfactual Engine" consumes them yet. Decide: build the engine, or
   fold the chains into existing world detail panels first.
2. Dutch economics truth pass — this needs real web verification (CBS,
   APPLiA sources) via WebFetch/WebSearch, structured the same way the
   research corpus was: verify-first, quarantine-if-invalid, cite exactly.
   Not started.
3. Official Versuni/Philips SKU list verification (carried over from the
   prior NEXT_ACTION.md entry — still not done).
4. Re-run the independent hostile visual critic (still pending from the
   prior session).
5. Author Playwright smoke tests (still pending).

## BLOCKERS

- Human-only: 50 hand labels, repo visibility/push decision (unchanged).
- Time/scope: the illustration suite, economics rebuild, products
  overhaul, and counterfactual engine are each substantial builds in
  their own right — no single blocker, just genuinely large remaining
  scope. Tackle one at a time per the priority order above.

## RESUME COMMANDS

```bash
cd /Users/goncalomelodemagalhaes/VERSUNI
git log --oneline -3
make test && make verify && make live-check
python3 src/real/research_corpus_real.py && python3 src/real/signals_from_research_real.py  # if research inputs changed
cd web && npm run build && cd ..
python3 -m uvicorn api.main:app --port 8000
python3 -m streamlit run dashboard/app.py --server.headless true
```
