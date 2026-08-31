"""Real Critic verdicts for Magic Box possibilities/finalists - and
Concept Evolution stage derivation - built ONLY from real signals already
computed by magic_box_real.py. No LLM, no fabricated confidence.

Critic dimensions the brief asks for: HUMAN, EVIDENCE, PHYSICAL, ECONOMIC,
COMPETITIVE, VERSUNI_FIT, TIMING, ROBUSTNESS. This corpus only carries real
evidence for three of them - EVIDENCE (the real Consumer Pain gate),
ECONOMIC (real price-weighted exposure vs. the corpus median), and
COMPETITIVE (real rivals measurably weak here). The other five dimensions
have no real signal anywhere in this pipeline (no physical-feasibility
lab data, no Versuni-org-fit assessment, no timing/market-window data, no
robustness/sensitivity study) - each is honestly reported as
NEEDS_EVIDENCE, not guessed, per the explicit "no fake confidence" rule.

Concept Evolution stage is derived from the possibility's real position in
the already-computed funnel (generated -> gate -> evidence -> non-dominated
-> finalist) plus graveyard membership - not a separate invented state
machine.
"""
import json
import os
import statistics

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")

VERDICTS = ("SURVIVE", "CHALLENGE", "NEEDS_EVIDENCE", "REJECT")


def load(name):
    with open(os.path.join(PROC, name), encoding="utf-8") as fh:
        return json.load(fh)


def critic_evidence_dimension(p):
    if not p["gate_passed"]:
        return "REJECT", "Consumer Pain evidence-sufficiency gate failed - no real, materially-prevalent friction to build against."
    if p["consumer_pain_prevalence_pct"] and p["consumer_pain_prevalence_pct"] >= 2.0:
        return "SURVIVE", "Real Consumer Pain evidence: prevalence {}%, average rating gap {} - materially above the gate floor.".format(
            p["consumer_pain_prevalence_pct"], p["consumer_pain_csat"])
    return "CHALLENGE", "Gate passed but prevalence ({}%) is only marginally above the materiality floor - thin evidence base.".format(
        p["consumer_pain_prevalence_pct"])


def critic_economic_dimension(p, median_value):
    if p["economic_value"] is None:
        return "NEEDS_EVIDENCE", "No real price-weighted exposure computed (gate failed upstream)."
    if p["economic_value"] >= median_value:
        return "SURVIVE", "Real price-weighted exposure (${:,.0f}) is at or above the corpus median (${:,.0f}).".format(
            p["economic_value"], median_value)
    return "CHALLENGE", "Real price-weighted exposure (${:,.0f}) is below the corpus median (${:,.0f}) - a real but comparatively modest signal.".format(
        p["economic_value"], median_value)


def critic_competitive_dimension(p):
    if p["is_white_space"] and len(p["competitor_gap_brands"]) >= 2:
        return "SURVIVE", "Real white space: {} named real rivals are measurably weaker on this theme.".format(
            len(p["competitor_gap_brands"]))
    if p["competitor_gap_brands"]:
        return "CHALLENGE", "{} rival(s) weak here, but below the 2-rival white-space threshold.".format(
            len(p["competitor_gap_brands"]))
    return "NEEDS_EVIDENCE", "No real rival-weakness data recorded for this friction theme."


UNASSESSED_DIMENSIONS = {
    "HUMAN": "No real usability/human-factors evidence exists in this pipeline for this concept.",
    "PHYSICAL": "No real lab/engineering feasibility data exists in this pipeline for this concept.",
    "VERSUNI_FIT": "No real organizational-capability assessment exists in this pipeline for this concept.",
    "TIMING": "No real market-timing/window evidence exists in this pipeline for this concept.",
    "ROBUSTNESS": "No real sensitivity/robustness study exists in this pipeline for this concept.",
}


def overall_verdict(dimension_verdicts):
    values = [v for v, _ in dimension_verdicts.values()]
    if "REJECT" in values:
        return "REJECT"
    if all(v == "SURVIVE" for v in values if v != "NEEDS_EVIDENCE"):
        return "SURVIVE" if "NEEDS_EVIDENCE" not in values else "NEEDS_EVIDENCE"
    if "CHALLENGE" in values:
        return "CHALLENGE"
    return "NEEDS_EVIDENCE"


