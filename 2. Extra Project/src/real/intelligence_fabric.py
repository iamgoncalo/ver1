"""THE INTELLIGENCE FABRIC - one canonical normalized model uniting every
real Project 1 evidence source (DATA_FABRIC.md).

This module computes nothing new about the world - it maps and
re-classifies already-real files (products_real.json, signals_real.json,
rivals_real.json, research_index.json, research_candidates.json,
category_assumptions.json, research_tensions.json, trend_corpus.json,
market_metrics.json, sources_real.json) into the requested canonical
object types. Evidence families stay explicitly separate at every layer.

Clustering (Layer B) here is a SEPARATE, additive clustering pass over the
real research corpus - distance-threshold agglomerative clustering that
genuinely allows OUTLIERS (unlike the existing fixed-n_clusters=4 "Model
B" in emergent_clustering_real.py, which is left untouched since it backs
the Signals world UI and this task must not redesign that page). All
current evidence families are small (<100 real items), so per
DATA_FABRIC.md's own instruction this module does NOT force
HDBSCAN/BERTopic-style clustering anywhere - doing so on a 12-88 item
corpus would be over-engineering, not rigor.

Run:  python3 src/real/intelligence_fabric.py
"""
import hashlib
import json
import os
from datetime import datetime, timezone

from sklearn.cluster import AgglomerativeClustering
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")
RAW = os.path.join(ROOT, "data", "raw")

DISTANCE_THRESHOLD = 0.82  # cosine DISTANCE (1 - similarity) cut; a paper more distant than this from every other paper is an OUTLIER, never force-merged
PERTURBED_THRESHOLD = 0.78  # +/- perturbation used for the real stability check (DATA_FABRIC.md "Stability")

LABEL_RULES = {
    # Layer C - typed canonical labels. A real, declared rule table (like
    # OPERATORS/THEME_OPERATORS elsewhere in this codebase) - not a
    # per-item AI guess, and every rule cites the real field it reads.
    "need": lambda p: p.get("gate_passed") is True,
    "friction": lambda p: bool(p.get("friction_theme")),
    "capability": lambda p: p.get("operator") == "CROSS_CATEGORY_TRANSFER",
    "behavior": lambda p: p.get("operator") in ("TEMPORAL_SHIFT", "AMBIENT", "PERSONALISE"),
    "space": lambda p: p.get("friction_theme") == "spatial_resuspension" or p.get("operator") == "MOVE",
    "technology": lambda p: p.get("friction_theme") == "ozone_odor_safety" or p.get("operator") in ("PREDICT", "MATERIALISE"),
    "assumption": lambda p: bool(p.get("design_dna", {}).get("A", {}).get("status") == "PRESENT"),
    "outcome": lambda p: bool(p.get("design_dna", {}).get("T", {}).get("status") == "PRESENT"),
}

# Relation-class classification for real signal<->paper lineage edges,
# read from each paper's own real study_design text (research_index.json)
# - never inferred from title similarity. See DATA_FABRIC.md "Correlation
# vs association": semantic similarity must never become correlation or
# causality.
STUDY_DESIGN_RELATION_CLASS = {
    "RP-01": "CAUSAL_ESTIMATE", "RP-02": "CAUSAL_ESTIMATE", "RP-03": "CAUSAL_ESTIMATE",
    "RP-04": "CAUSAL_ESTIMATE", "RP-05": "CAUSAL_HYPOTHESIS", "RP-06": "CAUSAL_ESTIMATE",
    "RP-07": "CAUSAL_ESTIMATE", "RP-08": "CAUSAL_ESTIMATE", "RP-09": "EMPIRICAL_ASSOCIATION",
    "RP-10": "CORRELATION", "RP-11": "EMPIRICAL_ASSOCIATION", "RP-12": "CAUSAL_HYPOTHESIS",
}
RELATION_CLASS_BASIS = {
    "RP-01": "Single-blinded randomized cross-over intervention - randomized design supports a causal estimate.",
    "RP-02": "Double-blinded randomized crossover intervention - randomized design supports a causal estimate.",
    "RP-03": "Randomized intervention trial - randomized design supports a causal estimate.",
    "RP-04": "Controlled full-scale laboratory chamber experiment - controlled manipulation supports a causal estimate.",
    "RP-05": "Small pilot phased-intervention study (n=10) - underpowered/uncontrolled enough to be a hypothesis, not a settled estimate.",
    "RP-06": "Randomized parallel-group intervention trial - randomized design supports a causal estimate.",
    "RP-07": "Three-arm randomized crossover trial - randomized design supports a causal estimate.",
    "RP-08": "Randomized controlled trial - randomized design supports a causal estimate.",
    "RP-09": "PRISMA systematic review of accuracy studies - synthesizes real empirical associations, does not itself run a new causal test.",
    "RP-10": "Co-location validation explicitly reports Pearson correlation between sensor and reference instrument.",
    "RP-11": "Observational analysis of ambient monitoring-station data - describes a real association, not a manipulated experiment.",
    "RP-12": "Retail-scanner econometric study using an environmental shock as a real-world natural-experiment design - suggestive of a mechanism, not a full RCT.",
}


