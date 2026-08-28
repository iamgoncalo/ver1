# Synthetic test fixtures — NOT submission evidence

Everything under this directory is the ORIGINAL synthetic-data engineering
pass on this project: fabricated reviews, fabricated market figures, a
fabricated trend corpus, and the analysis code written against them. It is
preserved here, isolated and clearly labelled, for exactly one reason: it is
a working demonstration of the pipeline architecture (defect detection,
taxonomy induction, WTP proxying, decision scoring) that the REAL pipeline in
`src/real/` and `data/raw/` was rebuilt from, and it remains useful as an
engineering unit-test fixture with a known, deterministic answer key
(`data/defect_ground_truth_SYNTHETIC_TEST_FIXTURE.json`) for regression-testing
detector logic in isolation from real-data noise.

**It must never be read as, or presented as, the Versuni case-study
submission.** No number in `deliverables/` is sourced from anything in this
directory. `data/raw/` contains only real, individually-verified evidence —
see `02_Data/data_manifest.csv` (provenance for every raw input) and this
directory's own quarantine described above for why this separation exists.

To run the synthetic demo in isolation (for engineering-test purposes only):
```
python3 tests/synthetic_fixtures/src/run_setup_SYNTHETIC_TEST_FIXTURE.py
python3 tests/synthetic_fixtures/src/run_analysis_SYNTHETIC_TEST_FIXTURE.py
python3 -m unittest tests.synthetic_fixtures.test_raw_integrity_SYNTHETIC -v
python3 -m unittest tests.synthetic_fixtures.test_analysis_outputs_SYNTHETIC -v
```
This writes into the same `data/raw/` and `data/processed/` paths the real
pipeline uses — running it will overwrite the real submission data. Do not
run it as part of `bash run_pipeline.sh`, and re-run the real pipeline
afterward if you ever do run it by hand.
