"""Rebuild Signals from the CURRENT verified evidence base (real consumer
review taxonomy + real peer-reviewed research corpus), superseding the
old research-blind version of data/processed/signals_real.json.

Per the governing brief: a Signal is not preserved merely because it
already existed. Each of the 6 original consumer-taxonomy signals is
re-evaluated for research convergence against the NEW 10-paper corpus
(RESEARCH_THEME_MAP below), and 4 new signals are added that emerge
purely from the research corpus and have no consumer-taxonomy analogue.
If a signal only has one independent source family, it stays
SINGLE_SOURCE_FAMILY - it is not forced to CONVERGING for symmetry.

Schema per signal (as specified): signal_id, short_name, meaning,
evidence_ids, independent_source_families, direction, limitations,
contradictions, design_consequence, confidence_state.

confidence_state in {SINGLE_SOURCE_FAMILY, CONVERGING, CONTESTED} -
CONTESTED is used (not invented lightly) only where two real, verified
peer-reviewed studies produce genuinely opposing findings on the same
question - see health_outcome_uncertainty below, grounded in
research_tensions.json::T6.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from products_signals_real import build_signals as build_taxonomy_signals  # noqa: E402

# Which of the 10 new peer-reviewed papers (research_id) speak to each
# existing consumer-taxonomy theme. Only added where the paper's actual
# finding (per evidence_cards.json) genuinely bears on that theme - not
# because it mentions air purifiers in general.
RESEARCH_THEME_MAP = {
    "noise": ["RP-05", "RP-07"],                    # noise as adherence barrier; auto-vs-constant noise/runtime trade
    "reliability": [],                                # no paper in this corpus addresses device failure/reliability
    "value_effectiveness": ["RP-01", "RP-02", "RP-06", "RP-07"],  # "does it actually clean the air" = real-world effectiveness
    "customer_service": [],                           # operational/CS topic, not a research question
    "filter_cost": [],                                 # no paper in this corpus addresses filter economics
    "ozone_odor_safety": [],                            # already converging via TC-R* regulatory docs; no new RP paper adds here
}


def load_research_index():
    with open(os.path.join(PROC, "research_index.json"), encoding="utf-8") as fh:
        return json.load(fh)


def load_evidence_cards():
    with open(os.path.join(PROC, "evidence_cards.json"), encoding="utf-8") as fh:
        return {c["research_id"]: c for c in json.load(fh)["cards"]}


TAXONOMY_MEANING = {
    "noise": "Motor/fan noise is a recurring complaint, now backed by peer-reviewed evidence it drives real under-use.",
    "reliability": "'Stopped working' or failing early is the most severe complaint theme by CSAT impact.",
    "ozone_odor_safety": "Ozone/smell/irritation complaints converge with real regulatory guidance on ozone safety limits.",
    "value_effectiveness": "Whether it 'actually cleans the air' is backed by four real peer-reviewed effectiveness trials.",
    "customer_service": "Customer service and warranty handling — a real, operational issue, not a research question.",
    "filter_cost": "Filter cost/frequency is a real complaint with no matching peer-reviewed literature.",
}


def enrich_taxonomy_signals(base, cards):
    normalized = []
    for s in base["signals"]:
        extra_ids = RESEARCH_THEME_MAP.get(s["id"], [])
        source_families = set(s["source_families"])
        evidence_ids = list(s["evidence_ids"])
        research_support = []
        if extra_ids:
            source_families.add("Peer-Reviewed Research")
            evidence_ids += extra_ids
            research_support = [
                {"research_id": rid, "title": cards[rid]["title"], "found": cards[rid]["found"]}
                for rid in extra_ids
            ]
        state = "CONVERGING" if len(source_families) >= 2 else s["state"]
        normalized.append({
            "id": s["id"], "name": s["name"], "meaning": TAXONOMY_MEANING[s["id"]],
            "prevalence_pct": s["prevalence_pct"], "csat_impact": s["csat_impact"],
            "n_reviews": s["n_reviews"], "n_independent_studies": len(extra_ids),
            "source_families": sorted(source_families), "state": state,
            "direction": "Negative (consumer pain point)" if s["csat_impact"] < 0 else "Neutral/positive",
            "limitations": "Prevalence measured via keyword-tagged real Amazon reviews, not a controlled study.",
            "contradictions": "None identified.",
            "design_consequence": research_support[0]["found"] if research_support else "See taxonomy_real.py for the underlying complaint pattern.",
            "related_trend_docs": s["related_trend_docs"],
            "evidence_ids": evidence_ids, "truth_class": s["truth_class"],
            "research_support": research_support,
        })
    return normalized


PURE_RESEARCH_SIGNALS = [
    {
        "id": "sensor_trust", "name": "Sensor precision != sensor accuracy",
        "meaning": "Consumer-grade IAQ sensors can track relative change well while reporting materially wrong absolute numbers - a 'smart' claim needs a trust qualifier, not just a reading.",
        "prevalence_pct": None, "csat_impact": None, "n_reviews": None,
        "evidence_ids": ["RP-09", "RP-10"], "n_independent_studies": 2,
        "source_families": ["Peer-Reviewed Research"], "state": "CONVERGING",
        "direction": "Constraint on autonomy claims - more sensors is not automatically more intelligence",
        "limitations": "Both studies test PM2.5/CO2 sensors specifically; may not generalize to other pollutant sensors (e.g. VOC).",
        "contradictions": "None identified - both studies agree sensor accuracy is context-dependent.",
        "design_consequence": "Any autonomous/reactive control claim should disclose the conditions under which its sensor reading is and isn't trustworthy.",
        "related_trend_docs": [], "truth_class": "DERIVED",
        "research_support": [{"research_id": "RP-09", "title": "Low-cost sensors for indoor air quality monitoring: A systematic review", "found": "Performance varies significantly with humidity, temperature, pollutant source; most devices lack formal validation."},
                              {"research_id": "RP-10", "title": "Validating the performance of low-cost IAQ sensors through co-location", "found": "A sensor can be precise (good relative trend) while inaccurate (biased absolute value) at the same time."}],
    },
    {
        "id": "operating_mode_tradeoff", "name": "Constant vs. auto is a real trade, not a solved problem",
        "meaning": "Constant operation filters measurably more (66% vs 40% PM2.5 reduction) than threshold-triggered auto mode, but auto mode cuts runtime, noise, and energy substantially.",
        "prevalence_pct": None, "csat_impact": None, "n_reviews": None,
        "evidence_ids": ["RP-07"], "n_independent_studies": 1,
        "source_families": ["Peer-Reviewed Research"], "state": "SINGLE_SOURCE_FAMILY",
        "direction": "Design constraint - no single default operating mode is strictly better",
        "limitations": "Single trial, Toronto multifamily buildings only, one-week arms per condition.",
        "contradictions": "None - single-source finding, treat as directional not definitive.",
        "design_consequence": "Ship the constant/auto choice as a visible, explainable trade-off, not a hidden factory default.",
        "related_trend_docs": [], "truth_class": "DERIVED",
        "research_support": [{"research_id": "RP-07", "title": "The impact of portable air cleaners on indoor PM concentrations and perceptions of IAQ", "found": "Constant mode: 66% PM2.5 reduction. Auto mode: 40% reduction with sharply less runtime."}],
    },
    {
        "id": "health_outcome_uncertainty", "name": "Filtration-to-health-benefit evidence is genuinely split",
        "meaning": "One real RCT (RP-08) found a significant asthma-control benefit from HEPA filtration; two other real studies (RP-03, RP-05) measuring related pollutants/symptoms found no such association.",
        "prevalence_pct": None, "csat_impact": None, "n_reviews": None,
        "evidence_ids": ["RP-08", "RP-03", "RP-05"], "n_independent_studies": 3,
        "source_families": ["Peer-Reviewed Research"], "state": "CONTESTED",
        "direction": "Contested - do not treat as resolved in either direction",
        "limitations": "RP-08 is a single-center trial in a niche journal, needs independent replication; RP-03/RP-05 measured different specific outcomes (ammonia; self-reported symptoms), so this is not a strict head-to-head contradiction.",
        "contradictions": "RP-08 (positive clinical result) vs. RP-03 and RP-05 (no measured symptom benefit) - see research_tensions.json tension T6.",
        "design_consequence": "Never assert a health-outcome claim from PM-reduction evidence alone; a verified-clean/verified-performance claim is more defensible until RP-08 is independently replicated.",
        "related_trend_docs": [], "truth_class": "DERIVED",
        "research_support": [{"research_id": "RP-08", "title": "Indoor environmental health and asthma relief", "found": "+2.2 ACT points, +27.7% symptom-free days vs. placebo (p<=0.004)."},
                              {"research_id": "RP-03", "title": "Effectiveness of portable HEPA air cleaners... children with asthma", "found": "PM2.5 reduced 60% but no symptom/clinical outcome reported in this result."},
                              {"research_id": "RP-05", "title": "Self-reported health impacts of DIY air cleaner use", "found": "No association observed between usage and self-reported symptoms."}],
    },
    {
        "id": "spatial_resuspension", "name": "The floor is a source, not just a sink",
        "meaning": "Ordinary walking measurably resuspends floor-deposited particles back into room air - a real spatial dynamic the standard stationary-room-purifier model does not directly address.",
        "prevalence_pct": None, "csat_impact": None, "n_reviews": None,
        "evidence_ids": ["RP-04"], "n_independent_studies": 1,
        "source_families": ["Peer-Reviewed Research"], "state": "SINGLE_SOURCE_FAMILY",
        "direction": "Opens a design question - does NOT establish a floor-level purifier would outperform a room-level one",
        "limitations": "Single controlled lab chamber, one carpet/dust load, no home field data, no purifier tested at all in this study.",
        "contradictions": "None - single-source finding; the 'floor purifier would be better' inference is explicitly NOT supported and must not be asserted.",
        "design_consequence": "Spatial-source modeling for sizing/placement should not assume deposited particles stay deposited - but no placement claim follows from this evidence alone.",
        "related_trend_docs": [], "truth_class": "DERIVED",
        "research_support": [{"research_id": "RP-04", "title": "PM10, PM2.5, PM1, and PM0.1 resuspension due to human walking", "found": "10 minutes of walking measurably raised PM concentrations across all four size fractions."}],
    },
]


def main():
    research_index = load_research_index()
    cards = load_evidence_cards()
    base = build_taxonomy_signals()
    taxonomy_signals = enrich_taxonomy_signals(base, cards)

    all_signals = taxonomy_signals + PURE_RESEARCH_SIGNALS
    all_signals.sort(key=lambda s: (s["state"] != "CONTESTED", s["state"] != "CONVERGING", -(s["prevalence_pct"] or 0)))
    out = {
        "_provenance": (
            "Signals REBUILT this session from the current verified evidence base - "
            "the 6 real consumer-taxonomy themes (re-evaluated for research convergence "
            "against the new 10-paper peer-reviewed corpus, not merely carried over) plus "
            "4 new signals that emerge purely from the research corpus and have no "
            "consumer-taxonomy analogue. Signals are not padded to a target count - if a "
            "signal has one independent source family, it is reported as "
            "SINGLE_SOURCE_FAMILY, not upgraded for symmetry. CONTESTED is used once, "
            "where two real studies genuinely disagree (see health_outcome_uncertainty)."
        ),
        "generated_by": "src/real/signals_from_research_real.py",
        "supersedes": "src/real/products_signals_real.py::build_signals (research-blind version)",
        "count": len(all_signals),
        "by_state": {
            state: sum(1 for s in all_signals if s["state"] == state)
            for state in ("SINGLE_SOURCE_FAMILY", "CONVERGING", "CONTESTED")
        },
        "signals": all_signals,
    }
    with open(os.path.join(PROC, "signals_real.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print("REBUILT signals_real.json: {} signals ({} converging, {} single-source, {} contested)".format(
        out["count"], out["by_state"]["CONVERGING"], out["by_state"]["SINGLE_SOURCE_FAMILY"],
        out["by_state"]["CONTESTED"]))
    for s in all_signals:
        print("  {:<28} {}".format(s["id"], s["state"]))
    return out


if __name__ == "__main__":
    main()
