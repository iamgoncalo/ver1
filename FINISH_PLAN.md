# Finish Plan — Versuni Case Study
Dependency-ordered. Do not start an item before its listed prerequisite is
DONE. Nothing in this plan has been executed yet — this is the plan only,
per the audit's instruction to audit before implementing.

---

### F1 — P0 — Fabricated raw data (all three evidence families)
**Problem.** `data/raw/consumer_reviews.csv`, `market_metrics.json`,
`trend_corpus.json` are entirely synthetic. The brief requires real consumer
review text, real corroborated market figures, and a real trend corpus
(§3.1–3.3). This is the root cause behind every "contingent FAIL" in the
audit table — Q2, Q3, Q4, Q5, Q6 all inherit it.
**Why it matters.** §10: fabricated/untraceable data is application-ending,
not a scoring deduction. Everything downstream is reasoning over invented
numbers.
**Files affected.** `src/generate_reviews.py`, `generate_market_metrics.py`,
`generate_trend_corpus.py`, `generate_aftermarket_signals.py` (replace with
real ingestion scripts), all of `data/raw/`, `data/manifest.json`.
**Exact fix.**
1. Consumer reviews (§3.2): pull a real, ToS-compliant public dataset for
   smart/connected air purifiers (a Kaggle/UCI Amazon-reviews-style category
   subset, or a small ToS-respecting sample from a retailer review page at
   low volume) — several thousand reviews concentrated in one category, per
   the brief's own guidance. Document who is missing from the sample.