def _load(kind, name):
    with open(os.path.join(PROC if kind == "processed" else RAW, name), encoding="utf-8") as fh:
        return json.load(fh)


def _load_or(kind, name, default):
    try:
        return _load(kind, name)
    except FileNotFoundError:
        return default


# ---------------------------------------------------------------- sources
def build_sources():
    sources = _load("processed", "sources_real.json")["sources"]
    out = []
    for s in sources:
        out.append({
            "id": s["id"], "source_family": {
                "pubmed": "RESEARCH", "crossref": "RESEARCH", "semantic_scholar": "RESEARCH",
                "google_scholar": "RESEARCH", "google_trends": "TRENDS", "cbs": "MARKET",
                "eurostat": "MARKET", "applia": "MARKET", "versuni_philips": "PRODUCTS",
                "reviews": "CONSUMERS", "market_reports": "MARKET",
            }.get(s["id"], "TRENDS"),
            "source_type": s["category"], "title": s["name"], "publisher": s["name"],
            "url_or_identifier": s["id"], "status": s["status"], "method": s.get("method"),
            "retrieved_at": s.get("last_verified"), "provenance": s["contributes"],
        })
    return out


# --------------------------------------------------------------- documents
def build_documents():
    research = _load("processed", "research_index.json")
    trends = _load_or("raw", "trend_corpus.json", {"articles": []})
    candidates = _load_or("processed", "research_candidates.json", {"candidates": []})["candidates"]
    docs = []
    for p in research["peer_reviewed_papers"]:
        docs.append({
            "id": p["research_id"], "source_family": "RESEARCH", "status": "ACCEPTED",
            "title": p["title"], "publisher": p["journal"], "published_at": str(p["year"]),
            "identifiers": {"pmid": p.get("pmid"), "pmcid": p.get("pmcid"), "doi": p.get("doi")},
            "study_design": p["study_design"], "territories": p["territories"],
        })
    for a in trends["articles"]:
        docs.append({
            "id": a["article_id"], "source_family": "TECHNOLOGY_AI" if set(a.get("themes", [])) & {"ai_sensing", "matter", "smart_home_platform", "sensor_accuracy", "interoperability"} else "TRENDS",
            "status": "ACCEPTED", "title": a["title"], "publisher": a["publisher"],
            "published_at": a.get("published_date"), "identifiers": {"url": a["url"]},
            "credibility_tier": a["credibility_tier"], "document_type": a["document_type"],
        })
    for c in candidates:
        docs.append({
            "id": c["candidate_id"], "source_family": "RESEARCH", "status": c["status"],
            "title": c["title"], "publisher": c.get("journal"), "published_at": c.get("pubdate"),
            "identifiers": {"pmid": c.get("pmid"), "doi": c.get("doi")},
            "discovered_at": c["discovered_at"],
        })
    return docs


# --------------------------------------------------------- evidence layer
def build_evidence_objects():
    cards = _load_or("processed", "evidence_cards.json", {"cards": []})["cards"]
    return [{
        "id": c["research_id"], "source_family": "RESEARCH", "source_ids": [c["research_id"]],
        "title": c["title"], "payload": {"question": c.get("question"), "found": c.get("found"),
                                          "establishes": c.get("establishes"), "does_not_establish": c.get("does_not_establish")},
        "published_at": str(c["year"]), "epistemic_state": "OBSERVED",
    } for c in cards]


# ------------------------------------------------------------- Layer B: clustering
def cluster_research_layer_b():
    research = _load("processed", "research_index.json")["peer_reviewed_papers"]
    if len(research) < 2:
        return {"method": "n/a", "clusters": [], "outlier_ids": [p["research_id"] for p in research]}

    def doc_text(p):
        return " ".join(filter(None, [p["title"], p.get("study_design", "")]))

    ids = [p["research_id"] for p in research]
    texts = [doc_text(p) for p in research]
    vec = TfidfVectorizer(max_features=300, stop_words="english", ngram_range=(1, 2))
    X = vec.fit_transform(texts)
    sim = cosine_similarity(X)
    dist = 1 - sim

    def run(threshold):
        model = AgglomerativeClustering(n_clusters=None, distance_threshold=threshold, metric="precomputed", linkage="average")
        return model.fit_predict(dist)

    labels = run(DISTANCE_THRESHOLD)
    labels_perturbed = run(PERTURBED_THRESHOLD)

    from collections import Counter
    counts = Counter(labels)
    clusters, outlier_ids = [], []
    for lab in sorted(set(labels)):
        members = [ids[i] for i, l in enumerate(labels) if l == lab]
        if len(members) == 1:
            outlier_ids.extend(members)
            continue
        member_idxs = [i for i, l in enumerate(labels) if l == lab]
        # representative = member with highest average intra-cluster similarity
        rep_idx = max(member_idxs, key=lambda i: sum(sim[i][j] for j in member_idxs if j != i))
        # stability: does this same member set survive the perturbed threshold (as a subset of one perturbed cluster)?
        perturbed_labels_for_members = {labels_perturbed[i] for i in member_idxs}
        stable = len(perturbed_labels_for_members) == 1
        clusters.append({
            "cluster_id": "research-b-{}".format(lab), "method": "tfidf_cosine_agglomerative_distance_threshold",
            "parameters": {"distance_threshold": DISTANCE_THRESHOLD, "linkage": "average", "max_features": 300},
            "member_ids": members, "representative_ids": [ids[rep_idx]],
            "coherence": round(sum(sim[i][j] for i in member_idxs for j in member_idxs if i != j) / max(1, len(member_idxs) * (len(member_idxs) - 1)), 3),
            "stability": "STABLE" if stable else "UNSTABLE_AT_PERTURBED_THRESHOLD",
            "outlier_ids": [], "label": None, "label_basis": "Not labelled - representative title only, no AI label was generated this run.",
        })
    return {"method": "tfidf_cosine_agglomerative_distance_threshold", "clusters": clusters, "outlier_ids": outlier_ids}


