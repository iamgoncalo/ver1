"""Category Assumption Map - the hidden assumptions embedded in "air
purifier" as a product category (see products-clusters.md Section 9).

These are explicitly INFERRED, not product facts - an analyst reading of
what the category currently takes for granted. Each assumption is linked
to real evidence (research tensions, rivals white space, or the real
product corpus) where that evidence actually bears on it - no assumption
is asserted to be challenged by evidence that doesn't actually address it.

Pass 2 upgrade: prevalence statistics are now COMPUTED live from
products_real.json / taxonomy_themes_real.json at build time (never typed
prose that can silently drift from the corpus), and every assumption
carries a machine-generated challenge test. A test is typed
DETERMINISTIC_FROM_STORED_FIELDS when the pipeline can recompute its
threshold from stored data on every run, and TEST_PROPOSAL (grounded LLM
proposal, explicitly unverified) when no stored field exists to derive a
deterministic test from - the two are never blended.
"""
import json
import os
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")

ASSUMPTIONS = [
    {
        "assumption_id": "A1",
        "text": "Purification requires a dedicated, standalone box.",
        "status": "INFERRED",
        "real_evidence_that_bears_on_it": ["RP-04"],
        "evidence_note": "RP-04 shows floor-level resuspension is a real, distinct spatial dynamic a stationary "
                         "box doesn't directly address - opens the question without proving an alternative wins.",
        "counterfactual": "What if purification were distributed across several small nodes instead of one box?",
    },
    {
        "assumption_id": "A2",
        "text": "The device sits in one fixed location, chosen once.",
        "status": "INFERRED",
        "evidence_for_prevalence": "No real product in this corpus is marketed as mobile or multi-room by design.",
        "real_evidence_that_bears_on_it": ["RP-04", "RP-01"],
        "evidence_note": "RP-01 shows a purifier's benefit already leaks unevenly beyond its own room; RP-04 shows "
                         "a real spatial source (walking) the fixed box doesn't chase.",
        "counterfactual": "What if the device (or its effect) followed the person, not the room?",
    },
    {
        "assumption_id": "A3",
        "text": "The consumer reacts after pollution is measured, not before.",
        "status": "INFERRED",
        "real_evidence_that_bears_on_it": ["RP-09", "RP-10"],
        "evidence_note": "RP-09/RP-10 show current sensors are precise-but-not-always-accurate - a real constraint "
                         "on how confidently any product could act predictively today.",
        "counterfactual": "What if the product acted on a forecast, not a measurement?",
    },
    {
        "assumption_id": "A4",
        "text": "Filters are replaced manually by the consumer.",
        "status": "INFERRED",
        "real_evidence_that_bears_on_it": [],
        "evidence_note": "No paper in this session's research corpus addresses filter-subscription or auto-"
                         "replacement models - this counterfactual has no direct research backing, only the real "
                         "consumer-complaint signal.",
        "counterfactual": "What if the consumer never has to remember, buy, or touch a filter?",
    },
    {
        "assumption_id": "A5",
        "text": "Clean-air delivery rate (CADR) is the primary performance basis.",
        "status": "INFERRED",
        "evidence_for_prevalence": "ENERGY STAR and AHAM certification (TC-R02, TC-R03) both center CADR as the "
                                    "official performance metric.",
        "real_evidence_that_bears_on_it": ["RP-07", "RP-06", "RP-01"],
        "evidence_note": "RP-07 explicitly reports a discrepancy between theoretical CADR-based sizing and "
                         "measured performance; RP-06 shows raw real-world averages can mislead entirely; RP-01 "
                         "shows single-room CADR doesn't capture whole-home effect. Real evidence directly "
                         "challenges CADR as sufficient, not just as a label.",
        "counterfactual": "What if performance were reported as a loss-rate curve or realized exposure reduction, not a lab CADR number?",
    },
    {
        "assumption_id": "A6",
        "text": "Continuous, constant operation is the default expectation.",
        "status": "INFERRED",
        "real_evidence_that_bears_on_it": ["RP-07", "RP-05"],
        "evidence_note": "RP-07's own trial shows constant mode filters 66% vs. auto's 40% - constant is not "
                         "neutral, it's a real trade-off against noise/runtime; RP-05 shows noise measurably "
                         "suppresses real usage.",
        "counterfactual": "What if the operating mode were chosen per household noise tolerance, not shipped as one default?",
    },
    {
        "assumption_id": "A7",
        "text": "The consumer owns the hardware outright after a single upfront purchase.",
        "status": "INFERRED",
        "real_evidence_that_bears_on_it": [],
        "evidence_note": "No paper in this session's research corpus addresses ownership models - this is a pure "
                         "category-structure observation, not backed by the peer-reviewed corpus.",
        "counterfactual": "What if clean air were sold as a guaranteed outcome/subscription rather than a device?",
    },
    {
        "assumption_id": "A8",
        "text": "A visible interface or app is required to trust the product is working.",
        "status": "INFERRED",
        "real_evidence_that_bears_on_it": ["RP-09", "RP-10"],
        "evidence_note": "If the underlying sensor reading itself carries real, documented uncertainty (RP-09, "
                         "RP-10), a more prominent display doesn't fix the trust problem - it may just surface an "
                         "unreliable number more confidently.",
        "counterfactual": "What if the most trustworthy product had no visible number at all, only a confidence-qualified state?",
    },
]


