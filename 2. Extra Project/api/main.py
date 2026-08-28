"""FastAPI application: serves the real analytical view-models to the React
Innovation Explorer AND the built React static frontend, on ONE port.

Never computes a fact - only reads data/processed/*.json (built by
src/real/*.py) or calls those modules' pure functions directly for
on-demand recomputation (scenario endpoint, evidence trace). No analytical
logic lives in this file.

Run:  python3 -m uvicorn api.main:app --port 8000   (or: make app)
"""
import json
import os
import sys

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROC = os.path.join(ROOT, "data", "processed")
WEB_DIST = os.path.join(ROOT, "web", "dist")

sys.path.insert(0, os.path.join(ROOT, "src"))
sys.path.insert(0, os.path.join(ROOT, "src", "real"))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

app = FastAPI(title="Versuni Innovation Explorer API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def warm_innovations_cache():
    # The default (unfiltered) real scenario computation reclassifies all
    # all real reviews (~2s) - compute()'s own in-process cache means this
    # only ever runs once per server lifetime, so pay that cost here at boot
    # rather than on a real visitor's first page load.
    try:
        from decision_framework_real import compute
        compute()
    except Exception:
        pass  # best-effort warmup only - real failures still surface per-request


def read_json(name):
    path = os.path.join(PROC, name)
    if not os.path.exists(path):
        raise HTTPException(status_code=503, detail="{} not built yet - run `make all`".format(name))
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


@app.get("/api/health")
def health():
    # Release identity: in production the container has no .git, so prefer
    # the deploy platform's commit env var (Railway sets
    # RAILWAY_GIT_COMMIT_SHA) or an explicit RELEASE_SHA; fall back to git
    # only for local dev checkouts.
    commit = (os.environ.get("RAILWAY_GIT_COMMIT_SHA")
              or os.environ.get("RELEASE_SHA"))
    if not commit:
        import subprocess
        try:
            commit = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"],
                                             cwd=ROOT, text=True).strip()
        except Exception:
            commit = "unknown"
    # Real readiness, not a reflexive "ok": the app is only healthy if its
    # required frozen state and the built frontend actually exist.
    required = ["products_real.json", "signals_real.json",
                "decision_framework_real.json", "magic_box_real.json"]
    missing = [n for n in required if not os.path.exists(os.path.join(PROC, n))]
    web_ok = os.path.exists(os.path.join(WEB_DIST, "index.html"))
    ready = not missing and web_ok
    return {"status": "ok" if ready else "degraded",
            "commit": commit[:12],
            "data_ready": not missing,
            "missing_data": missing,
            "frontend_built": web_ok}


@app.get("/api/products")
def products():
    return read_json("products_real.json")


@app.get("/api/signals")
def signals():
    return read_json("signals_real.json")


@app.get("/api/economics")
def economics():
    return read_json("economics_real.json")


@app.get("/api/assumptions")
def assumptions():
    return read_json("category_assumptions.json")


@app.get("/api/critic")
def critic():
    return read_json("critic_real.json")


@app.get("/api/criteria")
def criteria():
    return read_json("criteria_real.json")


@app.get("/api/intelligence-fabric")
def intelligence_fabric():
    """The canonical normalized model (DATA_FABRIC.md) - sources,
    documents, evidence_objects, clusters, labels, lineage_edges. Read by
    /api/funnel; exposed directly here for inspection. Not yet wired into
    any world's UI - out of scope for this task (STOP after the fabric
    works; UI integration beyond the funnel is a subsequent task)."""
    return read_json("intelligence_fabric.json")


@app.get("/api/research/candidates")
def research_candidates():
    """Live-discovered research documents with status=CANDIDATE - never
    silently promoted into the accepted, reproducible corpus
    (research_index.json). See src/real/research_discovery_real.py."""
    return read_json("research_candidates.json")


@app.get("/api/funnel")
def funnel():
    """The canonical Innovation Funnel Machine state - PRODUCTS + SIGNALS +
    COMPETITORS -> MAGIC BOX / PATTERN INTELLIGENCE -> CRITERIA ->
    INNOVATIONS -> CRITIC -> FINALISTS. Recomputed live on every request
    from already-real files (src/real/funnel_real.py) - never cached
    stale, never hardcoded."""
    import funnel_real
    return funnel_real.build()


@app.get("/api/sources")
def sources():
    return read_json("sources_real.json")


