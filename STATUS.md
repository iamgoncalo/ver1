# PROJECT 1 — STATUS

Last verified: 2026-08-26T21:35:00Z

Git:
- branch: `design/innovation-explorer`
- HEAD at last verification: `a57ee77` (chore: establish permanent project governance)
- working tree: DIRTY — this session's V1 frontend build is about to be
  committed (see NEXT_ACTION.md for the exact commit this produces).
- remote visibility: PUBLIC (`github.com/iamgoncalo/ver1`)
- pushed/unpushed: `origin/main` is still at `b6e96f8` — the OLD, fully
  synthetic pre-repair commit. Nothing from this repair, the control room,
  the Q6 rework, governance, or V1 has been pushed. NOT pushed this session
  either, per standing instruction.

## STAGE

ANALYTICS: **PASS** — re-run live this session: `make test` 22/22, `make
verify` 229/229, `make live-check` 11/11. `data/processed/decision_framework_real.json`
regenerated to the default `decision_priority=pain_feasibility_majority`
state (winner OS-1) after earlier ad-hoc testing had left it on the
`economic_value_override` state — restored intentionally, not a defect.

HUMAN VALIDATION: **0/50** — BLOCKED, confirmed genuinely blank again this
session (`data/hand_label_sample_BLANK.csv` unlabelled, `data/manual/hand_labels.csv`
does not exist). The Streamlit labelling UI (blinded by construction) is
running and reachable at `http://localhost:8501` — ready for Gonçalo to use
tonight. Not touched or tested end-to-end again this session beyond
confirming the process is alive.

V1 VISUAL EXPERIENCE: **IMPLEMENTED, BROWSER VERIFIED** (not yet
independently reviewed — see below). Built this session:
- `web/src/` — full five-world React/TypeScript/Vite app: `App.tsx`,
  `ProcessRail`, `FocusPanel`, `AskShell`, `ErrorBoundary`, a shared UI kit
  (`components/ui.tsx`), and all five worlds (`ProductsWorld`, `SignalsWorld`,
  `RivalsWorld`, `MagicBoxWorld`, `InnovationsWorld`), consuming the
  already-existing `api/main.py` real-data endpoints.
- Design: warm-neutral palette, Fraunces (display) + IBM Plex Sans/Mono
  (body/data), CSS custom-property tokens with light/dark support, no
  framer-motion (removed — see defects below).
- `make app` now builds the frontend and serves it + the API on ONE port:
  `python3 -m uvicorn api.main:app --port 8000` → `http://localhost:8000`.
  `make analyst` runs the existing Streamlit control room separately.
- Keyboard model implemented: 1–5 jump, ←/→ move, SPACE opens the
  deterministic "Ask" shell, ESC closes panels/shell.
- No-scroll constraint BROWSER-VERIFIED at 1440×900, 1366×768, and 1280×720
  on the densest worlds (Products/Rivals) — `document.documentElement`
  scrollHeight/scrollWidth exactly match the viewport at all three; internal
  content areas use their own `.scrollY` panel instead.
- Real defects found live in-browser and fixed this session (see
  CASE_REQUIREMENTS.yaml v1_innovation_explorer for detail): (1) a
  Framer-Motion `AnimatePresence`-based world-switch transition that
  permanently desynced the rendered world from nav state after the first
  click; (2) a null-`economic_value`/`severity_csat` crash for the
  gate-failed OS-3 card that unmounted the entire React tree with no error
  boundary; (3) the same Framer-Motion stuck-animation class of bug in
  `FocusPanel`/`AskShell` (opacity/transform frozen at their `initial`
  state). Fix for all three: removed framer-motion from interactive
  overlays and world transitions, replaced with plain CSS transitions/
  keyframes, and added an `ErrorBoundary` around each world so a future
  edge case degrades to a visible message instead of a blank page.
- Product portfolio: uses the existing 237-product real Amazon-review-corpus
  dataset (two verified cluster lenses: TYPE, INTELLIGENCE). The user's
  candidate Versuni/Philips official SKU list (AC0651/10 etc.) was
  explicitly NOT verified against official sources this session — deferred,
  not silently dropped (see CURRENT BLOCKERS).
- NOT done this session: the independent visual-critic pass was started
  (one hostile-executive-persona agent, via the Browser tool against the
  live app) but the session hit its usage limit before it returned a
  verdict — see BLOCKERS. Playwright automated tests were not authored;
  verification this session was real, manual, browser-tool-driven
  (screenshots + DOM/console ground-truth checks), not Playwright.

V2 AGENTIC INTELLIGENCE: NOT_STARTED (intentionally deferred this session —
see CASE_REQUIREMENTS.yaml)

V3 HOSTILE RELEASE: NOT_STARTED

## CORE HEALTH

make all: not re-run this session (no analytical inputs changed); last
known PASS
make test: PASS — 22/22 (re-run live this session)
make verify: PASS — 229/229 (re-run live this session)
make live-check: PASS — 11/11 (re-run live this session)
frontend build: PASS — `cd web && npm run build` clean, 0 TypeScript errors
localhost: FastAPI + built React SPA confirmed serving real data on :8000
this session — all five worlds browser-verified with live data
(`/api/products` → 237, `/api/signals` → 6, `/api/rivals` → 34 brands,
`/api/white-space` → 2 white-space opportunities, `/api/magic-box` →
12→8→8→6→3 funnel, `/api/innovations/scenario` → OS-1 default / OS-2 under
`economic_value_override`, live and matching the CLI).
synthetic final evidence: 0
dynamic winner: PASS — verified live IN THE BROWSER UI this session (not
just the API): toggling the decision-priority control flips OS-1 → OS-2
with a visible "WINNER CHANGED" banner.

## CURRENT RECOMMENDATION

winner: OS-1 — Reliability-Verified Air Purifiers (extended-life guarantee
+ real-time self-diagnostic)
decision type: NON_DOMINATED_PLUS_JUDGMENT
key trade-off: Consumer Pain + Feasibility (OS-1) vs. Economic Value (OS-2,
Whisper-Quiet Night Mode) — no candidate dominates on all three real dimensions
flip assumption: `decision_priority` — `pain_feasibility_majority` (default)
vs. `economic_value_override`

## CURRENT BLOCKERS

1. 50 real hand labels — requires Gonçalo personally; nothing else can
   complete Q3 validation until this happens. Streamlit labelling UI is up
   at `http://localhost:8501` and ready.
2. Repo visibility / push decision — public GitHub remote showing outdated
   synthetic-data work; nothing from this repair or V1 pushed. Needs
   Gonçalo's explicit go-ahead.
3. Independent visual-critic review of V1 did not complete — the review
   agent was cut off by a session usage limit before returning CRITICAL/HIGH
   findings. Re-run before treating V1 as fully reviewed.
4. Official Versuni/Philips SKU list (AC0651/10 etc.) not yet verified
   against official sources — Products world currently ships on the
   already-real, already-verified 237-product Amazon corpus only.
5. `data/manifest.json` / `market_metrics.json` / `trend_corpus.json` still
   carry a volatile `built_at`/`compiled_at` timestamp that changes on every
   pipeline re-run — cosmetic build metadata, not a content-integrity issue
   (confirmed via diff this session), but the CONTENT-vs-BUILD-METADATA
   separation requested earlier has not been implemented.

## NEXT ACTION

See NEXT_ACTION.md for the exact resume point.