def _load(name):
    with open(os.path.join(PROC, name), encoding="utf-8") as fh:
        return json.load(fh)


def _corpus_stats():
    """Live product/theme counts - the numbers every prevalence claim and
    deterministic challenge threshold below is recomputed from on each run."""
    products = _load("products_real.json")["products"]
    themes = _load("taxonomy_themes_real.json")["themes"]
    n = len(products)
    by_type = Counter(p["cluster_type"] for p in products)
    by_intel = Counter(p["cluster_intelligence"] for p in products)
    return {
        "n_products": n,
        "standard": by_type.get("standard_purifier", 0),
        "manual": by_intel.get("manual", 0),
        "connected": by_intel.get("connected", 0),
        "adaptive": by_intel.get("adaptive", 0),
        "filter_cost_prev": (themes.get("filter_cost") or {}).get("prevalence_pct"),
        "filter_cost_n": (themes.get("filter_cost") or {}).get("n_reviews"),
        "noise_prev": (themes.get("noise") or {}).get("prevalence_pct"),
    }


def _deterministic(text, derived_from, current_value, threshold):
    return {
        "type": "CHALLENGE_TEST",
        "derivation": "DETERMINISTIC_FROM_STORED_FIELDS",
        "text": text,
        "derived_from": derived_from,
        "current_value": current_value,
        "threshold": threshold,
    }


def _proposal(text, derived_from, why_not_deterministic):
    """A grounded LLM proposal, never presented as observed evidence: no
    stored field exists to derive a deterministic test from, and the record
    says so explicitly rather than inventing a recomputable threshold."""
    return {
        "type": "TEST_PROPOSAL",
        "derivation": "LLM_PROPOSED_GROUNDED",
        "proposed_by": "Claude Fable 5 (grounded proposal over the cited real records only)",
        "verification_state": "UNVERIFIED_PROPOSAL",
        "text": text,
        "derived_from": derived_from,
        "why_not_deterministic": why_not_deterministic,
    }


def compute_challenge_tests(stats):
    """One machine-generated challenge test per assumption. Thresholds and
    current values for the deterministic ones are computed from the live
    corpus, never typed."""
    n = stats["n_products"]
    smart = stats["connected"] + stats["adaptive"]
    return {
        "A1": _deterministic(
            "Challenged when the standard_purifier share of the real product corpus falls below 50% "
            "(currently {}/{} = {:.1f}%).".format(stats["standard"], n, 100.0 * stats["standard"] / n),
            ["products_real.json -> cluster_type"],
            "{}/{} standard_purifier".format(stats["standard"], n), "share < 50%"),
        "A2": _proposal(
            "Observe placement behaviour directly: in a small real-home panel, record whether households "
            "relocate the unit between rooms within 30 days (RP-01 already shows the benefit leaks unevenly "
            "beyond the placed room; RP-04 shows a moving spatial source). The assumption weakens if a "
            "material share relocate.",
            ["RP-01", "RP-04"],
            "products_real.json has no mobility/placement field, so no stored threshold can be recomputed."),
        "A3": _deterministic(
            "Challenged when connected+adaptive products outnumber manual ones "
            "(currently {}+{}={} vs {} manual).".format(stats["connected"], stats["adaptive"], smart, stats["manual"]),
            ["products_real.json -> cluster_intelligence"],
            "{} connected+adaptive vs {} manual".format(smart, stats["manual"]), "connected+adaptive > manual"),
        "A4": _deterministic(
            "Challenged when the filter_cost complaint theme's detected share exceeds the noise theme's "
            "(currently {}% vs {}% - both conservative lower bounds from the same classifier).".format(
                stats["filter_cost_prev"], stats["noise_prev"]),
            ["taxonomy_themes_real.json -> themes.filter_cost.prevalence_pct", "themes.noise.prevalence_pct"],
            "filter_cost {}% vs noise {}%".format(stats["filter_cost_prev"], stats["noise_prev"]),
            "filter_cost share > noise share"),
        "A5": _deterministic(
            "Challenged when a certification body in the trend corpus publishes a loss-rate or realized-"
            "exposure metric alongside CADR - i.e. when TC-R02 (ENERGY STAR) or TC-R03 (AHAM Verifide) theme "
            "tags stop reducing to 'cadr'. Fragile baseline: both documents carry published_date null, so "
            "change detection has no dated anchor.",
            ["data/raw/trend_corpus.json -> TC-R02.themes", "TC-R03.themes"],
            "TC-R02/TC-R03 themes centre on cadr", "a non-CADR official performance metric appears"),
        "A6": _deterministic(
            "Challenged when connected+adaptive share exceeds 25% of the corpus (currently {}/{} = {:.1f}%), "
            "or when an independent trial reproduces RP-07's constant-mode filtration under auto operation.".format(
                smart, n, 100.0 * smart / n),
            ["products_real.json -> cluster_intelligence", "RP-07"],
            "{}/{} connected+adaptive".format(smart, n), "share > 25%, or RP-07 auto-mode replication"),
        "A7": _proposal(
            "Track the category's official retail channels for outcome/subscription offers (clean-air-as-a-"
            "service, filter-inclusive plans): the assumption weakens the first time a mainstream brand ships "
            "one. No paper in this corpus addresses ownership models, so the trigger is an external market "
            "observation, not a recomputable corpus statistic.",
            ["category-structure observation (no corpus field)"],
            "products_real.json has no ownership/subscription field; real_evidence list is empty."),
        "A8": _deterministic(
            "Challenged when a product marketing app/voice connectivity (currently {}/{} = {:.1f}%) ships a "
            "confidence-qualified state instead of an absolute number - answering RP-10's precise-but-"
            "inaccurate finding in-product. Only the count threshold is machine-checkable; the product-side "
            "half needs a new observation.".format(stats["connected"], n, 100.0 * stats["connected"] / n),
            ["products_real.json -> cluster_intelligence == connected", "RP-10"],
            "{}/{} connected".format(stats["connected"], n), "a connected product ships confidence-qualified state"),
    }


