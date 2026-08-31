"""PRODUCT <-> CAUSAL ATLAS JOIN - the one real, non-fabricated bridge from
individual product SKUs to the concept-level causal ontology in
causal_atlas_real.py.

causal_atlas.json rows are FRICTION-THEME x OPERATOR concepts, not products -
there is no authored product->concept table anywhere in this pipeline. The
only real link available is the evidence trail every possibility/theme
already carries: which REVIEWS were classified into which friction theme,
and which PRODUCT each of those reviews was actually written about.

    causal_atlas row .friction_theme_id
      -> review_themes CSV (review_id, product_sku, theme_id/theme)
      -> product_sku

This module walks that trail for both real categories (Air Purification's
review_themes_real.csv, Floor Care's review_themes.csv - written by
floor_care_pipeline.py) and produces, per real product SKU, the SET of
causal_atlas rows it has genuine review-evidence exposure to, plus the
aggregate needs/transformations/state-variables/burdens that exposure
implies. A product with zero linked reviews gets an honestly empty set -
never a fabricated default.

Run:  python3 src/real/product_causal_join.py
"""
import csv
import json
import os
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")
RAW = os.path.join(ROOT, "data", "real_raw")
OUT = os.path.join(PROC, "product_causal_join.json")

FLOOR_FROZEN = os.path.join(RAW, "floor_care_products_frozen.jsonl")
FLOOR_REVIEW_THEMES = os.path.join(PROC, "floor_care", "review_themes.csv")
FLOOR_REVIEWS_CLEAN = os.path.join(PROC, "floor_care", "reviews_clean.csv")
AIR_REVIEW_THEMES = os.path.join(PROC, "review_themes_real.csv")


def _load_json(name):
    with open(os.path.join(PROC, name), encoding="utf-8") as fh:
        return json.load(fh)


