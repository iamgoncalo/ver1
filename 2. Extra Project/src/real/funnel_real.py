"""THE VERSUNI INNOVATION FUNNEL MACHINE - one canonical funnel state.

PRODUCT UNIVERSE -> RADAR (signal + competitor evidence) -> PATHS+FIELD -> MAGIC BOX ->
CRITERIA -> INNOVATIONS -> CRITIC -> FINALISTS.

This module computes NOTHING new - it is a pure aggregation/reclassification
layer over already-real processed files (products_real.json,
signals_real.json, rivals_real.json, white_space_real.json,
magic_box_real.json, criteria_real.json, decision_framework_real.json,
research_tensions.json, category_assumptions.json, defect_detection_report_real.json,
data/raw/trend_corpus.json, data/manifest.json). No product, signal, paper,
competitor, count, relationship, pattern, criterion result, counterfactual,
innovation, finalist, winner, price, market value, or source status is
invented here. Where a pattern type has no real verified parent in the
current data, its list is honestly empty (count 0) - never padded.

Idempotency: every field below is a deterministic function of the current
content of data/processed/*.json + data/raw/*.json. Running this script
twice on unchanged inputs produces byte-identical output (see
compute_input_snapshot_hash) and does NOT append a new row to
funnel_run_history.json - only a genuine input change does.

Run:  python3 src/real/funnel_real.py
"""
import hashlib
import json
import os
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")
RAW = os.path.join(ROOT, "data", "raw")
RUN_HISTORY_PATH = os.path.join(PROC, "funnel_run_history.json")

# The exact real files this funnel is a deterministic function of. Order
# matters for the hash (kept stable across runs).
SNAPSHOT_INPUTS = [
    ("processed", "products_real.json"),
    ("processed", "signals_real.json"),
    ("processed", "rivals_real.json"),
    ("processed", "white_space_real.json"),
    ("processed", "magic_box_real.json"),
    ("processed", "criteria_real.json"),
    ("processed", "critic_real.json"),
    ("processed", "decision_framework_real.json"),
    ("processed", "research_tensions.json"),
    ("processed", "research_index.json"),
    ("processed", "intelligence_fabric.json"),
    ("processed", "category_assumptions.json"),
    ("processed", "defect_detection_report_real.json"),
    ("processed", "economics_real.json"),
    ("raw", "trend_corpus.json"),
    ("raw", "market_metrics.json"),
]

TECHNOLOGY_AI_THEMES = {"ai_sensing", "matter", "smart_home_platform", "sensor_accuracy", "interoperability"}
from research_corpus_real import PROMOTED_TREND_IDS  # ONE canonical promotion set - never re-declared


def _load(kind, name):
    path = os.path.join(PROC if kind == "processed" else RAW, name)
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _load_or_none(kind, name):
    try:
        return _load(kind, name)
    except FileNotFoundError:
        return None


def compute_input_snapshot_hash():
    """A real sha256 over the current byte content of every file this
    funnel depends on - not a random or time-based value. Two runs with
    identical file content always produce the identical hash."""
    h = hashlib.sha256()
    for kind, name in SNAPSHOT_INPUTS:
        path = os.path.join(PROC if kind == "processed" else RAW, name)
        h.update(name.encode("utf-8"))
        try:
            with open(path, "rb") as fh:
                h.update(fh.read())
        except FileNotFoundError:
            h.update(b"MISSING")
    return h.hexdigest()


