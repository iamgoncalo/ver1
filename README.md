# Connected Air Treatment — Versuni Disruptive Innovation Case Study

Innovation AI Expert (Data Science & Consumer Insights) exercise. Category:
**Connected Air Treatment (Smart Home)**. One command reproduces every number
in the deliverables from raw data:

```bash
bash run_pipeline.sh
```

That single script: (re)generates the raw layer with a fixed seed, runs
defect detection, taxonomy extraction, the WTP proxy, decision scoring, and
the evidence table, then runs the full test suite. Everything is Python 3.9+
standard library — no network access, no paid tools, no specialised hardware
required (`requirements.txt` pins pandas/numpy/scikit-learn as requested;
they are not currently imported by anything in `src/` — see the comment at
the top of that file).

## Start here

- **[deliverables/insight_pack.md](deliverables/insight_pack.md)** — the
  recommendation, 5 slides, for a leadership audience.
- **[deliverables/technical_note.md](deliverables/technical_note.md)** —
  method, assumptions, limitations, what was cut. Max 2 pages.
- **[deliverables/evidence_table.csv](deliverables/evidence_table.csv)** —
  every number in the two documents above, traced to its exact source
  location, transformation, and code line. Machine-readable, checked by
  `tests/test_analysis_outputs.py::TestEvidenceTable`.
- **[deliverables/data_quality_report.md](deliverables/data_quality_report.md)**
  — the Q2 write-up: what was found, how, and the quantified cost of missing it.
- **[deliverables/ai_use_log.md](deliverables/ai_use_log.md)** — two rejected
  AI-drafted suggestions and one check that failed against the data.

## Architecture

```
data/
  raw/                  synthetic fixtures, generated with random_state=42, immutable
    consumer_reviews.csv        3,500 reviews, 3 planted defects (Q2)
    market_metrics.json         2 conflicting CAGR sources (Q5)
    trend_corpus.json           15-document trend/tech corpus metadata
    aftermarket_signals.csv     9-SKU filter behaviour (Q4 proxy input)
  manifest.json          origin, counts, SHA-256 per raw file
  hand_labeled_sample.csv       50 reviews, hand-labelled against a written
                                 codebook BEFORE any automated label was run (Q3)
  processed/              written by the pipeline, never hand-edited
    reviews_clean.csv           burst removed, conflicts quarantined
    defect_detection_report.json
    review_themes.csv, taxonomy_themes.json
    wtp_proxy.json
    decision_framework.json

src/
  config.py                     seed, category constants, the 3 fixed Q1 measures
  lexicon.py                    sentiment terms + the 6 induced friction themes
  generate_*.py                 raw layer generators (run via run_setup.py)
  detect_defects.py             Q2 — blind detection, then scored vs. ground truth
  taxonomy.py                   Q3 — bottom-up theme induction + classification
  willingness_to_pay.py         Q4 — behavioural WTP proxy, named as a proxy
  decision_framework.py         Q6 — score 3 opportunity spaces, recommend + kill
  build_deliverables.py         writes evidence_table.csv from data/processed/*.json
  run_setup.py / run_analysis.py / run_pipeline.sh   orchestration, in that order

tests/
  test_raw_integrity.py         raw layer: structure, checksums, the 3 planted defects
  test_analysis_outputs.py      processed layer: detection recall, taxonomy sanity,
                                 WTP proxy scope, decision-framework verdict, and a
                                 direct check that every insight_pack.md number has
                                 an evidence_table.csv row
  fixtures/defect_ground_truth.json   answer key for Q2 — opened only to SCORE
                                       detectors, never to tune them
```

**Read/write contract.** `data/raw/` is written once, by the generators, and
never edited afterward — the manifest's SHA-256 per file is the checksum gate
that proves it. Everything downstream reads raw, writes to `data/processed/`,
and is fully re-derivable by re-running `run_pipeline.sh`.

**Why the raw data is synthetic.** No licensed panel or scrape was available
inside this exercise's constraints (public material only, low volume, no
paywall circumvention). All three "real consumer data" defects in Q2 (burst,
sentiment conflict, malformed dates) are deliberately planted so their
detection code can be exercised and scored against a known answer key — see
`tests/fixtures/defect_ground_truth.json` and
`deliverables/data_quality_report.md` for what that trade-off costs the
submission and what would change with a real feed.

## Live follow-up session preparation

The brief specifies a 60-minute screen-shared session: 5 min recommendation
(no slides), 25 min live code changes, 10 min tracing claims to raw data, 15
min a new-information stress test, 5 min AI-use log discussion. To be ready:

- **Environment.** `bash run_pipeline.sh` runs clean from this checkout with
  no setup beyond Python 3.9+ — confirmed by deleting `data/raw/` and
  `data/processed/` and re-running from scratch immediately before this
  commit (30/30 tests pass; hero-SKU rating delta, defect counts, and every
  evidence-table row reproduce byte-for-byte because `random_state=42` is
  fixed everywhere it's used).
- **Tracing a claim.** Any number in `deliverables/insight_pack.md` →
  `deliverables/evidence_table.csv` (`claim_id` → `source_location` →
  `code_reference`) → the actual JSON key in `data/processed/*.json` → the
  function and line in `src/` that produced it. Practiced end to end on 5
  randomly sampled rows before this commit; all 5 traced cleanly.
- **Opening the defects.** `python3 src/detect_defects.py` re-runs detection
  standalone and prints the volume-anomaly evidence (108x VS-AP-8000i's own
  daily median on 2026-03-16) and precision/recall per defect live.
  `data/processed/reviews_clean.csv` has the row-level `rating_trusted` /
  `date_parseable` flags to open directly.
- **Opening the Q5 disagreement.** Both sources are in
  `data/raw/market_metrics.json` (`sources[0]`/`sources[1]`), with the
  `reconciliation.divergence_axes` block showing the scope-by-scope bridge
  from 5.8% to 11.2%.
- **A change to predict before running.** The most legible live-edit target
  is `src/taxonomy.py`'s theme keyword lists (`src/lexicon.py::THEMES`) or the
  sentiment-conflict thresholds in `src/detect_defects.py` — both are single,
  well-isolated dictionaries/constants whose effect on `friction_prevalence_pct`,
  `csat_impact`, or defect-recall is predictable and immediately re-checkable
  by re-running the relevant module alone.
- **New information.** The recommendation's stated single point of failure
  (insight_pack Slide 5) is the equal-EUR-per-affected-unit assumption behind
  the Financial Value Proxy — the fastest lever to pull if new evidence
  arrives is `src/decision_framework.py::financial_proxy`.

## Reproducibility

Every random draw is seeded via `config.RANDOM_STATE = 42`
(`src/config.py`). Re-running `bash run_pipeline.sh` on a clean checkout
reproduces byte-identical raw files (verified by SHA-256 in
`data/manifest.json`) and identical figures throughout `data/processed/` and
`deliverables/evidence_table.csv`.
