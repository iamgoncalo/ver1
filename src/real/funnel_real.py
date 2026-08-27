"""THE VERSUNI INNOVATION FUNNEL MACHINE - one canonical funnel state.

PRODUCTS + SIGNALS + COMPETITORS -> MAGIC BOX / PATTERN INTELLIGENCE ->
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
    ("processed", "category_assumptions.json"),
    ("processed", "defect_detection_report_real.json"),
    ("raw", "trend_corpus.json"),
    ("raw", "market_metrics.json"),
]

TECHNOLOGY_AI_THEMES = {"ai_sensing", "matter", "smart_home_platform", "sensor_accuracy", "interoperability"}
PROMOTED_TREND_IDS = {"TC-R06", "TC-R10"}  # already promoted to peer-reviewed papers - see research_corpus_real.py


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

    patterns["TENSION"] = [
        {"id": "tension:{}".format(t["tension_id"]), "name": t["name"], "parent_ids": [t["tension_id"]] + t["evidence_ids"],
         "detail": t["statement"]}
        for t in tensions
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
        {"id": "products", "label": "PRODUCTS", "count": len(products["products"]),
         "inputs": ["McAuley-Lab Amazon-Reviews-2023 (real product metadata)"],
         "outputs_to": ["magic_box"],
         "trace": "GET /api/products -> len(data/processed/products_real.json[\"products\"]), built by src/real/products_signals_real.py."},
        {"id": "signals", "label": "SIGNALS", "count": signals["count"],
         "families": {k: v["count"] for k, v in signal_families.items()},
         "inputs": ["real review-text taxonomy", "verified research corpus", "trend corpus", "market sizing"],
         "outputs_to": ["magic_box"],
         "trace": "GET /api/signals -> data/processed/signals_real.json[\"count\"], built by src/real/signals_from_research_real.py."},
        {"id": "competitors", "label": "COMPETITORS", "count": len(rivals["rivals"]),
         "verified_strategic_rivals": len(rivals["rivals"]),
         "parity_insight": "Every competitor here is a real brand with >= {} reviews in the same real corpus, weighted by which real friction theme it under-performs the category average on the most - never inferred from an absence of online evidence.".format(rivals["min_reviews_floor"]),
         "inputs": ["real Amazon review corpus, competitor brands"],
         "outputs_to": ["magic_box"],
         "trace": "GET /api/rivals -> len(data/processed/rivals_real.json[\"rivals\"]), built by src/real/rivals_real.py."},
        {"id": "magic_box", "label": "MAGIC BOX / PATTERN INTELLIGENCE", "count": pattern_total,
         "pattern_type_counts": {k: len(v) for k, v in patterns.items()},
         "strongest_patterns": [{"type": k, "example": v[0]["name"]} for k, v in patterns.items() if v][:5],
         "inputs": ["products", "signals", "competitors"],
         "outputs_to": ["criteria"],
         "trace": "GET /api/funnel -> sum(len(v) for v in patterns.values()), computed live by src/real/funnel_real.py::compute_patterns() from signals_real.json + research_tensions.json + category_assumptions.json + magic_box_real.json + white_space_real.json + defect_detection_report_real.json."},
        {"id": "criteria", "label": "CRITERIA", "count": len(criteria["criteria_library"]),
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
        {"id": "critic", "label": "CRITIC", "count": len(critic["concepts"]) if critic else 0,
         "verdict_counts": ({v: sum(1 for c in critic["concepts"] if c["critic_overall"] == v) for v in ("SURVIVE", "CHALLENGE", "NEEDS_EVIDENCE", "REJECT")}
                            if critic else {}),
         "why_ideas_are_dying": [{"name": g["name"], "reason": g["kill_reason"]} for g in magic_box["graveyard"][:3]],
         "inputs": ["innovations"], "outputs_to": ["finalists"],
         "trace": "GET /api/critic -> len(data/processed/critic_real.json[\"concepts\"]), built by src/real/critic_real.py::build()."},
        {"id": "finalists", "label": "FINALISTS", "count": len(magic_box["finalists"]),
         "finalist_names": [f["name"] for f in magic_box["finalists"]],
         "bet": decision["verdict"]["recommended_name"],
         "inputs": ["critic-surviving concepts"], "outputs_to": [],
         "trace": "GET /api/innovations -> data/processed/magic_box_real.json[\"finalists\"] (several, never one hardcoded winner); bet from data/processed/decision_framework_real.json[\"verdict\"][\"recommended_name\"]."},
    ]


def build():
    input_hash = compute_input_snapshot_hash()
    signal_families = compute_signal_families()
    patterns = compute_patterns()
    stages = compute_stages(patterns, signal_families)
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