@app.get("/api/how-we-got-here")
def how_we_got_here():
    """Aggregates ALREADY-COMPUTED real counts from the other endpoints'
    underlying files into one funnel - no new analysis happens here, no
    count is invented or hardcoded as an example. If a file is missing,
    that stage is honestly reported as unavailable rather than guessed."""
    def count_of(name, path_in_doc=None):
        try:
            doc = read_json(name)
        except HTTPException:
            return None
        if path_in_doc is None:
            return doc
        for key in path_in_doc:
            doc = doc[key]
        return doc

    reviews_manifest = count_of("products_real.json")
    signals = count_of("signals_real.json")
    research = count_of("research_index.json")
    tensions = count_of("research_tensions.json")
    rivals = count_of("rivals_real.json")
    white_space = count_of("white_space_real.json")
    magic_box = count_of("magic_box_real.json")
    assumptions = count_of("category_assumptions.json")
    decision = count_of("decision_framework_real.json")

    try:
        with open(os.path.join(ROOT, "data", "visual", "product_images.json"), encoding="utf-8") as fh:
            official_products = json.load(fh)
    except FileNotFoundError:
        official_products = None

    stages = [
        {"id": "reviews", "label": "Real consumer reviews", "count": sum(p["n_real_reviews_in_corpus"] for p in reviews_manifest["products"]) if reviews_manifest else None},
        {"id": "products", "label": "Real hand-validated products (Amazon corpus)", "count": len(reviews_manifest["products"]) if reviews_manifest else None},
        {"id": "signals", "label": "Signals derived", "count": signals["count"] if signals else None},
        {"id": "research", "label": "Verified research documents", "count": research["corpus_size"] if research else None},
        {"id": "tensions", "label": "Evidence-grounded tensions", "count": len(tensions["tensions"]) if tensions else None},
        {"id": "official_products", "label": "Verified official Versuni/Philips products", "count": len(official_products["products"]) if official_products else None},
        {"id": "assumptions", "label": "Category assumptions mapped", "count": len(assumptions["assumptions"]) if assumptions else None},
        {"id": "rivals", "label": "Real competitor brands analysed", "count": len(rivals["rivals"]) if rivals else None},
        {"id": "white_space", "label": "Real white-space opportunities", "count": sum(1 for s in white_space["spaces"] if s["is_white_space"]) if white_space else None},
        {"id": "possibilities_generated", "label": "Possibilities generated (Magic Box)", "count": magic_box["funnel"][0]["count"] if magic_box else None},
        {"id": "possibilities_finalists", "label": "Finalists surviving gate→evidence→dominance", "count": len(magic_box["finalists"]) if magic_box else None},
        {"id": "possibilities_rejected", "label": "Rejected candidates", "count": len(magic_box["graveyard"]) if magic_box else None},
        {"id": "bet", "label": "Final bet", "count": 1 if decision else None},
    ]
    return {
        "_provenance": "Every count here is read live from the same processed files the rest of the app reads - "
                       "nothing is a hardcoded example. A null count means that stage's source file was not "
                       "available when this was computed, reported honestly rather than guessed.",
        "stages": stages,
        "bet_name": decision["verdict"]["recommended_name"] if decision else None,
    }


@app.get("/api/consumer-corpus")
def consumer_corpus():
    """Exact provenance of the consumer evidence - assembled from the
    already-generated manifest + Q2 defect report, never recomputed here."""
    with open(os.path.join(ROOT, "data", "manifest.json"), encoding="utf-8") as fh:
        manifest = json.load(fh)
    with open(os.path.join(PROC, "defect_detection_report_real.json"), encoding="utf-8") as fh:
        dq = json.load(fh)
    f = next(x for x in manifest["files"] if x["filename"] == "consumer_reviews.csv")
    return {
        "source": f["origin"].get("described_as"),
        "source_url": f["origin"].get("url") or f["origin"].get("source_url"),
        "retrieved_at": f["retrieved_at"],
        "market": "Amazon.com (US marketplace)",
        "records_normalized": f["record_count"],
        "records_after_dq": dq["output_rows"],
        "quarantined_rating_conflicts": dq["defects_found"]["sentiment_rating_conflict"]["count"],
        "removed_empty_text": dq["defects_found"]["empty_or_trivial_text"]["count"],
        "distinct_products": f["origin"].get("distinct_real_products") or f.get("distinct_real_products"),
        "who_is_missing": f.get("who_is_missing"),
        "sha256": f["sha256"],
    }


@app.get("/api/product-images")
def product_images():
    path = os.path.join(ROOT, "data", "visual", "product_images.json")
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


@app.get("/api/research")
def research_index():
    return read_json("research_index.json")


@app.get("/api/research/evidence")
def research_evidence():
    return read_json("evidence_cards.json")


@app.get("/api/research/tensions")
def research_tensions():
    return read_json("research_tensions.json")


@app.get("/api/research/clusters")
def research_clusters():
    return read_json("research_clusters.json")


@app.get("/api/market")
def market_metrics():
    path = os.path.join(ROOT, "data", "raw", "market_metrics.json")
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


@app.get("/api/trends")
def trend_corpus():
    """Industry/regulatory/technical/manufacturer documents - explicitly
    NOT search-interest data (see /api/sources for Google Trends'
    honest NOT_IMPLEMENTED status)."""
    path = os.path.join(ROOT, "data", "raw", "trend_corpus.json")
    with open(path, encoding="utf-8") as fh:
        doc = json.load(fh)
    from research_corpus_real import PROMOTED_TREND_IDS
    doc["articles"] = [a for a in doc["articles"] if a["article_id"] not in PROMOTED_TREND_IDS]
    doc["article_count"] = len(doc["articles"])
    return doc


