# NEXT ACTION — resume point

Written 2026-08-27 (live session). Read this + `STATUS.md` before continuing
if context has compacted — do not rely on memory. `STATUS.md` has the full
current-state writeup; this file is just the resume point and what's
explicitly out of scope.

## CURRENT HEAD

`d987dc2` on branch `design/innovation-explorer` — "Fix stale 'Model B
NOT_IMPLEMENTED' claim in research_clusters.json". Working tree clean.

## RESUME COMMANDS

```bash
cd /Users/goncalomelodemagalhaes/VERSUNI
git log --oneline -10
python3 -m unittest discover -s tests -p "test_*.py"   # 48/48
python3 scripts/verify_submission.py                    # 229/229
python3 scripts/live_check.py                            # 11/11
cd web && npm run build && npx playwright test && cd .. # 39/39, 3 viewports
python3 -m uvicorn api.main:app --port 8000
python3 -m streamlit run dashboard/app.py --server.headless true
```

## IF PICKING UP THE "NOT YET DONE" LIST IN STATUS.md

That list (full Playwright golden path, hostile review, a final written
QUALITY REPAIR REPORT, remaining bespoke illustrations) has not been
explicitly requested by the live user this session — it's what's left
against the *original* HIGH-QUALITY REPAIR PASS / FUNNEL.md / DATA_FABRIC.md
specs. Do not start any of it proactively; confirm with the user first,
since each is a meaningfully-sized batch of its own.

## EXPLICITLY OUT OF SCOPE / NOT TOUCHED THIS SESSION

- TF-IDF emergent research clustering (Model B) — this WAS already
  implemented (`src/real/emergent_clustering_real.py`); a stale claim to
  the contrary in `research_clusters.json` was fixed this session. Nothing
  left to do here.
- Full DuckDB/connector-registry infrastructure — deliberately not built;
  the honest Sources dock covers the transparency need without the
  infrastructure investment.
- Concept Evolution/Critic visual system — this WAS already implemented
  (Criteria world: Design DNA, Critic verdicts, evolution stages). Nothing
  left to do here either; this line is kept only because an earlier version
  of this file listed it as not-done and that was already wrong then.
- **The `versuni-products` module and `versuni 3` project** — both exist
  elsewhere on this machine (`~/Downloads/Planta Smart Homes 2026/VERSUNI/`)
  and the user works on them separately. Do NOT touch either without being
  explicitly asked again.
- Never fill `data/hand_label_sample_BLANK.csv` (the blank human-label
  template) — it must stay blank. `data/hand_labeled_sample.csv` (a
  different, already-filled file from the original scaffold commit,
  predating any Claude session) is not something to edit either.
- Never push, never change repository visibility, never touch CI/deploy
  config, without explicit user request.
