"""PRODUCTS + SIGNALS view models - real data only.

PRODUCTS: the 237 real, hand-validated purifier products, with real
attributes (price, rating, review count) and three transparent cluster
lenses (TYPE, INTELLIGENCE) assigned by an explicit keyword rule against
the real product title - never an invented attribute.

SIGNALS: the six real taxonomy themes PLUS the real trend-corpus documents,
joined into "signals" only where a theme has real source-family convergence
(taxonomy evidence AND at least one real trend document tagged with a
related theme) - otherwise reported as a single-source-family theme, not
inflated into a false convergence claim.

Run:  python3 src/real/products_signals_real.py
"""
import json
import os
import re
import sys
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from taxonomy_real import THEMES, load_clean  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")
FROZEN = os.path.join(ROOT, "data", "real_raw", "purifier_products_frozen.jsonl")

TYPE_RULES = [
    ("purifier_fan_combo", re.compile(r"fan|bladeless|cool|heat", re.I)),
    ("purifier_humidifier_combo", re.compile(r"humidif", re.I)),
    ("personal_portable", re.compile(r"personal|necklace|desktop|mini|usb", re.I)),
    ("standard_purifier", re.compile(r".*", re.I)),  # fallback, always matches
]

INTELLIGENCE_RULES = [
    ("connected", re.compile(r"wifi|wi-fi|app|smart|alexa|bluetooth", re.I)),
    ("adaptive", re.compile(r"auto\s?mode|sensor|air quality monitor|smart sensing", re.I)),
    ("reactive", re.compile(r"true hepa|hepa filter|ionizer|plasma", re.I)),
    ("manual", re.compile(r".*", re.I)),  # fallback
]


def classify_by_rules(text, rules):
    for label, pattern in rules[:-1]:
        if pattern.search(text or ""):
            return label
    return rules[-1][0]


def build_products():
    reviews = load_clean()
    review_count_by_sku = defaultdict(int)
    rating_sum_by_sku = defaultdict(float)
    for r in reviews:
        review_count_by_sku[r["product_sku"]] += 1
        try:
            rating_sum_by_sku[r["product_sku"]] += float(r["rating"])
        except (TypeError, ValueError):
            pass

    products = []
    with open(FROZEN, encoding="utf-8") as fh:
        for line in fh:
            rec = json.loads(line)
            asin = rec.get("parent_asin")
            n_real = review_count_by_sku.get(asin, 0)
            if n_real == 0:
                continue  # no real review evidence for this product in our corpus
            title = rec.get("title") or ""
            price = None
            try:
                price = float(rec.get("price")) if rec.get("price") not in (None, "None", "") else None
            except (TypeError, ValueError):
                pass
            products.append({
                "id": asin,
                "name": title[:70],
                "brand": rec.get("store") or "Unknown",
                "price_usd": price,
                "average_rating": rec.get("average_rating"),
                "rating_number_lifetime": rec.get("rating_number"),
                "n_real_reviews_in_corpus": n_real,
                "mean_rating_in_corpus": round(rating_sum_by_sku[asin] / n_real, 3) if n_real else None,
                "cluster_type": classify_by_rules(title, TYPE_RULES),
                "cluster_intelligence": classify_by_rules(title, INTELLIGENCE_RULES),
                "evidence": "{} real reviews in the assembled corpus".format(n_real),
                "truth_class": "OBSERVED",
            })
    products.sort(key=lambda p: -p["n_real_reviews_in_corpus"])
    return {
        "_provenance": "Real, hand-validated purifier products. "
                       "cluster_type/cluster_intelligence assigned by an explicit, "
                       "documented keyword rule against the real product title - see "
                       "TYPE_RULES/INTELLIGENCE_RULES in this file.",
        "generated_by": "src/real/products_signals_real.py",
        "products": products,
    }


def build_signals():
    tax = json.load(open(os.path.join(PROC, "taxonomy_themes_real.json"), encoding="utf-8"))
    corpus = json.load(open(os.path.join(ROOT, "data", "raw", "trend_corpus.json"), encoding="utf-8"))

    theme_trend_map = {
        "reliability": [],
        "noise": ["noise", "sleep_mode"],
        "value_effectiveness": ["business_model"],
        "customer_service": [],
        "filter_cost": ["aftermarket"],
        "ozone_odor_safety": ["health_evidence", "iaq_standards"],
    }

    signals = []
    for tid, (name, _kws) in THEMES.items():
        stats = tax["themes"][tid]
        related_docs = [a for a in corpus["articles"]
                       if any(t in a["themes"] for t in theme_trend_map.get(tid, []))]
        source_families = {"Consumer"}  # taxonomy is always consumer-review-derived
        if related_docs:
            source_families.add("Science/Trend")
        state = "CONVERGING" if len(source_families) >= 2 else "SINGLE_SOURCE_FAMILY"
        signals.append({
            "id": tid, "name": name,
            "prevalence_pct": stats["prevalence_pct"],
            "csat_impact": stats["csat_impact"],
            "n_reviews": stats["n_reviews"],
            "source_families": sorted(source_families),
            "state": state,
            "related_trend_docs": [{"id": a["article_id"], "title": a["title"],
                                    "publisher": a["publisher"], "url": a["url"]}
                                   for a in related_docs],
            "evidence_ids": ["taxonomy:{}".format(tid)] + [a["article_id"] for a in related_docs],
            "truth_class": "DERIVED",
        })
    signals.sort(key=lambda s: -s["prevalence_pct"])
    return {
        "_provenance": "Signals = the same six real taxonomy themes used throughout Q3/Q6, "
                       "joined against the real 12-document trend corpus by an explicit "
                       "theme-tag mapping (theme_trend_map in this file). A signal is only "
                       "reported CONVERGING when a real trend document actually exists for "
                       "it - never asserted.",
        "generated_by": "src/real/products_signals_real.py",
        "signals": signals,
    }


def main():
    products = build_products()
    signals = build_signals()
    os.makedirs(PROC, exist_ok=True)
    with open(os.path.join(PROC, "products_real.json"), "w", encoding="utf-8") as fh:
        json.dump(products, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    with open(os.path.join(PROC, "signals_real.json"), "w", encoding="utf-8") as fh:
        json.dump(signals, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote products_real.json ({} real products)".format(len(products["products"])))
    print("wrote signals_real.json ({} signals, {} converging)".format(
        len(signals["signals"]), sum(1 for s in signals["signals"] if s["state"] == "CONVERGING")))
    return products, signals


if __name__ == "__main__":
    main()
