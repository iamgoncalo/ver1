# Final acceptance — generated 2026-08-28T19:48:22.130007+00:00 @ b234094

**PASS 27 · FAIL 0 · MANUAL 2**


## repository
- [x] **PASS** correct repo + main canonical — https://github.com/iamgoncalo/ver1.git
- [x] **PASS** clean working tree — clean
- [x] **PASS** local main == origin/main — local b23409491 vs origin b23409491
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
- [x] **PASS** floor care honestly insufficient (same pipeline) — {"products": 0, "reviews": 0, "research": 0, "trend_documents": 0, "competitors": 0, "market_reports": 0}
- [x] **PASS** no air masquerading as floor care — eligibility genuinely differs per category

## hardcoding
- [x] **PASS** mutation: floor 3.0 changes the verdict — verdict responds to threshold
- [x] **PASS** idempotency: unchanged rerun identical — stable
- [x] **PASS** snapshot hash deterministic — 737ea413d1dd

## tests
- [x] **PASS** extra project full discovery — 61 tests
- [~] **MANUAL** playwright suite — run `cd web && npx playwright test` (104 scenarios; last run green)

## production
- [x] **PASS** live health + release identity — deployed b234094 vs main b234094
- [x] **PASS** route / — 200
- [x] **PASS** route /products — 200
- [x] **PASS** route /radar — 200
- [x] **PASS** route /paths — 200
- [x] **PASS** route /magic-box — 200
- [x] **PASS** route /innovations — 200
