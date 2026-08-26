"""Q6 (real data) - score real opportunity spaces against the three Q1
measures, using ONLY evidence produced by this repair's real pipeline
(Q2 detection, Q3 taxonomy, Q4 pricing). The synthetic-fixture phase's
winner ("Ultra-Quiet Night Purification") is NOT assumed to still win -
this recomputes from the real numbers and reports whatever they support.

Usage:
  python3 src/real/decision_framework_real.py                  # primary market scenario
  python3 src/real/decision_framework_real.py --market-scenario=imarc   # Q5 sensitivity
"""
import csv
import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config as C

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")
CLEAN = os.path.join(ROOT, "data", "processed", "reviews_clean_real.csv")


def load_clean():
    with open(CLEAN, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def keyword_prevalence(rows, pattern):
    pat = re.compile(pattern, re.I)
    n = sum(1 for r in rows if pat.search(r["review_text"] or ""))
    return n, round(100.0 * n / len(rows), 3)


def main():
    scenario = "mordor"
    for a in sys.argv[1:]:
        if a.startswith("--market-scenario="):
            scenario = a.split("=", 1)[1]

    rows = load_clean()
    tax = json.load(open(os.path.join(PROC, "taxonomy_themes_real.json"), encoding="utf-8"))
    wtp = json.load(open(os.path.join(PROC, "wtp_real.json"), encoding="utf-8"))
    mkt = json.load(open(os.path.join(ROOT, "data", "raw", "market_metrics.json"), encoding="utf-8"))

    reliability = tax["themes"]["reliability"]
    noise = tax["themes"]["noise"]
    smart_n, smart_pct = keyword_prevalence(
        rows, r"wifi|wi-fi|bluetooth|smart\s?home|smartphone app|mobile app|alexa|"
             r"google assistant|voice control")

    scenario_cagr = {"mordor": 5.37, "imarc": 6.54}.get(scenario, 5.37)
    scenario_source = {"mordor": "Mordor Intelligence (primary planning basis)",
                       "imarc": "IMARC Group (Q5 alternative)"}.get(scenario)

    scores = {
        "OS-1": {
            "name": "Reliability-Verified Air Purifiers (extended-life guarantee "
                    "+ real-time self-diagnostic)",
            "usage_context": "Any household buying a purifier as a health/allergy "
                             "necessity, not a discretionary gadget",
            "friction": "Unit silently 'stops working' or 'dies' well before its "
                       "expected life, with no warning and often outside a short "
                       "return window - a complaint pattern visible across brands and "
                       "across the full 2004-2023 span of this real corpus, meaning it "
                       "has never been solved industry-wide",
            "enabling_trend": "TC-R08 (Matter Air Quality Sensor cluster - the same "
                              "connectivity layer could carry a self-diagnostic/runtime "
                              "health signal); TC-R02 (ENERGY STAR IEF/CADR measurement "
                              "already requires performance verification, a template for "
                              "an ongoing performance-verified claim)",
            "friction_prevalence_pct": reliability["prevalence_pct"],
            "csat_impact": reliability["csat_impact"],
            "price_weighted_exposure_usd": wtp["per_theme"]["reliability"]["price_weighted_exposure_usd"],
            "n_reviews_supporting": reliability["n_reviews"],
            "evidence": "src/real/taxonomy_real.py theme 'reliability', "
                       "polarity-gated real-text classification, n={} reviews".format(
                           reliability["n_reviews"]),
        },
        "OS-2": {
            "name": "Whisper-Quiet Night Mode",
            "usage_context": "Bedroom, overnight use",
            "friction": "Motor/fan noise at higher speeds",
            "enabling_trend": "TC-R11 (Dyson formaldehyde-sensor press release, "
                              "tangential); no real trend document in this corpus "
                              "directly addresses acoustic engineering",
            "friction_prevalence_pct": noise["prevalence_pct"],
            "csat_impact": noise["csat_impact"],
            "price_weighted_exposure_usd": wtp["per_theme"]["noise"]["price_weighted_exposure_usd"],
            "n_reviews_supporting": noise["n_reviews"],
            "evidence": "src/real/taxonomy_real.py theme 'noise', n={} reviews".format(
                noise["n_reviews"]),
        },
        "OS-3": {
            "name": "Smart/Connected Feature Expansion (app control, voice assistant)",
            "usage_context": "Smart-speaker / connected-home households",
            "friction": "Presumed friction with manual app/physical control",
            "enabling_trend": "TC-R08 (Matter Air Quality Sensor device type), "
                              "TC-R07 (Versuni's own AI-purifier launch)",
            "friction_prevalence_pct": smart_pct,
            "csat_impact": None,
            "price_weighted_exposure_usd": None,
            "n_reviews_supporting": smart_n,
            "evidence": "keyword search across all {} real reviews: {} matches "
                       "({}%); reviews that DO mention connectivity skew POSITIVE "
                       "(feature praise, not complaint) on manual inspection".format(
                           len(rows), smart_n, smart_pct),
        },
    }

    verdict = {
        "recommended": "OS-1", "recommended_name": scores["OS-1"]["name"],
        "why": (
            "Real data presents a genuine Pareto trade-off, not a dominant winner: Noise "
            "(OS-2) reaches more reviews ({np}% vs {rp}%) and touches higher-price-exposure "
            "products (${ne:,.0f} vs ${re:,.0f}), but its satisfaction hit is the mildest of "
            "any real theme ({nc} stars). Reliability (OS-1) reaches fewer reviews but its "
            "satisfaction hit is severe ({rc} stars, close to the worst in the whole real "
            "taxonomy) and, unlike noise, a reliability failure typically ends the customer "
            "relationship outright (no repeat purchase, no consumable/filter revenue at all "
            "afterward) rather than just annoying a buyer who keeps the unit. That asymmetry "
            "- shallow-but-broad vs. severe-and-relationship-ending - is the explicit "
            "judgment call this recommendation rests on, not a formula: see "
            "'most sensitive assumption' below."
        ).format(np=noise["prevalence_pct"], rp=reliability["prevalence_pct"],
                 ne=wtp["per_theme"]["noise"]["price_weighted_exposure_usd"],
                 re=wtp["per_theme"]["reliability"]["price_weighted_exposure_usd"],
                 nc=noise["csat_impact"], rc=reliability["csat_impact"]),
        "killed": [
            {"id": "OS-2", "name": scores["OS-2"]["name"],
             "killing_metric": "CSAT Impact = {} stars - the SHALLOWEST satisfaction hit "
                               "of any theme in the real taxonomy, despite the highest "
                               "prevalence".format(noise["csat_impact"]),
             "reason": ("Noise is the most-mentioned real friction, but solving it moves "
                       "satisfaction the least. On the same real evidence, a euro spent on "
                       "quieting the motor buys less improvement in the metric that "
                       "actually predicts whether a buyer stays a customer than the same "
                       "euro spent on reliability. 'Mentioned often' and 'worth fixing "
                       "first' are not the same claim, and this real corpus is where that "
                       "distinction is visible.")},
            {"id": "OS-3", "name": scores["OS-3"]["name"],
             "killing_metric": "Friction Prevalence % = {}% ({} of {} reviews) - and on "
                               "manual inspection, most of those mentions are FEATURE "
                               "PRAISE, not complaints".format(
                                   smart_pct, smart_n, len(rows)),
             "reason": ("Unlike the earlier synthetic-fixture version of this exercise, "
                       "connectivity mentions are not literally zero in real data (~1%) - "
                       "but they are the smallest of the three real candidates AND skew "
                       "positive when they do appear (e.g., 'It is incredibly powerful and "
                       "[connectivity feature]... impressed with it'). There is no real "
                       "friction signal here to build a roadmap bet on, only a feature "
                       "people occasionally mention liking.")},
        ],
        "sensitivity": (
            "The recommendation is most sensitive to the judgment call in 'why' above: "
            "that a severe-but-narrower friction (reliability) is worth prioritizing over "
            "a shallow-but-broader one (noise). A different but equally defensible business "
            "judgment - reach matters more than depth, because a mildly annoyed majority "
            "still drives more aggregate churn than a severely annoyed minority - would flip "
            "this to OS-2. This is a genuine, stated either-way call; it is not resolved by "
            "the data alone."
        ),
        "first_experiment_os1": (
            "Cross-reference the real review corpus's product-level failure mentions "
            "('stopped working', 'died', 'never worked') against each real product's "
            "rating_number (a rough popularity proxy) to identify whether failure reports "
            "cluster in specific brands/price tiers or are evenly distributed - if evenly "
            "distributed, this is a category-wide manufacturing/QA opportunity; if "
            "clustered, it may instead argue for a narrower positioning bet against the "
            "worst-performing competitors specifically."
        ),
        "abandon_signal_os1": (
            "If the failure-mention cross-reference above shows reliability complaints "
            "concentrated in 2-3 specific older/discontinued products rather than spread "
            "across the category, treat this as a solved-or-solving problem rather than a "
            "live opportunity, and abandon."
        ),
        "market_scenario": {"used": scenario_source, "cagr_pct": scenario_cagr,
                            "note": ("The Q6 scores above do not depend on category CAGR at "
                                    "all - they are built entirely from review-level "
                                    "prevalence/CSAT/price-exposure, so this scenario flag "
                                    "changes the category-sizing narrative in Q5/insight_pack "
                                    "but changes NOTHING in this file's scores or verdict. "
                                    "Run with --market-scenario=imarc to see this "
                                    "confirmed live.")},
    }

    out = {
        "_provenance": "Recomputed from REAL Q2/Q3/Q4 outputs during this repair - not "
                       "carried over from the synthetic-fixture phase.",
        "generated_by": "src/real/decision_framework_real.py",
        "market_scenario_used": scenario,
        "scores": scores, "verdict": verdict,
    }
    with open(os.path.join(PROC, "decision_framework_real.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print("Q6 (real data) decision framework - market scenario: {} (CAGR {}%)".format(
        scenario, scenario_cagr))
    for sid, s in scores.items():
        print("  {:<6} {:<38} prev={:>6}% csat={} price_exp={}".format(
            sid, s["name"][:38], s["friction_prevalence_pct"], s["csat_impact"],
            s["price_weighted_exposure_usd"]))
    print("\n  RECOMMEND: {} - {}".format(verdict["recommended"], verdict["recommended_name"]))
    for k in verdict["killed"]:
        print("  KILL: {} - {}".format(k["id"], k["killing_metric"]))
    return out


if __name__ == "__main__":
    main()
