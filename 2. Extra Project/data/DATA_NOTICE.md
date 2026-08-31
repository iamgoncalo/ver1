# Data notice — consumer review corpus

The consumer evidence in this repository is a filtered subset (air-purifier
products, plus a separately-filtered floor-care subset acquired the same
way for the category-generalization proof) of the McAuley-Lab
**Amazon-Reviews-2023** dataset
(https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023), which its
maintainers publish for research use. This repository does **not** assert any
licence beyond what the dataset card grants: the subset is included solely so
the case study reproduces offline, with full attribution, and the complete
re-fetch path (`run_pipeline.sh`, stages 1–4) is provided as the primary,
brief-compliant acquisition route. If the dataset maintainers object to the
bundled subset, it will be removed and the fetch-script route becomes the
only path.

Reviewer identity: the dataset's pseudonymous `user_id` is used transiently
during ingestion (cross-variant deduplication) and ships in the analytical
CSVs only as a one-way SHA-256 hash (`reviewer_hash`).

Floor Care large-file note: the raw floor-care review stream (226MB) and its
clean CSV (160MB) exceed repository size limits and are NOT bundled - the
stream scripts in run_pipeline.sh / src/real/filter_floor_care_products.py /
freeze_floor_care_products.py are the acquisition route, and the category
state reports recorded run-ledger counts flagged store_bundled:false when
the files are absent.
