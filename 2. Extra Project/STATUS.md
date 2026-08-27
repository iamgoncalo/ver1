# PROJECT 1 — STATUS

Last verified: 2026-08-27 (live session, in-browser + automated tests + `verify_submission.py` + `live_check.py`)

## Git

- branch: `design/innovation-explorer`
- HEAD: `d987dc2`
- working tree: clean, nothing uncommitted
- remote visibility: PUBLIC (`github.com/iamgoncalo/ver1`) — unchanged this session
- pushed/unpushed: nothing from this session pushed. `origin/main` untouched.

## What's real and working right now

`make app` (or `python3 -m uvicorn api.main:app --port 8000`, frontend built via
`cd web && npm run build`) serves the full "Versuni — Disruptive Innovation"
experience on one port. Five worlds, reached via keyboard 1–5 or the nav bar:

1. **Products** ("What is") — real official Versuni/Philips products with
   downloaded/hashed images, every hero metric traceable to its source file.
2. **Signals** ("What changes") — 4 explicit tabs (CONSUMERS / RESEARCH /
   TRENDS / MARKET), each a genuinely different evidence type with its own
   family icon; every hero metric traceable; Google Trends honestly reported
   NOT_IMPLEMENTED rather than faked.
3. **Competitors** ("What's missing") — real Amazon-review competitor
   brands, white-space opportunities, every hero metric traceable. (Renamed
   from "Rivals" earlier this session per live feedback.)
4. **Criteria** ("What if") — "How Intelligence Decides": the merged
   Counterfactuals + Criteria page. Category Assumption Map, 12→8→8→6→3
   funnel, concept gallery with Design DNA (F/S/T/R/C/A/E/O), Critic
   verdicts, 52-criterion library, and a per-concept "Trace this concept"
   panel walking real signal/tension/assumption evidence down to papers.
5. **Innovations** ("What's next") — the live decision engine (was "Bets").
   Decision-priority toggle genuinely flips the winner; "Trace this bet"
   resolves the full real chain: evidence → signal/paper, plus every
   Criteria concept sharing the same real friction theme (joined by
   `theme_id`, never by name).

Plus: a live Innovation Funnel homepage (world 0) with machine state,
funnel stages, 9 pattern types, and 5 signal families (RESEARCH/TRENDS/
CONSUMERS/MARKET/TECHNOLOGY_AI, each now with its own icon); an honest
Sources dock; a canonical intelligence fabric (`make refresh-intelligence`,
live PubMed/Crossref/Semantic Scholar discovery, CANDIDATE lifecycle,
distance-threshold clustering that allows real outliers); Model A (analyst
territories) and Model B (real TF-IDF + agglomerative emergent clustering)
both present and correctly labelled in `research_clusters.json`.

## Verification (all run this session, current)

- `python3 -m unittest discover -s tests -p "test_*.py"` — **48/48 passed**
- `python3 scripts/verify_submission.py` — **229/229 passed**
- `python3 scripts/live_check.py` — **11/11 passed**
- `cd web && npx playwright test` — **39/39 passed** (13 tests × 3 viewports:
  1440×900 / 1366×768 / 1280×720)
- `cd web && npm run build` — clean, no TypeScript errors
- Human labels (`data/hand_labeled_sample.csv`): 50/50 filled — this was
  already true in the original scaffold commit (`b6e96f8`), before any
  Claude session touched this repo; no session has filled or edited it.
  `data/hand_label_sample_BLANK.csv` (the blank template) remains blank, as
  required.

## This session's work (see `git log` for full commit messages/diffs — not
duplicated here to avoid drifting stale)

In order:
- Consumer Pain ranking methodology made explicit (how/when/who/how many/
  what studies) everywhere a Consumer Pain figure appears.
- Counterfactuals merged into Criteria (now nav position 4, not a bolted-on
  6th world); "Rivals" renamed "Competitors" everywhere; fixed a real
  hardcoding bug (8 of 12 Magic Box possibilities were defaulting
  `feasibility_2_5y` to a bare "medium" with no evidence).
- `/criteria` "How Intelligence Decides" page: gates/diagnostics only, never
  a 4th final-attractiveness score alongside Consumer Pain / Economic Value
  / 2–5yr Feasibility.
- **Task 1 (FUNNEL.md)**: the Innovation Funnel Machine homepage — machine
  state, 8 funnel stages, 9 pattern types, 5 signal families, idempotent
  run-history with genuine snapshot hashing.
- **Task 2 (DATA_FABRIC.md)**: the canonical intelligence fabric — live
  research discovery connectors (PubMed/Crossref/Semantic Scholar, real
  outbound calls, real rate-limit handling), CANDIDATE/ACCEPTED/REJECTED/
  SUPERSEDED lifecycle, `make refresh-intelligence` / `make
  intelligence-watch`, distance-threshold clustering.
- Every Products/Competitors/Signals hero metric made clickable
  (`TraceableMetric` + `MetricFocusPanel`) — click any number, see the
  exact `GET` endpoint, source JSON path, and computing script.
- Fixed the Innovations page's "What Wins?" / "5 · WHAT WINS" framing (live
  user feedback: innovations aren't about winning) → "Innovations" / "5 ·
  WHAT'S NEXT".
- Built the real multi-hop trace chain: `signal → paper` (existing) plus
  new `tension → paper` and `assumption → paper` resolvers; `concept`'s own
  Design DNA walked out to its real evidence; `bet → theme → every concept
  sharing that theme` (the genuine cross-pipeline join, by `theme_id`, that
  an earlier phase this session found could NOT be done by name-matching).
  Wired into both Innovations' "Trace this bet" and a new "Trace this
  concept" button on Criteria — walkable from either end.
- Added real icons for the 3 signal families that had none (CONSUMERS/
  TRENDS/MARKET — only RESEARCH had per-paper `TerritoryIcon`); new
  `FamilyIcon` component used in both the Signals tab bar and the Funnel
  homepage's family pills; consumer `SignalCard`s now show their existing
  `FrictionIcon` too.
- Fixed a stale self-contradiction in `research_clusters.json`: its own
  top-level `_provenance` claimed Model B was "NOT implemented" even after
  a real pipeline run had already computed and merged it in — the nested
  key was right, the file's own summary of itself was wrong.

## NOT YET DONE (genuinely outstanding, not stale carryover)

- Full 21-step Playwright golden-path walk from the original HIGH-QUALITY
  REPAIR PASS spec — current suite is 13 tests × 3 viewports covering the
  main golden path + several targeted regressions, not an exhaustive
  interaction-by-interaction walk.
- Independent 5-angle hostile review of the full experience.
- A final structured "QUALITY REPAIR REPORT" / completion-report deliverable
  in the format the original repair-pass spec asked for — the work itself
  is done and verified above, but no single report document was written.
- Bespoke signature illustrations: `ScienceConstellation` exists (Research
  tab, raw mode); "Air Mechanism" and "Performance Tension" as dedicated
  visuals (beyond the existing icon system and data views) do not.

## NEXT ACTION

See `NEXT_ACTION.md`.
