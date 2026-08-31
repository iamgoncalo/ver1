# Final acceptance — generated 2026-08-31T16:08:35.116014+00:00 @ c56f80a

**PASS 27 · FAIL 2 · MANUAL 2**


## repository
- [x] **PASS** correct repo + main canonical — https://github.com/iamgoncalo/ver1.git
- [ ] **FAIL** clean working tree — M "2. Extra Project/data/processed/funnel_run_history.json"
 M "2. Extra Project/tests/test_floor_ca
- [x] **PASS** local main == origin/main — local c56f80a20 vs origin c56f80a20
- [x] **PASS** no absolute personal paths in tracked files — none
- [x] **PASS** no obvious secrets — signature scan clean
- [x] **PASS** public repository — GitHub API visibility

## formal_case
- [x] **PASS** full test discovery — 51 tests, OK=True
- [x] **PASS** submission verifier — VERIFY: 301 passed, 0 failed
- [x] **PASS** Q3 honest human blocker — blank sample present, no fabricated human file
- [~] **MANUAL** clean-checkout reproduction — proven at release via FRESH_CLONE_REPORT.md - rerun after any pipeline change

## machine
- [x] **PASS** exactly five primary stages — five canonical routes; legacy routes fold in
- [x] **PASS** no winner/finalist user-facing ontology — clean
- [x] **PASS** Field nested inside Paths — grounding toggle present
- [x] **PASS** Lab nested inside Innovations — Lab entry present

## category
- [x] **PASS** air runnable from real eligibility — {"products": 223, "reviews": 10478, "research": 11, "trend_documents": 11, "competitors": 34, "market_reports": 2}
- [x] **PASS** floor care reports from its OWN real stores, not air's — floor products 572==572 (file), reviews 384253==384253 (file), both != air (223, 10478)
- [x] **PASS** no floor-care stage reports readiness above its evidence — no stage above its evidence; research=CANDIDATE_ONLY, runnable=False
- [x] **PASS** no air theme/possibility leaks into floor care surfaces — 33 induced theme ids clean; 24 possibility names clean

## hardcoding
- [x] **PASS** mutation: floor 3.0 changes the verdict — verdict responds to threshold
- [x] **PASS** idempotency: unchanged rerun identical — stable
- [x] **PASS** snapshot hash deterministic — 9d1decb9fa08

## tests
- [x] **PASS** extra project full discovery — 110 tests
- [x] **PASS** playwright full suite (all viewports) — 180 passed, exit=0
- [x] **PASS** frontend production build — vite production build
- [x] **PASS** docker production build — sha256:b3fdd700ea9996ab52fc21abf1b90efa56014cb6d6cadf5c9fe11

## hardcoding
- [x] **PASS** no stale ontology in shipped state — UI + funnel labels clean
- [ ] **FAIL** no missing-to-zero display coercion — guarded display sites

## public_data
- [x] **PASS** reviewer identity ships only as a hash — header check
- [x] **PASS** data notice present — DATA_NOTICE.md

## category
- [x] **PASS** stage-level readiness, no hardcoded market — stage readiness present for both; floor readiness never above evidence; real air market

## production
- [~] **MANUAL** live checks — set RAILWAY_URL=https://... to run live checks
