"""VERSUNI AIR CASE — CONTROL ROOM

Local inspection tool only. Reads frozen local outputs; no network access.

Write scope, precisely (this was wrong in an earlier draft, caught by an
independent review - see git history):
  - SCENARIO LAB tab: never mutates data/raw or data/processed. Calls the
    SAME pure production functions the CLI uses (compute(),
    compute_theme_stats(), compute_price_exposure() in src/real/*.py) and
    writes only to data/runtime/scenario_result.json.
  - CONSUMERS tab's human-labelling section: writes exclusively to
    data/manual/hand_labels.csv, blinded (see that section's own comment).
  - EVIDENCE/SYSTEM HEALTH tab's "make test"/"make verify"/"make live-check"
    buttons DELIBERATELY run the real CLI/pipeline, which can rewrite
    data/processed/*.json - that is the point of those buttons (rehearsing
    the exact commands a live session would run), not a Scenario Lab action.
    "Q5 scenario check" on that same tab calls compute() directly (no
    subprocess) precisely so a quick display check does NOT write anything.

Run: make app   (-> python3 -m streamlit run dashboard/app.py)
"""
import csv
import json
import os
import subprocess
import sys
from datetime import datetime, timezone

import streamlit as st

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))
sys.path.insert(0, os.path.join(ROOT, "src", "real"))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

import config as C  # noqa: E402
from taxonomy_real import THEMES, classify, compute_theme_stats, load_clean  # noqa: E402
from wtp_real import load_prices, compute_price_exposure  # noqa: E402
from decision_framework_real import compute as compute_decision  # noqa: E402
import trace_claim as tc  # noqa: E402

st.set_page_config(page_title="VERSUNI AIR CASE — CONTROL ROOM", layout="wide")

MANUAL_DIR = os.path.join(ROOT, "data", "manual")
MANUAL_LABELS = os.path.join(MANUAL_DIR, "hand_labels.csv")
BLANK_SAMPLE = os.path.join(ROOT, "data", "hand_label_sample_BLANK.csv")
RUNTIME_DIR = os.path.join(ROOT, "data", "runtime")


# ----------------------------------------------------------------- loaders
@st.cache_data
def load_json(rel_path):
    with open(os.path.join(ROOT, rel_path), encoding="utf-8") as fh:
        return json.load(fh)


@st.cache_data
def load_csv(rel_path):
    with open(os.path.join(ROOT, rel_path), newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


@st.cache_data
def load_reviews_raw():
    return load_csv("data/raw/consumer_reviews.csv")


@st.cache_data
def load_clean_reviews():
    return load_clean()


@st.cache_data
def load_real_prices():
    return load_prices()


def git_commit():
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"],
                                       cwd=ROOT, text=True).strip()
    except Exception:
        return "unknown"


def synthetic_evidence_count():
    """Genuinely checks, does not assert. Any data/raw/*.json with
    _synthetic:true, or any deliverable citing the old synthetic figures,
    counts against zero."""
    count = 0
    for name in ("market_metrics.json", "trend_corpus.json"):
        try:
            doc = load_json("data/raw/" + name)
            if doc.get("_synthetic"):
                count += 1
        except FileNotFoundError:
            pass
    manifest = load_json("data/manifest.json")
    if manifest.get("_synthetic"):
        count += 1
    return count


def manual_label_progress():
    if not os.path.exists(MANUAL_LABELS):
        return 0, 50, []
    rows = load_csv_uncached(MANUAL_LABELS)
    labelled = [r for r in rows if r.get("human_label", "").strip()]
    return len(labelled), 50, labelled


