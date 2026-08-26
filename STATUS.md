# Status

**Current commit:** `1d35e37` (control-room build) plus an uncommitted
Q6 rework on top as of this writing — see git status before trusting a
commit hash as fully current; commit before treating this as final.

**Data snapshot:** real, 10,547 reviews / 237 hand-validated products,
2 real market sources, 12 real trend documents. Manifest checksums are
authoritative only immediately after a full `make all` run — the source
JSON files stamp a live `compiled_at`/`built_at` timestamp on every
regeneration, so running an individual `src/real/*.py` script standalone
without following with `make all` will drift the manifest's recorded
checksums. Hit twice during this session's own testing, fixed each time by
re-running `make all`; an operational note, not a data-integrity defect.

**Tests:** 22/22 (`make test` — 14 pipeline-integrity + 8 dynamic-winner)

**Verify:** 229/229 checks (`make verify`), including a negative-test proof
(deliberately broke one evidence-table row, confirmed `make verify` failed,
restored, confirmed it passed again)

**Live-check:** 11/11 (`make live-check`)

**Q6 decision logic (reworked this session):** three real Versuni
dimensions — Consumer Pain (CSAT severity, gated by a 0.5% prevalence
materiality floor), Economic Value (price-weighted exposure), 2-5 Year
Feasibility (ordinal, grounded in real trend-corpus citations). Winner
computed via gate → Pareto dominance → a named, parameterized judgment
rule (`decision_priority`: `pain_feasibility_majority` default vs.
`economic_value_override`) — never a fixed literal. Proven genuinely
dynamic: `tests/test_dynamic_winner.py` (8 tests — current-evidence winner,
a fixture where dominance alone decides, the named judgment flip actually
flipping the winner OS-1→OS-2, dict-order independence, and a repo-wide
grep confirming no hardcoded `"recommended": "OS-<n>"` in any production
path). Two independent-review passes on this logic found and this session
fixed: an originally-hardcoded `"OS-1"` literal (the root defect); scenario
rows not actually flowing into OS-1/OS-2's recomputed stats; a
labelling-blinding leak; several unescaped `$` (Streamlit markdown/LaTeX);
a stale dashboard field reference after the schema change
(`KeyError: 'enabling_trend'`, caught by literally opening the page); an
unvalidated `decision_priority` silently defaulting instead of raising; an
unreachable-in-practice empty-profiles crash now raising a clear error.

**Dashboard:** `make app` → http://localhost:8501, all 8 tabs verified
working through an actual browser session (not just headless `curl`),
including the new SCENARIO LAB decision-priority control (BASELINE WINNER /
NEW WINNER / WHAT CHANGED / WHY) and the OPPORTUNITIES tab now showing the
three real dimensions live per candidate with dominance status.

**Human-label status:** 0/50. `data/hand_label_sample_BLANK.csv` is
genuinely blank — confirmed by `make verify` check #9.

**Remaining blockers (all require Gonçalo, none are engineering work):**
1. Label the 50 real reviews (dashboard CONSUMERS tab, or by hand in the CSV) —
   `data/manual/hand_labels.csv`, `labelled_by` must read `human_user`.
2. Decide repo visibility (currently public; brief wants private) —
   `gh repo edit iamgoncalo/ver1 --visibility private`, needs your go-ahead.
3. Decide whether/when to push — everything so far is local-only commits.

**Next task:** once labels are complete, run
`python3 src/real/taxonomy_real.py` to compute real Q3 validation
(agreement %, kappa, per-theme precision/recall), then re-run `make all`
and `make verify` to fold the real validation numbers into the deliverables.
Visual-design stage (Versuni logo + "Disruptive Innovation Team, Amsterdam"
branding, per user instruction) is explicitly deferred until told to start.
