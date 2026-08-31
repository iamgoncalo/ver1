"""INNOVATIONS - the developed-possibility population (Pass 3).

One Innovation object per Magic Box possibility, each carrying the full
Pass-2 lineage plus a mechanical development state. This is the general
innovation population; the formal Air case's three Opportunity Spaces and
their recommendation remain a SEPARATE formal-case block - never blended
into (or presented as) the population, and never a tournament ontology.

STATE RULE (a labelled METHOD_CHOICE, applied mechanically - no per-
innovation authoring):
  1. killed in the Magic funnel (gate / economics / dominance) -> rejected
  2. Critic overall REJECT                                     -> rejected
  3. Critic overall CHALLENGE                                  -> challenged
  4. finalist (top of the non-dominated set by consumer pain)  -> ready_to_test
  5. non-dominated + research-tension-grounded consequence     -> developing
  6. research-tension-grounded consequence                     -> grounded
  7. otherwise                                                 -> exploratory
'paused' exists in the vocabulary and is honestly zero - nothing has been
paused by a human decision yet.

Every field is a deterministic function of the processed files; missing
evidence stays missing (target_user/context carry only what review
evidence supports; no persona is invented; no target price is modelled).

Run:  python3 src/real/innovations_real.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")

STATE_RULE = [
    "1 killed in the Magic funnel -> rejected",
    "2 Critic REJECT -> rejected",
    "3 Critic CHALLENGE -> challenged",
    "4 finalist -> ready_to_test",
    "5 non-dominated + research-tension-grounded -> developing",
    "6 research-tension-grounded -> grounded",
    "7 otherwise -> exploratory",
    "paused: vocabulary only - honestly zero until a human pauses one",
]


def _load(name):
    with open(os.path.join(PROC, name), encoding="utf-8") as fh:
        return json.load(fh)


def innovation_state(concept, graveyard_by_id):
    grave = graveyard_by_id.get(concept["id"])
    if grave:
        return "rejected", "Killed in the Magic funnel: " + grave["why_not_selected"]
    if concept.get("critic_overall") == "REJECT":
        return "rejected", "Critic verdict REJECT."
    if concept.get("critic_overall") == "CHALLENGE":
        return "challenged", "Critic verdict CHALLENGE - a real dimension pushes back."
    grounded = (concept.get("why_here") or {}).get("consequence_basis") == "RESEARCH_TENSION"
    if concept.get("is_finalist"):
        return "ready_to_test", "Finalist of the non-dominated set - the next step is a real test."
    if concept.get("is_non_dominated") and grounded:
        return "developing", "Non-dominated and grounded in a real research tension."
    if grounded:
        return "grounded", "Its product consequence rests on a real research tension."
    return "exploratory", ("Real friction evidence, but its consequence rests on a feasibility "
                           "precedent or declared inference - not yet research-grounded.")


def build():
    criteria = _load("criteria_real.json")
    magic = _load("magic_box_real.json")
    funnel = _load("funnel_real.json")
    decision = _load("decision_framework_real.json")
    signals = {s["id"]: s for s in _load("signals_real.json")["signals"]}

    graveyard_by_id = {g["id"]: g for g in criteria["graveyard"]}
    paths_by_id = {p["id"]: p for p in funnel["homepage_funnel"]["paths"]}
    v = decision["verdict"]

    innovations = []
    for c in criteria["concepts"]:
        state, state_why = innovation_state(c, graveyard_by_id)
        signal = signals.get(c["friction_theme"])
        why = c.get("why_here") or {}
        env = c.get("engineering_envelope") or {}
        meth = c.get("consumer_pain_methodology") or {}
        parent_paths = [pid for pid in (c.get("parent_path_ids") or []) if pid in paths_by_id]

        visual_rel = "concept-visuals/{}.svg".format(c["id"].replace(":", "_"))
        visual_abs = os.path.join(ROOT, "web", "public", "concept-visuals",
                                  "{}.svg".format(c["id"].replace(":", "_")))
        dossier_rel = "innovation-dossiers/{}.pdf".format(c["id"].replace(":", "_"))
        dossier_abs = os.path.join(ROOT, "web", "public", "innovation-dossiers",
                                   "{}.pdf".format(c["id"].replace(":", "_")))

        artifacts = []
        if os.path.isfile(visual_abs):
            prov_path = visual_abs.replace(".svg", ".provenance.json")
            provenance = None
            if os.path.isfile(prov_path):
                with open(prov_path, encoding="utf-8") as fh:
                    provenance = json.load(fh)
            artifacts.append({"id": "visual-" + c["id"], "kind": "concept_visual",
                              "path": "/" + visual_rel, "state": "CONCEPT_VISUAL",
                              "provenance": provenance})
        if os.path.isfile(dossier_abs):
            artifacts.append({"id": "dossier-" + c["id"], "kind": "innovation_dossier",
                              "path": "/" + dossier_rel, "state": "generated"})

        prototype_state = ("CONCEPT_VISUAL" if any(a["kind"] == "concept_visual" for a in artifacts)
                           else "NONE")

        innovations.append({
            "innovation_id": c["id"],
            "name": c["name"],
            # Deterministic composition of stored fields - never free prose.
            # A colleague's first sentence: what the idea IS, composed from
            # stored fields only - the full derivation stays in why_here.
            "proposition": "A concept for the real '{}' friction, built with the {} design move - {}".format(
                c["friction_theme_name"], c["operator"],
                (c.get("operator_definition") or "").rstrip(".").lower() + "."),
            "target_category": c.get("target_category") or "AIR_PURIFICATION",
            "target_user_context": {
                "evidence_based": "Households whose real reviews carry this friction: {} reviews "
                                   "across {} real products ({}% verified purchase, {}-{}).".format(
                                       meth.get("n_reviews"), meth.get("n_distinct_products"),
                                       meth.get("pct_verified_purchase"),
                                       (meth.get("review_date_range") or ["?", "?"])[0],
                                       (meth.get("review_date_range") or ["?", "?"])[1]),
                "persona": "UNKNOWN - no persona/behavioural dataset exists in this pipeline; "
                           "only the review evidence above is real.",
            },
            "problem": signal["meaning"] if signal else why.get("reality", ""),
            "product_archetype": c.get("product_archetype"),
            "architecture": "UNKNOWN - no system-architecture dataset exists; the archetype above "
                            "is a design rule from the operator's own definition.",
            "mechanism": {"operator": c["operator"], "definition": c["operator_definition"],
                          "epistemic_type": "METHOD_CHOICE - authored design vocabulary"},
            "parent_possibility_ids": [c["id"]],
            "parent_path_ids": parent_paths,
            "parent_field_ids": parent_paths,
            "evidence_ids": (c.get("evidence_ids") or []) + (c.get("source_evidence_ids") or []),
            "criteria_results": c.get("criteria"),
            "critic_overall": c.get("critic_overall"),
            "critic_dimensions": c.get("critic_dimensions"),
            "design_dna": c.get("design_dna"),
            "why_here": why,
            "engineering_envelope": env,
            "reference_comparables": env.get("comparable_basis"),
            "target_price_range": {
                "status": "NOT_MODELLED",
                "note": "No concept target-price model exists - only the comparable market median "
                        "(${}, {} real products) as reference. A target price would be invented.".format(
                            c.get("comparable_market_median_usd"),
                            c.get("comparable_market_median_n_products")),
            },
            "economics": {
                "price_weighted_exposure_usd": c.get("economic_value"),
                "caveat": c.get("economic_value_caveat"),
                "comparable_market_median_usd": c.get("comparable_market_median_usd"),
                "comparable_market_median_n_products": c.get("comparable_market_median_n_products"),
                "comparable_market_median_caveat": c.get("comparable_market_median_caveat"),
            },
            "assumptions": c.get("assumption_challenged"),
            "uncertainties": c.get("unknowns") or [],
            "contradictions": (signal.get("contradictions") if signal and signal.get("contradictions")
                               and not signal["contradictions"].startswith("None identified") else None),
            "state": state,
            "state_why": state_why,
            "next_experiment": (c.get("test") or {}).get("text"),
            "kill_criterion": ("Formal-case kill criterion applies (see formal_case.abandon_signal)"
                               if c.get("is_finalist") else
                               "No authored kill criterion yet - a non-formal innovation earns one by "
                               "displacing the formal recommendation (Scenario lens) or by a human "
                               "decision to invest."),
            "prototype_state": prototype_state,
            "artifact_ids": [a["id"] for a in artifacts],
            "artifacts": artifacts,
            "run_history": {"magic_run_input_sha256": magic.get("run", {}).get("input_snapshot_sha256"),
                            "funnel_snapshot": funnel.get("machine_state", {}).get("input_snapshot_hash")},
        })

    state_counts = {}
    for i in innovations:
        state_counts[i["state"]] = state_counts.get(i["state"], 0) + 1
    state_counts.setdefault("paused", 0)

    return {
        "_provenance": "One Innovation per Magic Box possibility, every field a deterministic "
                       "function of criteria_real.json / magic_box_real.json / funnel_real.json / "
                       "signals_real.json / decision_framework_real.json. Missing evidence stays "
                       "missing (no persona, no architecture dataset, no target-price model).",
        "generated_by": "src/real/innovations_real.py",
        "state_rule": {"epistemic_type": "METHOD_CHOICE", "rule": STATE_RULE},
        "state_counts": state_counts,
        "innovations": innovations,
        "formal_case": {
            "label": "FORMAL CASE RECOMMENDATION",
            "note": "The formal Air case's three Opportunity Spaces and its one recommendation - "
                    "kept separate from the general innovation population above, never a tournament "
                    "over it.",
            "recommended": v["recommended"], "recommended_name": v["recommended_name"],
            "decision_type": v["decision_type"], "why": v["why"],
            "first_experiment": v["first_experiment"], "abandon_signal": v["abandon_signal"],
            "most_sensitive_assumption": criteria["why_did_this_win"]["most_sensitive_assumption"],
        },
    }


def main():
    doc = build()
    with open(os.path.join(PROC, "innovations_real.json"), "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote innovations_real.json: {} innovations, states {}".format(
        len(doc["innovations"]), doc["state_counts"]))
    return doc


if __name__ == "__main__":
    main()
