"""Submission integrity verifier. `make verify` runs this.

Fails LOUDLY (non-zero exit, printed failures) on any of the 16 checks
below. Never softens a check to get a green run - if a check is wrong,
fix the check's logic explicitly and say why in a commit, don't silently
relax the threshold.
"""
import csv
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from trace_claim import load_evidence_table, trace  # noqa: E402

FAILURES = []
PASSES = []


def check(name, condition, detail=""):
    if condition:
        PASSES.append(name)
    else:
        FAILURES.append((name, detail))


def j(*parts):
    with open(os.path.join(ROOT, *parts), encoding="utf-8") as fh:
        return json.load(fh)


def main():
    # 1. No final claim traces to synthetic fixtures
    rows = load_evidence_table()
    for r in rows:
        sf = r["source_file"].split(" (")[0].strip()
        check("1. claim {} does not trace to synthetic_fixtures".format(r["claim_id"]),
              "synthetic_fixtures" not in sf and "SYNTHETIC" not in sf,
              "source_file={}".format(sf))

    # 2. Every final numeric claim in insight_pack.md has evidence-table coverage
    pack = open(os.path.join(ROOT, "deliverables", "insight_pack.md"), encoding="utf-8").read()
    table_values = {row["value_as_cited"] for row in rows}
    candidates = set(re.findall(r"-?\d+\.\d+%?|\$?\d[\d,]*\.\d+%?", pack))
    untraced = [c for c in candidates
               if not any(c.strip("$€%,").replace(",", "") in v.replace(",", "") for v in table_values)]
    check("2. every insight_pack.md number has an evidence_table.csv row",
          not untraced, "untraced: {}".format(untraced))

    # 3. Every evidence-table path exists
    for r in rows:
        sf = r["source_file"].split(" (")[0].strip()
        check("3. evidence path exists: {}".format(r["claim_id"]),
              os.path.exists(os.path.join(ROOT, sf)), sf)

    # 4/6. Required source URLs present, no placeholder/fabricated URLs
    mkt = j("data", "raw", "market_metrics.json")
    for s in mkt["sources"]:
        check("4/6. market source {} has a real URL".format(s["source_id"]),
              s["url"].startswith("http") and "placeholder" not in s["url"].lower())
    corpus = j("data", "raw", "trend_corpus.json")
    for a in corpus["articles"]:
        check("4/6. trend doc {} url_verified".format(a["article_id"]), a["url_verified"])
        check("6. trend doc {} not a placeholder".format(a["article_id"]),
              "PLACEHOLDER" not in (a.get("url_status") or ""))

    # 5. Archived sources actually exist on disk
    for s in mkt["sources"]:
        check("5. market source {} archive exists".format(s["source_id"]),
              os.path.exists(os.path.join(ROOT, s["archive_file"])))
    for a in corpus["articles"]:
        if a.get("archive_file"):
            check("5. trend doc {} archive exists".format(a["article_id"]),
                  os.path.exists(os.path.join(ROOT, a["archive_file"])))

    # 7. Q5 primary AND alternative evidence present
    check("7. Q5 has >=2 sources", len(mkt["sources"]) >= 2)
    vendors = {s["vendor"] for s in mkt["sources"]}
    check("7. Q5 sources are genuinely different vendors", len(vendors) >= 2, str(vendors))

    # 8. Every evidence row has transformation + code provenance
    for r in rows:
        check("8. claim {} has transformation".format(r["claim_id"]),
              bool(r["transformation"].strip()))
        check("8. claim {} has code_reference".format(r["claim_id"]),
              bool(r["code_reference"].strip()))

    # 9/10. Human-validation honesty: BLANK file has no labels, and if a
    # completed file exists, its labelled_by is never an AI identity
    blank_path = os.path.join(ROOT, "data", "hand_label_sample_BLANK.csv")
    if os.path.exists(blank_path):
        with open(blank_path, newline="", encoding="utf-8") as fh:
            blank_rows = list(csv.DictReader(fh))
        check("9. hand_label_sample_BLANK.csv genuinely blank",
              all(r.get("hand_label", "").strip() == "" for r in blank_rows))

    manual_path = os.path.join(ROOT, "data", "manual", "hand_labels.csv")
    tax = j("data", "processed", "taxonomy_themes_real.json")
    if os.path.exists(manual_path):
        with open(manual_path, newline="", encoding="utf-8") as fh:
            manual_rows = list(csv.DictReader(fh))
        check("10. no AI-authored labels in data/manual/hand_labels.csv",
              all(r.get("labelled_by") == "human_user" for r in manual_rows),
              "found labelled_by values: {}".format(
                  {r.get("labelled_by") for r in manual_rows}))
        n_complete = sum(1 for r in manual_rows if r.get("human_label", "").strip())
        check("9. Q3 validation status matches actual label completeness",
              (n_complete >= 50) == ("raw_agreement_pct" in tax.get("validation", {})),
              "n_complete={}, validation={}".format(n_complete, tax.get("validation", {})))
    else:
        check("9. Q3 validation honestly reports HUMAN_ACTION_REQUIRED (no labels yet)",
              "HUMAN_ACTION_REQUIRED" in tax.get("validation", {}).get("status", ""))

    # 11. WTP claimed only with the correct evidence class
    wtp = j("data", "processed", "wtp_real.json")
    check("11. direct_wtp_available is explicitly False (no fabricated WTP)",
          wtp["direct_wtp_available"] is False)
    check("11. WTP statement names the evidence gap explicitly",
          "does not directly measure" in wtp["direct_wtp_statement"])

    # 12. No synthetic values referenced by deliverables
    for name in ("insight_pack.md", "technical_note.md", "data_quality_report.md"):
        text = open(os.path.join(ROOT, "deliverables", name), encoding="utf-8").read()
        check("12. {} does not cite the old synthetic figures (4.399, 97.32m EUR, 73.89%)".format(name),
              "4.399" not in text and "97.32" not in text and "73.89" not in text)

    # 13. Insight pack <= 5 slides
    n_slides = len(re.findall(r"^## Slide", pack, re.M))
    check("13. insight_pack.md has <=5 slides", n_slides <= 5 and n_slides > 0, str(n_slides))

    # 14. Technical note length (operational proxy: word count <= ~1200,
    # consistent with 2 pages at normal report density)
    tn = open(os.path.join(ROOT, "deliverables", "technical_note.md"), encoding="utf-8").read()
    n_words = len(re.findall(r"\S+", tn))
    check("14. technical_note.md within operational 2-page word budget",
          n_words <= 1300, "{} words".format(n_words))

    # 15. Required appendices present
    for name in ("evidence_table.csv", "data_quality_report.md", "ai_use_log.md"):
        check("15. appendix present: {}".format(name),
              os.path.exists(os.path.join(ROOT, "deliverables", name)))

    # 16. Submission build requires no network - static check: build_reviews_csv.py,
    # the module `make all` actually calls, must not import a network library
    net_libs = ("urllib.request", "requests", "http.client", "socket")
    offline_modules = ["build_reviews_csv.py", "build_market_metrics.py",
                      "build_trend_corpus.py", "build_manifest_real.py",
                      "detect_defects_real.py", "taxonomy_real.py", "wtp_real.py",
                      "decision_framework_real.py", "build_evidence_table_real.py"]
    for mod in offline_modules:
        src = open(os.path.join(ROOT, "src", "real", mod), encoding="utf-8").read()
        check("16. {} has no network import (make all must be offline)".format(mod),
              not any(lib in src for lib in net_libs))

    # Bonus: 10-row random trace, using the SAME function the dashboard uses
    import random
    random.seed(2026)
    sample = random.sample(rows, min(10, len(rows)))
    trace_pass = sum(1 for r in sample if trace(r["claim_id"])["PASS"])
    check("bonus. 10-row random claim trace", trace_pass == len(sample),
          "{}/{}".format(trace_pass, len(sample)))

    print("=" * 70)
    print("VERIFY: {} passed, {} failed".format(len(PASSES), len(FAILURES)))
    print("=" * 70)
    if FAILURES:
        print("\nFAILURES:")
        for name, detail in FAILURES:
            print("  FAIL: {}{}".format(name, "  ({})".format(detail) if detail else ""))
        sys.exit(1)
    else:
        print("All checks passed.")
        sys.exit(0)


if __name__ == "__main__":
    main()
