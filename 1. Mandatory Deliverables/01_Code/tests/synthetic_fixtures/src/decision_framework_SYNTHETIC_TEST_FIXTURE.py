"""Q6 - score the three opportunity spaces against the three Q1 measures, and
produce the recommendation and the two kills with explicit killing metrics.

The three measures were fixed at Q1 (src/config.py::DECISION_METRICS) and are
not redefined here:
  1. Friction Prevalence %   - src/taxonomy.py theme prevalence (or a direct
                               keyword search for OS-2/OS-3, which map to no
                               induced theme)
  2. CSAT Impact             - mean rating of affected reviews minus corpus mean
  3. Financial Value Proxy   - EUR/year value-at-stake, built from ONE empirical
                               anchor (Q4's filter_cost revenue-at-risk) and
                               extrapolated to the other frictions under a single,
                               explicitly-stated assumption (equal per-unit value
                               at stake across frictions). That assumption is
                               flagged as the sensitivity driver for Q6.

Run:  python3 src/decision_framework.py
"""
import csv
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config_SYNTHETIC_TEST_FIXTURE as C

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROC = os.path.join(ROOT, "data", "processed")
RAW = os.path.join(ROOT, "data", "raw", "consumer_reviews.csv")

OS2_MARKERS = ["voice", "alexa", "siri", "google assistant", "hey google", "voice command"]
OS3_MARKERS = ["outdoor air", "outdoor aqi", "outdoor pollution", "outside air quality"]


