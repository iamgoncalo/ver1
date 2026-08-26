# NEXT ACTION — resume point

Written 2026-08-27T00:15:00Z. Read this + STATUS.md + CHECKLIST.md before
continuing if context has compacted — do not rely on memory.

## CURRENT HEAD

`a004934` on branch `design/innovation-explorer` — "fix: real 3x
scenario-endpoint slowdown + baseline race condition"

## WHAT'S REAL AND WORKING RIGHT NOW

`make app` (or `python3 -m uvicorn api.main:app --port 8000`) serves the
full V1 "Versuni — Disruptive Innovation" experience on one port:
- 5 worlds (Products/Signals/Rivals/Counterfactuals/Bets), each with a real
  DISTILLED/RAW toggle
- 22-document verified research corpus (12 peer-reviewed, verified live
  against PubMed this session), 10 signals rebuilt from that evidence
- Real Dutch economics (CBS/APPLiA/Eurostat, verified live), a per-product
  Dutch Wallet affordability calc
- Category Assumption Map (8 assumptions, 6 evidence-linked)
- 3 real official Versuni/Philips products with real downloaded/hashed
  images (PureProtect 3200/Mini 900/Pro 4200)
- An honest Sources dock and a live "How We Got Here" funnel — no
  fabricated connector states, no hardcoded example counts
- Trace This Bet — real reverse-evidence lineage from any Bet back to its
  raw sources
- A real Playwright suite: 30/30 passing across 1440x900/1366x768/1280x720
- Two real bugs found and fixed via that testing (not source review): a
  3.2x backend slowdown in the live scenario endpoint, and a baseline
  race condition that hid the winner-flip banner

`make test` 36/36, `make verify` 229/229, `make live-check` 11/11.
Human labels: 0/50, untouched. Nothing pushed, no visibility change.

## EXPLICITLY OUT OF SCOPE / NOT TOUCHED THIS SESSION

- The 9 signature illustrations beyond what's built (Science Constellation,
  Air Mechanism, Performance Tension as dedicated visuals — the underlying
  data is browsable via existing worlds, just not as bespoke illustrations)
- TF-IDF emergent research clustering (Model B) — honestly reported
  NOT_IMPLEMENTED in research_clusters.json
- Full DuckDB/connector-registry infrastructure — deliberately not built;
  the honest Sources dock covers the transparency need without the
  infrastructure investment
- Concept Evolution/Critic/Rejected-Space visual system
- **The `versuni-products` module and `versuni 3` project** — both exist
  elsewhere on this machine (`~/Downloads/Planta Smart Homes 2026/VERSUNI/`)
  and the user is working on them separately. Do NOT touch either without
  being explicitly asked again — see the conversation where this was
  discovered for full detail (versuni-products: 76 products/45 images/115
  sources already real; versuni 3: a separate "Freedom Intelligence
  Machine" implementation of the same Air Purifier case, Postgres+Next.js,
  currently at stage T06/human-action-required).

## RESUME COMMANDS

```bash
cd /Users/goncalomelodemagalhaes/VERSUNI
git log --oneline -6
make test && make verify && make live-check
cd web && npm run build && npx playwright test && cd ..
python3 -m uvicorn api.main:app --port 8000
python3 -m streamlit run dashboard/app.py --server.headless true
```