@app.get("/api/rivals")
def rivals():
    return read_json("rivals_real.json")


@app.get("/api/white-space")
def white_space():
    return read_json("white_space_real.json")


@app.get("/api/magic-box")
def magic_box():
    return read_json("magic_box_real.json")


@app.get("/api/innovations")
def innovations():
    return read_json("decision_framework_real.json")


@app.get("/api/innovations/scenario")
def innovations_scenario(market_scenario: str = "mordor",
                         decision_priority: str = "pain_feasibility_majority"):
    """Live recompute - pure function, no file write. Powers the dynamic
    decision UI (World 5). Never mutates data/raw or data/processed."""
    from decision_framework_real import compute
    try:
        return compute(market_scenario, decision_priority=decision_priority)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/evidence/trace/{claim_id}")
def evidence_trace(claim_id: str):
    import trace_claim as tc
    try:
        return tc.trace(claim_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="no such claim_id")


@app.get("/api/evidence/table")
def evidence_table():
    import csv
    path = os.path.join(ROOT, "deliverables", "evidence_table.csv")
    with open(path, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


@app.get("/api/system-health")
def system_health():
    import subprocess
    try:
        commit = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"],
                                         cwd=ROOT, text=True).strip()
    except Exception:
        commit = "unknown"
    try:
        with open(os.path.join(ROOT, "data", "manifest.json"), encoding="utf-8") as fh:
            manifest = json.load(fh)
    except FileNotFoundError:
        manifest = {}
    hand_labels_path = os.path.join(ROOT, "data", "manual", "hand_labels.csv")
    n_labelled = 0
    if os.path.exists(hand_labels_path):
        import csv
        with open(hand_labels_path, newline="", encoding="utf-8") as fh:
            n_labelled = sum(1 for r in csv.DictReader(fh) if r.get("human_label", "").strip())
    synthetic_count = 1 if manifest.get("_synthetic") else 0
    return {
        "commit": commit,
        "synthetic_evidence_count": synthetic_count,
        "human_labels": {"done": n_labelled, "target": 50},
        "real_reviews": manifest.get("files", [{}])[0].get("record_count"),
        "real_products": manifest.get("files", [{}])[0].get("distinct_real_products"),
    }


# ---------------------------------------------------------------- static UI
# Serves the Vite production build (web/dist) so the whole experience lives
# on one port. If the frontend hasn't been built yet, /api/* still works -
# only the UI itself is unavailable, with a clear message instead of a
# silent 404.
if os.path.isdir(WEB_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(WEB_DIST, "assets")), name="assets")
    app.mount("/brand", StaticFiles(directory=os.path.join(WEB_DIST, "brand")), name="brand")
    app.mount("/products", StaticFiles(directory=os.path.join(WEB_DIST, "products")), name="products")

    # A plain StaticFiles mount would leave the browser/OS default to decide
    # download vs. inline view - some browsers are configured to always
    # download PDFs. Explicit inline Content-Disposition means clicking a
    # disclosure link opens it to read first; the reader can still save it
    # from their PDF viewer if they want a copy.
    INNOVATION_DISCLOSURES_DIR = os.path.join(WEB_DIST, "innovation-disclosures")

    @app.get("/innovation-disclosures/{filename}")
    def innovation_disclosure(filename: str):
        if not filename.endswith(".pdf") or "/" in filename or ".." in filename:
            raise HTTPException(status_code=404, detail="not found")
        path = os.path.join(INNOVATION_DISCLOSURES_DIR, filename)
        if not os.path.isfile(path):
            raise HTTPException(status_code=404, detail="not found")
        return FileResponse(path, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{filename}"'})

    # The Versuni Products catalog (a separate, independently-built Vite app,
    # committed as a built artifact under web/public/verinfo) is served from
    # this same origin/port too, so "VERSUNI PRODUCTS" in the header is a
    # same-tab, same-origin link with no external dependency at runtime.
    verinfo_dir = os.path.join(WEB_DIST, "verinfo")
    if os.path.isdir(verinfo_dir):
        app.mount("/verinfo", StaticFiles(directory=verinfo_dir, html=True), name="verinfo")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        index = os.path.join(WEB_DIST, "index.html")
        # index.html has no content hash in its filename (unlike /assets/*),
        # so a browser cache would otherwise keep serving a stale shell -
        # with a stale <script src> - after every rebuild. Always revalidate.
        return FileResponse(index, headers={"Cache-Control": "no-cache"})
else:
    @app.get("/")
    def not_built():
        return {"error": "web/dist not built yet. Run: cd web && npm install && npm run build"}
