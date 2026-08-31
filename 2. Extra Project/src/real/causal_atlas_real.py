"""CAUSAL ATLAS - the L0-L6 causal-chain layer over the real possibility
population (Air's 16 Magic Box possibilities + Floor Care's real
theme x operator possibilities), plus a need-coverage matrix across a
fixed, honest home-domain vocabulary.

This is NOT a new evidence source. It is a second READ over already-real
possibility/theme objects (magic_box_real.json, floor_care/possibilities.json,
floor_care/induced_themes.json, innovations_real.json, white_space_real.json)
plus a small set of declared, documented METHOD_CHOICE mappings - the exact
same honesty pattern as magic_box_real.py's THEME_OPERATORS/FORM_FACTOR_RULE:
authored once, applied deterministically, never per-row judgment, always
labelled epistemic_type METHOD_CHOICE wherever it touches the output.

Structural ontology declared in this module (all METHOD_CHOICE, never
evidence):
  HOME_DOMAINS        - fixed structural vocabulary of 14 home domains.
                        Only AIR and FLOOR ever carry real possibility
                        data (CATEGORY_TO_DOMAIN); every other domain
                        honestly reports n_real_objects: 0 - never a
                        fabricated Food/Beverage/etc. possibility.
  NEEDS               - a small (8), evidence-groundable need taxonomy,
                        chosen because it is what Air's 6 fixed friction
                        themes AND Floor Care's real induced-theme member
                        terms actually, independently support - not a
                        forced shared vocabulary (see THEME_TO_NEED /
                        classify_floor_theme_need below).
  THEME_TO_NEED       - Air: an explicit 1:1 dict, one real friction theme
                        id -> one NEEDS id (the causal L3 layer).
                        Floor Care: NOT a 1:1 dict (its themes are machine-
                        induced, not a fixed vocabulary) - a small ordered,
                        deterministic keyword classifier over each theme's
                        own real member_terms (classify_floor_theme_need).
  OPERATOR_BURDEN_MAP - per OPERATORS, which human-burden dimensions its
                        OWN definition structurally implies it reduces.
                        Left empty (with an honest note) for any operator
                        whose definition does not confidently imply a
                        direction - never guessed.
  OPERATOR_PRIMITIVES - per OPERATORS, 1-2 canonical causal primitives that
                        genuinely match the operator's own definition. Left
                        empty (with an honest note) where no fixed-
                        vocabulary primitive genuinely matches.

Run:  python3 src/real/causal_atlas_real.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from taxonomy_real import THEMES, load_clean, compute_theme_stats           # noqa: E402
from decision_framework_real import MATERIALITY_FLOOR_PCT                   # noqa: E402
from magic_box_real import OPERATORS                                        # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")

UNKNOWN = "UNKNOWN — no real data in this pipeline for this field."


# --- HOME_DOMAINS -----------------------------------------------------------
# Fixed structural vocabulary named in the mission. Declaring a domain here
# is NOT a claim that Versuni has a product/evidence base for it - see
# CATEGORY_TO_DOMAIN: only AIR and FLOOR are ever backed by a real
# category registered in src/real/category_state.py::CATEGORIES.
HOME_DOMAINS = {
    "AIR": "Indoor air quality/purification.",
    "FLOOR": "Floor care (vacuuming/mopping).",
    "FOOD": "Food preparation/cooking.",
    "BEVERAGE": "Beverage preparation (coffee, water, etc.).",
    "THERMAL_COMFORT": "Indoor temperature/humidity comfort.",
    "WATER": "Water quality/usage in the home.",
    "GARMENT": "Garment/laundry care.",
    "CLEANLINESS": "General home surface/object cleanliness (non-floor).",
    "SECURITY": "Home security/monitoring.",
    "CARE": "Care of dependents (children, elderly, ill).",
    "PET": "Pet care.",
    "GARDEN": "Garden/outdoor plant care.",
    "SLEEP": "Sleep environment.",
    "RESOURCES": "Home resource use (energy/water/consumables) awareness.",
    "KNOWLEDGE": "Home-related information/decision support.",
    "HOME_COORDINATION": "Coordination across household tasks/devices.",
}

# The ONLY real join between a structural domain and an actually-registered,
# evidence-backed category (see src/real/category_state.py::CATEGORIES).
# Every other HOME_DOMAINS key intentionally has no entry here.
CATEGORY_TO_DOMAIN = {"AIR_PURIFICATION": "AIR", "FLOOR_CARE": "FLOOR"}

NO_DOMAIN_DATA_NOTE = "no Versuni product/evidence data exists for this domain in the current corpus"


# --- NEEDS -------------------------------------------------------------------
# A small (8), evidence-groundable need taxonomy. Every entry below is
# actually backed by real friction-theme content in AT LEAST one of the two
# real categories (see THEME_TO_NEED and classify_floor_theme_need) - this
# is not the sprawling 20+ mission list, and it is not Air's 6 themes
# force-mapped onto Floor Care's real, differently-shaped theme corpus.
NEEDS = {
    "RELIABILITY_LONGEVITY": "The product keeps working for its expected functional "
        "lifetime, without premature failure.",
    "QUIET_OPERATION": "The product operates without objectionable noise.",
    "VERIFIED_EFFECTIVENESS": "The product measurably performs its core job (cleans/"
        "purifies) as claimed, not just as advertised.",
    "SERVICE_CONTINUITY_COST": "Ongoing consumable/replacement-part cost and cadence "
        "don't erode ownership value over time.",
    "ODOR_AIR_SAFETY": "The product does not introduce smell, irritation, or an "
        "unsafe byproduct into the home.",
    "CUSTOMER_SUPPORT_WARRANTY": "Getting help, a replacement, a refund, or a "
        "warranty honoured when something goes wrong is straightforward.",
    "VALUE_FOR_MONEY": "The purchase feels justified by what the product actually "
        "delivers - the opposite of purchase regret.",
    "BUILD_QUALITY_MATERIALS": "The physical construction/materials feel sufficiently "
        "robust out of the box, not flimsy, defective, or a 'lemon'.",
}

# --- THEME_TO_NEED (Air) ------------------------------------------------------
# Air's friction-theme vocabulary (taxonomy_real.py::THEMES) is a small,
# FIXED set of 6 ids - so, exactly like magic_box_real.py's THEME_OPERATORS,
# this is an explicit, author-reviewed 1:1 dict. This IS the causal L3 layer:
# a judgment call, never evidence - every row that carries it is labelled
# epistemic_type METHOD_CHOICE.
THEME_TO_NEED = {
    "reliability": "RELIABILITY_LONGEVITY",
    "noise": "QUIET_OPERATION",
    "value_effectiveness": "VERIFIED_EFFECTIVENESS",
    "filter_cost": "SERVICE_CONTINUITY_COST",
    "ozone_odor_safety": "ODOR_AIR_SAFETY",
    "customer_service": "CUSTOMER_SUPPORT_WARRANTY",
}
assert set(THEME_TO_NEED) == set(THEMES), "THEME_TO_NEED must cover exactly taxonomy_real.THEMES"
assert set(THEME_TO_NEED.values()) <= set(NEEDS), "THEME_TO_NEED must only target declared NEEDS"


# --- Floor Care need classifier ----------------------------------------------
# Floor Care's themes (data/processed/floor_care/induced_themes.json) are
# MACHINE-INDUCED from the real review corpus - there is no fixed 6-theme
# vocabulary to hand-map 1:1 the way Air's THEME_TO_NEED does. Instead: a
# small, ORDERED, deterministic keyword-substring classifier over each
# theme's own real member_terms (inspected directly from
# induced_themes.json before writing this - see the priority groups below).
# A theme whose member_terms match none of these keyword groups is left
# UNMAPPED (returns None) rather than forced into a poor-fit need - e.g.
# generic emotional/ambiguous themes like "high hopes" or "wanted love"
# carry no confident need signal on their own and are honestly excluded
# from the need-coverage counts below, never guessed.
#
# Priority order matters (first match wins) and is fixed here so the
# classifier is reproducible: support/warranty language is checked first
# (it is the most lexically specific), then build-quality/DOA language,
# then performance language, then time-bounded-failure language, then
# purchase-regret/value language.
FLOOR_NEED_KEYWORDS = [
    ("CUSTOMER_SUPPORT_WARRANTY", [
        "service center", "repair shop", "authorized", "honor", "policy",
        "sending back", "response", "expired", "refused", "warranty",
        "customer service",
    ]),
    ("BUILD_QUALITY_MATERIALS", [
        "cheaply made", "defective", "broken", "lemon",
    ]),
    ("VERIFIED_EFFECTIVENESS", [
        "suction", "spit", "suck anything", "doesn't work", "work all",
        "anything up", "followed instructions",
    ]),
    ("RELIABILITY_LONGEVITY", [
        "stopped", "quit working", "broke within", "less months",
        "within months", "hold charge", "broke after", "less year",
    ]),
    ("VALUE_FOR_MONEY", [
        "waste money", "waste time", "don't buy", "save money",
        "never buy another", "buy something", "save yourself", "buyer",
        "better off",
    ]),
]


def classify_floor_theme_need(member_terms):
    """Apply FLOOR_NEED_KEYWORDS in fixed priority order to a theme's own
    real member_terms (lower-cased substring match). Returns a NEEDS id or
    None if no keyword group matches - an honest UNMAPPED, not a guess."""
    text = " | ".join((t or "").lower() for t in (member_terms or []))
    for need_id, keywords in FLOOR_NEED_KEYWORDS:
        if any(kw in text for kw in keywords):
            return need_id
    return None


# --- OPERATOR_BURDEN_MAP ------------------------------------------------------
# Fixed human-burden vocabulary the mission specifies.
BURDEN_DIMENSIONS = ("effort", "time", "attention", "skill", "presence",
                     "uncertainty", "decisions", "setup", "cleanup")

# Per operator, which burden dimension(s) its OWN OPERATORS[...] definition
# structurally implies it reduces - declared once, applied deterministically.
# An operator absent from a key's value list (empty list) means its own
# definition does not confidently imply a direction; OPERATOR_BURDEN_NOTES
# below records why for every operator, matched or not.
OPERATOR_BURDEN_MAP = {
    "MOVE": [],
    "MERGE": ["setup", "decisions"],
    "REMOVE": ["effort", "attention"],
    "INVERT": ["decisions"],
    "DISTRIBUTE": [],
    "CONCENTRATE": ["setup", "decisions"],
    "PREDICT": ["attention", "decisions"],
    "PERSONALISE": [],
    "AMBIENT": ["attention", "presence"],
    "TEMPORAL_SHIFT": [],
    "CROSS_CATEGORY_TRANSFER": [],
    "MATERIALISE": ["effort", "decisions"],
}
assert set(OPERATOR_BURDEN_MAP) == set(OPERATORS)

OPERATOR_BURDEN_NOTES = {
    "MOVE": "MOVE's own definition (\"change physical location\") does not itself say "
            "TO a more or less convenient location - direction is unspecified, so no "
            "burden dimension is confidently reduced.",
    "MERGE": "\"Combine functions/objects/jobs\" structurally means fewer separate "
             "things to install/configure (setup) and fewer separate things to decide "
             "about (decisions).",
    "REMOVE": "\"Eliminate an interaction/component\" is, by its own definition, work "
              "(effort) and a thing to notice (attention) that no longer has to happen.",
    "INVERT": "\"Act before instead of after\" removes the in-the-moment reactive "
              "choice (decisions) at the point of failure/mess; it does not itself "
              "imply less overall effort, so only decisions is claimed.",
    "DISTRIBUTE": "\"One large system -> several smaller systems\" is a topology "
                 "change with no stated direction of burden - could mean less to carry "
                 "per unit or more units to manage. Genuinely ambiguous, left empty "
                 "per the mission's own callout.",
    "CONCENTRATE": "\"Multiple systems -> one system\" structurally means fewer "
                   "separate things to set up and decide about than the multi-system "
                   "baseline it replaces.",
    "PREDICT": "\"Reactive -> anticipatory\" means the human no longer has to notice "
               "(attention) and decide (decisions) - the system already has.",
    "PERSONALISE": "\"Room/system -> individual/context\" is a scope change (WHO/WHERE "
                   "it targets), not itself a statement about which burden shrinks - "
                   "left empty rather than inferring one.",
    "AMBIENT": "\"Explicit interaction -> invisible environmental behaviour\" removes "
               "both the act of interacting (attention) and the need to be there to "
               "trigger it (presence).",
    "TEMPORAL_SHIFT": "\"Move the job earlier/later\" only specifies WHEN, not that "
                      "any burden is removed - and \"earlier\" vs. \"later\" would "
                      "imply opposite effects on time pressure, so no direction is "
                      "confidently claimed.",
    "CROSS_CATEGORY_TRANSFER": "The definition is about the SOURCE of a capability "
                               "(verified elsewhere), not about which burden it "
                               "reduces - that depends entirely on the transferred "
                               "capability itself, which this pipeline never verifies "
                               "(donor_state is always MISSING).",
    "MATERIALISE": "\"Turn digital perception/information into physical intervention\" "
                   "means the human no longer has to act on that information "
                   "themselves (effort) or decide what to do about it (decisions).",
}
assert set(OPERATOR_BURDEN_NOTES) == set(OPERATORS)


# --- OPERATOR_PRIMITIVES -------------------------------------------------------
# Fixed causal-primitive vocabulary the mission specifies (a superset;
# only the ones that genuinely match an operator's own definition are used).
CAUSAL_PRIMITIVES = ("HEAT", "COOL", "STEAM", "MOVE_AIR", "MIX", "SEPARATE",
                     "SENSE", "CLASSIFY", "PREDICT", "PERSONALIZE",
                     "COORDINATE", "RESTORE", "MAINTAIN")

OPERATOR_PRIMITIVES = {
    "MOVE": [],
    "MERGE": ["COORDINATE"],
    "REMOVE": ["SEPARATE"],
    "INVERT": ["PREDICT"],
    "DISTRIBUTE": ["COORDINATE"],
    "CONCENTRATE": ["COORDINATE"],
    "PREDICT": ["SENSE", "PREDICT"],
    "PERSONALISE": ["CLASSIFY", "PERSONALIZE"],
    "AMBIENT": ["SENSE", "MAINTAIN"],
    "TEMPORAL_SHIFT": [],
    "CROSS_CATEGORY_TRANSFER": [],
    "MATERIALISE": ["SENSE", "RESTORE"],
}
assert set(OPERATOR_PRIMITIVES) == set(OPERATORS)
for _op, _prims in OPERATOR_PRIMITIVES.items():
    assert set(_prims) <= set(CAUSAL_PRIMITIVES), _op

OPERATOR_PRIMITIVES_NOTES = {
    "MOVE": "Purely a physical-relocation definition; no listed primitive (heat/cool/"
            "steam/move-air/mix/separate/sense/classify/predict/personalize/"
            "coordinate/restore/maintain) genuinely describes relocation itself.",
    "MERGE": "Combining functions/objects/jobs into one is an orchestration act - "
             "COORDINATE.",
    "REMOVE": "Eliminating a component is structurally closest to SEPARATE (taking a "
              "part out of the system), the nearest listed primitive.",
    "INVERT": "Acting before something happens requires anticipating it - PREDICT.",
    "DISTRIBUTE": "Splitting one system into several smaller ones requires the parts "
                 "to work together as a whole - COORDINATE.",
    "CONCENTRATE": "Consolidating several systems into one is the same orchestration "
                   "primitive as DISTRIBUTE, applied in the opposite topological "
                   "direction - COORDINATE.",
    "PREDICT": "\"Reactive -> anticipatory\" is literally sense-then-predict.",
    "PERSONALISE": "Targeting an individual/context requires identifying which one "
                   "(CLASSIFY) and then acting on that identity (PERSONALIZE).",
    "AMBIENT": "Invisible environmental behaviour requires ongoing background sensing "
              "(SENSE) and continuous upkeep without being asked (MAINTAIN).",
    "TEMPORAL_SHIFT": "Only WHEN a job happens is specified; earlier vs. later implies "
                      "no single mechanism, so no primitive is confidently assigned.",
    "CROSS_CATEGORY_TRANSFER": "A provenance operator (capability verified elsewhere), "
                               "not a causal mechanism itself - no primitive applies.",
    "MATERIALISE": "Turning perceived information into a physical intervention is "
                   "sense-then-act-to-correct - SENSE + RESTORE.",
}
assert set(OPERATOR_PRIMITIVES_NOTES) == set(OPERATORS)


# --- DOMAIN_DIRECTION ----------------------------------------------------------
# One fixed, honestly-framed ASPIRATIONAL sentence per home_domain - directional
# framing only, never asserted as an observed fact. Declared once per domain,
# applied verbatim to every row in that domain (L6_ultimate_direction).
DOMAIN_DIRECTION = {
    "AIR": "Move indoor air quality from something residents actively worry about "
          "toward something they stop noticing because it is reliably handled.",
    "FLOOR": "Move floor cleaning from a recurring physical chore residents must "
             "schedule and perform toward a background task the home increasingly "
             "handles for them.",
    "FOOD": "Move food preparation from effortful daily labour toward something "
           "faster, more consistent, and less dependent on cooking skill.",
    "BEVERAGE": "Move beverage preparation from a manual, multi-step ritual toward "
               "an on-demand, consistently-quality experience.",
    "THERMAL_COMFORT": "Move indoor temperature/humidity from something residents "
                       "actively manage toward something the home maintains on "
                       "their behalf.",
    "WATER": "Move water quality/usage from an invisible utility residents must "
            "trust blindly toward something they can see, verify and control.",
    "GARMENT": "Move garment care from a time- and skill-intensive chore toward a "
              "largely automated, lower-effort routine.",
    "CLEANLINESS": "Move general home cleanliness from residents' recurring manual "
                  "effort toward continuous, low-effort upkeep.",
    "SECURITY": "Move home security from something residents must actively monitor "
               "toward something that reliably watches on their behalf.",
    "CARE": "Move the practical load of caring for dependents (children, elderly, "
           "ill) from constant manual vigilance toward supported, less effortful "
           "vigilance.",
    "PET": "Move pet care from a set of manual daily chores toward routines the "
          "home increasingly handles or assists with.",
    "GARDEN": "Move garden/outdoor plant care from manual, knowledge-dependent "
             "labour toward guided or automated upkeep.",
    "SLEEP": "Move sleep-environment management from something residents must "
            "manually tune toward something the home adapts on their behalf.",
    "RESOURCES": "Move home resource use (energy/water/consumables) from something "
                "residents track themselves toward something the home surfaces and "
                "manages for them.",
    "KNOWLEDGE": "Move home-related decisions from residents researching alone "
                "toward decisions supported by information the home itself "
                "generates.",
    "HOME_COORDINATION": "Move the coordination of household tasks and devices from "
                         "manual, person-by-person orchestration toward something "
                         "the home increasingly handles together.",
}
assert set(DOMAIN_DIRECTION) == set(HOME_DOMAINS)


# ------------------------------------------------------------------ loading --
def _load_json_or_none(*parts):
    path = os.path.join(PROC, *parts)
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        return None


def _fmt(n, digits=2):
    if n is None:
        return "UNKNOWN"
    if isinstance(n, float):
        return "{:.{}f}".format(n, digits)
    return str(n)


# ------------------------------------------------------------ Air atlas rows --
def _air_atlas_rows(magic_box_doc, innovations_by_id):
    rows = []
    for p in magic_box_doc.get("possibilities", []):
        theme_id = p["friction_theme"]
        op = p["operator"]
        need = THEME_TO_NEED.get(theme_id)
        prevalence = p.get("consumer_pain_prevalence_pct")
        gap = p.get("consumer_pain_csat")
        n_reviews = (p.get("consumer_pain_methodology") or {}).get("n_reviews")
        n_products = (p.get("consumer_pain_methodology") or {}).get("n_distinct_products")

        l2 = ("Detected complaint share (lower bound): {}% of trusted reviews (n={} "
              "reviews across {} products) carry the '{}' friction, with an average "
              "rating gap of {}★ vs. the corpus mean — the proximal problem this "
              "concept targets.".format(_fmt(prevalence), n_reviews, n_products,
                                       p["friction_theme_name"], _fmt(gap)))
        current_state = ("Today: {}% of trusted reviews (detected, lower bound) carry "
                         "this friction; affected products average {}★ below the "
                         "corpus mean.".format(_fmt(prevalence), _fmt(gap)))
        desired_state = "If realized: " + p["why_here"]["product_consequence"]

        burden = OPERATOR_BURDEN_MAP.get(op, [])
        if burden:
            l5 = ("If realized, reduces the {} burden on the resident - structurally "
                 "implied by {}'s own definition (\"{}\").".format(
                     " + ".join(burden), op, OPERATORS[op]))
        else:
            l5 = ("No confident freedom/burden-reduction claim can be derived from {}'s "
                 "own definition alone ({}) - left honestly undetermined rather than "
                 "guessed.".format(op, OPERATOR_BURDEN_NOTES[op]))

        primitives = OPERATOR_PRIMITIVES.get(op, [])
        if primitives:
            l4 = ("Adds a {} capability, per {}'s own definition: \"{}\".".format(
                " + ".join(primitives), op, OPERATORS[op]))
        else:
            l4 = ("No confident capability-primitive claim can be derived from {}'s own "
                 "definition alone ({}).".format(op, OPERATOR_PRIMITIVES_NOTES[op]))

        inn = innovations_by_id.get(p["id"])
        evidence_state = {
            "gate_passed": p.get("gate_passed"),
            "truth_class": p.get("truth_class"),
            "feasibility_2_5y_rating": (p.get("feasibility_2_5y") or {}).get("rating"),
            "is_white_space": p.get("is_white_space"),
        }
        if inn:
            evidence_state["innovation_state"] = inn.get("state")
            evidence_state["innovation_lifecycle"] = inn.get("lifecycle")
            evidence_state["critic_overall"] = inn.get("critic_overall")

        rows.append({
            "id": p["id"],
            "category": "AIR_PURIFICATION",
            "home_domain": "AIR",
            "name": p["name"],
            "friction_theme_id": theme_id,
            "friction_theme_name": p["friction_theme_name"],
            "primary_need": need,
            "primary_need_epistemic_type": "METHOD_CHOICE",
            "L0_mechanism": "{}: {}".format(op, OPERATORS[op]),
            "L1_transformation": p["why_here"]["transformation"],
            "L2_proximal_problem": l2,
            "L3_human_need": "Human need (METHOD_CHOICE mapping): {} — {}".format(
                need, NEEDS.get(need, "")),
            "L4_capability_created": l4,
            "L5_freedom_created": l5,
            "L6_ultimate_direction": ("Directional framing, not a fact: "
                                      + DOMAIN_DIRECTION["AIR"]),
            "state_variables": ["consumer_pain_prevalence_pct", "consumer_pain_csat",
                                "economic_value", "feasibility_2_5y.rating"],
            "causal_primitives": primitives,
            "burden_dimensions_addressed": burden,
            "current_state": current_state,
            "desired_state": desired_state,
            "form_factor": (p.get("product_archetype") or {}).get("form_factor"),
            "evidence_state": evidence_state,
            "parent_path_ids": p.get("parent_path_ids", []),
            "evidence_ids": p.get("evidence_ids", []),
            "epistemic_type": "DERIVED",
            "epistemic_note": ("Observed: friction_theme_name, L2_proximal_problem, "
                              "current_state, state_variables' underlying numbers, and "
                              "evidence_state (real friction/possibility/critic/gate "
                              "fields, verbatim). METHOD_CHOICE: primary_need "
                              "(THEME_TO_NEED), L0/L1/L4/L5 (operator vocabulary + "
                              "OPERATOR_PRIMITIVES/OPERATOR_BURDEN_MAP), "
                              "L6_ultimate_direction (DOMAIN_DIRECTION, aspirational "
                              "framing, never asserted as fact)."),
        })
    return rows


# --------------------------------------------------------- Floor atlas rows --
def _floor_atlas_rows(floor_possibilities_doc, floor_themes_by_id):
    rows = []
    for p in floor_possibilities_doc.get("possibilities", []):
        theme_id = p["theme_id"]
        op = p["operator"]
        friction = p.get("friction", {})
        theme_doc = floor_themes_by_id.get(theme_id, {})
        member_terms = theme_doc.get("member_terms") or friction.get("member_terms")
        need = classify_floor_theme_need(member_terms)

        prevalence = friction.get("prevalence_pct")
        gap = friction.get("rating_gap_vs_corpus_mean")
        n_reviews = friction.get("n_reviews")
        n_products = friction.get("n_distinct_products")

        l2 = ("Detected complaint share (lower bound): {}% of reviews (n={} reviews "
              "across {} products) carry the '{}' friction, with an average rating "
              "gap of {}★ vs. the corpus mean — the proximal problem this concept "
              "targets.".format(_fmt(prevalence), n_reviews, n_products,
                               friction.get("theme_name", theme_id), _fmt(gap)))
        current_state = ("Today: {}% of reviews (detected, lower bound) carry this "
                         "friction; affected products average {}★ below the corpus "
                         "mean.".format(_fmt(prevalence), _fmt(gap)))
        desired_state = ("If realized: applying operator {} (\"{}\") to the '{}' "
                         "friction (currently {}% of reviews, {}★ rating gap) would "
                         "directly target that friction — no independent "
                         "product_consequence evidence exists for Floor Care yet "
                         "(no why_here/research-tension corpus is wired for this "
                         "category).".format(op, OPERATORS[op],
                                            friction.get("theme_name", theme_id),
                                            _fmt(prevalence), _fmt(gap)))

        burden = OPERATOR_BURDEN_MAP.get(op, [])
        if burden:
            l5 = ("If realized, reduces the {} burden on the resident - structurally "
                 "implied by {}'s own definition (\"{}\").".format(
                     " + ".join(burden), op, OPERATORS[op]))
        else:
            l5 = ("No confident freedom/burden-reduction claim can be derived from {}'s "
                 "own definition alone ({}) - left honestly undetermined rather than "
                 "guessed.".format(op, OPERATOR_BURDEN_NOTES[op]))

        primitives = OPERATOR_PRIMITIVES.get(op, [])
        if primitives:
            l4 = ("Adds a {} capability, per {}'s own definition: \"{}\".".format(
                " + ".join(primitives), op, OPERATORS[op]))
        else:
            l4 = ("No confident capability-primitive claim can be derived from {}'s own "
                 "definition alone ({}).".format(op, OPERATOR_PRIMITIVES_NOTES[op]))

        rows.append({
            "id": p["id"],
            "category": "FLOOR_CARE",
            "home_domain": "FLOOR",
            "name": p["name"],
            "friction_theme_id": theme_id,
            "friction_theme_name": friction.get("theme_name", theme_id),
            "primary_need": need,
            "primary_need_epistemic_type": "METHOD_CHOICE",
            "L0_mechanism": "{}: {}".format(op, OPERATORS[op]),
            "L1_transformation": ("Method choice, not evidence: the category-independent "
                                  "operator vocabulary assigns {} - \"{}\" - to this "
                                  "machine-induced friction theme (machine cross-product, "
                                  "not an authored theme x operator pairing table - see "
                                  "src/real/floor_care_pipeline.py::compute_possibilities_"
                                  "doc).".format(op, OPERATORS[op])),
            "L2_proximal_problem": l2,
            "L3_human_need": ("Human need (METHOD_CHOICE mapping via a deterministic "
                              "keyword classifier over this theme's own real "
                              "member_terms): {} — {}".format(need, NEEDS.get(need, ""))
                              if need else
                              "Unmapped — this theme's real member_terms did not match any "
                              "declared NEEDS keyword group (see classify_floor_theme_need) "
                              "- left honestly unclassified rather than forced."),
            "L4_capability_created": l4,
            "L5_freedom_created": l5,
            "L6_ultimate_direction": ("Directional framing, not a fact: "
                                      + DOMAIN_DIRECTION["FLOOR"]),
            "state_variables": ["friction.prevalence_pct", "friction.rating_gap_vs_corpus_mean",
                                "economics.price_weighted_exposure_usd"],
            "causal_primitives": primitives,
            "burden_dimensions_addressed": burden,
            "current_state": current_state,
            "desired_state": desired_state,
            "form_factor": None,
            "evidence_state": {
                "state": p.get("state"),
                "promotion": p.get("promotion"),
                "generation_method": p.get("generation_method"),
            },
            "parent_path_ids": [],
            "evidence_ids": ["floor_theme:{}".format(theme_id)],
            "epistemic_type": "DERIVED",
            "epistemic_note": ("Observed: friction_theme_name, L2_proximal_problem, "
                              "current_state, state_variables' underlying numbers, and "
                              "evidence_state (real possibility state/promotion fields, "
                              "verbatim). METHOD_CHOICE: primary_need (the deterministic "
                              "Floor keyword classifier), L0/L1/L4/L5 (operator vocabulary "
                              "+ OPERATOR_PRIMITIVES/OPERATOR_BURDEN_MAP), "
                              "L6_ultimate_direction (DOMAIN_DIRECTION, aspirational "
                              "framing, never asserted as fact). parent_path_ids is "
                              "honestly empty: Floor Care has no research-tension/"
                              "assumption corpus wired in this pipeline yet."),
        })
    return rows


def build_causal_atlas(magic_box_doc=None, innovations_doc=None,
                       floor_possibilities_doc=None, floor_themes_doc=None):
    """One row per real possibility (Air's 16 + Floor Care's real set).
    Every input is injectable (defaulting to the real files on disk) so
    mutation tests can perturb one theme's stats in memory and prove the
    dependent atlas row genuinely changes - the same pattern
    magic_box_real.py::generate_possibilities(**inject) already supports."""
    magic_box_doc = magic_box_doc if magic_box_doc is not None else _load_json_or_none("magic_box_real.json")
    innovations_doc = innovations_doc if innovations_doc is not None else _load_json_or_none("innovations_real.json")
    floor_possibilities_doc = (floor_possibilities_doc if floor_possibilities_doc is not None
                               else _load_json_or_none("floor_care", "possibilities.json"))
    floor_themes_doc = (floor_themes_doc if floor_themes_doc is not None
                        else _load_json_or_none("floor_care", "induced_themes.json"))

    innovations_by_id = {i["innovation_id"]: i for i in (innovations_doc or {}).get("innovations", [])}
    floor_themes_by_id = {t["theme_id"]: t for t in (floor_themes_doc or {}).get("themes", [])}

    rows = []
    if magic_box_doc:
        rows.extend(_air_atlas_rows(magic_box_doc, innovations_by_id))
    if floor_possibilities_doc:
        rows.extend(_floor_atlas_rows(floor_possibilities_doc, floor_themes_by_id))
    return rows


# ------------------------------------------------------- need coverage matrix --
def _air_theme_need_stats(air_theme_stats):
    """theme_id -> {prevalence_pct, rating_gap, n_reviews, n_products} for
    every one of Air's 6 real friction themes, keyed by NEEDS id via
    THEME_TO_NEED. air_theme_stats defaults to a live recompute
    (taxonomy_real.compute_theme_stats over the real clean review corpus) -
    injectable for tests."""
    if air_theme_stats is None:
        rows = load_clean()
        stats, _corpus_mean, _theme_of = compute_theme_stats(rows)
        air_theme_stats = {
            tid: {"prevalence_pct": s["prevalence_pct"], "rating_gap": s["csat_impact"],
                 "n_reviews": s["n_reviews"]}
            for tid, s in stats.items()
        }
    return air_theme_stats


def _floor_theme_need_stats(floor_themes_doc):
    out = {}
    for t in (floor_themes_doc or {}).get("themes", []):
        out[t["theme_id"]] = {
            "prevalence_pct": t.get("prevalence_pct"),
            "rating_gap": t.get("rating_gap_vs_corpus_mean"),
            "n_reviews": t.get("n_reviews"),
        }
    return out


def _need_state(theme_stats_for_need):
    """Threshold rule (declared here, applied deterministically):
      NO_DATA   - no real theme maps to this need for this domain.
      STRONG    - at least one mapped theme clears BOTH the materiality
                  floor (prevalence_pct >= MATERIALITY_FLOOR_PCT, imported
                  from decision_framework_real.MATERIALITY_FLOOR_PCT) AND a
                  |rating_gap| >= 1.0 star.
      SECONDARY - at least one mapped theme clears the materiality floor,
                  but none reaches the 1.0-star rating-gap severity above.
      WEAK      - real theme(s) map to this need, but none clears the
                  materiality floor at all (thin evidence).
    """
    if not theme_stats_for_need:
        return "NO_DATA"
    cleared_floor = [s for s in theme_stats_for_need
                     if (s.get("prevalence_pct") or 0) >= MATERIALITY_FLOOR_PCT]
    if not cleared_floor:
        return "WEAK"
    if any(abs(s.get("rating_gap") or 0) >= 1.0 for s in cleared_floor):
        return "STRONG"
    return "SECONDARY"


def build_need_coverage_matrix(air_theme_stats=None, floor_themes_doc=None,
                               magic_box_doc=None, floor_possibilities_doc=None,
                               white_space_doc=None):
    """rows = NEEDS x HOME_DOMAINS. Only AIR/FLOOR ever carry real theme
    evidence; every other domain reports state NO_DATA with an honest note
    (never fabricated). state is derived purely from the declared threshold
    rule in _need_state() above - see its docstring for the exact rule.
    Every input is injectable (defaults to the real files on disk) for
    mutation testing: perturbing one theme's rating_gap in memory must move
    that need's computed state in the expected direction."""
    floor_themes_doc = (floor_themes_doc if floor_themes_doc is not None
                        else _load_json_or_none("floor_care", "induced_themes.json"))
    magic_box_doc = magic_box_doc if magic_box_doc is not None else _load_json_or_none("magic_box_real.json")
    floor_possibilities_doc = (floor_possibilities_doc if floor_possibilities_doc is not None
                               else _load_json_or_none("floor_care", "possibilities.json"))
    white_space_doc = white_space_doc if white_space_doc is not None else _load_json_or_none("white_space_real.json")

    air_stats = _air_theme_need_stats(air_theme_stats)
    floor_stats = _floor_theme_need_stats(floor_themes_doc)

    # theme_id -> need, per domain (AIR uses the explicit dict; FLOOR uses
    # the deterministic keyword classifier over each theme's real terms).
    air_theme_need = dict(THEME_TO_NEED)
    floor_theme_need = {}
    for t in (floor_themes_doc or {}).get("themes", []):
        n = classify_floor_theme_need(t.get("member_terms"))
        if n:
            floor_theme_need[t["theme_id"]] = n

    # n_possibilities_targeting per theme, from the real possibility docs.
    air_poss_by_theme = {}
    for p in (magic_box_doc or {}).get("possibilities", []):
        air_poss_by_theme.setdefault(p["friction_theme"], []).append(p["id"])
    floor_poss_by_theme = {}
    for p in (floor_possibilities_doc or {}).get("possibilities", []):
        floor_poss_by_theme.setdefault(p["theme_id"], []).append(p["id"])

    white_space_by_theme = {s["theme"]: s for s in (white_space_doc or {}).get("spaces", [])}

    rows = []
    for need_id in NEEDS:
        for domain_id in HOME_DOMAINS:
            if domain_id == "AIR":
                theme_ids = sorted(tid for tid, n in air_theme_need.items() if n == need_id)
                theme_stats = [air_stats[tid] for tid in theme_ids if tid in air_stats]
                n_poss = sum(len(air_poss_by_theme.get(tid, [])) for tid in theme_ids)
                is_ws = None
                ws_hits = [white_space_by_theme[tid] for tid in theme_ids if tid in white_space_by_theme]
                if ws_hits:
                    is_ws = any(w.get("is_white_space") for w in ws_hits)
                evidence_ids = ["taxonomy:{}".format(tid) for tid in theme_ids]
                note = None
            elif domain_id == "FLOOR":
                theme_ids = sorted(tid for tid, n in floor_theme_need.items() if n == need_id)
                theme_stats = [floor_stats[tid] for tid in theme_ids if tid in floor_stats]
                n_poss = sum(len(floor_poss_by_theme.get(tid, [])) for tid in theme_ids)
                is_ws = None  # is_white_space is declared AIR-only (white_space_real.json is Air-only)
                evidence_ids = ["floor_theme:{}".format(tid) for tid in theme_ids]
                note = None
            else:
                theme_ids, theme_stats, n_poss, is_ws, evidence_ids = [], [], 0, None, []
                note = NO_DOMAIN_DATA_NOTE

            gaps = [s["rating_gap"] for s in theme_stats if s.get("rating_gap") is not None]
            rows.append({
                "need": need_id,
                "home_domain": domain_id,
                "state": _need_state(theme_stats),
                "n_themes_addressing": len(theme_ids),
                "theme_ids": theme_ids,
                "worst_rating_gap": min(gaps) if gaps else None,
                "best_rating_gap": max(gaps) if gaps else None,
                "n_possibilities_targeting": n_poss,
                "is_white_space": is_ws,
                "evidence_ids": evidence_ids,
                "note": note,
            })
    return rows


