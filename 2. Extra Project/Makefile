.PHONY: refresh all test verify app app-dev analyst live-check webbuild refresh-intelligence intelligence-watch

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
	python3 -m unittest tests.test_real_pipeline tests.test_dynamic_winner tests.test_research_corpus -v

verify:
	python3 scripts/verify_submission.py

# app: the primary V1 Innovation Explorer (five-world React UI + real API),
# served on ONE port. Builds the frontend first if needed.
webbuild:
	cd web && npm run build

app: webbuild
	python3 -m uvicorn api.main:app --port 8000

# app-dev: frontend dev server with hot reload (proxies /api to :8000).
# Run `python3 -m uvicorn api.main:app --port 8000` in a second terminal.
app-dev:
	cd web && npm run dev

# analyst: the secondary Analyst Mode control room (Streamlit).
analyst:
	python3 -m streamlit run dashboard/app.py --server.headless true

live-check:
	python3 scripts/live_check.py

# refresh-intelligence: DISCOVER -> FETCH -> NORMALIZE -> DEDUPLICATE ->
# QUALITY FILTER -> DIFF -> CLUSTER -> PATTERN DETECTION -> CANDIDATE
# SNAPSHOT -> FUNNEL UPDATE -> RUN MANIFEST (DATA_FABRIC.md). Network-
# enabled (real PubMed/Crossref/Semantic Scholar public APIs, no API key).
# Never writes to the accepted, reproducible research corpus - discovered
# items land in data/processed/research_candidates.json as CANDIDATE only.
# Safe to run repeatedly: real dedup means an unchanged external database
# state produces 0 new candidates on rerun.
refresh-intelligence:
	python3 src/real/research_discovery_real.py
	python3 src/real/intelligence_fabric.py
	python3 src/real/funnel_real.py

# intelligence-watch: restart-safe continuous refresh loop. Interval is
# configurable via INTELLIGENCE_WATCH_INTERVAL_SECONDS (default 3600s) -
# never baked into domain logic. Ctrl-C or `kill` stops it cleanly between
# iterations; each iteration is a complete, idempotent refresh-intelligence
# run, so restarting after a stop never duplicates or corrupts state.
intelligence-watch:
	@interval=$${INTELLIGENCE_WATCH_INTERVAL_SECONDS:-3600}; \
	echo "intelligence-watch: refreshing every $${interval}s (Ctrl-C to stop)"; \
	while true; do \
		date -u +"[%Y-%m-%dT%H:%M:%SZ] refresh-intelligence starting"; \
		$(MAKE) refresh-intelligence || echo "refresh-intelligence failed this cycle - will retry next interval"; \
		sleep $${interval}; \
	done

final-check:
	python3 scripts/final_check.py
