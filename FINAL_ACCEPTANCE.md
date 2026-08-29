# Final acceptance — generated 2026-08-29T14:49:56.818490+00:00 @ 4baa5e8

**PASS 26 · FAIL 2 · MANUAL 2**


## repository
- [x] **PASS** correct repo + main canonical — https://github.com/iamgoncalo/ver1.git
- [ ] **FAIL** clean working tree — M "1. Mandatory Deliverables/01_Code/data/manifest.json"
 M "1. Mandatory Deliverables/01_Code/data/
- [x] **PASS** local main == origin/main — local 4baa5e823 vs origin 4baa5e823
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
- [x] **PASS** snapshot hash deterministic — 360c41fc86bf

## tests
- [x] **PASS** extra project full discovery — 67 tests
- [x] **PASS** playwright full suite (all viewports) — 112 passed, exit=0
- [x] **PASS** frontend production build — vite production build
- [x] **PASS** docker production build — sha256:1b6ea077348a24860d55e9e05c7c5cc1b0db0e4fae91d190a4d09

## hardcoding
- [x] **PASS** no stale ontology in shipped state — UI + funnel labels clean
- [ ] **FAIL** no missing-to-zero display coercion — guarded display sites

## public_data
- [x] **PASS** reviewer identity ships only as a hash — header check
- [x] **PASS** data notice present — DATA_NOTICE.md

## category
- [x] **PASS** stage-level readiness, no hardcoded market — stage readiness + category-linked market

## production
- [~] **MANUAL** live checks — set RAILWAY_URL=https://... to run live checks