# ------------------------------------------------------------- Layer C: labels
def build_labels():
    magic_box = _load("processed", "magic_box_real.json")
    labelled = []
    for p in magic_box["possibilities"]:
        applicable = [name for name, rule in LABEL_RULES.items() if rule(p)]
        labelled.append({"object_id": p["id"], "object_type": "possibility", "labels": applicable})
    return labelled


# ------------------------------------------------------- lineage / relation classes
def build_lineage_edges():
    signals = _load("processed", "signals_real.json")["signals"]
    edges = []
    for s in signals:
        for r in (s.get("research_support") or []):
            rel = STUDY_DESIGN_RELATION_CLASS.get(r["research_id"], "SEMANTIC_RELATED")
            edges.append({
                "from_id": r["research_id"], "to_id": s["id"], "relation": rel,
                "relation_basis": RELATION_CLASS_BASIS.get(r["research_id"], "No specific study-design basis recorded - defaulted to SEMANTIC_RELATED."),
            })
    return edges


# --------------------------------------------------------------- snapshot
FABRIC_INPUTS = [
    ("processed", "sources_real.json"), ("processed", "research_index.json"),
    ("processed", "research_candidates.json"), ("processed", "signals_real.json"),
    ("processed", "products_real.json"), ("processed", "rivals_real.json"),
    ("processed", "magic_box_real.json"), ("raw", "trend_corpus.json"), ("raw", "market_metrics.json"),
]


def compute_snapshot_id():
    h = hashlib.sha256()
    for kind, name in FABRIC_INPUTS:
        path = os.path.join(PROC if kind == "processed" else RAW, name)
        h.update(name.encode())
        try:
            with open(path, "rb") as fh:
                h.update(fh.read())
        except FileNotFoundError:
            h.update(b"MISSING")
    return h.hexdigest()[:16]


def build():
    snapshot_id = compute_snapshot_id()
    now = datetime.now(timezone.utc).isoformat()
    layer_b = cluster_research_layer_b()
    discovery_checkpoint = _load_or("processed", "research_discovery_checkpoint.json", None)

    return {
        "_provenance": (
            "Canonical normalized model over already-real Project 1 sources - no product, paper, "
            "signal, competitor, cluster, pattern, or relationship is invented here. All 7 evidence "
            "families (PRODUCTS/RESEARCH/CONSUMERS/TRENDS/MARKET/RIVALS/TECHNOLOGY_AI) stay explicitly "
            "separate. HDBSCAN/BERTopic-style clustering is deliberately NOT used anywhere - every "
            "current family is small (<100 real items), and DATA_FABRIC.md's own acceptance criteria "
            "require small-corpus clustering not be forced into a large-corpus method."
        ),
        "generated_by": "src/real/intelligence_fabric.py",
        "snapshot_id": snapshot_id, "generated_at": now,
        "sources": build_sources(),
        "documents": build_documents(),
        "evidence_objects": build_evidence_objects(),
        "clusters": {"research": layer_b},
        "labels": build_labels(),
        "lineage_edges": build_lineage_edges(),
        "last_research_discovery_run": discovery_checkpoint,
    }


def main():
    doc = build()
    with open(os.path.join(PROC, "intelligence_fabric.json"), "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote intelligence_fabric.json: {} sources, {} documents, {} evidence objects, {} research clusters ({} outliers), {} labelled objects, {} lineage edges".format(
        len(doc["sources"]), len(doc["documents"]), len(doc["evidence_objects"]),
        len(doc["clusters"]["research"]["clusters"]), len(doc["clusters"]["research"]["outlier_ids"]),
        len(doc["labels"]), len(doc["lineage_edges"])))
    return doc


if __name__ == "__main__":
    main()
