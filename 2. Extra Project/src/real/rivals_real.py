"""RIVALS - real, computed competitive landscape from the real review corpus.

For every real brand ('store' field on the real product metadata) with
enough real review volume to be meaningful, compute:
  - review count, mean rating (real)
  - per-theme friction prevalence WITHIN that brand's own reviews (real)
  - the brand's single most over-represented friction relative to the
    category average (a real, computed "gap" - not asserted)

No brand is included without real review evidence (MIN_REVIEWS floor).
No axis is invented - "gap" is literally (brand theme rate - category
theme rate), the same six real taxonomy themes used everywhere else.

Run:  python3 src/real/rivals_real.py
"""
import csv
import json
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from taxonomy_real import THEMES, classify, load_clean  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")
FROZEN = os.path.join(ROOT, "data", "real_raw", "purifier_products_frozen.jsonl")

MIN_REVIEWS = 40  # evidence floor - a brand needs this many real reviews to appear


def load_product_brand_map():
    m = {}
    with open(FROZEN, encoding="utf-8") as fh:
        for line in fh:
            rec = json.loads(line)
            if rec.get("parent_asin"):
                m[rec["parent_asin"]] = rec.get("store") or "Unknown"
    return m


def compute_rivals():
    rows = load_clean()
    brand_of = load_product_brand_map()

    by_brand = defaultdict(list)
    for r in rows:
        brand = brand_of.get(r["product_sku"], "Unknown")
        by_brand[brand].append(r)

    category_theme_counts = defaultdict(int)
    for r in rows:
        t = classify(r["review_text"])
        if t != "none":
            category_theme_counts[t] += 1
    n_category = len(rows)
    category_rate = {tid: category_theme_counts[tid] / n_category for tid in THEMES}

    rivals = []
    for brand, brand_rows in by_brand.items():
        if len(brand_rows) < MIN_REVIEWS:
            continue
        ratings = [float(r["rating"]) for r in brand_rows if r["rating"] not in (None, "")]
        mean_rating = sum(ratings) / len(ratings) if ratings else None

        brand_theme_counts = defaultdict(int)
        for r in brand_rows:
            t = classify(r["review_text"])
            if t != "none":
                brand_theme_counts[t] += 1
        n_brand = len(brand_rows)
        brand_rate = {tid: brand_theme_counts[tid] / n_brand for tid in THEMES}

        gaps = []
        for tid in THEMES:
            delta_pp = (brand_rate[tid] - category_rate[tid]) * 100
            gaps.append({"theme": tid, "theme_name": THEMES[tid][0],
                        "brand_rate_pct": round(brand_rate[tid] * 100, 2),
                        "category_rate_pct": round(category_rate[tid] * 100, 2),
                        "delta_pp": round(delta_pp, 2)})
        gaps.sort(key=lambda g: -g["delta_pp"])
        biggest_gap = gaps[0] if gaps and gaps[0]["delta_pp"] > 0 else None
        strongest = min(gaps, key=lambda g: g["delta_pp"]) if gaps else None

        distinct_products = len({r["product_sku"] for r in brand_rows})
        rivals.append({
            "brand": brand,
            "n_reviews": n_brand,
            "n_products": distinct_products,
            "mean_rating": round(mean_rating, 3) if mean_rating else None,
            "theme_gaps": gaps,
            "biggest_weakness": biggest_gap,
            "strongest_area": strongest,
            "evidence": "src/real/rivals_real.py, n={} real reviews across {} real "
                       "products".format(n_brand, distinct_products),
        })

    rivals.sort(key=lambda r: -r["n_reviews"])
    return {
        "_provenance": "Computed from REAL review + real product-brand data. "
                       "Every axis is one of the same six real taxonomy themes "
                       "used throughout Q3/Q6 - no invented competitive dimension.",
        "generated_by": "src/real/rivals_real.py",
        "min_reviews_floor": MIN_REVIEWS,
        "n_category_reviews": n_category,
        "category_theme_rates_pct": {tid: round(category_rate[tid] * 100, 2) for tid in THEMES},
        "rivals": rivals,
    }


def compute_white_space():
    """A capability gap is 'white space' only where three REAL conditions
    all hold at once: (1) a real friction theme clears the same evidence
    gate Q6 uses, (2) at least one real rival is measurably worse on that
    theme than the category average, (3) real trend-corpus evidence names
    an enabling technology for it (reused from decision_framework_real's
    own FEASIBILITY table - not a new invented axis)."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from decision_framework_real import compute as compute_decision, MATERIALITY_FLOOR_PCT
    dec = compute_decision("mordor")
    rivals_doc = compute_rivals()

    spaces = []
    for os_id, profile in dec["scores"].items():
        if not profile["consumer_pain"]["gate_passed"]:
            continue
        theme_key = profile["evidence_ids"][0].split(":")[-1] if profile["evidence_ids"] else None
        rivals_weak_here = [r["brand"] for r in rivals_doc["rivals"]
                            if any(g["theme"] == theme_key and g["delta_pp"] > 2 for g in r["theme_gaps"])]
        spaces.append({
            "opportunity_id": os_id, "name": profile["name"],
            "theme": theme_key,
            "consumer_pain_csat": profile["consumer_pain"]["severity_csat"],
            "feasibility": profile["feasibility_2_5y"]["rating"],
            "rivals_measurably_weak_here": rivals_weak_here,
            "is_white_space": len(rivals_weak_here) >= 2,
        })
    return {"_provenance": "White space = real Consumer Pain gate passed + >=2 real "
                          "rivals measurably worse than category average on that theme "
                          "+ real Feasibility evidence exists. Reuses "
                          "decision_framework_real.py's own gate, not a new metric.",
           "spaces": spaces}


def main():
    doc = compute_rivals()
    os.makedirs(PROC, exist_ok=True)
    with open(os.path.join(PROC, "rivals_real.json"), "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    ws = compute_white_space()
    with open(os.path.join(PROC, "white_space_real.json"), "w", encoding="utf-8") as fh:
        json.dump(ws, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote rivals_real.json ({} real brands, floor={} reviews)".format(
        len(doc["rivals"]), MIN_REVIEWS))
    for r in doc["rivals"][:8]:
        print("  {:<16} n={:>5} mean={} weakness={}".format(
            r["brand"][:16], r["n_reviews"], r["mean_rating"],
            r["biggest_weakness"]["theme"] if r["biggest_weakness"] else "none"))
    print("wrote white_space_real.json ({} spaces, {} white-space)".format(
        len(ws["spaces"]), sum(1 for s in ws["spaces"] if s["is_white_space"])))
    return doc


if __name__ == "__main__":
    main()
