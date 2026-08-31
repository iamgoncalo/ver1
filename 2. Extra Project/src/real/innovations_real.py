"""INNOVATIONS - the developed-possibility population (Pass 3).

One Innovation object per Magic Box possibility, each carrying the full
Pass-2 lineage plus a mechanical development state AND a mechanical
lifecycle status (registry-derived, see LIFECYCLE_RULE below). This is the
general innovation population; the formal Air case's three Opportunity
Spaces and their recommendation remain a SEPARATE formal-case block - never
blended into (or presented as) the population, and never a tournament
ontology.

STATE RULE (a labelled METHOD_CHOICE, applied mechanically - no per-
innovation authoring). "ready_to_test" is earned by evidence alone - being
one of the (arbitrary, count-based) top-3-by-pain "finalists" is NOT part of
this rule any more (is_finalist is never read below):
  1. killed in the Magic funnel (gate / economics / dominance) -> rejected
  2. Critic overall REJECT                                     -> rejected
  3. Critic overall CHALLENGE                                  -> challenged
  4. non-dominated AND Critic SURVIVE AND research-tension-
     grounded consequence                                      -> ready_to_test
  5. non-dominated + research-tension-grounded consequence      -> developing
  6. research-tension-grounded consequence                      -> grounded
  7. otherwise                                                  -> exploratory
'paused' exists in the vocabulary and is honestly zero - nothing has been
paused by a human decision yet.

Why this replaces is_finalist: on the current real corpus every one of the
16 possibilities is_finalist ever picked out was already short-circuited to
"challenged" by rule 3 above (their Critic verdict is CHALLENGE, not
SURVIVE) - is_finalist never actually produced "ready_to_test" in practice.
The new rule 4 makes that requirement explicit and evidence-driven instead
of implicit and count-based (top 3 by pain_score, an arbitrary tournament
cut). On today's data both the old and new rule produce zero ready_to_test
innovations - an honest, unchanged real number, now for an honest reason.

LIFECYCLE RULE (data/processed/innovation_registry.json, a persistent
ledger built the same idempotent way funnel_real.py builds
funnel_run_history.json - see update_registry() below): every innovation id
carries one of 8 values - new / active / updated / challenged / rejected /
superseded / stale / archived. See LIFECYCLE_RULE for the full mechanical
definition and STALE_AFTER_RUNS / ARCHIVE_GRACE_RUNS for the two method
constants that govern it.

Every field is a deterministic function of the processed files; missing
evidence stays missing (target_user/context carry only what review
evidence supports; no persona is invented; no target price is modelled).

Run:  python3 src/real/innovations_real.py
"""
import hashlib
import json
import os
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")
REGISTRY_PATH = os.path.join(PROC, "innovation_registry.json")

STATE_RULE = [
    "1 killed in the Magic funnel -> rejected",
    "2 Critic REJECT -> rejected",
    "3 Critic CHALLENGE -> challenged",
    "4 non-dominated + Critic SURVIVE + research-tension-grounded -> ready_to_test",
    "5 non-dominated + research-tension-grounded -> developing",
    "6 research-tension-grounded -> grounded",
    "7 otherwise -> exploratory",
    "paused: vocabulary only - honestly zero until a human pauses one",
    "NOTE: is_finalist (the magic-box top-3-by-pain cut) is never read here - "
    "ready_to_test is earned by evidence (non-dominated + Critic SURVIVE + "
    "research-tension-grounded), not by an arbitrary top-N count.",
]

# ---------------------------------------------------------------------------
# LIFECYCLE - a second, independent dimension from STATE above. STATE is
# "what does this run's evidence say right now"; LIFECYCLE is "how has this
# id's own record moved across real runs" - new/updated/stale/superseded/
# archived only make sense against a persisted history, which is exactly
# what data/processed/innovation_registry.json is for.
#
# The registry is idempotent the same way funnel_run_history.json is: a
# "genuine run" only happens when REGISTRY_INPUT_FILES' bytes actually
# changed since the last recorded run; re-invoking innovations_real.py on
# byte-identical inputs (e.g. run_pipeline.sh's second, dossier-recording
# pass) rechecks but never fabricates a new run, a new history entry, or a
# fake "new" classification.
# ---------------------------------------------------------------------------
REGISTRY_INPUT_FILES = ["criteria_real.json", "magic_box_real.json"]