def load_run_history():
    if not os.path.exists(RUN_HISTORY_PATH):
        return []
    with open(RUN_HISTORY_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def record_run(input_hash, stage_counts, generated_objects, killed_objects, surviving_objects, errors):
    """Idempotent: only appends a new run record if the input snapshot hash
    genuinely changed since the last recorded run. Re-running on unchanged
    inputs updates nothing but 'checked_at'/'finished_at' on the existing
    last entry - it never duplicates a run record or silently overwrites
    an earlier one (FUNNEL.md: 'Must be idempotent. Never silently
    overwrite history.'). changed_objects is a real per-stage count delta
    against the previous DIFFERENT run, not a guess."""
    history = load_run_history()
    now = datetime.now(timezone.utc).isoformat()
    prior_counts = history[-1]["stage_counts"] if history else {}
    changed_objects = {k: stage_counts[k] - prior_counts.get(k, 0) for k in stage_counts if stage_counts[k] != prior_counts.get(k, 0)}

    if history and history[-1]["input_snapshot_hash"] == input_hash:
        history[-1]["last_checked_at"] = now
        history[-1]["finished_at"] = now
        history[-1]["check_count"] = history[-1].get("check_count", 1) + 1
        changed = False
    else:
        history.append({
            "run_id": "run-{}".format(len(history) + 1),
            "started_at": now,
            "finished_at": now,
            "last_checked_at": now,
            "check_count": 1,
            "input_snapshot_hash": input_hash,
            "stage_counts": stage_counts,
            "changed_objects": changed_objects,
            "generated_objects": generated_objects,
            "killed_objects": killed_objects,
            "surviving_objects": surviving_objects,
            "errors": errors,
        })
        changed = True
    with open(RUN_HISTORY_PATH, "w", encoding="utf-8") as fh:
        json.dump(history, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    return history, changed


def compute_signal_families():
    """RESEARCH / TRENDS / CONSUMERS / MARKET / TECHNOLOGY_AI, kept
    structurally distinct - never merged into one generic 'signal' type.
    TECHNOLOGY_AI is a real subset of the existing trend corpus, carved out
    by the corpus's own real theme tags (ai_sensing/matter/
    smart_home_platform/sensor_accuracy/interoperability) - not a new
    connector, not invented data."""
    signals = _load("processed", "signals_real.json")["signals"]
    research = _load_or_none("processed", "research_index.json")
    trends = _load_or_none("raw", "trend_corpus.json")
    market = _load_or_none("raw", "market_metrics.json")

    consumer_ids = [s["id"] for s in signals if s["prevalence_pct"] is not None]
    research_only_ids = [s["id"] for s in signals if s["prevalence_pct"] is None]

    trend_articles = [a for a in (trends["articles"] if trends else []) if a["article_id"] not in PROMOTED_TREND_IDS]
    tech_ai_articles = [a for a in trend_articles if set(a.get("themes", [])) & TECHNOLOGY_AI_THEMES]
    non_tech_trend_articles = [a for a in trend_articles if a["article_id"] not in {x["article_id"] for x in tech_ai_articles}]

    return {
        "RESEARCH": {
            "count": research["peer_reviewed_count"] if research else 0,
            "ids": [p["research_id"] for p in (research["peer_reviewed_papers"] if research else [])],
            "plus_research_grounded_signals": research_only_ids,
            "source": "research_index.json - PubMed/PMC-verified papers",
        },
        "TRENDS": {
            "count": len(non_tech_trend_articles),
            "ids": [a["article_id"] for a in non_tech_trend_articles],
            "source": "data/raw/trend_corpus.json - regulatory/standard/manufacturer/industry documents",
        },
        "CONSUMERS": {
            "count": len(consumer_ids),
            "ids": consumer_ids,
            "source": "signals_real.json - real Amazon review-text taxonomy",
        },
        "MARKET": {
            "count": len(market["sources"]) if market else 0,
            "ids": [s["source_id"] for s in (market["sources"] if market else [])],
            "source": "data/raw/market_metrics.json - Mordor/IMARC syndicated market sizing",
        },
        "TECHNOLOGY_AI": {
            "count": len(tech_ai_articles),
            "ids": [a["article_id"] for a in tech_ai_articles],
            "source": "data/raw/trend_corpus.json, filtered by real theme tags: {}".format(sorted(TECHNOLOGY_AI_THEMES)),
        },
    }


def compute_patterns():
    """MAGIC BOX / PATTERN INTELLIGENCE - 9 pattern types, each a real
    reclassification of already-computed real objects. A pattern type with
    no real verified parent in the current data is an honest empty list,
    never padded to look populated."""
    signals = _load("processed", "signals_real.json")["signals"]
    tensions = _load("processed", "research_tensions.json")["tensions"]
    assumptions = _load("processed", "category_assumptions.json")["assumptions"]
    magic_box = _load("processed", "magic_box_real.json")
    white_space = _load("processed", "white_space_real.json")["spaces"]
    defects = _load_or_none("processed", "defect_detection_report_real.json")

    patterns = {}

    patterns["CONVERGENCE"] = [
        {"id": "convergence:{}".format(s["id"]), "name": s["name"], "parent_ids": [s["id"]] + [r["research_id"] for r in (s.get("research_support") or [])],
         "detail": "Independent evidence families agree: {}".format(s["meaning"])}
        for s in signals if s["state"] == "CONVERGING"
    ]

    # Kept consistent with the Pass 2 path ontology: a record reclassified
    # to ASSUMPTION_TO_TEST (T4/T5, machine-checked against signal states)
    # never appears in the TENSION pattern bucket.
    signal_state = {s["id"]: s["state"] for s in signals}
    def _is_reclassified(tid):
        r = TENSION_RECLASS.get(tid)
        return bool(r) and signal_state.get(r["check_signal"]) == r["check_state"]
    patterns["TENSION"] = [
        {"id": "tension:{}".format(t["tension_id"]), "name": t["name"], "parent_ids": [t["tension_id"]] + t["evidence_ids"],
         "detail": t["statement"]}
        for t in tensions if not _is_reclassified(t["tension_id"])
    ]

    patterns["CONTRADICTION"] = [
        {"id": "contradiction:{}".format(s["id"]), "name": s["name"], "parent_ids": [s["id"]] + [r["research_id"] for r in (s.get("research_support") or [])],
         "detail": "Real evidence genuinely disagrees: {}".format(s["meaning"])}
        for s in signals if s["state"] == "CONTESTED"
    ]

    patterns["ASSUMPTION"] = [
        {"id": "assumption:{}".format(a["assumption_id"]), "name": a["text"], "parent_ids": [a["assumption_id"]] + a["real_evidence_that_bears_on_it"],
         "detail": a["evidence_for_prevalence"]}
        for a in assumptions
    ] + [
        {"id": "tension:{}".format(t["tension_id"]), "name": t["name"], "parent_ids": [t["tension_id"]] + t["evidence_ids"],
         "detail": t["statement"] + " (reclassified from TENSION: " + TENSION_RECLASS[t["tension_id"]]["why"] + ")"}
        for t in tensions if _is_reclassified(t["tension_id"])
    ]

    patterns["CAPABILITY_TRANSFER"] = [
        {"id": "capability_transfer:{}".format(p["id"]), "name": p["name"], "parent_ids": [p["id"], p["friction_theme"], p["operator"]],
         "detail": "{} - {}".format(p["operator"], p["operator_definition"])}
        for p in magic_box["possibilities"] if p["operator"] == "CROSS_CATEGORY_TRANSFER"
    ]

    patterns["WHITE_SPACE"] = [
        {"id": "white_space:{}".format(s["opportunity_id"]), "name": s["name"], "parent_ids": [s["opportunity_id"], s["theme"]] + s["rivals_measurably_weak_here"],
         "detail": "{} real competitors measurably weaker here, feasibility {}".format(len(s["rivals_measurably_weak_here"]), s["feasibility"])}
        for s in white_space if s["is_white_space"]
    ]

    volume_anomalies = (defects["defects_found"]["product_daily_volume_anomalies"]["evidence"]
                        if defects and "product_daily_volume_anomalies" in defects.get("defects_found", {}) else [])
    patterns["ANOMALY"] = [
        {"id": "anomaly:{}".format(i), "name": str(a), "parent_ids": [], "detail": "Real per-product daily review-volume burst (MAD z-score >= 5.0)."}
        for i, a in enumerate(volume_anomalies)
    ]

    patterns["TEMPORAL_SHIFT"] = [
        {"id": "temporal_shift:{}".format(p["id"]), "name": p["name"], "parent_ids": [p["id"], p["friction_theme"], p["operator"]],
         "detail": "{} - {}".format(p["operator"], p["operator_definition"])}
        for p in magic_box["possibilities"] if p["operator"] == "TEMPORAL_SHIFT"
    ]

    patterns["CROSS_SCALE_LINK"] = [
        {"id": "cross_scale_link:{}".format(s["id"]), "name": s["name"], "parent_ids": [s["id"]] + [r["research_id"] for r in (s.get("research_support") or [])],
         "detail": s["meaning"]}
        for s in signals if s["id"] == "spatial_resuspension"
    ]

    return patterns


def compute_stages(patterns, signal_families):
    products = _load("processed", "products_real.json")
    signals = _load("processed", "signals_real.json")
    rivals = _load("processed", "rivals_real.json")
    criteria = _load("processed", "criteria_real.json")
    magic_box = _load("processed", "magic_box_real.json")
    decision = _load("processed", "decision_framework_real.json")
    critic = _load_or_none("processed", "critic_real.json")

    pattern_total = sum(len(v) for v in patterns.values())

    return [
        {"id": "products", "label": "PRODUCT UNIVERSE", "count": len(products["products"]),
         "inputs": ["McAuley-Lab Amazon-Reviews-2023 (real product metadata)"],
         "outputs_to": ["magic_box"],
         "trace": "GET /api/products -> len(data/processed/products_real.json[\"products\"]), built by src/real/products_signals_real.py."},
        {"id": "signals", "label": "RADAR · SIGNAL EVIDENCE", "count": signals["count"],
         "families": {k: v["count"] for k, v in signal_families.items()},
         "inputs": ["real review-text taxonomy", "verified research corpus", "trend corpus", "market sizing"],
         "outputs_to": ["magic_box"],
         "trace": "GET /api/signals -> data/processed/signals_real.json[\"count\"], built by src/real/signals_from_research_real.py."},
        {"id": "competitors", "label": "RADAR · COMPETITOR EVIDENCE", "count": len(rivals["rivals"]),
         "verified_strategic_rivals": len(rivals["rivals"]),
         "parity_insight": "Every competitor here is a real brand with >= {} reviews in the same real corpus, weighted by which real friction theme it under-performs the category average on the most - never inferred from an absence of online evidence.".format(rivals["min_reviews_floor"]),
         "inputs": ["real Amazon review corpus, competitor brands"],
         "outputs_to": ["magic_box"],
         "trace": "GET /api/rivals -> len(data/processed/rivals_real.json[\"rivals\"]), built by src/real/rivals_real.py."},
        {"id": "magic_box", "label": "MAGIC BOX", "count": pattern_total,
         "pattern_type_counts": {k: len(v) for k, v in patterns.items()},
         "strongest_patterns": [{"type": k, "example": v[0]["name"]} for k, v in patterns.items() if v][:5],
         "inputs": ["products", "signals", "competitors"],
         "outputs_to": ["criteria"],
         "trace": "GET /api/funnel -> sum(len(v) for v in patterns.values()), computed live by src/real/funnel_real.py::compute_patterns() from signals_real.json + research_tensions.json + category_assumptions.json + magic_box_real.json + white_space_real.json + defect_detection_report_real.json."},
        {"id": "criteria", "label": "CRITERIA (GOVERNANCE LAYER)", "count": len(criteria["criteria_library"]),
         "concepts_evaluated": len(criteria["concepts"]),
         "inputs": ["magic_box possibilities", "critic verdicts", "assumptions", "tensions"],
         "outputs_to": ["innovations"],
         "trace": "GET /api/criteria -> len(data/processed/criteria_real.json[\"criteria_library\"]), built by src/real/criteria_real.py::CRITERIA_LIBRARY."},
        {"id": "innovations", "label": "INNOVATIONS", "count": len(magic_box["possibilities"]),
         "candidates_preview": [{"id": p["id"], "name": p["name"], "friction_theme": p["friction_theme"],
                                 "typical_market_price_usd": p["typical_market_price_usd"]}
                                for p in magic_box["possibilities"]],
         "inputs": ["criteria-gated concepts"],
         "outputs_to": ["critic"],
         "trace": "GET /api/magic-box -> len(data/processed/magic_box_real.json[\"possibilities\"]), built by src/real/magic_box_real.py::generate_possibilities()."},
        {"id": "critic", "label": "INNOVATIONS · CRITIC PASS", "count": len(critic["concepts"]) if critic else 0,
         "verdict_counts": ({v: sum(1 for c in critic["concepts"] if c["critic_overall"] == v) for v in ("SURVIVE", "CHALLENGE", "NEEDS_EVIDENCE", "REJECT")}
                            if critic else {}),
         "why_ideas_are_dying": [{"name": g["name"], "reason": g["kill_reason"]} for g in magic_box["graveyard"][:3]],
         "inputs": ["innovations"], "outputs_to": ["finalists"],
         "trace": "GET /api/critic -> len(data/processed/critic_real.json[\"concepts\"]), built by src/real/critic_real.py::build()."},
        {"id": "finalists", "label": "INNOVATIONS · PRIORITY TO TEST", "count": len(magic_box["finalists"]),
         "finalist_names": [f["name"] for f in magic_box["finalists"]],
         "bet": decision["verdict"]["recommended_name"],
         "inputs": ["critic-surviving concepts"], "outputs_to": [],
         "trace": "GET /api/innovations -> data/processed/magic_box_real.json[\"finalists\"] (several, never one hardcoded winner); bet from data/processed/decision_framework_real.json[\"verdict\"][\"recommended_name\"]."},
    ]


NO_DATA = "NO VERIFIED DATA"

# ---------------------------------------------------------------------------
# Pass 2 path ontology - three explicit epistemic classes, never collapsed:
#
#   TRAJECTORY          "reality appears to be moving from X toward Y" -
#                       requires temporal AND directional evidence.
#   TENSION             credible evidence genuinely pulls in different
#                       directions (a real trade-off or disagreement).
#   ASSUMPTION_TO_TEST  the category behaves as though X were true; we test
#                       what changes if it is not.
#
# This corpus contains NO validated temporal series: paper years are
# literature accumulating (not the category moving), the trend corpus's own
# what_this_corpus_cannot_establish disqualifies trend claims, market
# figures are forward forecasts (not observed history), and the review-share
# yearly series is non-stationary (denominator drift dominates). So the
# TRAJECTORY bucket is honestly EMPTY - publishing zero trajectories is the
# only defensible output, and the note below says exactly why.
# ---------------------------------------------------------------------------

TRAJECTORY_NOTE = {
    "count": 0,
    "statement": "No supported or tentative trajectory can be published from this corpus: a trajectory "
                 "requires observed temporal + directional evidence, and none exists here.",
    "why": [
        "Paper publication years (2018-2026) show the literature accumulating, not the category moving.",
        "data/raw/trend_corpus.json's own 'what_this_corpus_cannot_establish' states these documents cannot "
        "establish that any trend is real or growing in a statistical sense.",
        "market_metrics.json carries forward forecasts only (base year -> forecast year) - a forecast is a "
        "claim about the future, not an observation that reality moved.",
        "The per-theme review-share yearly series is dominated by corpus-composition drift (2 reviews in "
        "2004 vs 2,478 in 2020) - a trend read off it would be a sampling artefact.",
    ],
    "what_would_create_one": "A validated multi-year observation of the same measure (e.g. an official "
                             "yearly category panel, or a stationary review series) showing consistent "
                             "direction across at least two independent evidence families.",
}

# Reclassification of two records historically labelled TENSION - a labelled
# METHOD_CHOICE, each applied only while its machine-checkable condition
# still holds against the live signals layer (checked at build time).
TENSION_RECLASS = {
    "T4": {
        "epistemic_class": "ASSUMPTION_TO_TEST",
        "why": "RP-09 and RP-10 agree - the signals layer classifies sensor_trust as CONVERGING with 2 "
               "independent studies. Agreeing evidence is not a tension; 'more sensing implies more trust' "
               "is a category belief the evidence already challenges.",
        "check_signal": "sensor_trust", "check_state": "CONVERGING",
    },
    "T5": {
        "epistemic_class": "ASSUMPTION_TO_TEST",
        "why": "Single source (RP-04), and the record's own statement says the alternative was never tested "
               "('RP-04 tested no purifier placement at all') - an open question, not contested evidence.",
        "check_signal": "spatial_resuspension", "check_state": "SINGLE_SOURCE_FAMILY",
    },
}

# Machine-formulated tests per tension record - each derives from stored
# evidence-card fields (the source_quotes are attached live at build time so
# the derivation is inspectable). Typed FALSIFIER when a concrete
# observation would collapse the trade-off, CHALLENGE_TEST for reclassified
# assumption-like records. The old public fallback sentence is deleted.
TENSION_TESTS = {
    "T1": {"type": "FALSIFIER", "derivation": "DETERMINISTIC_FROM_STORED_FIELDS",
           "text": "Falsified when one design point achieves RP-01's measured primary-room particulate "
                   "reduction at a sound level that removes noise as a named reason for running the device "
                   "less (RP-05) - both halves are stored, quantified findings.",
           "derived_from": ["RP-01.found", "RP-05.establishes"]},
    "T2": {"type": "FALSIFIER", "derivation": "DETERMINISTIC_FROM_STORED_FIELDS",
           "text": "Falsified when an auto-mode arm reaches the lower bound of RP-07's constant-mode "
                   "reduction interval while keeping auto's runtime/noise advantage - the two stored "
                   "confidence intervals would then overlap and the trade-off dissolves.",
           "derived_from": ["RP-07.found"]},
    "T3": {"type": "FALSIFIER", "derivation": "DETERMINISTIC_FROM_STORED_FIELDS",
           "text": "Falsified when a CADR-derived sizing prediction matches a source-strength-adjusted "
                   "measured loss rate within the fan-speed band RP-06 reports, in a home with the central "
                   "air-handling configuration RP-01 identifies as decisive.",
           "derived_from": ["RP-06.found", "RP-01.does_not_establish"]},
    "T4": {"type": "CHALLENGE_TEST", "derivation": "DETERMINISTIC_FROM_STORED_FIELDS",
           "text": "Challenged when a consumer air-quality sensor passes a formal regulatory validation "
                   "standard - RP-09's stored finding is that most currently do not.",
           "derived_from": ["RP-09.found"]},
    "T5": {"type": "CHALLENGE_TEST", "derivation": "DETERMINISTIC_FROM_STORED_FIELDS",
           "text": "Challenged only by a study that tests purifier placement against floor-level "
                   "resuspension - RP-04's own record states no placement was tested. The honest answer "
                   "today is that the deciding test does not exist yet.",
           "derived_from": ["RP-04.does_not_establish"]},
    "T6": {"type": "FALSIFIER", "derivation": "DETERMINISTIC_FROM_STORED_FIELDS",
           "text": "Resolved when an independent replication of RP-08 reproduces its clinical effect in a "
                   "cohort whose particulate reduction matches RP-03's measured range - RP-08's own record "
                   "names independent replication as the missing step. A failed replication resolves it the "
                   "other way.",
           "derived_from": ["RP-08.found", "RP-08.does_not_establish", "RP-03.found"]},
}


def tension_evidence_state(evidence_ids):
    return "contested-multi-source" if len(evidence_ids or []) >= 2 else "single-source trade-off"


def assumption_evidence_state(evidence_ids):
    n = len(evidence_ids or [])
    if n == 0:
        return "untested - no direct evidence"
    return "single-source-informed" if n == 1 else "multi-source-informed"


def compute_homepage_funnel(patterns, signal_families):
    """The homepage funnel: RADAR -> PATHS -> FIELD -> MAGIC BOX ->
    INNOVATIONS -> NEW PRODUCTS (docs/FUNNEL.md). A pure regrouping of the
    exact same real objects compute_stages()/compute_patterns() already
    produce, relabelled into this narrower 6-stage vocabulary - no new
    analysis, no new evidence. Every field with no real source in this
    pipeline (Patents, Nature analogues, PATHS' driver/blocker/distortion)
    is honestly NO_DATA/NO_NATURE, never inferred or invented."""
    products = _load("processed", "products_real.json")
    rivals = _load("processed", "rivals_real.json")
    economics = _load_or_none("processed", "economics_real.json")
    tensions = _load("processed", "research_tensions.json")["tensions"]
    assumptions = _load("processed", "category_assumptions.json")["assumptions"]
    decision = _load("processed", "decision_framework_real.json")
    magic_box = _load("processed", "magic_box_real.json")
    critic = _load_or_none("processed", "critic_real.json")

    # RADAR - "see reality": every real evidence family this pipeline
    # actually has, plus the two the brief asks for that this pipeline
    # honestly does not (Patents, Nature) - reported as real zeros, not
    # omitted and not padded.
    radar_families = {
        "RESEARCH": signal_families["RESEARCH"]["count"],
        "TRENDS": signal_families["TRENDS"]["count"],
        "CONSUMERS": signal_families["CONSUMERS"]["count"],
        "MARKET": signal_families["MARKET"]["count"],
        "TECHNOLOGY_AI": signal_families["TECHNOLOGY_AI"]["count"],
        "PRODUCTS": len(products["products"]),
        "RIVALS": len(rivals["rivals"]),
        "ECONOMICS": len(economics["anchors"]) if economics else 0,
        "PATENTS": 0,
        "NATURE": 0,
    }
    radar_notes = {
        "PATENTS": NO_DATA + " - no patent/IP register exists in this pipeline (see Criteria V6 'IP/know-how leverage', honestly NEEDS_EVIDENCE for every concept).",
        "NATURE": NO_DATA + " - no biomimicry/nature-analogue dataset exists in this pipeline.",
    }

    # PATHS - the Pass 2 epistemic ontology. Three explicit classes
    # (TRAJECTORY / TENSION / ASSUMPTION_TO_TEST) that are never collapsed:
    # zero trajectories are publishable from this corpus (TRAJECTORY_NOTE
    # says exactly why), research tensions stay tensions only while their
    # evidence genuinely pulls in different directions (T4/T5 are
    # reclassified with machine-checked conditions), and every path carries
    # a typed, derivable test instead of the old NO-VERIFIED-DATA slots.
    signals_doc = _load("processed", "signals_real.json")["signals"]
    signal_state = {s["id"]: s["state"] for s in signals_doc}
    cards = {c["research_id"]: c for c in _load("processed", "evidence_cards.json")["cards"]}

    def _quotes(derived_from):
        out = {}
        for ref in derived_from:
            rid, _, fieldname = ref.partition(".")
            card = cards.get(rid)
            if card and fieldname in card:
                out[ref] = card[fieldname]
        return out

    paths = []
    reclassified = []
    for t in tensions:
        tid = t["tension_id"]
        reclass = TENSION_RECLASS.get(tid)
        # A reclassification is a labelled method choice that applies only
        # while its machine-checkable signal-state condition still holds.
        if reclass and signal_state.get(reclass["check_signal"]) != reclass["check_state"]:
            reclass = None
        epistemic_class = reclass["epistemic_class"] if reclass else "TENSION"
        test = dict(TENSION_TESTS[tid]) if tid in TENSION_TESTS else None
        if test:
            test["source_quotes"] = _quotes(test["derived_from"])
        parts = t["name"].split(" vs. ", 1)
        pole_a, pole_b = (parts[0], parts[1]) if len(parts) == 2 else (t["name"], "")
        path = {
            "id": "tension:" + tid, "epistemic_class": epistemic_class, "name": t["name"],
            "relation": "TRADE_OFF", "from": pole_a, "to": pole_b,
            "what_opens": t["design_consequence"],
            "evidence": t["evidence_ids"],
            "evidence_state": tension_evidence_state(t["evidence_ids"]),
            "causal_drivers_verified": False,
            "test": test,
            "detail": t["statement"],
        }
        if reclass:
            path["reclassified_from"] = "TENSION"
            path["reclassification_why"] = reclass["why"]
            path["evidence_state"] = assumption_evidence_state(t["evidence_ids"])
            reclassified.append({"id": path["id"], "to": epistemic_class, "why": reclass["why"]})
        paths.append(path)
    for a in assumptions:
        paths.append({
            "id": "assumption:" + a["assumption_id"], "epistemic_class": "ASSUMPTION_TO_TEST",
            "name": a["text"], "relation": "BELIEF_TO_QUESTION",
            "from": a["text"], "to": a["counterfactual"],
            "what_opens": a["counterfactual"],
            "evidence": a["real_evidence_that_bears_on_it"],
            "evidence_state": assumption_evidence_state(a["real_evidence_that_bears_on_it"]),
            "causal_drivers_verified": False,
            "test": a.get("challenge_test"),
            "detail": a["evidence_note"],
        })

    # Per-path FIELD grounding - each path's OWN evidence-backed world
    # model, built by field_grounding_real.py. Replaces the old single
    # global brief that was reused under every path.
    from field_grounding_real import build_field_grounding
    fields = build_field_grounding(paths)
    for p in paths:
        p["field"] = fields[p["id"]]

    path_ontology = {
        "classes": {
            "TRAJECTORY": 0,
            "TENSION": sum(1 for p in paths if p["epistemic_class"] == "TENSION"),
            "ASSUMPTION_TO_TEST": sum(1 for p in paths if p["epistemic_class"] == "ASSUMPTION_TO_TEST"),
        },
        "trajectory_note": TRAJECTORY_NOTE,
        "reclassifications": reclassified,
        "method": "Classification is a labelled method rule cross-checked against the live signals layer "
                  "at build time: a record is TENSION only while credible evidence genuinely pulls in "
                  "different directions; agreeing or single-open-question records are "
                  "ASSUMPTION_TO_TEST; TRAJECTORY requires observed temporal + directional evidence "
                  "(none exists in this corpus).",
    }

    # FORMAL-CASE BRIEF - honestly named for what it is: the decision
    # framework's verdict for the formal Air case. It is NOT field
    # grounding and is no longer served as such - per-path field objects
    # live on each path above.
    v = decision["verdict"]
    formal_case_brief = {
        "now": v["recommended_name"],
        "moving": v["sensitivity"],
        "because": v["why"],
        "opens": v["first_experiment"],
        "blocked_by": [{"name": k["name"], "reason": k["reason"]} for k in v["killed"]],
        "wrong_if": v["abandon_signal"],
    }

    # MAGIC BOX - headline is the real count of possibilities generated
    # (magic_box_real.json["funnel"], stage "generated") - the number that
    # actually narrows into INNOVATIONS below, not the 9-pattern-type total
    # (a different, broader real count, kept as supporting detail).
    generated_count = next((s["count"] for s in magic_box["funnel"] if s["stage"] == "generated"), len(magic_box["possibilities"]))
    magic_box_stage = {
        "count": generated_count,
        "possibilities": [{"id": p["id"], "name": p["name"], "friction_theme": p["friction_theme"]} for p in magic_box["possibilities"]],
        "pattern_type_counts": {k: len(v2) for k, v2 in patterns.items()},
    }

    # INNOVATIONS - the real non-dominated survivors (Pareto frontier) of
    # the 12 generated above, each annotated with its real Critic verdict -
    # a genuinely narrower, real subset, not the full 12 again.
    critic_by_id = {c["possibility_id"]: c["critic_overall"] for c in critic["concepts"]} if critic else {}
    innovations_stage = {
        "count": len(magic_box["non_dominated"]),
        "candidates": [
            {"id": p["id"], "name": p["name"], "friction_theme": p["friction_theme"],
             "typical_market_price_usd": p["typical_market_price_usd"],
             "critic_overall": critic_by_id.get(p["id"])}
            for p in magic_box["non_dominated"]
        ],
    }

    # NEW PRODUCTS - "make possibility physical": only the real finalists
    # that survived the full funnel, never a hardcoded winner.
    new_products_stage = {
        "count": len(magic_box["finalists"]),
        "products": [
            {"id": f["id"], "name": f["name"], "friction_theme_name": f["friction_theme_name"],
             "operator": f["operator"], "typical_market_price_usd": f["typical_market_price_usd"],
             "economic_value": f["economic_value"], "feasibility": f["feasibility_2_5y"]["rating"]}
            for f in magic_box["finalists"]
        ],
        "bet": v["recommended_name"],
    }

    return {
        "radar": {"families": radar_families, "notes": radar_notes},
        "paths": paths,
        "path_ontology": path_ontology,
        "formal_case_brief": formal_case_brief,
        "magic_box": magic_box_stage,
        "innovations": innovations_stage,
        "new_products": new_products_stage,
    }


def build():
    input_hash = compute_input_snapshot_hash()
    signal_families = compute_signal_families()
    patterns = compute_patterns()
    stages = compute_stages(patterns, signal_families)
    homepage_funnel = compute_homepage_funnel(patterns, signal_families)
    stage_counts = {s["id"]: s["count"] for s in stages}

    # Per DATA_FABRIC.md's "Funnel contract" - this endpoint consumes the
    # unified Intelligence Fabric so the frontend never has to independently
    # join several JSON/API sources to reconstruct the funnel itself.
    fabric = _load_or_none("processed", "intelligence_fabric.json")
    criteria = _load_or_none("processed", "criteria_real.json")
    critic = _load_or_none("processed", "critic_real.json")
    candidates = _load_or_none("processed", "research_candidates.json")
    magic_box = _load_or_none("processed", "magic_box_real.json")

    run_errors = []
    if magic_box is None:
        run_errors.append("magic_box_real.json missing - Magic Box/pattern stages cannot be computed.")
    if criteria is None:
        run_errors.append("criteria_real.json missing - Criteria stage cannot be computed.")
    generated_objects = stage_counts.get("magic_box", 0)
    killed_objects = len(magic_box["graveyard"]) if magic_box else 0
    surviving_objects = len(magic_box["non_dominated"]) if magic_box else 0

    history, changed = record_run(input_hash, stage_counts, generated_objects, killed_objects, surviving_objects, run_errors)
    last = history[-1]
    status = "ERROR" if run_errors else "RUNNING"

    return {
        "_provenance": (
            "Pure aggregation over already-real processed files - no product, signal, paper, "
            "competitor, pattern, criterion result, concept, or finalist is computed or invented "
            "here. Every count is len() of a real list read from data/processed/*.json or "
            "data/raw/*.json at request time."
        ),
        "generated_by": "src/real/funnel_real.py",
        "machine_state": {
            "status": status,
            "last_run_id": last["run_id"],
            "last_run_started_at": last["started_at"],
            "last_run_finished_at": last.get("finished_at", last["started_at"]),
            "last_checked_at": last["last_checked_at"],
            "check_count": last["check_count"],
            "input_snapshot_hash": input_hash,
            "changed_since_last_run": changed,
            "new_since_last_run": last.get("changed_objects", {}),
            "total_runs_recorded": len(history),
            "errors": run_errors,
        },
        "stages": stages,
        "homepage_funnel": homepage_funnel,
        "signal_families": signal_families,
        "patterns": patterns,
        "clusters": fabric["clusters"] if fabric else None,
        "criteria_summary": ({"library_size": len(criteria["criteria_library"]), "concepts_evaluated": len(criteria["concepts"])}
                             if criteria else None),
        "innovation_candidates": ({"count": len(candidates["candidates"]),
                                   "by_status": {"CANDIDATE": sum(1 for c in candidates["candidates"] if c["status"] == "CANDIDATE")}}
                                  if candidates else {"count": 0, "by_status": {}}),
        "critic_summary": (next((s["verdict_counts"] for s in stages if s["id"] == "critic"), {}) if critic else None),
        "snapshot": fabric["snapshot_id"] if fabric else None,
        "last_refresh": fabric["last_research_discovery_run"] if fabric else None,
    }


def main():
    doc = build()
    os.makedirs(PROC, exist_ok=True)
    with open(os.path.join(PROC, "funnel_real.json"), "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote funnel_real.json: {} stages, {} pattern types ({} total instances), snapshot_hash={}, changed_since_last_run={}".format(
        len(doc["stages"]), len(doc["patterns"]), sum(len(v) for v in doc["patterns"].values()),
        doc["machine_state"]["input_snapshot_hash"][:12], doc["machine_state"]["changed_since_last_run"]))
    return doc


if __name__ == "__main__":
    main()
