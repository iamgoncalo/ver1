# PROJECT 1 — STATUS

Last verified: 2026-08-27 (live session, in-browser + automated tests)

## Git

- branch: `design/innovation-explorer`
- HEAD: `53139e4`
- working tree: clean (every change below is committed)
- remote visibility: PUBLIC (`github.com/iamgoncalo/ver1`) — unchanged this session
- pushed/unpushed: nothing from this session pushed. `origin/main` untouched.

## This session's repair pass (live user feedback + OVERNIGHT_SPEC / HIGH-QUALITY REPAIR PASS)

Committed, tested (38/38 Python unit tests, 30/30 Playwright across
1440x900/1366x768/1280x720), browser-verified (DOM + screenshot):

1. **Critic + Concept Evolution** (`src/real/critic_real.py`, `/api/critic`) —
   SURVIVE/CHALLENGE/NEEDS_EVIDENCE/REJECT verdicts and SEED→CHALLENGED→
   SURVIVOR→FINALIST→REJECTED stages, derived only from already-computed
   real signals. 5/8 requested Critic dimensions honestly NEEDS_EVIDENCE
   (no real HUMAN/PHYSICAL/VERSUNI_FIT/TIMING/ROBUSTNESS data exists).
2. **Real per-concept pricing** — every innovation/possibility now shows a
   real median observed price ("$199.99, typical real price today, median
   of 27 real products") alongside the existing aggregate price-weighted
   exposure metric. Computed in `wtp_real.py`, threaded through
   `magic_box_real.py` and `decision_framework_real.py`.
3. **Renamed "Bets" → "Innovations"** everywhere (nav, eyebrow labels,
   trace button) per live feedback that "Bets" read as gambling jargon.
4. **Consumer Pain methodology surfaced inline** — every Consumer Pain
   figure now shows WHO (real Amazon customers, % verified purchase), HOW
   MANY (n reviews, n products), WHEN (real review date range), WHAT
   STUDIES (explicitly "none" — deterministic keyword classification, not
   survey/panel data).
5. **What Wins explicit LOADING/SUCCESS/EMPTY/ERROR/TIMEOUT states** —
   previously only an implicit opacity dim; now a real state machine with
   a 15s timeout and retry affordance on error/timeout.
6. **Products relabelled** "Verified case portfolio" (was "Official
   Versuni/Philips products").
7. **Signals rebuilt into 4 explicit tabs** — CONSUMERS / RESEARCH /
   TRENDS / MARKET (previously one undifferentiated DISTILLED/RAW view
   mixing review text, papers, and industry docs together). New
   `/api/market` and `/api/trends` endpoints. TRENDS tab states outright
   that Google Trends is NOT_IMPLEMENTED (matches the honest Sources dock
   status — never faked).
8. **Fixed a real data-integrity bug**: `research_index.json` claimed 12
   peer-reviewed papers but only 10 were ever rendered as full cards — 2
   real, verified papers (now RP-11, RP-12) were sitting inside
   `trend_corpus.json`, double-countable but never shown. Promoted both to
   full FOUND/ESTABLISHES/DOES_NOT_ESTABLISH/LIMITATIONS distillation.
   RP-11 verified live via PubMed (PMID 38617028); RP-12 is an economics
   journal paper outside PubMed's scope, verified via its existing
   fetch/archive. `peer_reviewed_count` now equals `len(peer_reviewed_papers)`: 12 == 12.
   5 of the 12 papers are 2025+ (RP-06, RP-07, RP-08, RP-09, RP-10).
9. **Design DNA (F/S/T/R/C/A/E/O)** added to every one of the 12
   Counterfactual possibilities — every parent is a genuine join against
   already-computed real files (signals/research_tensions/
   category_assumptions), never invented. `C` (Versuni capability) is
   honestly MISSING_UNVERIFIED for all 12 — no such dataset exists
   anywhere in this pipeline.
10. **Editorial icon/image system** (`web/src/components/ThemeIcon.tsx`) —
    hand-authored SVG icons per friction theme (6) and research territory
    (6), each carrying an explicit "EDITORIAL" provenance badge. No
    image-generation tool is available in this environment. Wired into
    Counterfactuals, Innovations, and Signals/Research cards + FocusPanels.

## STAGE

ANALYTICS: PASS — `python3 -m unittest discover -s tests` 38/38 this session.
HUMAN VALIDATION: 0/50 — still blocked on Gonçalo, untouched this session.
V1 VISUAL EXPERIENCE: substantially reworked this session (see above).

## NOT YET DONE (from the live "HIGH-QUALITY REPAIR PASS" request)

- Counterfactual object fields beyond Design DNA: explicit ONE-LINE WHAT IF
  / WHY IT EXISTS / WHAT CONCEPT(S) IT GENERATED as first-class fields
  (partially covered today via `why_it_existed`/`what_killed_it` on
  rejected concepts only).
- Innovations/What-Wins object fields: WHY VERSUNI, HOW IT WORKS AT A HIGH
  LEVEL, COMPETITOR OVERLAP not yet explicit fields (Critic result is wired
  into Counterfactuals but not yet into the Innovations/What-Wins cards).
- Full TRACE THIS BET chain (BET→CONCEPT→COUNTERFACTUAL→ASSUMPTION→
  SIGNAL→EVIDENCE) — currently traces EVIDENCE→SIGNAL/TREND/PAPER only;
  Bets (OS-1/OS-2) and Magic Box possibilities are still separate,
  unlinked pipelines.
- Image system coverage for Products (already has real official images —
  unchanged this session) and Consumers/Market tabs (no icons yet).
- Extended 21-step Playwright golden path (current suite: 10 tests/
  viewport, all passing, but not the full spec'd walk).
- Independent 5-angle hostile review.
- Final `OVERNIGHT_FINAL_REPORT.md` / structured "QUALITY REPAIR REPORT".

## NEXT ACTION

See `NEXT_ACTION.md`.
