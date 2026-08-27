"""Smoke-tests every command LIVE_REHEARSAL.md promises works, so `make
live-check` catches drift before the actual Versuni session does.
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

RESULTS = []


def run(label, cmd, cwd=ROOT):
    r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True, timeout=60)
    ok = r.returncode == 0
    RESULTS.append((label, ok, r.stdout[-300:] if not ok else ""))
    return ok


def main():
    run("open real review rows",
        "python3 -c \"import csv; r=list(csv.DictReader(open('data/raw/consumer_reviews.csv'))); "
        "assert len(r) > 3000\"")

    run("run Q2 defect detector",
        "python3 src/real/detect_defects_real.py")

    run("trace a claim (single row)",
        "python3 scripts/trace_claim.py real_review_count")

    run("trace 10 random claims",
        "python3 scripts/trace_claim.py --random 10")

    run("open both Q5 market source archives exist",
        "test -f data/real_raw/market_sources/mordor_europe_air_purifier_market.html && "
        "test -f data/real_raw/market_sources/imarc_europe_air_purifier_market.html")

    run("Q5 primary market scenario",
        "python3 src/real/decision_framework_real.py")
    run("Q5 alternative market scenario",
        "python3 src/real/decision_framework_real.py --market-scenario=imarc")

    # verdict invariance check, matching tests/test_real_pipeline.py's logic
    r1 = subprocess.run(["python3", "src/real/decision_framework_real.py"],
                        cwd=ROOT, capture_output=True, text=True)
    r2 = subprocess.run(["python3", "src/real/decision_framework_real.py",
                        "--market-scenario=imarc"], cwd=ROOT, capture_output=True, text=True)
    import re
    rec1 = re.search(r"RECOMMEND: (\S+)", r1.stdout)
    rec2 = re.search(r"RECOMMEND: (\S+)", r2.stdout)
    ok = bool(rec1 and rec2 and rec1.group(1) == rec2.group(1))
    RESULTS.append(("Q5 scenario invariance (winner unchanged)", ok,
                   "" if ok else "{} vs {}".format(rec1, rec2)))

    run("evidence table exists and is non-empty",
        "test -s deliverables/evidence_table.csv")

    run("hand-label BLANK file exists with 50 real rows",
        "python3 -c \"import csv; r=list(csv.DictReader(open('data/hand_label_sample_BLANK.csv'))); "
        "assert len(r) == 50\"")

    run("AI-use log present",
        "test -s deliverables/ai_use_log.md")

    print("=" * 70)
    passed = sum(1 for _, ok, _ in RESULTS if ok)
    for label, ok, detail in RESULTS:
        print("  {}  {}".format("PASS" if ok else "FAIL", label))
        if detail:
            print("    -> {}".format(detail.strip().replace("\n", " | ")))
    print("=" * 70)
    print("LIVE-CHECK: {}/{} passed".format(passed, len(RESULTS)))
    sys.exit(0 if passed == len(RESULTS) else 1)


if __name__ == "__main__":
    main()
