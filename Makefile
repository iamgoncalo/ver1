.PHONY: refresh all test verify app live-check

# refresh: OPTIONAL, network-enabled. Re-streams real source data from
# HuggingFace (McAuley-Lab Amazon-Reviews-2023) and re-fetches/archives the
# real market and trend sources. NEVER used for submission reproduction -
# `all` below is the reproduction path and is offline.
refresh:
	bash run_pipeline.sh

# all: OFFLINE. Uses the already-bundled, filtered real evidence in
# data/real_raw/ only. Regenerates every final analytical output and
# deliverable. Must not touch the network and must not generate or fetch
# synthetic evidence.
all:
	bash run_pipeline.sh --analysis-only

test:
	python3 -m unittest tests.test_real_pipeline -v

verify:
	python3 scripts/verify_submission.py

app:
	python3 -m streamlit run dashboard/app.py --server.headless true

live-check:
	python3 scripts/live_check.py
