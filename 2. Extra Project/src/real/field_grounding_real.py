"""Per-path FIELD grounding - what each specific path means in the real
world, assembled only from evidence that genuinely attaches to THAT path.

The old design served one global "field" brief (a relabelling of the
decision verdict) under every path. This module replaces it: every path
gets its OWN field object, built by the one honest join available in this
corpus:

    path.evidence (RP-xx ids)
      -> signals_real.json signals whose evidence_ids intersect
      -> those signals' taxonomy:<theme> ids
      -> taxonomy_themes_real.json  (friction stats per theme)
      -> review_themes_real.csv     (which real products carry the theme)
      -> wtp_real.json.per_theme    (price-weighted exposure, with caveat)
      -> rivals_real.json           (per-brand theme gaps)

A key that has no real source for a given path is OMITTED (never a
placeholder); genuinely unavailable families (Versuni capabilities,
household behaviour, physical constraints) are reported once, explicitly,
as unavailable - the same honesty notes the criteria layer already uses.

Two paths therefore share field content only where the evidence genuinely
is shared (e.g. two tensions carried by the same papers/themes), and each
path's field leads with its OWN research cards - never one reused brief.
"""
import csv
import json
import os
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")

UNAVAILABLE = {
    "capabilities": "No real Versuni internal-capability dataset (portfolio inventory, install base, "
                    "IP register, service network) exists anywhere in this pipeline - see Criteria V1-V6, "
                    "honestly NEEDS_EVIDENCE.",
    "behaviour": "Review text can show a friction exists, not how a real household would behave once it "
                 "were fixed - no persona, diary, or panel dataset exists in this pipeline.",
    "physical_constraints": "No weight/dimension/installation dataset exists for corpus products - "
                            "physical envelope claims would be invented, so none are made.",
}

MAX_PRODUCTS_PER_THEME = 6
MAX_COMPETITORS_PER_THEME = 5


def _load(name):
    with open(os.path.join(PROC, name), encoding="utf-8") as fh:
        return json.load(fh)


def _theme_skus():
    """theme -> Counter(product_sku -> n trusted reviews) from the real
    per-review theme table."""
    out = {}
    path = os.path.join(PROC, "review_themes_real.csv")
    with open(path, encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            theme = row.get("theme")
            if not theme or theme == "none":
                continue
            out.setdefault(theme, Counter())[row["product_sku"]] += 1
    return out


def build_field_grounding(paths):
    """path_id -> field object. Pure function of the processed files."""
    signals = _load("signals_real.json")["signals"]
    tax = _load("taxonomy_themes_real.json")
    themes = tax.get("themes", {})
    validation = tax.get("validation", {})
    wtp = _load("wtp_real.json").get("per_theme", {})
    rivals = _load("rivals_real.json")["rivals"]
    cards = {c["research_id"]: c for c in _load("evidence_cards.json")["cards"]}
    products_by_id = {p["id"]: p for p in _load("products_real.json")["products"]}
    theme_skus = _theme_skus()

    fields = {}
    for path in paths:
        ev = set(path.get("evidence") or [])
        matched_signals = [s for s in signals if ev & set(s.get("evidence_ids") or [])]
        matched_themes = sorted({
            e.split(":", 1)[1]
            for s in matched_signals for e in (s.get("evidence_ids") or [])
            if e.startswith("taxonomy:") and e.split(":", 1)[1] in themes
        })

        field = {}

        # This path's OWN research cards - always first, they are what
        # distinguishes paths that share a consumer theme.
        own_cards = [cards[rid] for rid in path.get("evidence") or [] if rid in cards]
        if own_cards:
            field["supporting_evidence"] = [
                {"research_id": c["research_id"], "title": c["title"], "year": c["year"], "doi": c["doi"],
                 "found": c["found"], "does_not_establish": c["does_not_establish"]}
                for c in own_cards
            ]

        if matched_themes:
            field["friction"] = []
            for t in matched_themes:
                th = themes[t]
                block = {
                    "theme": t, "theme_name": th["theme_name"], "n_reviews": th["n_reviews"],
                    "detected_share_pct": th["prevalence_pct"], "avg_rating_gap": th["csat_impact"],
                    "mean_rating": th["mean_rating"], "pct_verified_purchase": th["pct_verified_purchase"],
                    "review_date_range": th.get("review_date_range"),
                    "classifier_validation": {
                        "raw_agreement_pct": validation.get("raw_agreement_pct"),
                        "n_labelled": validation.get("n_labelled"),
                        "note": "Detected share is a conservative lower bound from a deterministic keyword "
                                "classifier - see the Radar's classifier-honesty block.",
                    },
                }
                field["friction"].append(block)

            products = []
            for t in matched_themes:
                for sku, n in (theme_skus.get(t) or Counter()).most_common(MAX_PRODUCTS_PER_THEME):
                    p = products_by_id.get(sku)
                    if p:
                        products.append({
                            "id": p["id"], "name": p["name"], "brand": p["brand"],
                            "price_usd": p["price_usd"], "n_theme_reviews": n, "theme": t,
                        })
            if products:
                field["products"] = products

            econ = []
            for t in matched_themes:
                w = wtp.get(t)
                if w:
                    econ.append({
                        "theme": t, "theme_name": w["theme_name"],
                        "n_reviews_affected": w["n_reviews_affected"],
                        "n_affected_with_known_real_price": w["n_affected_with_known_real_price"],
                        "price_weighted_exposure_usd": w["price_weighted_exposure_usd"],
                        "caveat": w.get("price_weighted_exposure_caveat"),
                    })
            if econ:
                field["economics"] = econ

            comps = []
            for t in matched_themes:
                gaps = []
                for r in rivals:
                    g = next((x for x in r.get("theme_gaps", []) if x["theme"] == t), None)
                    if g and g["delta_pp"] > 0:
                        gaps.append({"brand": r["brand"], "n_reviews": r["n_reviews"],
                                     "brand_rate_pct": g["brand_rate_pct"],
                                     "category_rate_pct": g["category_rate_pct"], "delta_pp": g["delta_pp"],
                                     "theme": t})
                gaps.sort(key=lambda x: -x["delta_pp"])
                comps.extend(gaps[:MAX_COMPETITORS_PER_THEME])
            if comps:
                field["competitors"] = comps

        contradictions = [
            {"signal": s["id"], "text": s["contradictions"]}
            for s in matched_signals
            if s.get("contradictions") and not s["contradictions"].startswith("None identified")
        ]
        if contradictions:
            field["contradictions"] = contradictions
        unknowns = [
            {"signal": s["id"], "text": s["limitations"]}
            for s in matched_signals if s.get("limitations")
        ]
        if unknowns:
            field["unknowns"] = unknowns
        if matched_signals:
            field["signals"] = [s["id"] for s in matched_signals]

        field["unavailable"] = UNAVAILABLE
        if not field.get("supporting_evidence") and not matched_signals:
            field["no_evidence"] = ("This path carries no resolvable evidence ids - its field grounding is "
                                    "honestly empty rather than borrowed from a neighbouring path.")
        fields[path["id"]] = field
    return fields