def _air_theme_counts():
    """product_sku -> Counter(friction_theme_id -> n_reviews), Air corpus."""
    out = defaultdict(Counter)
    with open(AIR_REVIEW_THEMES, encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            theme = row.get("theme")
            if not theme or theme == "none":
                continue
            out[row["product_sku"]][theme] += 1
    return out


def _floor_theme_counts():
    """product_sku -> Counter(friction_theme_id -> n_reviews), Floor corpus."""
    out = defaultdict(Counter)
    if not os.path.exists(FLOOR_REVIEW_THEMES):
        return out
    with open(FLOOR_REVIEW_THEMES, encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            theme = row.get("theme_id")
            if not theme:
                continue
            out[row["product_sku"]][theme] += 1
    return out


def _floor_review_counts():
    """product_sku -> total n reviews in the clean Floor corpus (regardless
    of whether the review carried a gated theme hit) - the same honest
    'evidence' denominator products_real.json already reports for Air."""
    out = Counter()
    if not os.path.exists(FLOOR_REVIEWS_CLEAN):
        return out
    with open(FLOOR_REVIEWS_CLEAN, encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            out[row["product_sku"]] += 1
    return out


def _floor_products():
    """The frozen, validated Floor Care product list (raw scraped fields),
    keyed by ASIN - the same file floor_care_pipeline.py itself joins
    reviews against."""
    out = {}
    if not os.path.exists(FLOOR_FROZEN):
        return out
    with open(FLOOR_FROZEN, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            asin = rec.get("parent_asin")
            if asin:
                out[asin] = rec
    return out


def _atlas_rows_by_theme(atlas_rows):
    out = defaultdict(list)
    for r in atlas_rows:
        out[r["friction_theme_id"]].append(r)
    return out


def _aggregate(linked_atlas_rows, theme_review_counts):
    """Union the real per-theme causal fields this product's evidence
    touches. Every value here is a straight union/aggregate over rows the
    review-evidence join actually selected - no field is invented for a
    theme the product has no review-linked exposure to."""
    # Group atlas rows by theme FIRST - a theme's real review-evidence count
    # belongs to the theme once, never once per operator-variant row that
    # theme happens to have in the atlas (summing per-row would multiply a
    # theme's evidence by however many operators were applied to it).
    rows_by_theme = defaultdict(list)
    for row in linked_atlas_rows:
        rows_by_theme[row["friction_theme_id"]].append(row)

    needs, transforms, svars, burdens = {}, set(), set(), set()
    themes_out = []
    for tid, rows in rows_by_theme.items():
        n = theme_review_counts.get(tid, 0)
        themes_out.append({
            "friction_theme_id": tid,
            "friction_theme_name": rows[0]["friction_theme_name"],
            "n_evidence_reviews": n,
            "atlas_row_ids": [row["id"] for row in rows],
        })
        theme_needs = {row.get("primary_need") for row in rows if row.get("primary_need")}
        for need in theme_needs:
            needs[need] = needs.get(need, 0) + n
        for row in rows:
            for prim in (row.get("causal_primitives") or []):
                transforms.add(prim)
            for sv in (row.get("state_variables") or []):
                svars.add(sv)
            for b in (row.get("burden_dimensions_addressed") or []):
                burdens.add(b)
    themes_out.sort(key=lambda t: -t["n_evidence_reviews"])
    needs_out = sorted(
        ({"need": k, "n_evidence_reviews": v} for k, v in needs.items()),
        key=lambda x: -x["n_evidence_reviews"])
    return {
        "linked_themes": themes_out,
        "needs_touched": needs_out,
        "transformations_touched": sorted(transforms),
        "state_variables_touched": sorted(svars),
        "burdens_touched": sorted(burdens),
    }


def build():
    atlas_doc = _load_json("causal_atlas.json")
    atlas_rows = next(v for v in atlas_doc.values()
                      if isinstance(v, list) and v and isinstance(v[0], dict) and "friction_theme_id" in v[0])
    air_atlas = [r for r in atlas_rows if r.get("category") == "AIR_PURIFICATION"]
    floor_atlas = [r for r in atlas_rows if r.get("category") == "FLOOR_CARE"]
    air_by_theme = _atlas_rows_by_theme(air_atlas)
    floor_by_theme = _atlas_rows_by_theme(floor_atlas)

    air_products = _load_json("products_real.json")["products"]
    air_theme_counts = _air_theme_counts()

    floor_raw = _floor_products()
    floor_theme_counts = _floor_theme_counts()
    floor_review_counts = _floor_review_counts()

    out_products = []

    for p in air_products:
        sku = p["id"]
        theme_counts = air_theme_counts.get(sku, Counter())
        linked_rows = [row for tid in theme_counts for row in air_by_theme.get(tid, [])]
        agg = _aggregate(linked_rows, theme_counts)
        out_products.append({
            "id": sku, "name": p["name"], "brand": p["brand"], "domain": "AIR",
            "category": "AIR_PURIFICATION", "price_usd": p.get("price_usd"),
            "average_rating": p.get("average_rating"),
            "rating_number_lifetime": p.get("rating_number_lifetime"),
            "n_real_reviews_in_corpus": p.get("n_real_reviews_in_corpus"),
            "cluster_type": p.get("cluster_type"), "cluster_intelligence": p.get("cluster_intelligence"),
            "truth_class": p.get("truth_class", "OBSERVED"),
            "evidence_state": "LINKED" if linked_rows else "NO_LINKED_EVIDENCE",
            **agg,
        })

    for sku, rec in floor_raw.items():
        theme_counts = floor_theme_counts.get(sku, Counter())
        linked_rows = [row for tid in theme_counts for row in floor_by_theme.get(tid, [])]
        agg = _aggregate(linked_rows, theme_counts)
        n_reviews = floor_review_counts.get(sku, 0)
        out_products.append({
            "id": sku, "name": rec.get("title"), "brand": rec.get("store"), "domain": "FLOOR",
            "category": "FLOOR_CARE", "price_usd": rec.get("price"),
            "average_rating": rec.get("average_rating"),
            "rating_number_lifetime": rec.get("rating_number"),
            "n_real_reviews_in_corpus": n_reviews,
            "cluster_type": None, "cluster_intelligence": None,
            "truth_class": "OBSERVED",
            "evidence_state": "LINKED" if linked_rows else "NO_LINKED_EVIDENCE",
            **agg,
        })

    n_linked = sum(1 for p in out_products if p["evidence_state"] == "LINKED")
    doc = {
        "_provenance": (
            "Real product<->causal-atlas join. Every linked_themes/needs_touched/"
            "transformations_touched/state_variables_touched/burdens_touched entry "
            "traces to actual reviews for that exact product SKU that were classified "
            "into a friction theme (review_themes_real.csv for Air, "
            "floor_care/review_themes.csv for Floor Care), joined to that theme's "
            "causal_atlas.json rows. Products with no review-linked theme hit are "
            "reported evidence_state=NO_LINKED_EVIDENCE with empty arrays - never a "
            "fabricated need/transformation/burden."),
        "generated_by": "src/real/product_causal_join.py",
        "n_products": len(out_products),
        "n_products_linked": n_linked,
        "n_products_unlinked": len(out_products) - n_linked,
        "products": out_products,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote {} ({} products, {} linked to >=1 causal_atlas row, {} unlinked)".format(
        OUT, len(out_products), n_linked, len(out_products) - n_linked))
    return doc


MAX_RELATIONSHIPS = 2000


def _needs_set(p):
    return {n["need"] for n in p["needs_touched"]}


def _relationship_type(shared_needs, shared_transforms, cross_domain):
    """A DETERMINISTIC classification of the join's own overlap sets - never
    a judgment call about whether the relationship is 'good', just what kind
    of real structural overlap it is."""
    if shared_needs and shared_transforms:
        return "STRONG_OVERLAP"
    if shared_transforms and not shared_needs:
        return "CAPABILITY_TRANSFER_CANDIDATE" if cross_domain else "SAME_MECHANISM_DIFFERENT_NEED"
    if shared_needs and not shared_transforms:
        return "CONVERGENCE_CANDIDATE"
    return None


def build_relationships(join_doc):
    """Pairwise product relationships, computed purely by set-intersection
    over the real per-product dimensions build() already derived from
    review evidence - no pair is scored or ranked by anything invented.
    Only pairs with a genuine shared need AND/OR shared transformation are
    kept (shared burdens/state-variables alone are extremely common and
    would swamp the table with low-signal pairs); pairs are ranked by total
    overlap size and capped at MAX_RELATIONSHIPS, with the drop count
    reported honestly rather than silently truncated."""
    linked = [p for p in join_doc["products"] if p["evidence_state"] == "LINKED"]
    candidates = []
    for i in range(len(linked)):
        a = linked[i]
        a_needs, a_trans = _needs_set(a), set(a["transformations_touched"])
        for j in range(i + 1, len(linked)):
            b = linked[j]
            shared_needs = a_needs & _needs_set(b)
            shared_trans = a_trans & set(b["transformations_touched"])
            if not shared_needs and not shared_trans:
                continue
            cross_domain = a["domain"] != b["domain"]
            rel_type = _relationship_type(shared_needs, shared_trans, cross_domain)
            if not rel_type:
                continue
            shared_burdens = set(a["burdens_touched"]) & set(b["burdens_touched"])
            shared_svars = set(a["state_variables_touched"]) & set(b["state_variables_touched"])
            candidates.append({
                "product_a_id": a["id"], "product_a_name": a["name"], "product_a_domain": a["domain"],
                "product_b_id": b["id"], "product_b_name": b["name"], "product_b_domain": b["domain"],
                "relationship_type": rel_type, "cross_domain": cross_domain,
                "shared_needs": sorted(shared_needs), "shared_transformations": sorted(shared_trans),
                "shared_burdens": sorted(shared_burdens), "shared_state_variables": sorted(shared_svars),
                "overlap_strength": len(shared_needs) + len(shared_trans) + len(shared_burdens) + len(shared_svars),
            })
    candidates.sort(key=lambda r: -r["overlap_strength"])
    n_total = len(candidates)
    kept = candidates[:MAX_RELATIONSHIPS]
    doc = {
        "_provenance": (
            "Pairwise product relationships, computed by real set-intersection over "
            "product_causal_join.json's per-product needs_touched/transformations_touched "
            "(each itself traced to review evidence). relationship_type is a deterministic "
            "rule over which sets overlap - never a fabricated judgment. Ranked by "
            "overlap_strength and capped; n_total_candidates_before_cap reports the real "
            "count so the cap is never silent."),
        "generated_by": "src/real/product_causal_join.py::build_relationships",
        "n_total_candidates_before_cap": n_total,
        "n_returned": len(kept),
        "capped": n_total > MAX_RELATIONSHIPS,
        "relationships": kept,
    }
    out_path = os.path.join(PROC, "product_relationships.json")
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote {} ({} of {} candidate relationships, capped={})".format(
        out_path, len(kept), n_total, doc["capped"]))
    return doc


if __name__ == "__main__":
    _doc = build()
    build_relationships(_doc)