# Method constant: an id with an unchanged fingerprint AND unchanged state
# across this many consecutive GENUINE runs (not mere re-invocations) is
# "stale" - the pipeline keeps regenerating it but nothing about its real
# evidence or verdict has moved.
STALE_AFTER_RUNS = 5

# Method constant: an id stays visible in the active population for this
# many consecutive genuine runs after first earning rejected/superseded/
# stale, before moving into the archive-only view. A grace period, not an
# instant vanish, so a single-run blip is inspectable before it disappears.
ARCHIVE_GRACE_RUNS = 2

LIFECYCLE_VALUES = ("new", "active", "updated", "challenged", "rejected",
                    "superseded", "stale", "archived")

LIFECYCLE_RULE = [
    "new: id has never been recorded in the registry before this run.",
    "rejected: this run's mechanical state is 'rejected' (funnel kill or Critic REJECT).",
    "superseded: another id shares its friction_theme, its source_evidence_ids "
    "are a real STRICT SUPERSET of this id's, and its Critic verdict is "
    "equal-or-stronger - see detect_supersession().",
    "challenged: this run's mechanical state is 'challenged' (Critic CHALLENGE) "
    "and neither rejected nor superseded applies.",
    "updated: the id's structural/semantic fingerprint (friction_theme, operator, "
    "sorted parent_path_ids, sorted source_evidence_ids) changed since the last "
    "genuine run, and none of the above apply.",
    "stale: the fingerprint AND mechanical state have been unchanged for "
    ">= STALE_AFTER_RUNS consecutive genuine runs.",
    "active: none of the above - a healthy, unremarkable run for this id.",
    "archived: rejected/superseded/stale for >= ARCHIVE_GRACE_RUNS consecutive "
    "genuine runs - leaves the active population, recorded permanently in "
    "archived_innovations (never deleted, only moved out of the active view).",
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
    non_dominated = bool(concept.get("is_non_dominated"))
    survives_critic = concept.get("critic_overall") == "SURVIVE"
    if non_dominated and survives_critic and grounded:
        return "ready_to_test", ("Non-dominated, Critic verdict SURVIVE, and its product consequence "
                                 "rests on a real research tension - the strongest evidence combination "
                                 "this pipeline can show, not a top-N pain-score cut.")
    if non_dominated and grounded:
        return "developing", "Non-dominated and grounded in a real research tension."
    if grounded:
        return "grounded", "Its product consequence rests on a real research tension."
    return "exploratory", ("Real friction evidence, but its consequence rests on a feasibility "
                           "precedent or declared inference - not yet research-grounded.")


# ---------------------------------------------------------------------------
# Registry / lifecycle machinery
# ---------------------------------------------------------------------------

def compute_registry_input_hash():
    """A real sha256 over the exact files that determine every id's
    friction_theme/operator/parent_path_ids/source_evidence_ids/state -
    criteria_real.json and magic_box_real.json. Two genuine runs with
    identical bytes always produce the identical hash (the same pattern
    funnel_real.py::compute_input_snapshot_hash uses)."""
    h = hashlib.sha256()
    for name in REGISTRY_INPUT_FILES:
        path = os.path.join(PROC, name)
        h.update(name.encode("utf-8"))
        try:
            with open(path, "rb") as fh:
                h.update(fh.read())
        except FileNotFoundError:
            h.update(b"MISSING")
    return h.hexdigest()


def compute_fingerprint(friction_theme, operator, parent_path_ids, source_evidence_ids):
    """The structural/semantic fingerprint the brief asks for: sha256 of
    {friction_theme, operator, sorted(parent_path_ids), sorted(source_evidence_ids)}.
    Two possibilities with the same friction_theme/operator and the same
    evidence lineage always fingerprint identically - this is what makes
    Air's fixed 16 (theme, operator) pairs regenerate as 'unchanged', never
    'new', run after run with no evidence change."""
    payload = json.dumps({
        "friction_theme": friction_theme,
        "operator": operator,
        "parent_path_ids": sorted(parent_path_ids or []),
        "source_evidence_ids": sorted(source_evidence_ids or []),
    }, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def load_registry():
    if not os.path.exists(REGISTRY_PATH):
        return {"last_input_hash": None, "run_counter": 0, "innovations": {}}
    with open(REGISTRY_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def save_registry(doc):
    with open(REGISTRY_PATH, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


CRITIC_RANK = {"SURVIVE": 3, "NEEDS_EVIDENCE": 2, "CHALLENGE": 1, "REJECT": 0, None: -1}


def detect_supersession(concepts_by_id):
    """Concrete, honest rule: within the same friction_theme, id A is
    superseded by id B only when B's source_evidence_ids is a real, STRICT
    SUPERSET of A's (not merely equal) and B's Critic verdict is
    equal-or-stronger than A's. Equal evidence sets within a theme (which is
    what Air's fixed THEME_OPERATORS table actually produces - every
    operator sharing a theme shares that theme's exact signal/tension
    lineage) are parallel design variety, NOT supersession - they stay
    separate ids. On the current real corpus this rule fires zero times
    (verified by tests/test_innovation_lifecycle.py, which also injects a
    genuine superset in memory to prove the mechanism itself works)."""
    by_theme = {}
    for cid, c in concepts_by_id.items():
        by_theme.setdefault(c.get("friction_theme"), []).append(cid)
    superseded_by = {}
    for _theme, ids in by_theme.items():
        for a in ids:
            ea = set(concepts_by_id[a].get("source_evidence_ids") or [])
            for b in ids:
                if a == b:
                    continue
                cb = concepts_by_id[b]
                eb = set(cb.get("source_evidence_ids") or [])
                if eb > ea and CRITIC_RANK.get(cb.get("critic_overall")) >= CRITIC_RANK.get(concepts_by_id[a].get("critic_overall")):
                    superseded_by[a] = b
                    break
    return superseded_by


def update_registry(records, registry=None, input_hash=None, persist=True):
    """records: list of {"id", "friction_theme", "operator", "parent_path_ids",
    "source_evidence_ids", "state", "critic_overall"} - one per current
    concept. Mutates the registry and, when persist=True (the default),
    writes it to REGISTRY_PATH; returns (registry, new_this_run_ids,
    archived_list).

    persist=False is for tests that pass their own in-memory `registry`
    dict to exercise the state machine in isolation - it must NEVER touch
    data/processed/innovation_registry.json. build()/main() always use the
    default persist=True so the real ledger is genuinely updated on every
    real run.

    Idempotent exactly like funnel_real.py::record_run: only a genuinely
    changed input snapshot bumps run_counter / appends history / can
    produce a 'new' classification. Re-invoking on unchanged inputs (e.g.
    run_pipeline.sh's second, dossier-recording innovations_real.py pass)
    only refreshes last_checked_at."""
    registry = registry if registry is not None else load_registry()
    input_hash = input_hash if input_hash is not None else compute_registry_input_hash()
    now = datetime.now(timezone.utc).isoformat()
    concepts_by_id = {r["id"]: r for r in records}
    entries = registry.setdefault("innovations", {})

    genuinely_new_run = registry.get("last_input_hash") != input_hash
    if not genuinely_new_run:
        registry["last_checked_at"] = now
        registry["last_check_count"] = registry.get("last_check_count", 0) + 1
        if persist:
            save_registry(registry)
        return registry, [], build_archive_list(registry, concepts_by_id)

    registry["run_counter"] = registry.get("run_counter", 0) + 1
    run_id = "run-{}".format(registry["run_counter"])
    supersession = detect_supersession(concepts_by_id)
    new_this_run = []

    for cid, r in concepts_by_id.items():
        fp = compute_fingerprint(r["friction_theme"], r["operator"], r["parent_path_ids"], r["source_evidence_ids"])
        mech_state = r["state"]
        entry = entries.get(cid)

        if entry is None:
            entries[cid] = {
                "first_seen_run": run_id, "first_seen_at": now,
                "current_fingerprint": fp, "current_state": mech_state,
                "lifecycle": "new", "consecutive_unchanged_runs": 0, "grace_count": 0,
                "superseded_by": None,
                "history": [{"run_id": run_id, "from_state": None, "to_state": mech_state,
                            "why": "First observed in the registry.", "at": now}],
            }
            new_this_run.append(cid)
            continue

        fp_changed = entry["current_fingerprint"] != fp
        state_changed = entry["current_state"] != mech_state
        if fp_changed or state_changed:
            entry["history"].append({
                "run_id": run_id, "from_state": entry["current_state"], "to_state": mech_state,
                "why": ("Evidence lineage changed (fingerprint)." if fp_changed
                       else "Development state changed with the same evidence lineage."),
                "at": now,
            })
            entry["consecutive_unchanged_runs"] = 0
        else:
            entry["consecutive_unchanged_runs"] = entry.get("consecutive_unchanged_runs", 0) + 1

        entry["current_fingerprint"] = fp
        entry["current_state"] = mech_state

        successor = supersession.get(cid)
        if successor and entry.get("superseded_by") != successor:
            entry["superseded_by"] = successor
            entry["history"].append({
                "run_id": run_id, "from_state": entry["current_state"], "to_state": "superseded",
                "why": "{} shares this friction theme with a strict superset of real evidence and an "
                       "equal-or-stronger Critic verdict.".format(successor),
                "at": now,
            })
        elif not successor:
            entry["superseded_by"] = None

        if mech_state == "rejected":
            lifecycle = "rejected"
        elif entry.get("superseded_by"):
            lifecycle = "superseded"
        elif mech_state == "challenged":
            lifecycle = "challenged"
        elif fp_changed:
            lifecycle = "updated"
        elif entry["consecutive_unchanged_runs"] >= STALE_AFTER_RUNS:
            lifecycle = "stale"
        else:
            lifecycle = "active"

        if lifecycle in ("rejected", "superseded", "stale"):
            entry["grace_count"] = entry.get("grace_count", 0) + 1
            if entry["grace_count"] >= ARCHIVE_GRACE_RUNS:
                lifecycle = "archived"
        else:
            entry["grace_count"] = 0

        entry["lifecycle"] = lifecycle

    registry["last_input_hash"] = input_hash
    registry["last_checked_at"] = now
    registry["last_run_id"] = run_id
    if persist:
        save_registry(registry)
    return registry, new_this_run, build_archive_list(registry, concepts_by_id)


def build_archive_list(registry, concepts_by_id):
    """Never deletes anything - an archived entry's full history stays in
    the registry forever; this is only the read view of what has left the
    active population."""
    archived = []
    for cid, entry in registry.get("innovations", {}).items():
        if entry.get("lifecycle") != "archived":
            continue
        last_hist = entry["history"][-1] if entry.get("history") else {}
        r = concepts_by_id.get(cid, {})
        archived.append({
            "innovation_id": cid,
            "reason": last_hist.get("why", "Left the active population."),
            "run_id": entry.get("last_run_id") or last_hist.get("run_id"),
            "date": last_hist.get("at"),
            "previous_evidence": {
                "fingerprint": entry.get("current_fingerprint"),
                "friction_theme": r.get("friction_theme"),
                "parent_path_ids": r.get("parent_path_ids"),
                "source_evidence_ids": r.get("source_evidence_ids"),
            },
            "successor_id": entry.get("superseded_by"),
        })
    return sorted(archived, key=lambda a: a["innovation_id"])


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
    registry_records = []
    for c in criteria["concepts"]:
        state, state_why = innovation_state(c, graveyard_by_id)
        registry_records.append({
            "id": c["id"], "friction_theme": c["friction_theme"], "operator": c["operator"],
            "parent_path_ids": c.get("parent_path_ids") or [],
            "source_evidence_ids": c.get("source_evidence_ids") or [],
            "state": state, "critic_overall": c.get("critic_overall"),
        })
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
            # No is_finalist special-case any more: only the formal case (its
            # own OS-1/2/3 model) has an authored kill criterion today.
            "kill_criterion": ("No authored kill criterion yet for this innovation - only the formal "
                               "case (see formal_case.abandon_signal) has a human-authored one; this "
                               "innovation earns its own by developing further evidence or by a human "
                               "decision to invest."),
            "prototype_state": prototype_state,
            "artifact_ids": [a["id"] for a in artifacts],
            "artifacts": artifacts,
            "run_history": {"magic_run_input_sha256": magic.get("run", {}).get("input_snapshot_sha256"),
                            "funnel_snapshot": funnel.get("machine_state", {}).get("input_snapshot_hash")},
        })

    registry_input_hash = compute_registry_input_hash()
    registry, new_this_run, archived = update_registry(registry_records, input_hash=registry_input_hash)
    lifecycle_by_id = registry.get("innovations", {})

    for i in innovations:
        entry = lifecycle_by_id.get(i["innovation_id"], {})
        i["lifecycle"] = entry.get("lifecycle", "active")
        i["lifecycle_first_seen_run"] = entry.get("first_seen_run")
        i["lifecycle_history"] = entry.get("history", [])
        i["superseded_by"] = entry.get("superseded_by")

    # Archived ids (rejected/superseded/stale past their grace period) leave
    # the active population and live only in archived_innovations below -
    # their full record stays in innovation_registry.json forever.
    archived_ids = {a["innovation_id"] for a in archived}
    active_innovations = [i for i in innovations if i["innovation_id"] not in archived_ids]

    state_counts = {}
    for i in active_innovations:
        state_counts[i["state"]] = state_counts.get(i["state"], 0) + 1
    state_counts.setdefault("paused", 0)

    lifecycle_counts = {}
    for i in innovations:
        lifecycle_counts[i["lifecycle"]] = lifecycle_counts.get(i["lifecycle"], 0) + 1
    for v_ in LIFECYCLE_VALUES:
        lifecycle_counts.setdefault(v_, 0)

    return {
        "_provenance": "One Innovation per Magic Box possibility, every field a deterministic "
                       "function of criteria_real.json / magic_box_real.json / funnel_real.json / "
                       "signals_real.json / decision_framework_real.json. Missing evidence stays "
                       "missing (no persona, no architecture dataset, no target-price model). "
                       "Lifecycle fields are a deterministic function of "
                       "data/processed/innovation_registry.json, appended to only on a genuine "
                       "input change (funnel_run_history.json's exact idempotent pattern).",
        "generated_by": "src/real/innovations_real.py",
        "state_rule": {"epistemic_type": "METHOD_CHOICE", "rule": STATE_RULE},
        "state_counts": state_counts,
        "lifecycle_rule": {"epistemic_type": "METHOD_CHOICE", "rule": LIFECYCLE_RULE,
                           "stale_after_runs": STALE_AFTER_RUNS,
                           "archive_grace_runs": ARCHIVE_GRACE_RUNS},
        "lifecycle_counts": lifecycle_counts,
        "new_this_run": new_this_run if new_this_run else [],
        "new_this_run_note": ("{} genuinely new innovation id(s) this run.".format(len(new_this_run))
                              if new_this_run else
                              "No new qualified innovation this run - every id's fingerprint already "
                              "existed in the registry unchanged (Air's fixed operator table "
                              "regenerating the same ids is correctly recognised as no novelty)."),
        "innovations": active_innovations,
        "archived_innovations": archived,
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
    print("wrote innovations_real.json: {} active innovations, states {}, lifecycle {}, "
         "{} archived, new_this_run={}".format(
            len(doc["innovations"]), doc["state_counts"], doc["lifecycle_counts"],
            len(doc["archived_innovations"]), doc["new_this_run"]))
    return doc


if __name__ == "__main__":
    main()