2. Market metrics (§3.3, Q5): find two real, independently published figures
   for the same segment that genuinely disagree (a common, findable pattern:
   one vendor report vs. a press/analyst secondary citation of a different
   vendor's number). Save copies or archived links; record the exact
   page/table.
3. Trend corpus (§3.1): assemble 12–20 real documents (articles, regulatory
   pages, standards releases) with real URLs, publication dates, and the
   date you accessed them.
4. Rewrite `src/generate_*.py` as real ingestion/parsing scripts over the
   downloaded/saved raw material (or, where a source can't be redistributed,
   ship the fetching script + manifest entry instead, per §3.5).
5. Rebuild `data/manifest.json` from the real files (checksums, real counts,
   real retrieval dates).
**Verification command.** `bash run_pipeline.sh` — must still run end to end
with the new raw inputs.
**Done condition.** Every `_synthetic: true` / `url_verified: false` /
`SYNTHETIC FIXTURE` marker in `data/manifest.json` and `trend_corpus.json`
is gone because the thing it was disclosing is gone.
**Human action.** None required to start (public data only), but you should
sanity-check the chosen review dataset's license/ToS yourself before
submission — I will not silently expand into paywalled or ToS-ambiguous
sources.

---

### F2 — P0 — "Hand-labelled" sample was AI-authored, not human, and this isn't disclosed
**Problem.** `data/hand_labeled_sample.csv` was labelled by the AI in-session,
not an independent human, which makes the 82%/κ=0.77 agreement figure
circular (AI classifier validated against AI labels). The AI-use log doesn't
disclose this.
**Why it matters.** The brief and standard case-study practice treat
AI-labelled-as-human as a fabrication-adjacent integrity issue, not a style
choice. §6.3 requires the AI-use log to be truthful about what the tools did.
**Prerequisite.** None — independent of F1, can run in parallel.
**Files affected.** `data/hand_labeled_sample.csv`, `deliverables/ai_use_log.md`,
`deliverables/technical_note.md`, `README.md`, `src/taxonomy.py` (comments).
**Exact fix.** Two acceptable paths, your call:
- (a) **Get a real human label** — you (or another qualified person) read the
  50 sampled reviews cold, without seeing `classify()`'s output, using the
  written codebook already in `technical_note.md`, and produce a genuinely
  independent CSV. I cannot do this step — it requires a human.
- (b) **Relabel and disclose** — rename the file to make clear it is
  AI-derived (e.g. `ai_reference_sample.csv`), strike every "hand-labelled"
  claim from README/technical_note/taxonomy.py, and add an explicit,
  unflattering line to `ai_use_log.md` stating Q3's validation step is
  currently AI-vs-AI and does not satisfy the brief's hand-labelling
  requirement — with a named plan to fix it (path (a)) before the live
  session.
**Verification command.** `grep -rn "hand-label\|hand_label" README.md deliverables/ src/taxonomy.py` — every remaining hit must be accurate given whichever path you choose.
**Done condition.** No document in the repo claims independent human
labelling unless a human actually did it.
**Human action.** Yes — this is the one item in the whole plan that
genuinely requires you personally, if you choose path (a).

---

### F3 — P1 — Two evidence-table rows cite a nonexistent file path
**Problem.** `abandon_signal_threshold` and `abandon_signal_window_days` in
`deliverables/evidence_table.csv` cite `source_file` = `deliverables/decision_framework.json`,
which does not exist. Real file: `data/processed/decision_framework.json`.
**Why it matters.** §6.1: "A number that cannot be traced is treated as
fabricated... we make no distinction between [a model, a report, or a typing
error]." This is a random-sample-catchable error — it was independently
found twice, by two separate reviewers, in two different 5-row samples.
**Prerequisite.** Should be redone AFTER F1 (since F1 rebuilds
`build_deliverables.py`'s outputs anyway) — but is a one-line fix either way,
so do it whenever convenient, before final submission at the latest.
**Files affected.** `src/build_deliverables.py` (two `rows.append(...)` calls
near the end).
**Exact fix.** Change `"deliverables/decision_framework.json (analyst judgement, not code output)"`
to `"data/processed/decision_framework.json"` on both rows; keep the
"analyst judgement, not code output" caveat in the `transformation` column
instead, where it belongs.
**Verification command.** `python3 src/build_deliverables.py && python3 -m unittest tests.test_analysis_outputs -v`
**Done condition.** `ls` on every distinct `source_file` value in
`evidence_table.csv` resolves.

---

### F4 — P1 — Repository is public; brief asks for private
**Problem.** `github.com/iamgoncalo/ver1` is PUBLIC. §11: "a link to a
private repository with access granted."
**Why it matters.** Explicit brief requirement; also means the (currently
fabricated, post-F1 real) case-study material has been publicly exposed.
**Prerequisite.** None.
**Files affected.** None — GitHub setting only.
**Exact fix.** `gh repo edit iamgoncalo/ver1 --visibility private`.
**Verification command.** `gh repo view iamgoncalo/ver1 --json visibility`
**Done condition.** `"visibility":"PRIVATE"`.
**Human action.** This is an account-setting change — I need your explicit
go-ahead before running it, same as when I first flagged it.

---

### F5 — P1 — Q5's "what if you'd used the other source" isn't demonstrable
**Problem.** The brief requires stating what the recommendation would look
like under the other market source; currently that's one prose sentence, not
a re-runnable scenario.
**Why it matters.** §8 live session explicitly rehearses "use the
alternative market estimate" as something you'll be asked to actually do.
**Prerequisite.** F1 (needs the real, corrected market figures first —
building this against synthetic numbers would be wasted work).
**Files affected.** `src/decision_framework.py`, maybe `willingness_to_pay.py`.
**Exact fix.** Add a parameter (CLI flag or function argument) that swaps
which market-growth figure feeds any calculation that depends on it, and
have the script print both verdicts side by side.
**Verification command.** Run the module twice, once per source, diff the
printed verdicts.
**Done condition.** You can, live, in front of an interviewer, flip the
source and show the number move (or explicitly show it does NOT move, with
the code path that proves that rather than a sentence asserting it).

---

### F6 — P2 — Rehearse the rest of the live-session checklist
**Problem.** Not a defect, a readiness check. §8's ten items (explain in 5
min, open raw rows, run each detector, trace numbers, open both Q5 sources,
change a threshold, exclude a product, use the alt estimate, change an
assumption, predict direction first) should each be dry-run once, end to end,
after F1–F5 land.
**Prerequisite.** F1, F2, F3, F5.
**Exact fix.** Not code — a rehearsal pass. No files change unless it
surfaces a new defect, in which case log it as a new Fx item.
**Done condition.** You've personally done all ten once.

---

### Explicitly NOT doing (P4 — do not spend time here)
- Makefile / CI workflow / pyproject / lock file — brief doesn't require
  them, `run_pipeline.sh` already satisfies "one documented command."
- Removing the unused pandas/numpy/scikit-learn pins from `requirements.txt`
  — harmless, already self-disclosed, not worth the churn.
- Closing the taxonomy's 82%→85% self-set agreement gap — that target was
  self-imposed, already honestly reported as missed, and is orthogonal to F2
  (F2 is about the label *source* being illegitimate, not the agreement
  *number* being a few points short).
- Any redesign toward a larger architecture, multi-service system, or
  different toolchain. Out of scope for finishing this specific case study.

---

## Dependency graph
```
F1 (real raw data) ──┬──► F5 (alt-market scenario, needs real F1 numbers)
                      │
F2 (real hand labels) │         (independent of F1, run in parallel)
                      │
F3 (evidence path fix)┤         (independent, trivial, do anytime)
                      │
F4 (repo private)     │         (independent, needs your go-ahead)
                      │
                      └──► F6 (full rehearsal, needs F1/F2/F3/F5 done)
```
