# Status

**Current commit:** `e3e31f3` (checkpoint: real-evidence repair) — this
control-room build (Makefile, verifier, dashboard, CI) is staged on top,
not yet committed as of this writing; see git status before trusting the
commit hash above as fully current.

**Data snapshot:** real, 10,547 reviews / 237 hand-validated products,
2 real market sources, 12 real trend documents. Manifest checksums are
authoritative only immediately after a full `make all` run — the source
JSON files stamp a live `compiled_at`/`built_at` timestamp on every
regeneration, so running an individual `src/real/*.py` script standalone
without following with `make all` (or at least `build_manifest_real.py`)
will drift the manifest's recorded checksums. This was hit once during
this session's own testing and fixed by re-running `make all`; it is a
real operational note, not a data-integrity defect — see git history for
the concrete incident if useful.

**Tests:** 14/14 (`make test`)

**Verify:** 229/229 checks (`make verify`), including a negative-test proof
(deliberately broke one evidence-table row, confirmed `make verify` failed,
restored, confirmed it passed again)

**Live-check:** 11/11 (`make live-check`)

**Dashboard:** `make app` → http://localhost:8501, all 8 tabs verified
working through an actual browser session this session (not just headless
`curl`): EXECUTIVE, DATA, DATA QUALITY, CONSUMERS (including a genuine
end-to-end blinded-label save, tested then reverted since it was a test
click, not a real Gonçalo label), MARKET/PRICE/WTP, OPPORTUNITIES, SCENARIO
LAB (a real scenario run confirmed `data/raw`/`data/processed` untouched,
only `data/runtime/scenario_result.json` written), EVIDENCE/SYSTEM HEALTH.
Two real rendering bugs were found and fixed by actually opening the page:
Streamlit's markdown renderer treats a `$...$` pair as inline LaTeX, which
silently mangled every sentence or table cell containing two dollar
amounts — fixed with a `md()` escaping helper applied everywhere free text
(JSON-derived or raw review text) reaches `st.markdown`.

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
