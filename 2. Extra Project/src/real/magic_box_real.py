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
import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from taxonomy_real import THEMES  # noqa: E402
from decision_framework_real import (dominates,  # noqa: E402
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
# HONEST METHOD LABEL: this operator table and the POSSIBILITY_NAMES below
# are ANALYST-DESIGNED, DETERMINISTIC METHOD - a rule set authored for the
# air-purification category specifically. The generation is category-
# specific by construction; it is NOT a general category-independent
# generator, and no other category's results can be claimed from it
# without authoring (or genuinely generalizing) an equivalent rule set.
THEME_OPERATORS = {
    "reliability": ["PREDICT", "MATERIALISE", "CROSS_CATEGORY_TRANSFER"],
    "noise": ["AMBIENT", "TEMPORAL_SHIFT", "CROSS_CATEGORY_TRANSFER"],
    "value_effectiveness": ["CONCENTRATE", "CROSS_CATEGORY_TRANSFER", "PERSONALISE"],
    "customer_service": ["INVERT", "REMOVE"],
    "filter_cost": ["DISTRIBUTE", "MERGE"],
    "ozone_odor_safety": ["MOVE", "PERSONALISE", "CROSS_CATEGORY_TRANSFER"],
}

POSSIBILITY_NAMES = {
    ("reliability", "PREDICT"): "Predictive-Maintenance Air Purifier",
    ("reliability", "MATERIALISE"): "Health-Indicator Air Purifier",
    ("reliability", "CROSS_CATEGORY_TRANSFER"): "Self-Testing Air Purifier",
    ("noise", "AMBIENT"): "Ambient-Sensing Night Purifier",
    ("noise", "TEMPORAL_SHIFT"): "Pre-Sleep Air Purifier",
    ("noise", "CROSS_CATEGORY_TRANSFER"): "Noise-Cancelling Air Purifier",
    ("value_effectiveness", "CONCENTRATE"): "Verified-Performance Air Purifier",
    ("value_effectiveness", "CROSS_CATEGORY_TRANSFER"): "Certified-Clean Air Purifier",
    ("value_effectiveness", "PERSONALISE"): "Personal Air Purifier",
    ("customer_service", "INVERT"): "Self-Reporting Air Purifier",
    ("customer_service", "REMOVE"): "Swap-Ready Air Purifier",
    ("filter_cost", "DISTRIBUTE"): "Micro-Filter Air Purifier",
    ("filter_cost", "MERGE"): "All-Inclusive Air Purifier",
    ("ozone_odor_safety", "MOVE"): "Placement-Sensing Air Purifier",
    ("ozone_odor_safety", "PERSONALISE"): "Sensitivity-Aware Air Purifier",
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


# --- FORM_FACTOR_RULE ------------------------------------------------------
# A second, separate METHOD_CHOICE layer, same pattern as THEME_OPERATORS:
# authored once, applied deterministically, never per-run randomness. It
# answers a narrower question than OPERATOR_PRODUCT_HINTS above ("is it
# mobile?"): which of a fixed set of PHYSICAL TOPOLOGY classes a concept's
# silhouette should use, so genuinely different concepts render as genuinely
# different shapes instead of all defaulting to the same tower(). Every rule
# below is derived from an operator's own fixed OPERATORS[...] definition,
# from a friction theme's own THEMES[...] description, or from a possibility's
# own authored POSSIBILITY_NAMES text - never invented per-concept.
FORM_FACTOR_TOPOLOGIES = {
    "tower": "Standalone room-scale unit - the room-fixed default shape when no "
             "operator/theme signal implies otherwise.",
    "wall": "Fixed, wall-mounted flat panel - implied by an operator whose own "
            "definition is about receding into the environment (AMBIENT).",
    "window": "Frame mounted in a window opening - declared for future concepts "
              "whose operator/theme implies an intake/exhaust boundary at a "
              "window; no current possibility triggers it (never forced).",
    "portable": "Small handheld/tabletop personal-scale unit - PERSONALISE "
                "applied to a theme that is not itself about direct individual "
                "physical exposure.",
    "distributed": "Several small nodes instead of one system - the literal "
                   "structural meaning of DISTRIBUTE.",
    "furniture_integrated": "Embedded in a furniture silhouette - MERGE is "
                            "defined as combining functions/objects, so a "
                            "MERGE-derived concept structurally becomes part "
                            "of another object rather than standing alone.",
    "mobile": "Wheeled/relocatable tower - MOVE is defined as changing physical "
              "location; CROSS_CATEGORY_TRANSFER always carries donor_state "
              "MISSING in this pipeline (no verified donor tells us the "
              "transferred capability's real shape), so it is conservatively "
              "treated the same way unless a stronger signal (see wearable "
              "override below) applies.",
    "wearable_personal": "Worn on/carried against the body - PERSONALISE "
                         "applied to a theme that is itself about direct "
                         "individual physical exposure (ozone_odor_safety), "
                         "or a possibility whose own authored name says "
                         "'wearable'/'clip'.",
    "other": "No operator/theme/name signal above matched - declared default "
             "for any future operator this table does not yet cover, never a "
             "guessed shape.",
}

# Friction themes whose own THEMES[...] description is about a direct
# individual physical exposure (breathing/skin/irritation), not a general
# room-level or economic/service friction. See taxonomy_real.py::THEMES -
# ozone_odor_safety's own description is "Ozone / smell / irritation": a
# bodily exposure, unlike e.g. value_effectiveness ("does it actually clean
# the air") which is about performance, not exposure.
INDIVIDUAL_EXPOSURE_THEMES = {"ozone_odor_safety"}

# Operators whose own fixed OPERATORS[...] definition directly implies a
# physical topology (see FORM_FACTOR_TOPOLOGIES for the reasoning behind
# each mapping). Operators absent here have no such structural implication
# and fall through to the "tower" declared default in compute_form_factor -
# never guessed per possibility.
FORM_FACTOR_RULE = {
    "DISTRIBUTE": "distributed",
    "MERGE": "furniture_integrated",
    "MOVE": "mobile",
    "CROSS_CATEGORY_TRANSFER": "mobile",
    "AMBIENT": "wall",
    # PERSONALISE and CONCENTRATE are resolved by compute_form_factor()
    # below (PERSONALISE needs the theme; CONCENTRATE is a declared "tower"
    # - consolidation folds into one standard-shaped unit, which is what
    # tower already means).
}


def compute_form_factor(theme_id, operator, name=None):
    """FORM_FACTOR_RULE, resolved. See FORM_FACTOR_TOPOLOGIES/FORM_FACTOR_RULE/
    INDIVIDUAL_EXPOSURE_THEMES above for the authored, documented reasoning
    behind every branch - this function only applies that table, it does not
    add any new judgment of its own."""
    name_l = (name or "").lower()
    # Strongest, most concrete signal: the possibility's OWN authored name
    # already says what it physically is (POSSIBILITY_NAMES is
    # analyst-authored text, same status as the operator table itself).
    if "wearable" in name_l or "clip" in name_l:
        return "wearable_personal"

    if operator == "PERSONALISE":
        return "wearable_personal" if theme_id in INDIVIDUAL_EXPOSURE_THEMES else "portable"

    if operator in FORM_FACTOR_RULE:
        return FORM_FACTOR_RULE[operator]

    # CONCENTRATE structurally folds several systems into one standard unit
    # - that consolidated unit is exactly what "tower" means here.
    if operator == "CONCENTRATE":
        return "tower"

    # No operator/theme/name signal implies a different topology - declared
    # default, not a guess (see FORM_FACTOR_TOPOLOGIES["tower"]).
    if operator in OPERATORS:
        return "tower"
    return "other"


def compute_product_conditions(theme_id, operator, name=None):
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
        "form_factor": compute_form_factor(theme_id, operator, name),
    }
    return conditions


def _load_json_or_none(name):
    try:
        with open(os.path.join(PROC, name), encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        return None


# The exact files this generator is a deterministic function of - hashed
# into every output doc so a run is identifiable and mutation-testable.
MAGIC_INPUT_FILES = [
    os.path.join(PROC, "reviews_clean_real.csv"),
    os.path.join(ROOT, "data", "real_raw", "purifier_products_frozen.jsonl"),
    os.path.join(PROC, "white_space_real.json"),
    os.path.join(PROC, "signals_real.json"),
    os.path.join(PROC, "research_tensions.json"),
    os.path.join(PROC, "category_assumptions.json"),
]


def compute_magic_input_hash():
    h = hashlib.sha256()
    for path in MAGIC_INPUT_FILES:
        h.update(os.path.basename(path).encode("utf-8"))
        try:
            with open(path, "rb") as fh:
                h.update(fh.read())
        except FileNotFoundError:
            h.update(b"MISSING")
    return h.hexdigest()


def compute_engineering_envelope_base():
    """Comparable-based engineering ranges, computed ONLY from the
    individually verified official product pages (data/visual/
    product_images.json). Every populated field is OBSERVED_COMPARABLE with
    its n; a spec no comparable publishes stays UNKNOWN - never invented.
    These are category comparables, not a concept's own specification."""
    try:
        with open(os.path.join(ROOT, "data", "visual", "product_images.json"), encoding="utf-8") as fh:
            official = json.load(fh)["products"]
    except FileNotFoundError:
        official = []

    def observed(key, unit):
        vals = [p["specs"].get(key) for p in official if p.get("specs", {}).get(key) is not None]
        if not vals:
            return {"epistemic_type": "UNKNOWN",
                    "note": "No verified comparable publishes this value - left unknown, never estimated."}
        return {"min": min(vals), "max": max(vals), "n_comparables": len(vals), "unit": unit,
                "epistemic_type": "OBSERVED_COMPARABLE",
                "source": "individually verified official Versuni/Philips product pages (data/visual/product_images.json)"}

    unknown = {"epistemic_type": "UNKNOWN",
               "note": "No verified comparable publishes this value - left unknown, never estimated."}
    return {
        "comparable_basis": "{} verified official Versuni/Philips air-purifier families (room-scale)".format(len(official)),
        "performance_cadr_m3h": observed("cadr_m3h", "m3/h"),
        "room_coverage_m2": observed("room_coverage_m2", "m2"),
        "acoustic_min_dba": observed("noise_min_dba", "dBA"),
        "target_mass_kg": unknown,
        "target_power_w": unknown,
        "target_dimensions": unknown,
    }


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
        # O is a METHOD CHOICE, never evidence - it gets its own status so a
        # DNA badge row can never be read as eight evidence parents.
        "O": {"status": "METHOD_CHOICE", "kind": "design_operator",
              "detail": "Authored operator vocabulary applied deterministically (METHOD_CHOICE, not evidence) - "
                        "see OPERATORS/THEME_OPERATORS in src/real/magic_box_real.py."},
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


def generate_possibilities(rows=None, prices=None, white_space_doc=None,
                           signals_doc=None, tensions_doc=None, assumptions_doc=None):
    """Stage 1 of the funnel: every (theme, operator) pair the fixed table
    defines, regardless of gate status - the raw candidate pool.

    Every input is injectable (defaulting to the real files on disk) so
    mutation tests can remove a parent evidence object in memory and prove
    the dependent possibility genuinely weakens - the same pattern
    decision_framework_real.compute(rows=...) already supports."""
    rows = rows if rows is not None else load_clean()
    theme_stats, corpus_mean, _ = compute_theme_stats(rows)
    prices = prices if prices is not None else load_prices()
    price_exposure = compute_price_exposure(rows, prices)

    if white_space_doc is None:
        white_space_doc = _load_json_or_none("white_space_real.json") or {"spaces": []}
    white_space = {s["theme"]: s for s in white_space_doc["spaces"]}

    signals_doc = signals_doc if signals_doc is not None else _load_json_or_none("signals_real.json")
    signals_by_id = {s["id"]: s for s in signals_doc["signals"]} if signals_doc else {}
    tensions_doc = tensions_doc if tensions_doc is not None else _load_json_or_none("research_tensions.json")
    tensions = tensions_doc["tensions"] if tensions_doc else []
    assumptions_doc = assumptions_doc if assumptions_doc is not None else _load_json_or_none("category_assumptions.json")
    assumptions = assumptions_doc["assumptions"] if assumptions_doc else []

    envelope_base = compute_engineering_envelope_base()

    possibilities = []
    for theme_id, ops in THEME_OPERATORS.items():
        stats = theme_stats[theme_id]
        signal = signals_by_id.get(theme_id)
        signal_paper_ids = {r["research_id"] for r in (signal.get("research_support") or [])} if signal else set()
        matching_tensions = [t for t in tensions if signal_paper_ids & set(t["evidence_ids"])] if signal_paper_ids else []
        matching_assumptions = [a for a in assumptions if signal_paper_ids & set(a["real_evidence_that_bears_on_it"])] if signal_paper_ids else []
        pe = price_exposure[theme_id]
        for op in ops:
            pid = "{}:{}".format(theme_id, op)
            gate_passed = (stats["csat_impact"] is not None
                          and (stats["prevalence_pct"] or 0) >= MATERIALITY_FLOOR_PCT)
            ws = white_space.get(theme_id)

            # WHY_HERE - the 3-part derivation every possibility must answer
            # immediately: reality (evidence) -> transformation (labelled
            # method) -> product consequence (with its honest basis).
            reality = ("{}% of trusted reviews ({} reviews across {} real products) carry this friction, "
                       "with a {}★ average rating gap.".format(
                           stats["prevalence_pct"], stats["n_reviews"], stats["n_distinct_products"],
                           stats["csat_impact"]))
            if signal:
                reality += " Signal: {}".format(signal["meaning"])
            transformation = ("Method choice, not evidence: the authored operator table assigns {} - "
                              "\"{}\" - to this friction. Analyst design judgment, applied "
                              "deterministically.".format(op, OPERATORS[op]))
            if matching_tensions:
                consequence_basis = "RESEARCH_TENSION"
                consequence = matching_tensions[0]["design_consequence"]
                if matching_assumptions:
                    consequence += " Assumption challenged: \"{}\" -> {}".format(
                        matching_assumptions[0]["text"], matching_assumptions[0]["counterfactual"])
            elif THEME_FEASIBILITY[theme_id].get("rationale"):
                consequence_basis = "FEASIBILITY_PRECEDENT"
                consequence = ("Feasibility precedent (from the trend corpus, not a consumer-evidence "
                               "consequence): {}".format(THEME_FEASIBILITY[theme_id]["rationale"]))
            else:
                consequence_basis = "DECLARED_INFERENCE"
                consequence = ("Declared inference from the friction and the operator alone - no research "
                               "tension or feasibility precedent backs this consequence.")

            unknowns = [THEME_FEASIBILITY[theme_id].get("missing_internal_evidence")]
            unknowns = [u for u in unknowns if u]

            envelope = dict(envelope_base)
            envelope["reference_market_price_usd"] = {
                "median": pe["median_real_price_usd"], "min": pe["min_real_price_usd"],
                "max": pe["max_real_price_usd"], "n_comparables": pe["n_distinct_priced_products_affected"],
                "epistemic_type": "REFERENCE_MARKET_PRICE",
                "caveat": pe.get("median_real_price_caveat"),
            }
            name = POSSIBILITY_NAMES.get((theme_id, op), "{} x {}".format(theme_id, op))
            archetype = compute_product_conditions(theme_id, op, name)
            if "portable" in archetype.get("mobility", "").lower() or "Relocatable" in archetype.get("mobility", ""):
                envelope = dict(envelope)
                envelope["form_factor_note"] = ("The operator implies a different form factor than the "
                                                "room-scale verified comparables - the ranges above are "
                                                "category context, not a target for this concept.")

            possibilities.append({
                "id": pid,
                "possibility_id": pid,
                "target_category": "AIR_PURIFICATION",
                "name": name,
                "friction_theme": theme_id,
                "friction_theme_name": THEMES[theme_id][0],
                "operator": op,
                "operator_definition": OPERATORS[op],
                "operator_origin": "AUTHORED_VOCABULARY (METHOD_CHOICE) - src/real/magic_box_real.py::OPERATORS + THEME_OPERATORS",
                "generation": "analyst-designed deterministic rule (theme x operator), see generation_method",
                "parent_path_ids": (["tension:" + t["tension_id"] for t in matching_tensions]
                                     + ["assumption:" + a["assumption_id"] for a in matching_assumptions]),
                "source_evidence_ids": sorted(signal_paper_ids) + list(THEME_FEASIBILITY[theme_id]["evidence_ids"]),
                "friction_ids": ["taxonomy:{}".format(theme_id)],
                "donor_capability_ids": [],
                "donor_state": ("MISSING - CROSS_CATEGORY_TRANSFER requires a verified donor "
                                "capability relationship and none exists in this pipeline; "
                                "treat the transfer as HYPOTHESIS"
                                if op == "CROSS_CATEGORY_TRANSFER" else None),
                "assumption_challenged": ({"ids": [a["assumption_id"] for a in matching_assumptions],
                                            "counterfactuals": [a["counterfactual"] for a in matching_assumptions]}
                                           if matching_assumptions else
                                           {"ids": [], "note": "No category assumption shares a paper with this theme's signal evidence."}),
                "why_here": {"reality": reality, "transformation": transformation,
                             "product_consequence": consequence, "consequence_basis": consequence_basis},
                "product_archetype": dict(archetype,
                                          epistemic_type="DESIGN_RULE - each populated field follows from the "
                                                          "operator's own fixed definition, never from evidence"),
                "engineering_envelope": envelope,
                "unknowns": unknowns,
                "test": {"type": "CHALLENGE_TEST", "derivation": "DETERMINISTIC_FROM_STORED_FIELDS",
                         "text": THEME_FEASIBILITY[theme_id]["what_would_change_rating"],
                         "derived_from": ["decision_framework_real.py::THEME_FEASIBILITY[{}].what_would_change_rating".format(theme_id)]},
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
                "economic_value": pe["price_weighted_exposure_usd"],
                "economic_value_caveat": pe.get("price_weighted_exposure_caveat"),
                "typical_market_price_usd": pe["median_real_price_usd"],
                "typical_market_price_n_products": pe["n_distinct_priced_products_affected"],
                "comparable_market_median_usd": pe["median_real_price_usd"],
                "comparable_market_median_n_products": pe["n_distinct_priced_products_affected"],
                "comparable_market_median_caveat": pe.get("median_real_price_caveat"),
                "feasibility_2_5y": {
                    "rating": THEME_FEASIBILITY[theme_id]["rating"],
                    "rank": FEASIBILITY_RANK[THEME_FEASIBILITY[theme_id]["rating"]],
                    "epistemic_type": THEME_FEASIBILITY[theme_id].get("epistemic_type"),
                    "evidence_ids": THEME_FEASIBILITY[theme_id]["evidence_ids"],
                    "rationale": THEME_FEASIBILITY[theme_id]["rationale"],
                    "missing_internal_evidence": THEME_FEASIBILITY[theme_id].get("missing_internal_evidence"),
                    "what_would_change_rating": THEME_FEASIBILITY[theme_id].get("what_would_change_rating"),
                },
                "is_white_space": bool(ws and ws.get("is_white_space")),
                "competitor_gap_brands": ws["rivals_measurably_weak_here"] if ws else [],
                "evidence_ids": ["taxonomy:{}".format(theme_id)],
                "truth_class": "DESIGN_POSSIBILITY",
                "design_dna": compute_design_dna(
                    theme_id, ["taxonomy:{}".format(theme_id)],
                    bool(ws and ws.get("is_white_space")), ws["rivals_measurably_weak_here"] if ws else [],
                    pe["price_weighted_exposure_usd"],
                    signals_by_id, tensions, assumptions),
            })
    return possibilities


def run_funnel(**inject):
    """Every stage count below is len() of a real filtered list - the
    funnel numbers are computed, never hardcoded. Keyword arguments pass
    straight through to generate_possibilities() for mutation tests."""
    all_possibilities = generate_possibilities(**inject)
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
                          "kill_reason": "Not enough real complaint evidence — {}% is below "
                                        "the {}% floor.".format(
                                            p["consumer_pain_prevalence_pct"], MATERIALITY_FLOOR_PCT)})
    for p in stage2_gate:
        if p in stage3_evidence:
            continue
        graveyard.append({**p, "killed_by": "INSUFFICIENT_ECONOMIC_EVIDENCE",
                          "kill_reason": "No real price data for this theme."})
    for p in stage3_evidence:
        if p in stage4_dominance:
            continue
        graveyard.append({**p, "killed_by": "DOMINATED",
                          "kill_reason": "Another concept beats it on pain, value, and feasibility."})

    return {
        "generation_method": {
            "class": "ANALYST_DESIGNED_DETERMINISTIC",
            "epistemic_type": "METHOD_CHOICE / ANALYST_DESIGN_JUDGMENT",
            "scope": "AIR_PURIFICATION only - the theme x operator rule table and "
                     "possibility names are authored for this category; not "
                     "category-general",
            "code_reference": "src/real/magic_box_real.py::OPERATORS / THEME_OPERATORS / "
                              "POSSIBILITY_NAMES / OPERATOR_PRODUCT_HINTS",
            "authored_constants": [
                "OPERATORS (the 12 operator definitions - authored vocabulary, not discovered)",
                "THEME_OPERATORS (which operators fit which friction theme)",
                "POSSIBILITY_NAMES (all 16 concept names)",
                "OPERATOR_PRODUCT_HINTS (product-shape rules that follow from operator definitions)",
                "FORM_FACTOR_RULE / INDIVIDUAL_EXPOSURE_THEMES / compute_form_factor "
                "(physical topology class per concept - DESIGN_RULE, not evidence)",
                "decision_framework_real.py::THEME_FEASIBILITY (analyst feasibility judgments, "
                "epistemic_type ANALYST_JUDGMENT, carried per possibility)",
                "web OPERATOR_TAGLINE strings (UI copies of the operator definitions - same authored vocabulary)",
            ],
        },
        "run": {
            "input_snapshot_sha256": compute_magic_input_hash(),
            "input_files": [os.path.relpath(p, ROOT) for p in MAGIC_INPUT_FILES],
            "deterministic": "Byte-identical inputs always produce a byte-identical document - "
                             "nothing is sampled, timed, or invented per run.",
        },
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