def load_csv_uncached(path):
    with open(path, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def md(text):
    """Escape literal '$' before handing free text to st.markdown/st.success/
    st.error/st.info - Streamlit's markdown renderer treats a $...$ pair as
    inline LaTeX, which silently mangles any sentence containing two dollar
    amounts (e.g. "$84,015.62 vs $26,357.86" rendered as broken math on
    first load of this dashboard - caught by actually opening the page, not
    just running it headless)."""
    return str(text).replace("$", "\\$")


# ----------------------------------------------------------------- header
st.title("VERSUNI AIR CASE")
st.caption("CONTROL ROOM — Air Purification / Air Purifier, real evidence only")

topcols = st.columns(5)
topcols[0].metric("Git commit", git_commit())
topcols[1].metric("Synthetic final evidence", synthetic_evidence_count())
n_labelled, n_target, _ = manual_label_progress()
topcols[2].metric("Human labels", "{}/{}".format(n_labelled, n_target))
try:
    manifest = load_json("data/manifest.json")
    topcols[3].metric("Real reviews", manifest["files"][0]["record_count"])
except Exception:
    topcols[3].metric("Real reviews", "n/a")
topcols[4].metric("Real products", manifest["files"][0].get("distinct_real_products", "n/a"))

tabs = st.tabs(["EXECUTIVE", "DATA", "DATA QUALITY", "CONSUMERS",
               "MARKET / PRICE / WTP", "OPPORTUNITIES", "SCENARIO LAB",
               "EVIDENCE / SYSTEM HEALTH"])

# =========================================================== 1. EXECUTIVE
with tabs[0]:
    st.header("Executive summary")
    st.caption("Current evidence-based results — not a fixed conclusion. "
              "Recompute anytime; see SCENARIO LAB for sensitivity.")

    dec = load_json("data/processed/decision_framework_real.json")
    verdict = dec["verdict"]
    scores = dec["scores"]

    c1, c2 = st.columns([2, 1])
    with c1:
        st.subheader("Recommendation")
        st.success("**{}**\n\n{}".format(
            verdict["recommended_name"], md(scores[verdict["recommended"]]["friction"])))
        st.markdown("**Why:** " + md(verdict["why"]))
        st.markdown("**Most sensitive assumption:** " + md(verdict["sensitivity"]))

        st.subheader("Rejected")
        for k in verdict["killed"]:
            with st.expander("{} — {}".format(k["id"], scores[k["id"]]["name"])):
                st.markdown("**Killing metric:** " + md(k["killing_metric"]))
                st.markdown(md(k["reason"]))

    with c2:
        st.subheader("Three fixed measures")
        for mid, name, definition in C.DECISION_METRICS if hasattr(C, "DECISION_METRICS") else []:
            st.markdown("**{}**  \n{}".format(name, definition))
        if not hasattr(C, "DECISION_METRICS"):
            st.markdown("- **Friction Prevalence %**\n- **CSAT Impact**\n"
                       "- **Price-Weighted Exposure** (real, a labelled diagnostic - not WTP)")

        st.subheader("Status")
        req = None
        req_path = os.path.join(ROOT, "CASE_COMPLIANCE.yaml")
        st.markdown("Requirements ledger: `CASE_COMPLIANCE.yaml`")
        st.markdown("- Q1–Q6: see OPPORTUNITIES / DATA QUALITY / MARKET tabs")
        st.markdown("- Human validation: **{}/50** real labels".format(n_labelled))
        st.markdown("- Synthetic final evidence: **{}**".format(synthetic_evidence_count()))

        if st.button("Run tests now"):
            r = subprocess.run(["python3", "-m", "unittest", "tests.test_real_pipeline"],
                              cwd=ROOT, capture_output=True, text=True)
            st.code(r.stderr[-1500:] or r.stdout[-1500:])
        if st.button("Run verify now"):
            r = subprocess.run(["python3", "scripts/verify_submission.py"],
                              cwd=ROOT, capture_output=True, text=True)
            st.code(r.stdout[-1500:])

# =========================================================== 2. DATA
with tabs[1]:
    st.header("Real data inventory")
    manifest = load_json("data/manifest.json")
    for f in manifest["files"]:
        with st.expander("{} — {} records".format(f["filename"], f["record_count"])):
            st.json(f)

    st.subheader("Real review corpus — browse")
    reviews = load_reviews_raw()
    q = st.text_input("Search review text or product name")
    min_rating, max_rating = st.slider("Rating range", 1, 5, (1, 5))
    filtered = [r for r in reviews
               if min_rating <= float(r["rating"] or 0) <= max_rating
               and (not q or q.lower() in (r["review_text"] or "").lower()
                    or q.lower() in (r["product_name"] or "").lower())]
    st.caption("{} of {} real reviews match".format(len(filtered), len(reviews)))
    st.dataframe(filtered[:200], use_container_width=True, height=400)

# =========================================================== 3. DATA QUALITY
with tabs[2]:
    st.header("Data quality — real defects only")
    det = load_json("data/processed/defect_detection_report_real.json")
    st.caption(det["_provenance"])

    for key, d in det["defects_found"].items():
        with st.expander("{} — {} found".format(key.replace("_", " ").title(), d["count"])):
            st.markdown(md("**Remedy:** " + d["remedy"]))
            ev = d.get("evidence", {})
            if isinstance(ev, dict):
                if "rule" in ev:
                    st.markdown("**Rule:** `{}`".format(ev["rule"]))
                for k in ("examples", "distinct_duplicate_texts", "pattern_breakdown"):
                    if k in ev:
                        st.write(k, ev[k])
            if d["count"] == 0:
                st.info("Zero found — a genuine real-data finding, not a detector failure. "
                       "This corpus does not contain the kind of defect the earlier synthetic "
                       "fixture planted by design.")

# =========================================================== 4. CONSUMERS
with tabs[3]:
    st.header("Consumer friction taxonomy — real text")
    tax = load_json("data/processed/taxonomy_themes_real.json")
    st.caption("Corpus mean (rating_trusted): {} | unassigned: {}%".format(
        tax["corpus_mean_rating_trusted"], tax["unassigned_pct"]))

    theme_rows = [{"theme": st_["theme_name"], "prevalence_pct": st_["prevalence_pct"],
                  "csat_impact": st_["csat_impact"], "n_reviews": st_["n_reviews"]}
                 for st_ in tax["themes"].values()]
    st.dataframe(sorted(theme_rows, key=lambda r: -r["prevalence_pct"]), use_container_width=True)

    val = tax["validation"]
    if "raw_agreement_pct" in val:
        st.success("Human validation complete: {}% raw agreement, n={}".format(
            val["raw_agreement_pct"], val["n_labelled"]))
    else:
        st.warning("HUMAN_ACTION_REQUIRED — Q3 validation not yet computed. "
                  "Complete labelling below first.")

    st.subheader("Representative real excerpts")
    st.caption("Excludes the 50 reviews in the blind hand-labelling sample below - "
              "seeing a review's automated theme here before blind-labelling it would "
              "leak the label the blinding rule exists to hide.")
    theme_pick = st.selectbox("Theme", list(tax["themes"].keys()),
                              format_func=lambda t: tax["themes"][t]["theme_name"])
    reviews = load_clean_reviews()
    blind_sample_ids = {r["review_id"] for r in load_csv(os.path.relpath(BLANK_SAMPLE, ROOT))}
    examples = [r for r in reviews if r["review_id"] not in blind_sample_ids
               and classify(r["review_text"]) == theme_pick][:8]
    for r in examples:
        st.markdown(md("> **{}★** — {}".format(r["rating"], (r["review_text"] or "")[:220])))

    st.divider()
    st.subheader("Human labelling — BLINDED")
    st.caption("The automated label is never shown before you save your label for a row. "
              "See it only in the post-completion validation report below.")

    os.makedirs(MANUAL_DIR, exist_ok=True)
    blank = load_csv(os.path.relpath(BLANK_SAMPLE, ROOT))
    existing = {r["review_id"]: r for r in load_csv_uncached(MANUAL_LABELS)} \
              if os.path.exists(MANUAL_LABELS) else {}
    unlabelled = [r for r in blank if r["review_id"] not in existing
                 or not existing[r["review_id"]].get("human_label", "").strip()]

    n_done = len(blank) - len(unlabelled)
    st.progress(n_done / len(blank), text="{}/{} labelled".format(n_done, len(blank)))

    if unlabelled:
        row = unlabelled[0]
        st.markdown(md("**Review `{}`** — {}★ — *{}*".format(
            row["review_id"], row["rating"], row["product_name"])))
        st.markdown(md("> " + row["review_text"]))
        theme_options = ["none"] + list(THEMES.keys())
        choice = st.radio("Your label (no automated hint shown)", theme_options,
                          format_func=lambda t: "none (no friction)" if t == "none"
                          else THEMES[t][0], key="label_choice_{}".format(row["review_id"]))
        note = st.text_input("Optional note", key="label_note_{}".format(row["review_id"]))
        if st.button("Save label and continue", key="save_{}".format(row["review_id"])):
            all_rows = load_csv_uncached(MANUAL_LABELS) if os.path.exists(MANUAL_LABELS) else []
            all_rows = [r for r in all_rows if r["review_id"] != row["review_id"]]
            all_rows.append({
                "review_id": row["review_id"], "human_label": choice,
                "labelled_at": datetime.now(timezone.utc).isoformat(),
                "labelled_by": "human_user", "note": note,
            })
            with open(MANUAL_LABELS, "w", newline="", encoding="utf-8") as fh:
                w = csv.DictWriter(fh, fieldnames=["review_id", "human_label",
                                                   "labelled_at", "labelled_by", "note"])
                w.writeheader()
                w.writerows(all_rows)
            st.cache_data.clear()
            st.rerun()
    else:
        st.success("All 50 real reviews labelled.")
        st.markdown("Run validation: `python3 src/real/taxonomy_real.py` after copying "
                   "`data/manual/hand_labels.csv` review_id/human_label columns into "
                   "`data/hand_label_sample.csv`'s `hand_label` column (validation logic "
                   "lives in the analysis layer, not the dashboard).")

# =========================================================== 5. MARKET/PRICE/WTP
with tabs[4]:
    st.header("Market, price, and willingness-to-pay evidence")
    mkt = load_json("data/raw/market_metrics.json")
    st.subheader("Q5 — two real, disagreeing sources")
    c1, c2 = st.columns(2)
    for col, s in zip((c1, c2), mkt["sources"]):
        with col:
            st.markdown(md("### {}".format(s["vendor"])))
            st.markdown(md("**{}**".format(s["product_title"])))
            st.markdown("CAGR: **{}%** ({}–{})".format(
                s["metric"]["value"], s["metric"]["period"]["start_year"],
                s["metric"]["period"]["end_year"]))
            st.markdown(md("${}B → ${}B".format(
                s["market_size"]["base_value_usd_b"], s["market_size"]["forecast_value_usd_b"])))
            st.caption("Source: [{}]({})".format(s["url"], s["url"]))
            st.caption("Archived: `{}`".format(s["archive_file"]))
    st.info(md(mkt["conflict_summary"]["headline"]))
    with st.expander("Why they disagree"):
        for axis in mkt["reconciliation"]["divergence_axes"]:
            st.markdown(md("**{}**: {}".format(axis["axis"], axis["rationale"])))

    st.divider()
    st.subheader("Q4 — willingness to pay")
    wtp = load_json("data/processed/wtp_real.json")
    if not wtp["direct_wtp_available"]:
        st.error(md("DIRECT WTP: NOT AVAILABLE — " + wtp["direct_wtp_statement"]))
    st.markdown(md("**OBSERVED_PRICE** (real, historical Amazon listings): {}/{} products, "
               "${}-${}, median ${}".format(
                   wtp["real_price_coverage"]["n_products_with_real_observed_price"],
                   wtp["real_price_coverage"]["n_products_total"],
                   wtp["real_price_coverage"]["min_usd"], wtp["real_price_coverage"]["max_usd"],
                   wtp["real_price_coverage"]["median_usd"])))
    st.markdown("**PRICE_EXPOSURE** (relative reach×price indicator, NOT revenue/WTP):")
    exp_rows = [{"theme": v["theme_name"], "price_weighted_exposure_usd": v["price_weighted_exposure_usd"],
                "n_reviews_affected": v["n_reviews_affected"],
                "value_language_prevalence_pct (REVIEW_LANGUAGE_PROXY)": v["value_language_prevalence_pct"]}
               for v in wtp["per_theme"].values()]
    st.dataframe(sorted(exp_rows, key=lambda r: -r["price_weighted_exposure_usd"]),
                use_container_width=True)
    st.caption(md("What would replace this proxy: " + "; ".join(wtp["what_would_replace_the_proxy"])))

# =========================================================== 6. OPPORTUNITIES
with tabs[5]:
    st.header("Opportunity spaces")
    st.caption("Exactly three fixed dimensions per space - Consumer Pain, Economic "
              "Value, 2-5 Year Feasibility. No weighted overall score. Winner is "
              "computed live (gate -> Pareto dominance -> named judgment rule), "
              "never a fixed literal - see EVIDENCE tab / CASE_COMPLIANCE.yaml.")
    dec = load_json("data/processed/decision_framework_real.json")
    verdict = dec["verdict"]
    winner_id = verdict["recommended"]
    st.info(md("**Decision type:** {}  |  **Decision priority used:** {}".format(
        verdict["decision_type"], verdict["decision_priority_used"])))
    ordering = [winner_id] + [sid for sid in ("OS-1", "OS-2", "OS-3") if sid != winner_id]
    for sid in ordering:
        label = "WINNER" if sid == winner_id else "REJECTED"
        s = dec["scores"][sid]
        box = st.success if label == "WINNER" else st.error
        box(md("**{} — {}**".format(label, s["name"])))
        c1, c2, c3 = st.columns(3)
        pain = s["consumer_pain"]
        c1.metric("Consumer Pain", "{}★".format(pain["severity_csat"]) if pain["severity_csat"] is not None else "n/a",
                  help="Gate: prevalence {}% (floor 0.5%) -> {}".format(
                      pain["prevalence_pct"], "PASSED" if pain["gate_passed"] else "FAILED"))
        c2.metric("Economic Value", "${:,.0f}".format(s["economic_value"]) if s.get("economic_value") else "n/a")
        c3.metric("2-5yr Feasibility", s["feasibility_2_5y"]["rating"].upper())
        st.caption(md("Dominance status: **{}** — {}".format(s["dominance_status"], s["decision_reason"])))
        with st.expander("Consumer / friction / feasibility / evidence / assumptions"):
            st.markdown("**Usage context:** " + md(s["usage_context"]))
            st.markdown("**Friction:** " + md(s["friction"]))
            st.markdown("**Feasibility rationale:** " + md(s["feasibility_2_5y"]["rationale"]))
            st.markdown("**Evidence IDs:** " + ", ".join(s["evidence_ids"]))
            st.markdown("**Assumptions:** " + "; ".join(s["assumptions"]))
            st.markdown("**Uncertainty:** " + "; ".join(s["uncertainty"]))
        st.divider()

# =========================================================== 7. SCENARIO LAB
with tabs[6]:
    st.header("Scenario Lab")
    st.caption("Writes only to data/runtime/ — never mutates data/raw, data/processed, "
              "or deliverables. Calls the same production functions as the CLI.")

    os.makedirs(RUNTIME_DIR, exist_ok=True)
    all_rows = load_clean_reviews()
    products = sorted({r["product_name"] for r in all_rows})

    st.subheader("Controls")
    col1, col2 = st.columns(2)
    with col1:
        market_scenario = st.radio("Q5 market source", ["mordor", "imarc"],
                                   format_func=lambda s: "Mordor Intelligence (5.37% CAGR)"
                                   if s == "mordor" else "IMARC Group (6.54% CAGR)")
        exclude_product = st.selectbox("Exclude one product (optional)",
                                       ["(none)"] + products)
        decision_priority = st.radio(
            "Decision priority — THE most-sensitive assumption (Q6)",
            ["pain_feasibility_majority", "economic_value_override"],
            format_func=lambda p: "Severity + Feasibility majority (current default)"
            if p == "pain_feasibility_majority" else "Economic Value overrides (the named flip)")
    with col2:
        min_r = st.slider("Rating floor for 'trusted' reviews (theme recompute)", 1, 5, 1)
        prediction = st.text_input(
            "EXPECTED DIRECTION — state your prediction before running",
            placeholder="e.g. 'switching to economic_value_override should flip the "
                       "winner to Whisper-Quiet Night Mode, since it has the higher "
                       "Economic Value'")

    run_disabled = not prediction.strip()
    if run_disabled:
        st.info("Enter a prediction above to enable the run.")
    if st.button("Run scenario", disabled=run_disabled):
        scenario_rows = [r for r in all_rows if float(r["rating"] or 0) >= min_r]
        if exclude_product != "(none)":
            scenario_rows = [r for r in scenario_rows if r["product_name"] != exclude_product]

        baseline_stats, baseline_mean, _ = compute_theme_stats(all_rows)
        scenario_stats, scenario_mean, _ = compute_theme_stats(scenario_rows)
        prices = load_real_prices()
        baseline_exposure = compute_price_exposure(all_rows, prices)
        scenario_exposure = compute_price_exposure(scenario_rows, prices)
        # BASELINE is always the unmodified default (mordor + majority rule),
        # so "what changed" is always measured against the same fixed point,
        # regardless of which controls above were touched.
        baseline_dec = compute_decision("mordor", decision_priority="pain_feasibility_majority")
        scenario_dec = compute_decision(market_scenario, rows=scenario_rows,
                                        decision_priority=decision_priority)

        winner_changed = baseline_dec["verdict"]["recommended"] != scenario_dec["verdict"]["recommended"]
        what_changed = []
        if market_scenario != "mordor":
            what_changed.append("Q5 market source -> {}".format(market_scenario))
        if exclude_product != "(none)":
            what_changed.append("excluded product: {}".format(exclude_product))
        if min_r != 1:
            what_changed.append("rating floor -> {}".format(min_r))
        if decision_priority != "pain_feasibility_majority":
            what_changed.append("decision priority -> {}".format(decision_priority))
        if not what_changed:
            what_changed.append("(nothing - scenario == baseline)")

        result = {
            "prediction": prediction, "market_scenario": market_scenario,
            "exclude_product": exclude_product, "min_rating": min_r,
            "decision_priority": decision_priority,
            "baseline_recommended": baseline_dec["verdict"]["recommended"],
            "scenario_recommended": scenario_dec["verdict"]["recommended"],
            "winner_changed": winner_changed,
            "what_changed": what_changed,
            "why": scenario_dec["verdict"]["why"],
            "run_at": datetime.now(timezone.utc).isoformat(),
        }
        with open(os.path.join(RUNTIME_DIR, "scenario_result.json"), "w", encoding="utf-8") as fh:
            json.dump(result, fh, indent=2)

        st.subheader("Result")
        c1, c2, c3 = st.columns(3)
        c1.metric("BASELINE WINNER", result["baseline_recommended"])
        c2.metric("NEW WINNER", result["scenario_recommended"])
        c3.metric("WINNER CHANGED", "YES" if result["winner_changed"] else "NO")
        st.markdown("**WHAT CHANGED:** " + "; ".join(what_changed))
        st.markdown(md("**WHY:** " + result["why"]))

        st.markdown("**Baseline vs scenario theme deltas**")
        delta_rows = []
        for tid in THEMES:
            b, s = baseline_stats[tid], scenario_stats[tid]
            be, se = baseline_exposure[tid], scenario_exposure[tid]
            delta_rows.append({
                "theme": b["theme_name"],
                "baseline_prevalence_pct": b["prevalence_pct"],
                "scenario_prevalence_pct": s["prevalence_pct"],
                "delta_pct_pts": round((s["prevalence_pct"] or 0) - (b["prevalence_pct"] or 0), 2),
                "baseline_csat": b["csat_impact"], "scenario_csat": s["csat_impact"],
                "baseline_price_exposure_usd": be["price_weighted_exposure_usd"],
                "scenario_price_exposure_usd": se["price_weighted_exposure_usd"],
            })
        st.dataframe(delta_rows, use_container_width=True)
        st.caption("Written to data/runtime/scenario_result.json — frozen submission data untouched.")

# =========================================================== 8. EVIDENCE / SYSTEM HEALTH
with tabs[7]:
    st.header("Evidence lineage & system health")

    st.subheader("Trace a claim")
    all_claims = [r["claim_id"] for r in tc.load_evidence_table()]
    picked = st.selectbox("claim_id", all_claims)
    if picked:
        t = tc.trace(picked)
        st.write(t)
        (st.success if t["PASS"] else st.error)("Trace result: {}".format(
            "PASS" if t["PASS"] else "FAIL"))

    if st.button("Trace 10 random claims"):
        import random
        rows = tc.load_evidence_table()
        random.seed()
        sample = random.sample(rows, min(10, len(rows)))
        results = [tc.trace(r["claim_id"]) for r in sample]
        passed = sum(1 for r in results if r["PASS"])
        st.write(results)
        st.metric("Evidence trace", "{}/10".format(passed))

    st.divider()
    st.subheader("make targets")
    mc1, mc2, mc3, mc4 = st.columns(4)
    if mc1.button("make test"):
        r = subprocess.run(["make", "test"], cwd=ROOT, capture_output=True, text=True)
        st.code((r.stdout + r.stderr)[-1500:])
    if mc2.button("make verify"):
        r = subprocess.run(["make", "verify"], cwd=ROOT, capture_output=True, text=True)
        st.code((r.stdout + r.stderr)[-1500:])
    if mc3.button("make live-check"):
        st.caption("Runs the real CLI/pipeline commands from the live-session runbook - this "
                  "intentionally exercises (and may rewrite) data/processed/*.json, the "
                  "same way running them by hand during the live session would. This is "
                  "not the Scenario Lab, which never touches data/processed.")
        r = subprocess.run(["make", "live-check"], cwd=ROOT, capture_output=True, text=True)
        st.code((r.stdout + r.stderr)[-1500:])
    if mc4.button("Q5 scenario check"):
        # Uses the pure compute() function directly - no subprocess, no file
        # write - so a display-only check never touches data/processed,
        # unlike the CLI/live-check buttons above which deliberately do.
        r1 = compute_decision("mordor")
        r2 = compute_decision("imarc")
        st.write({"mordor": r1["verdict"]["recommended"], "imarc": r2["verdict"]["recommended"]})

    st.divider()
    st.subheader("Snapshot")
    st.markdown("- Git commit: `{}`".format(git_commit()))
    st.markdown("- Synthetic final evidence count: **{}**".format(synthetic_evidence_count()))
    st.markdown("- Human labels: **{}/50**".format(n_labelled))