def main():
    atlas = build_causal_atlas()
    matrix = build_need_coverage_matrix()

    n_air = sum(1 for r in atlas if r["home_domain"] == "AIR")
    n_floor = sum(1 for r in atlas if r["home_domain"] == "FLOOR")

    os.makedirs(PROC, exist_ok=True)
    with open(os.path.join(PROC, "causal_atlas.json"), "w", encoding="utf-8") as fh:
        json.dump({
            "_provenance": "One row per real possibility (Air's Magic Box + Floor "
                           "Care's induced possibilities). NEEDS/THEME_TO_NEED/"
                           "OPERATOR_BURDEN_MAP/OPERATOR_PRIMITIVES/DOMAIN_DIRECTION "
                           "are declared METHOD_CHOICE mappings, applied "
                           "deterministically - see src/real/causal_atlas_real.py "
                           "module docstring.",
            "generated_by": "src/real/causal_atlas_real.py",
            "home_domains": HOME_DOMAINS,
            "category_to_domain": CATEGORY_TO_DOMAIN,
            "needs": NEEDS,
            "count": len(atlas),
            "count_by_domain": {"AIR": n_air, "FLOOR": n_floor},
            "rows": atlas,
        }, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    with open(os.path.join(PROC, "need_coverage_matrix.json"), "w", encoding="utf-8") as fh:
        json.dump({
            "_provenance": "rows = NEEDS x HOME_DOMAINS. Only AIR/FLOOR ever carry "
                           "real theme evidence (see CATEGORY_TO_DOMAIN); every other "
                           "domain honestly reports state NO_DATA. state thresholds "
                           "are declared in _need_state() - "
                           "src/real/causal_atlas_real.py.",
            "generated_by": "src/real/causal_atlas_real.py",
            "materiality_floor_pct": MATERIALITY_FLOOR_PCT,
            "materiality_floor_source": "src/real/decision_framework_real.py::MATERIALITY_FLOOR_PCT",
            "count": len(matrix),
            "rows": matrix,
        }, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print("wrote causal_atlas.json ({} rows: {} AIR, {} FLOOR)".format(len(atlas), n_air, n_floor))
    print("wrote need_coverage_matrix.json ({} rows)".format(len(matrix)))
    return atlas, matrix


if __name__ == "__main__":
    main()
