# Versuni Intelligence Machine — Case Study

Innovation AI Expert (Data Science & Consumer Insights) exercise. Category:
**Connected Air Treatment (Smart Home)**. All evidence is **real**: 10,547
real Amazon reviews for 237 hand-validated real air purifier products, two
real market-research sources, twelve real trend documents. One command
reproduces every figure in the deliverables:

```bash
bash run_pipeline.sh              # full run: re-fetches real source data (~15-20 min)
bash run_pipeline.sh --analysis-only   # fast: reuses the already-bundled filtered real data
```

Everything is Python 3.9+ standard library plus `curl` for data acquisition
— no paid tools, no specialised hardware (`requirements.txt` pins
pandas/numpy/scikit-learn per an earlier instruction in this repair; they
are not currently imported anywhere in `src/`).

**This is a repair of an earlier, fully synthetic version of this project.**
An internal audit (`AUDIT_CURRENT_PROJECT.md`) found that the original raw
data was entirely fabricated and that a "hand-labelled" Q3 validation sample
had actually been AI-authored rather than human-labelled — both violations
of the brief's core requirements. `FINISH_PLAN.md` is the repair plan that
was executed; the original synthetic engineering demo is preserved, clearly
isolated, in `tests/synthetic_fixtures/` and is never used as submission
evidence.

## Start here

- **[deliverables/insight_pack.md](deliverables/insight_pack.md)** — the
  recommendation, 5 slides, for a leadership audience.
- **[deliverables/technical_note.md](deliverables/technical_note.md)** —
  method, assumptions, limitations, what was cut. Max 2 pages.
- **[deliverables/evidence_table.csv](deliverables/evidence_table.csv)** —
  every number in the two documents above, traced to its exact source
  location and code line. Checked by `tests/test_real_pipeline.py`.
- **[deliverables/data_quality_report.md](deliverables/data_quality_report.md)**
  — the Q2 write-up: real defects found, how, and their quantified cost.
- **[deliverables/ai_use_log.md](deliverables/ai_use_log.md)** — including
  the self-caught misrepresentation that triggered this repair.
- **[AUDIT_CURRENT_PROJECT.md](AUDIT_CURRENT_PROJECT.md)** /
  **[FINISH_PLAN.md](FINISH_PLAN.md)** — the audit and repair plan.
- **[LIVE_REHEARSAL.md](LIVE_REHEARSAL.md)** — tested commands for every
  item in the brief's §8 live-session checklist.

## Architecture

```
data/
  raw/                            REAL data, individually verified, immutable
    consumer_reviews.csv          10,547 real Amazon reviews, 237 real products
    market_metrics.json           2 real, archived, disagreeing CAGR sources (Q5)
    trend_corpus.json             12 real, archived trend/tech/regulatory documents
  manifest.json                   real origin, real counts, SHA-256 per raw file
  hand_label_sample_BLANK.csv     50 real reviews, hand_label column BLANK -
                                   HUMAN_ACTION_REQUIRED before Q3 validation
  real_raw/                       archived source material
    purifier_products_frozen.jsonl        237 real, manually-validated products
    market_sources/*.html                 archived Mordor Intelligence + IMARC pages
    trend_sources/*.html,*.pdf            archived real trend documents
    reviews_appliances.jsonl, reviews_hk.jsonl   filtered real review exports
  processed/                      written by the real pipeline, never hand-edited
    reviews_clean_real.csv, defect_detection_report_real.json
    taxonomy_themes_real.json, review_themes_real.csv
    wtp_real.json, decision_framework_real.json

src/
  config.py, lexicon.py           shared constants + sentiment lexicon (real + fixture)
  real/                           the REAL pipeline (see below)

tests/
  test_real_pipeline.py           real raw-layer checks, Q2-Q6 sanity, evidence
                                   traceability, Q5 market-scenario invariance
  synthetic_fixtures/             the ORIGINAL synthetic engineering demo, isolated
                                   and labelled - never used as submission evidence
                                   (see tests/synthetic_fixtures/README.md)
```

### `src/real/` pipeline, in order
```
filter_purifier_products.py    stream-filter Amazon category metadata for real
                                purifier products (first pass)
reclassify_purifiers.py        title-only, regex-tightened second pass -
                                106->227 candidates after manual inspection
                                caught real false positives (vacuums, wearables)
filter_reviews_by_asin.py      stream-filter the ~886MB/~31GB real review
                                exports against the frozen 237-product allowlist
build_reviews_csv.py           join reviews + real product metadata -> raw CSV
build_market_metrics.py        2 real, archived Q5 sources
build_trend_corpus.py          12 real, archived trend documents
build_manifest_real.py         real manifest with SHA-256 checksums
detect_defects_real.py         Q2 - real defects found (not planted)
taxonomy_real.py               Q3 - real bottom-up theme induction + classification;
                                --emit-sample writes the BLANK hand-label file
wtp_real.py                    Q4 - honest "no direct WTP" + real price exposure
decision_framework_real.py     Q6 - real Pareto scoring; --market-scenario=imarc
                                for the Q5 sensitivity re-run
build_evidence_table_real.py   writes evidence_table.csv from data/processed/*.json
```

**Read/write contract.** `data/raw/` is written once and never edited
afterward — the manifest's SHA-256 per file is the checksum gate.

## What "reproducible" means here, precisely
The two upstream McAuley-Lab source files (Amazon-Reviews-2023, Appliances +
Home_and_Kitchen categories) are **not** bundled — they total ~32GB and are
hosted on HuggingFace, per the brief's own guidance for sources that can't be
redistributed ("ship the fetching script and the manifest entry instead",
§3.5). What **is** bundled is the already-filtered, purifier-only subset
(`data/real_raw/reviews_*.jsonl`, a few thousand rows) that
`data/raw/consumer_reviews.csv` is actually built from — so
`bash run_pipeline.sh --analysis-only` reproduces every deliverable number
with **no network access** at all. `bash run_pipeline.sh` (no flag) re-runs
the full real acquisition from scratch, including a live 31GB network
stream, and was run successfully once during this repair (see
`data/real_raw/reviews_hk.log`).

## Live follow-up session preparation
See [LIVE_REHEARSAL.md](LIVE_REHEARSAL.md) for tested, copy-pasteable
commands for every item in the brief's §8 checklist (open raw rows, run each
detector, trace a number, open both Q5 sources, change a threshold, exclude
a product, switch market scenario, change an assumption, predict direction
first).

**Outstanding before the session:** `data/hand_label_sample_BLANK.csv`
needs Gonçalo's real hand labels — Q3's automated-vs-human agreement cannot
be reported honestly until a human completes it. This is stated as a real
blocker, not smoothed over; `python3 src/real/taxonomy_real.py` reports
`HUMAN_ACTION_REQUIRED` until it is.

## Reproducibility
14/14 tests pass (`tests/test_real_pipeline.py`), including a 10-row random
evidence-trace check and a live Q5 market-scenario invariance check (the
Q6 verdict is identical whether the primary 5.37% or alternative 6.54% CAGR
is used, because the Financial Value Proxy is built from review-level price
exposure, not category CAGR).
