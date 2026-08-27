"""MAGIC BOX - deterministic possibility generation from real evidence.

This is NOT a generative-AI idea machine. It is a fixed, transparent,
reproducible RULE TABLE: for each real friction theme that clears the same
evidence gate Q6 uses, one or two DESIGN OPERATORS (a named vocabulary, not
evidence - see DESIGN_TRANSFORMATIONS below) are deterministically applied to
produce a POSSIBILITY. Every possibility carries its full derivation chain
(friction, evidence_ids, competitor gap if any, operator) so it can always be
traced back to real data. Re-running this script on the same evidence always
produces the same possibilities in the same order - nothing here is sampled
or invented per-run.

The funnel (52 -> gates -> dominance -> finalists in the brief's own example
language) is REAL here: every count below is len() of an actual filtered
list, never a hardcoded number.

Run:  python3 src/real/magic_box_real.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from taxonomy_real import THEMES  # noqa: E402
from decision_framework_real import (compute as compute_decision, dominates,  # noqa: E402
                                      pain_score, MATERIALITY_FLOOR_PCT, THEME_FEASIBILITY,
                                      FEASIBILITY_RANK)
from wtp_real import load_prices, compute_price_exposure  # noqa: E402
from taxonomy_real import load_clean, compute_theme_stats  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")

# The fixed design-operator vocabulary. These are DESIGN OPERATORS, not
# evidence - applying MOVE to a real friction does not make the resulting
# possibility a fact. Every possibility is explicitly typed as such
# downstream (visual_truth_classes: DESIGN POSSIBILITY / HYPOTHESIS).
OPERATORS = {
    "MOVE": "Change physical location.",
    "MERGE": "Combine functions / objects / jobs.",
    "REMOVE": "Eliminate an interaction/component.",
    "INVERT": "Act before instead of after.",
    "DISTRIBUTE": "One large system -> several smaller systems.",
    "CONCENTRATE": "Multiple systems -> one system.",
    "PREDICT": "Reactive -> anticipatory.",
    "PERSONALISE": "Room/system -> individual/context.",
    "AMBIENT": "Explicit interaction -> invisible environmental behaviour.",
    "TEMPORAL_SHIFT": "Move the job earlier/later.",
    "CROSS_CATEGORY_TRANSFER": "Transfer a verified capability from another product/category.",
    "MATERIALISE": "Turn digital perception/information into physical intervention.",
}

# Fixed, transparent, author-reviewed mapping: which operator(s) fit which
# real friction theme. This table itself is the "design judgment" layer -
# declared once, applied deterministically, never per-run randomness.
THEME_OPERATORS = {
    "reliability": ["PREDICT", "MATERIALISE", "CROSS_CATEGORY_TRANSFER"],
    "noise": ["AMBIENT", "TEMPORAL_SHIFT", "CROSS_CATEGORY_TRANSFER"],
    "value_effectiveness": ["CONCENTRATE", "CROSS_CATEGORY_TRANSFER", "PERSONALISE"],
    "customer_service": ["INVERT", "REMOVE"],
    "filter_cost": ["DISTRIBUTE", "MERGE"],
    "ozone_odor_safety": ["MOVE", "PERSONALISE", "CROSS_CATEGORY_TRANSFER"],
}

POSSIBILITY_NAMES = {
    ("reliability", "PREDICT"): "Predictive Failure Warning",
    ("reliability", "MATERIALISE"): "Physical Health Indicator",
    ("reliability", "CROSS_CATEGORY_TRANSFER"): "Self-Testing Status Light",
    ("noise", "AMBIENT"): "Ambient Night Mode",
    ("noise", "TEMPORAL_SHIFT"): "Pre-Sleep Purification Window",
    ("noise", "CROSS_CATEGORY_TRANSFER"): "Active Noise-Cancelling Fan Mode",
    ("value_effectiveness", "CONCENTRATE"): "Single-Metric Trust Score",
    ("value_effectiveness", "CROSS_CATEGORY_TRANSFER"): "Verified-Clean Certification",
    ("value_effectiveness", "PERSONALISE"): "Personal Clean-Air Zone",
    ("customer_service", "INVERT"): "Proactive Warranty Contact",
    ("customer_service", "REMOVE"): "No-Ticket Replacement",
    ("filter_cost", "DISTRIBUTE"): "Micro-Filter Subscription",
    ("filter_cost", "MERGE"): "Filter-Inclusive Pricing",
    ("ozone_odor_safety", "MOVE"): "Sensor-Led Placement Guidance",
    ("ozone_odor_safety", "PERSONALISE"): "Sensitivity-Aware Auto Mode",
    ("ozone_odor_safety", "CROSS_CATEGORY_TRANSFER"): "Wearable Odor/Ozone Safety Clip",
}

UNKNOWN = "UNKNOWN — no real data in this pipeline for this field."

# Structural product-shape hints that follow DIRECTLY from an operator's own
# fixed definition (see OPERATORS above) - e.g. MOVE is defined as "change
# physical location," so a MOVE-derived concept is real-ly relocatable by
# construction, not by invented spec. Fields with no such direct structural
# basis are left out here and default to UNKNOWN below - never guessed.
OPERATOR_PRODUCT_HINTS = {
    "MOVE": {"mobility": "Relocatable — operator MOVE is defined as changing physical location."},
    "DISTRIBUTE": {"mobility": "Multi-unit — operator DISTRIBUTE turns one system into several smaller ones."},
    "CONCENTRATE": {"mobility": "Single-unit — operator CONCENTRATE turns several systems into one."},
    "PERSONALISE": {"mobility": "Personal/portable — operator PERSONALISE moves scope from room to individual."},
    "PREDICT": {"connected": "Likely — operator PREDICT (reactive → anticipatory) requires sensing/data."},
    "AMBIENT": {"connected": "Likely — operator AMBIENT (invisible environmental behaviour) requires sensing."},
    "MATERIALISE": {"connected": "Likely — operator MATERIALISE turns a digital signal into a physical action."},
}


def compute_product_conditions(theme_id, operator):
    """Product-shape hints, honestly UNKNOWN unless the operator's own fixed
    definition or the friction theme itself directly implies a field - never
    a fabricated spec. See OPERATOR_PRODUCT_HINTS and OPERATORS above."""
    hints = OPERATOR_PRODUCT_HINTS.get(operator, {})
    conditions = {
        "room_scale": UNKNOWN,
        "mobility": hints.get("mobility", UNKNOWN),
        "size_class": UNKNOWN,
        "power_class": UNKNOWN,
        "noise_ambition": UNKNOWN,
        "maintenance_burden": UNKNOWN,
        "filter_service_dependency": (
            "High — this concept directly targets filter cost/frequency friction."
            if theme_id == "filter_cost" else UNKNOWN
        ),
        "connected": hints.get("connected", UNKNOWN),
    }
    return conditions


def _load_json_or_none(name):
    try:
        with open(os.path.join(PROC, name), encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        return None


MISSING_UNVERIFIED = {"status": "MISSING_UNVERIFIED"}


def compute_design_dna(theme_id, evidence_ids, is_white_space, competitor_gap_brands,
                       economic_value, signals_by_id, tensions, assumptions):
    """The F/S/T/R/C/A/E/O parent lineage the brief calls "Design DNA" -
    every parent below is a genuine join against already-computed real
    files (signals_real.json / research_tensions.json /
    category_assumptions.json), never invented. A parent with no real join
    is reported MISSING_UNVERIFIED rather than silently omitted or guessed.
    """
    signal = signals_by_id.get(theme_id)
    signal_paper_ids = {r["research_id"] for r in (signal.get("research_support") or [])} if signal else set()

    dna = {
        "F": {"status": "PRESENT", "kind": "consumer_friction", "id": "taxonomy:{}".format(theme_id),
              "detail": "Real Amazon review-text friction theme (see Consumer Pain methodology)."},
        "O": {"status": "PRESENT", "kind": "design_operator", "detail": "Fixed operator vocabulary, applied deterministically - see THEME_OPERATORS."},
    }

    dna["S"] = ({"status": "PRESENT", "kind": "signal", "id": theme_id, "detail": signal["meaning"]}
                if signal else dict(MISSING_UNVERIFIED, kind="signal", detail="No real signal object exists for this friction theme."))

    matching_tensions = [t for t in tensions if signal_paper_ids & set(t["evidence_ids"])] if signal_paper_ids else []
    dna["T"] = ({"status": "PRESENT", "kind": "scientific_tension",
                "ids": [t["tension_id"] for t in matching_tensions],
                "detail": "; ".join(t["name"] for t in matching_tensions)}
                if matching_tensions else dict(MISSING_UNVERIFIED, kind="scientific_tension",
                    detail="No real research tension shares a paper with this theme's signal evidence."))

    dna["R"] = ({"status": "PRESENT", "kind": "rival_gap", "brands": competitor_gap_brands,
                "detail": "{} named real competitors measurably weaker on this theme.".format(len(competitor_gap_brands))}
                if is_white_space and competitor_gap_brands else
                dict(MISSING_UNVERIFIED, kind="rival_gap", detail="No real competitor-weakness data clears the white-space threshold for this theme."))

    dna["C"] = dict(MISSING_UNVERIFIED, kind="versuni_capability",
                    detail="No real Versuni internal capability/org-readiness dataset exists in this pipeline.")

    matching_assumptions = [a for a in assumptions if signal_paper_ids & set(a["real_evidence_that_bears_on_it"])] if signal_paper_ids else []
    dna["A"] = ({"status": "PRESENT", "kind": "category_assumption",
                "ids": [a["assumption_id"] for a in matching_assumptions],
                "detail": "; ".join(a["text"] for a in matching_assumptions)}
                if matching_assumptions else dict(MISSING_UNVERIFIED, kind="category_assumption",
                    detail="No category assumption shares a paper with this theme's signal evidence."))

    dna["E"] = ({"status": "PRESENT", "kind": "economic_condition",
                "detail": "Real price-weighted exposure computed for this theme (${:,.2f}).".format(economic_value)}
                if economic_value else dict(MISSING_UNVERIFIED, kind="economic_condition",
                    detail="No real price coverage for this theme's affected reviews."))
    return dna


def generate_possibilities():
    """Stage 1 of the funnel: every (theme, operator) pair the fixed table
    defines, regardless of gate status - the raw candidate pool."""
    rows = load_clean()
    theme_stats, corpus_mean, _ = compute_theme_stats(rows)
    prices = load_prices()
    price_exposure = compute_price_exposure(rows, prices)

    try:
        with open(os.path.join(PROC, "white_space_real.json"), encoding="utf-8") as fh:
            white_space = {s["theme"]: s for s in json.load(fh)["spaces"]}
    except FileNotFoundError:
        white_space = {}

    signals_doc = _load_json_or_none("signals_real.json")
    signals_by_id = {s["id"]: s for s in signals_doc["signals"]} if signals_doc else {}
    tensions_doc = _load_json_or_none("research_tensions.json")
    tensions = tensions_doc["tensions"] if tensions_doc else []
    assumptions_doc = _load_json_or_none("category_assumptions.json")
    assumptions = assumptions_doc["assumptions"] if assumptions_doc else []

    possibilities = []
    for theme_id, ops in THEME_OPERATORS.items():
        stats = theme_stats[theme_id]
        for op in ops:
            pid = "{}:{}".format(theme_id, op)
            gate_passed = (stats["csat_impact"] is not None
                          and (stats["prevalence_pct"] or 0) >= MATERIALITY_FLOOR_PCT)
            ws = white_space.get(theme_id)
            possibilities.append({
                "id": pid,
                "name": POSSIBILITY_NAMES.get((theme_id, op), "{} x {}".format(theme_id, op)),
                "friction_theme": theme_id,
                "friction_theme_name": THEMES[theme_id][0],
                "operator": op,
                "operator_definition": OPERATORS[op],
                "consumer_pain_csat": stats["csat_impact"],
                "consumer_pain_prevalence_pct": stats["prevalence_pct"],
                "consumer_pain_methodology": {
                    "method": stats["method"],
                    "n_reviews": stats["n_reviews"],
                    "n_distinct_products": stats["n_distinct_products"],
                    "review_date_range": stats["review_date_range"],
                    "pct_verified_purchase": stats["pct_verified_purchase"],
                    "source": "McAuley-Lab Amazon-Reviews-2023 (Amazon.com real customer reviews)",
                },
                "gate_passed": gate_passed,
                "economic_value": price_exposure[theme_id]["price_weighted_exposure_usd"],
                "typical_market_price_usd": price_exposure[theme_id]["median_real_price_usd"],
                "typical_market_price_n_products": price_exposure[theme_id]["n_distinct_priced_products_affected"],
                "feasibility_2_5y": {
                    "rating": THEME_FEASIBILITY[theme_id]["rating"],
                    "rank": FEASIBILITY_RANK[THEME_FEASIBILITY[theme_id]["rating"]],
                    "evidence_ids": THEME_FEASIBILITY[theme_id]["evidence_ids"],
                    "rationale": THEME_FEASIBILITY[theme_id]["rationale"],
                },
                "is_white_space": bool(ws and ws.get("is_white_space")),
                "competitor_gap_brands": ws["rivals_measurably_weak_here"] if ws else [],
                "evidence_ids": ["taxonomy:{}".format(theme_id)],
                "truth_class": "DESIGN_POSSIBILITY",
                "design_dna": compute_design_dna(
                    theme_id, ["taxonomy:{}".format(theme_id)],
                    bool(ws and ws.get("is_white_space")), ws["rivals_measurably_weak_here"] if ws else [],
                    price_exposure[theme_id]["price_weighted_exposure_usd"],
                    signals_by_id, tensions, assumptions),
            })
    return possibilities


def run_funnel():
    """Every stage count below is len() of a real filtered list - the
    funnel numbers are computed, never hardcoded."""
    all_possibilities = generate_possibilities()
    stage1 = all_possibilities
    stage2_gate = [p for p in stage1 if p["gate_passed"]]
    stage3_evidence = [p for p in stage2_gate if p["economic_value"] not in (None, 0)]

    # Pairwise dominance over the surviving possibilities, reusing the exact
    # same dominates() function decision_framework_real.py uses for Q6 -
    # generalized here to N candidates instead of 3.
    def profile_for_dominance(p):
        return {"consumer_pain": {"severity_csat": p["consumer_pain_csat"]},
               "economic_value": p["economic_value"],
               "feasibility_2_5y": {"rank": p["feasibility_2_5y"]["rank"]}}

    non_dominated = []
    for a in stage3_evidence:
        pa = profile_for_dominance(a)
        dominated = False
        for b in stage3_evidence:
            if a is b:
                continue
            if dominates(profile_for_dominance(b), pa):
                dominated = True
                break
        if not dominated:
            non_dominated.append(a)
    stage4_dominance = non_dominated

    stage5_finalists = sorted(
        stage4_dominance, key=lambda p: pain_score(profile_for_dominance(p)) or 0,
        reverse=True)[:3]

    graveyard = []
    for p in stage1:
        if p in stage2_gate:
            continue
        graveyard.append({**p, "killed_by": "NO_OBSERVED_PAIN",
                          "kill_reason": "Consumer Pain evidence-sufficiency gate failed - "
                                        "prevalence {}% below the {}% floor, or no real "
                                        "CSAT signal.".format(
                                            p["consumer_pain_prevalence_pct"], MATERIALITY_FLOOR_PCT)})
    for p in stage2_gate:
        if p in stage3_evidence:
            continue
        graveyard.append({**p, "killed_by": "INSUFFICIENT_ECONOMIC_EVIDENCE",
                          "kill_reason": "No real observed-price coverage for this theme's "
                                        "affected reviews - cannot size Economic Value."})
    for p in stage3_evidence:
        if p in stage4_dominance:
            continue
        graveyard.append({**p, "killed_by": "DOMINATED",
                          "kill_reason": "Strictly dominated by another surviving "
                                        "possibility on Consumer Pain, Economic Value and "
                                        "Feasibility simultaneously."})

    return {
        "_provenance": "Every count is len() of a real filtered Python list. Dominance "
                       "reuses src/real/decision_framework_real.py::dominates() exactly, "
                       "generalized to N candidates.",
        "generated_by": "src/real/magic_box_real.py",
        "funnel": [
            {"stage": "generated", "label": "Possibilities generated", "count": len(stage1)},
            {"stage": "gate", "label": "Pass Consumer Pain evidence gate", "count": len(stage2_gate)},
            {"stage": "evidence", "label": "Have real Economic Value coverage", "count": len(stage3_evidence)},
            {"stage": "dominance", "label": "Non-dominated (Pareto frontier)", "count": len(stage4_dominance)},
            {"stage": "finalists", "label": "Finalists (top 3 by Consumer Pain)", "count": len(stage5_finalists)},
        ],
        "possibilities": stage1,
        "finalists": stage5_finalists,
        "non_dominated": stage4_dominance,
        "graveyard": graveyard,
        "operators": OPERATORS,
    }


def main():
    doc = run_funnel()
    os.makedirs(PROC, exist_ok=True)
    with open(os.path.join(PROC, "magic_box_real.json"), "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote magic_box_real.json")
    for s in doc["funnel"]:
        print("  {:<12} {:>3}  {}".format(s["stage"], s["count"], s["label"]))
    print("  finalists: {}".format([p["name"] for p in doc["finalists"]]))
    print("  graveyard: {} killed".format(len(doc["graveyard"])))
    return doc


if __name__ == "__main__":
    main()
