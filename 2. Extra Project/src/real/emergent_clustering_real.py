"""Model B - emergent textual-similarity clustering over the verified
peer-reviewed research corpus. Deterministic, reproducible, no external
API: TF-IDF + cosine similarity + agglomerative (average-linkage)
clustering, fixed parameters, scikit-learn only (already a project
dependency via requirements - no new service call, no embedding API).

This does NOT claim to be objectively true - it answers "does the text
itself form similar territories to the analyst-defined Model A taxonomy?"
(research-clusters.md). Model A (research_corpus_real.py) remains the
canonical/citable territory assignment; this is a cross-check.
"""
import json
import os

from sklearn.cluster import AgglomerativeClustering
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")

N_CLUSTERS = 4  # fixed, documented - chosen as roughly corpus_size/3, not tuned per-result
SIMILARITY_EDGE_THRESHOLD = 0.12  # fixed, documented - pairs below this are not drawn as edges


def load_corpus():
    with open(os.path.join(PROC, "research_index.json"), encoding="utf-8") as fh:
        idx = json.load(fh)
    with open(os.path.join(PROC, "evidence_cards.json"), encoding="utf-8") as fh:
        cards = {c["research_id"]: c for c in json.load(fh)["cards"]}
    return idx["peer_reviewed_papers"], cards


def build_document(paper, card):
    """The 'document' clustered per paper: title + found + limitations +
    study design - the real distilled text already in the corpus, not a
    fetched abstract (none is stored verbatim per copyright policy)."""
    parts = [
        paper["title"],
        card.get("found", ""),
        card.get("does_not_establish", ""),
        paper.get("study_design", ""),
    ]
    return " ".join(p for p in parts if p)


def main():
    papers, cards = load_corpus()
    docs = [build_document(p, cards.get(p["research_id"], {})) for p in papers]
    ids = [p["research_id"] for p in papers]

    vectorizer = TfidfVectorizer(stop_words="english", max_features=500, ngram_range=(1, 2))
    tfidf = vectorizer.fit_transform(docs)
    sim = cosine_similarity(tfidf)

    clustering = AgglomerativeClustering(
        n_clusters=N_CLUSTERS, metric="precomputed", linkage="average"
    )
    labels = clustering.fit_predict(1 - sim)  # distance = 1 - cosine similarity

    clusters = {}
    for rid, label in zip(ids, labels):
        clusters.setdefault(int(label), []).append(rid)

    edges = []
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            s = float(sim[i][j])
            if s >= SIMILARITY_EDGE_THRESHOLD:
                edges.append({"from": ids[i], "to": ids[j], "cosine_similarity": round(s, 4)})
    edges.sort(key=lambda e: -e["cosine_similarity"])

    # Cross-check: does the emergent grouping recover the analyst-defined
    # territory assignment? Reported honestly as a rough agreement stat,
    # not a validation claim - text similarity and strategic-question
    # territory are different things by design and are not expected to
    # match perfectly.
    territory_of = {p["research_id"]: sorted(p["territories"]) for p in papers}
    cluster_territory_overlap = []
    for label, members in clusters.items():
        territory_counts = {}
        for m in members:
            for t in territory_of.get(m, []):
                territory_counts[t] = territory_counts.get(t, 0) + 1
        dominant = max(territory_counts.items(), key=lambda kv: kv[1]) if territory_counts else (None, 0)
        cluster_territory_overlap.append({
            "cluster_id": label, "members": members,
            "dominant_territory": dominant[0],
            "dominant_territory_share": round(dominant[1] / len(members), 2) if members else None,
        })

    doc = {
        "_provenance": (
            "Model B - deterministic TF-IDF (unigrams+bigrams, English stopwords, max 500 features) "
            "+ cosine similarity + agglomerative average-linkage clustering (scikit-learn), fixed "
            "n_clusters={} and edge threshold={} - not tuned per-result. Clusters text similarity of "
            "each paper's real title + distilled found/does-not-establish/method text - not an "
            "embedding API, not an LLM. This is a cross-check against Model A's analyst-defined "
            "territories (research_corpus_real.py), not a replacement for it - text similarity and "
            "strategic-question territory are different axes and are not expected to agree perfectly."
        ).format(N_CLUSTERS, SIMILARITY_EDGE_THRESHOLD),
        "generated_by": "src/real/emergent_clustering_real.py",
        "method": "TF-IDF + cosine similarity + agglomerative average-linkage clustering",
        "n_clusters": N_CLUSTERS,
        "similarity_edge_threshold": SIMILARITY_EDGE_THRESHOLD,
        "clusters": cluster_territory_overlap,
        "similarity_edges": edges,
    }

    with open(os.path.join(PROC, "research_clusters.json"), encoding="utf-8") as fh:
        existing = json.load(fh)
    existing["model_b_emergent_textual_similarity"] = doc
    # The file's own top-level _provenance was written by
    # research_corpus_real.py::build_clusters() BEFORE this script ever ran,
    # honestly stating Model B was not yet implemented. Now that this script
    # has actually run and merged real Model B output above, that top-level
    # claim would be stale/false if left untouched - update it in place so
    # the file never contradicts its own content.
    existing["_provenance"] = (
        "MODEL A (canonical, analyst-defined research territories) and MODEL B "
        "(emergent TF-IDF + cosine-similarity + agglomerative clustering, see "
        "model_b_emergent_textual_similarity._provenance for method) are both "
        "present. Model A remains the citable territory assignment; Model B is "
        "a cross-check, not a replacement - do not present either as validating "
        "the other."
    )
    with open(os.path.join(PROC, "research_clusters.json"), "w", encoding="utf-8") as fh:
        json.dump(existing, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print("wrote Model B into research_clusters.json: {} clusters, {} similarity edges >= {}".format(
        N_CLUSTERS, len(edges), SIMILARITY_EDGE_THRESHOLD))
    for c in cluster_territory_overlap:
        print("  cluster {}: {} (dominant territory: {}, {}%)".format(
            c["cluster_id"], c["members"], c["dominant_territory"],
            round((c["dominant_territory_share"] or 0) * 100)))
    return doc


if __name__ == "__main__":
    main()