def load_reviews():
    with open(RAW, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def keyword_prevalence(rows, markers):
    n = sum(1 for r in rows if any(m in r["review_text"].lower() for m in markers))
    return n, round(100.0 * n / len(rows), 4)


def main():
    rows = load_reviews()
    tax = json.load(open(os.path.join(PROC, "taxonomy_themes.json"), encoding="utf-8"))["themes"]
    wtp = json.load(open(os.path.join(PROC, "wtp_proxy.json"), encoding="utf-8"))
    after = json.load(open(os.path.join(PROC, "defect_detection_report.json"), encoding="utf-8"))

    connected_installed = sum(int(r["installed_base_units_eu"]) for r in
                              csv.DictReader(open(os.path.join(ROOT, "data", "raw",
                                                                "aftermarket_signals.csv"))))

    # ---- empirical financial anchor from Q4 (filter_cost is the only
    # friction with a directly-measured EUR value) ------------------------
    filter_cost_theme = tax["filter_cost"]
    filter_cost_prevalence_frac = filter_cost_theme["friction_prevalence_pct"] / 100.0
    total_revenue_at_risk = wtp["category_weighted"]["total_annual_oem_revenue_at_risk_eur_m"] * 1_000_000
    value_per_affected_unit_eur = total_revenue_at_risk / (connected_installed * filter_cost_prevalence_frac)

    def financial_proxy(prevalence_pct):
        """EUR/year, assuming affected owners carry the SAME per-unit value at
        stake as filter_cost's measured owners. This is the single assumption
        the Q6 recommendation is most sensitive to - see technical_note.md."""
        return connected_installed * (prevalence_pct / 100.0) * value_per_affected_unit_eur

    corpus_mean = tax.get("filter_cost", {}).get("mean_rating")  # placeholder, real one below
    # corpus mean rating, trusted subset (same figure taxonomy.py computed)
    trusted_mean = json.load(open(os.path.join(PROC, "taxonomy_themes.json")))["corpus_mean_rating_trusted"]

    n_os2, prev_os2 = keyword_prevalence(rows, OS2_MARKERS)
    n_os3, prev_os3 = keyword_prevalence(rows, OS3_MARKERS)

    noise = tax["noise"]
    scores = {
        "OS-1": {
            "name": "Ultra-Quiet Autonomous Night Air Purification",
            "friction_prevalence_pct": noise["friction_prevalence_pct"],
            "n_reviews_supporting": noise["n_reviews"],
            "csat_impact": noise["csat_impact"],
            "financial_value_proxy_eur_m": round(financial_proxy(noise["friction_prevalence_pct"]) / 1e6, 2),
            "confidence": noise["confidence"],
            "evidence": "src/taxonomy.py theme 'noise', validated at 82% hand-label agreement "
                        "(kappa 0.767) on data/hand_labeled_sample.csv",
        },
        "OS-2": {
            "name": "Voice-Driven Manual Control",
            "friction_prevalence_pct": prev_os2,
            "n_reviews_supporting": n_os2,
            "csat_impact": None,
            "financial_value_proxy_eur_m": 0.0,
            "confidence": "none",
            "evidence": "keyword search for {} across all 3,500 raw reviews: {} matches".format(
                OS2_MARKERS, n_os2),
        },
        "OS-3": {
            "name": "Outdoor Air App Integration",
            "friction_prevalence_pct": prev_os3,
            "n_reviews_supporting": n_os3,
            "csat_impact": None,
            "financial_value_proxy_eur_m": 0.0,
            "confidence": "none",
            "evidence": "keyword search for {} across all 3,500 raw reviews: {} matches".format(
                OS3_MARKERS, n_os3),
        },
    }

    verdict = {
        "recommended": "OS-1",
        "recommended_name": scores["OS-1"]["name"],
        "why": (
            "OS-1 is the only opportunity space with a friction that (a) is present "
            "in the consumer-voice data at material, non-trivial prevalence, "
            "(b) is validated against a hand-labelled sample rather than asserted, "
            "(c) carries a large, high-confidence CSAT penalty ({} stars vs. corpus "
            "mean {}), and (d) has a non-zero financial value proxy under the stated "
            "assumption. OS-2 and OS-3 clear none of the three measures above a "
            "detectable floor."
        ).format(noise["mean_rating"], trusted_mean),
        "killed": [
            {
                "id": "OS-2", "name": scores["OS-2"]["name"],
                "killing_metric": "Friction Prevalence % = {}% ({} of 3,500 reviews)".format(
                    prev_os2, n_os2),
                "reason": (
                    "Zero reviewers in a 3,500-review corpus mention voice control, a "
                    "voice assistant, or manual-control friction of any kind. The premise "
                    "of the opportunity - that manual app control is a felt friction - has "
                    "no support in the data assembled for this exercise. Matter 1.4 makes "
                    "this technically easy (TC-003), but ease of build is not evidence of "
                    "demand."
                ),
            },
            {
                "id": "OS-3", "name": scores["OS-3"]["name"],
                "killing_metric": "Friction Prevalence % = {}% ({} of 3,500 reviews)".format(
                    prev_os3, n_os3),
                "reason": (
                    "Zero reviewers mention outdoor air quality, outdoor AQI, or relating "
                    "indoor readings to outside conditions. This may reflect a real gap "
                    "review text cannot surface (see limitation below) rather than a real "
                    "absence of the need, but on the only consumer-voice evidence this "
                    "repository contains, the friction is not observed."
                ),
            },
        ],
        "sensitivity": (
            "The recommendation is most sensitive to the equal-per-unit-value assumption "
            "in the Financial Value Proxy: it borrows the EUR/unit value-at-stake measured "
            "for filter_cost (a real, behavioural, revealed-preference figure) and applies "
            "it to the noise friction, which has no direct financial measurement of its own. "
            "If noise owners are actually worth less than filter-switching owners per unit "
            "- plausible, since defecting to a third-party filter is a lower-commitment act "
            "than replacing a purifier - the Financial Value Proxy for OS-1 is overstated "
            "and the case for OS-1 rests more heavily on CSAT Impact and Friction Prevalence "
            "than on the euro figure."
        ),
        "kill_switch_evidence_gap": (
            "A prevalence of 0% for OS-2 and OS-3 is a property of REVIEW TEXT, which "
            "structurally cannot surface a need for a feature that does not yet exist "
            "(nobody complains about the absence of voice control in a purifier review "
            "unless they were already expecting it). The kill is sound given the mandate "
            "of this exercise - decide from the data assembled - but a stated-need survey "
            "would be the correct instrument before treating either kill as final."
        ),
        "first_experiment_os1": (
            "Ship an opt-in 'ultra-quiet mode' firmware update to the existing VS-AP-8000i "
            "connected install base (118k units) that trades a small purification-speed "
            "penalty for a measured dB reduction below the current sleep-mode floor; "
            "measure opt-in rate and 30-day retention of the mode versus a control group "
            "that receives the update but not the prompt."
        ),
        "abandon_signal_os1": (
            "If opt-in rate for the ultra-quiet mode stays under 15% of the eligible "
            "install base after 60 days, treat the noise friction in review text as "
            "vocal-minority noise rather than a majority preference, and abandon."
        ),
    }

    out = {
        "_provenance": C.PROVENANCE_BANNER,
        "generated_by": "src/decision_framework.py",
        "fixed_measures": [{"id": mid, "name": name, "definition": defn}
                           for mid, name, defn in C.DECISION_METRICS],
        "financial_proxy_method": {
            "anchor": "filter_cost revenue-at-risk from src/willingness_to_pay.py",
            "value_per_affected_connected_unit_eur": round(value_per_affected_unit_eur, 2),
            "assumption": "Equal EUR value-at-stake per affected unit across friction themes "
                          "(stated, not measured, for themes other than filter_cost).",
            "connected_installed_base_eu_units": connected_installed,
        },
        "scores": scores,
        "verdict": verdict,
    }
    with open(os.path.join(PROC, "decision_framework.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print("Q6 decision framework")
    print("  {:<6} {:<38} {:>8} {:>9} {:>10}".format("id", "name", "prev%", "CSATd", "fin.EURm"))
    for sid, s in scores.items():
        print("  {:<6} {:<38} {:>8} {:>9} {:>10}".format(
            sid, s["name"][:38], s["friction_prevalence_pct"],
            s["csat_impact"] if s["csat_impact"] is not None else "n/a",
            s["financial_value_proxy_eur_m"]))
    print("\n  RECOMMEND: {} - {}".format(verdict["recommended"], verdict["recommended_name"]))
    for k in verdict["killed"]:
        print("  KILL: {} - {}".format(k["id"], k["killing_metric"]))
    return out


if __name__ == "__main__":
    main()