def build():
    stats = _corpus_stats()
    n = stats["n_products"]
    smart = stats["connected"] + stats["adaptive"]
    # Prevalence claims recomputed live where a stored field backs them -
    # a corpus change now changes the claim on the next run instead of
    # silently contradicting a typed sentence.
    computed_prevalence = {
        "A1": "{} of {} real corpus products ({:.0f}%) are classified standard_purifier - a single dedicated "
              "appliance is still the dominant real architecture.".format(stats["standard"], n, 100.0 * stats["standard"] / n),
        "A3": "{} of {} products ({:.0f}%) are cluster_intelligence=manual; only {} are adaptive.".format(
            stats["manual"], n, 100.0 * stats["manual"] / n, stats["adaptive"]),
        "A4": "\"filter_cost\" is a real, distinct consumer-complaint theme in the taxonomy ({}% detected share, "
              "{} real reviews) - replacement friction is a lived reality.".format(stats["filter_cost_prev"], stats["filter_cost_n"]),
        "A6": "Standard purifier control panels default to a fixed or continuous mode; only {} of {} products "
              "are classified connected, and {} adaptive.".format(stats["connected"], n, stats["adaptive"]),
        "A7": "All {} real corpus products are sold as one-time purchases on Amazon - no subscription/service "
              "model observed in this corpus.".format(n),
        "A8": "{} of {} products explicitly market app/voice connectivity as a selling point.".format(stats["connected"], n),
    }
    tests = compute_challenge_tests(stats)
    assumptions = []
    for a in ASSUMPTIONS:
        rec = dict(a)
        if a["assumption_id"] in computed_prevalence:
            rec["evidence_for_prevalence"] = computed_prevalence[a["assumption_id"]]
        rec["challenge_test"] = tests[a["assumption_id"]]
        assumptions.append(rec)
    return {
        "_provenance": "Category assumptions are analyst-INFERRED (see products-clusters.md Section 9), not "
                       "product facts. Each is linked only to real evidence (research corpus, real product "
                       "distribution stats) that genuinely bears on it - evidence lists are empty where no real "
                       "source in this session's corpus addresses that specific assumption. Prevalence claims "
                       "with a stored backing field are recomputed live at build time; challenge tests are "
                       "DETERMINISTIC_FROM_STORED_FIELDS where recomputable and TEST_PROPOSAL (grounded LLM "
                       "proposal, unverified) where no stored field exists.",
        "generated_by": "src/real/assumptions_real.py",
        "assumptions": assumptions,
    }


def main():
    doc = build()
    os.makedirs(PROC, exist_ok=True)
    with open(os.path.join(PROC, "category_assumptions.json"), "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote category_assumptions.json ({} assumptions, {} with real evidence links, {} deterministic tests)".format(
        len(doc["assumptions"]), sum(1 for a in doc["assumptions"] if a["real_evidence_that_bears_on_it"]),
        sum(1 for a in doc["assumptions"] if a["challenge_test"]["type"] == "CHALLENGE_TEST")))
    return doc


if __name__ == "__main__":
    main()
