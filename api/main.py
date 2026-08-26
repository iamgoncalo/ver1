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


def read_json(name):
    path = os.path.join(PROC, name)
    if not os.path.exists(path):
        raise HTTPException(status_code=503, detail="{} not built yet - run `make all`".format(name))
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


@app.get("/api/health")
def health():
    import subprocess
    try:
        commit = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"],
                                         cwd=ROOT, text=True).strip()
    except Exception:
        commit = "unknown"
    return {"status": "ok", "commit": commit}


@app.get("/api/products")
def products():
    return read_json("products_real.json")


@app.get("/api/signals")
def signals():
    return read_json("signals_real.json")


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

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        index = os.path.join(WEB_DIST, "index.html")
        return FileResponse(index)
else:
    @app.get("/")
    def not_built():
        return {"error": "web/dist not built yet. Run: cd web && npm install && npm run build"}