def evolution_stage(possibility_id, funnel_sets, critic_overall, graveyard_ids):
    """Evidence-driven stage, never a tournament placement: a possibility
    reaches the top stage by clearing the SAME dominance screen and Critic
    verdict every possibility is evaluated against - never by ranking
    against its siblings. (Magic Box's own internal top-3-by-pain
    'finalists' funnel-stage data still exists as a documented pipeline
    stage, but nothing downstream reads it to assign a stage.)"""
    if possibility_id in graveyard_ids:
        return "REJECTED"
    if possibility_id in funnel_sets["non_dominated"] and critic_overall == "SURVIVE":
        return "STRONG_SURVIVOR"
    if possibility_id in funnel_sets["non_dominated"]:
        return "SURVIVOR"
    if possibility_id in funnel_sets["evidence"]:
        return "CHALLENGED"
    return "SEED"


def build():
    magic_box = load("magic_box_real.json")
    possibilities = magic_box["possibilities"]
    non_dominated_ids = {p["id"] for p in magic_box["non_dominated"]}
    graveyard = {g["id"]: g for g in magic_box["graveyard"]}
    evidence_ids = {p["id"] for p in possibilities if p["gate_passed"]}
    funnel_sets = {"evidence": evidence_ids, "non_dominated": non_dominated_ids}

    priced = [p["economic_value"] for p in possibilities if p["economic_value"] is not None]
    median_value = statistics.median(priced) if priced else 0

    results = []
    for p in possibilities:
        ev_v, ev_r = critic_evidence_dimension(p)
        ec_v, ec_r = critic_economic_dimension(p, median_value)
        co_v, co_r = critic_competitive_dimension(p)
        dims = {
            "EVIDENCE": (ev_v, ev_r),
            "ECONOMIC": (ec_v, ec_r),
            "COMPETITIVE": (co_v, co_r),
        }
        for name, note in UNASSESSED_DIMENSIONS.items():
            dims[name] = ("NEEDS_EVIDENCE", note)

        critic_overall = overall_verdict(dims)
        stage = evolution_stage(p["id"], funnel_sets, critic_overall, graveyard)
        entry = {
            "possibility_id": p["id"],
            "name": p["name"],
            "evolution_stage": stage,
            "critic_overall": critic_overall,
            "critic_dimensions": {k: {"verdict": v[0], "reasoning": v[1]} for k, v in dims.items()},
        }
        if stage == "REJECTED" and p["id"] in graveyard:
            entry["why_it_existed"] = "Generated from a real friction ({}) x real design operator ({}) combination.".format(
                p["friction_theme_name"], p["operator"])
            entry["what_killed_it"] = graveyard[p["id"]]["kill_reason"]
        results.append(entry)

    return {
        "_provenance": (
            "Critic verdicts derived ONLY from real signals already computed by magic_box_real.py "
            "(gate_passed, economic_value vs. corpus median, is_white_space/competitor_gap_brands). "
            "5 of 8 requested Critic dimensions (HUMAN/PHYSICAL/VERSUNI_FIT/TIMING/ROBUSTNESS) have no "
            "real evidence anywhere in this pipeline and are honestly reported NEEDS_EVIDENCE, never "
            "guessed. Evolution stage is derived from the possibility's own evidence position in the "
            "already-computed funnel (generated/gate/evidence/non-dominated) crossed with its own "
            "Critic verdict, and graveyard membership - never from a ranking against its siblings."
        ),
        "generated_by": "src/real/critic_real.py",
        "verdict_vocabulary": list(VERDICTS),
        "evolution_stages": ["SEED", "CHALLENGED", "SURVIVOR", "STRONG_SURVIVOR", "REJECTED"],
        "concepts": results,
    }


def main():
    doc = build()
    os.makedirs(PROC, exist_ok=True)
    with open(os.path.join(PROC, "critic_real.json"), "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    counts = {}
    for c in doc["concepts"]:
        counts[c["evolution_stage"]] = counts.get(c["evolution_stage"], 0) + 1
    print("wrote critic_real.json ({} concepts): {}".format(len(doc["concepts"]), counts))
    return doc


if __name__ == "__main__":
    main()
