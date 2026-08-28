# Synthetic contamination sentinel — TEST ONLY, never submission evidence

This directory holds exactly one synthetic artifact and its constants:

- `src/generate_reviews_SYNTHETIC_TEST_FIXTURE.py` — the original synthetic
  review generator, kept as a **contamination sentinel**: its template pool
  is the known corpus of fabricated review text that
  `tests/test_real_pipeline.py::test_no_production_data_file_contains_synthetic_fixture_text`
  scans every production data file against. It is never executed by the
  pipeline; it exists only to be read by that test.
- `src/config_SYNTHETIC_TEST_FIXTURE.py` — the constants that generator
  imports.

The rest of the historical synthetic project (generators for market
metrics, trend corpus, signals; a synthetic decision framework, taxonomy,
WTP; its own test files and answer key) was deleted — a reviewer opening
the official submission should not encounter an obsolete synthetic version
of the entire analysis. Git history preserves it.

Nothing here is submission evidence. No number in `deliverables/` derives
from this directory, and `scripts/verify_submission.py` fails any
evidence-table row whose source path points into it.
