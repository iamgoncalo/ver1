"""Single shared claim-trace function. Used by BOTH the CLI below and
dashboard/app.py's EVIDENCE tab - there is exactly one lineage
implementation, imported in both places, so the dashboard can never drift
from what the CLI (and a live interviewer) sees.

CLI usage:
  python3 scripts/trace_claim.py <claim_id>
  python3 scripts/trace_claim.py --list
  python3 scripts/trace_claim.py --random 10      # sample N rows and trace all
"""
import csv
import json
import os
import random
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVIDENCE_TABLE = os.path.join(ROOT, "deliverables", "evidence_table.csv")


def load_evidence_table():
    with open(EVIDENCE_TABLE, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def _resolve_json_path(doc, dotted_path):
    """Best-effort resolution of a dotted/bracket path like
    'themes.reliability.csat_impact' or 'sources[0].metric.value' against a
    loaded JSON document. Returns (value, resolved) - resolved=False if the
    path could not be walked (e.g. it's descriptive prose, not a real path)."""
    import re
    tokens = re.findall(r"[^.\[\]]+|\[\d+\]", dotted_path.split(" ")[0])
    cur = doc
    try:
        for tok in tokens:
            if tok.startswith("[") and tok.endswith("]"):
                cur = cur[int(tok[1:-1])]
            else:
                cur = cur[tok]
        return cur, True
    except (KeyError, IndexError, TypeError):
        return None, False


def trace(claim_id):
    """Returns a dict describing the full lineage for one claim_id, or
    raises KeyError if the claim_id isn't in the evidence table."""
    rows = load_evidence_table()
    row = next((r for r in rows if r["claim_id"] == claim_id), None)
    if row is None:
        raise KeyError("no such claim_id: {}".format(claim_id))

    source_file_field = row["source_file"]
    source_file = source_file_field.split(" (")[0].strip()
    abs_path = os.path.join(ROOT, source_file)
    file_exists = os.path.exists(abs_path)

    resolved_value = None
    resolved = False
    raw_preview = None
    if file_exists and source_file.endswith(".json"):
        try:
            doc = json.load(open(abs_path, encoding="utf-8"))
            resolved_value, resolved = _resolve_json_path(doc, row["source_location"])
        except (json.JSONDecodeError, OSError):
            pass
    elif file_exists:
        raw_preview = "(non-JSON source - {} - open directly to verify)".format(
            "HTML/PDF archive" if source_file.endswith((".html", ".pdf")) else "data file")

    return {
        "claim_id": claim_id,
        "final_claim": row["value_as_cited"],
        "metric_path": row["source_location"],
        "transformation": row["transformation"],
        "code_reference": row["code_reference"],
        "raw_file": source_file,
        "raw_file_exists": file_exists,
        "resolved_value_at_path": resolved_value,
        "path_resolved": resolved,
        "note": raw_preview,
        "PASS": file_exists and (resolved if source_file.endswith(".json") else True),
    }


def print_trace(t):
    print("FINAL CLAIM      : {}".format(t["final_claim"]))
    print("  |")
    print("METRIC (source loc): {}".format(t["metric_path"]))
    print("  |")
    print("TRANSFORMATION   : {}".format(t["transformation"]))
    print("  |")
    print("CODE              : {}".format(t["code_reference"]))
    print("  |")
    print("RAW FILE          : {} (exists: {})".format(t["raw_file"], t["raw_file_exists"]))
    if t["raw_file"].endswith(".json"):
        print("  |")
        print("RESOLVED VALUE    : {} (path resolved: {})".format(
            t["resolved_value_at_path"], t["path_resolved"]))
    if t["note"]:
        print("NOTE              : {}".format(t["note"]))
    print("RESULT            : {}".format("PASS" if t["PASS"] else "FAIL"))


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        return

    if args[0] == "--list":
        for r in load_evidence_table():
            print(r["claim_id"])
        return

    if args[0] == "--random":
        n = int(args[1]) if len(args) > 1 else 10
        rows = load_evidence_table()
        random.seed()  # genuine randomness for a live-session demo, not reproducibility
        sample = random.sample(rows, min(n, len(rows)))
        passed = 0
        for r in sample:
            t = trace(r["claim_id"])
            print_trace(t)
            print("-" * 60)
            if t["PASS"]:
                passed += 1
        print("{}/{} passed".format(passed, len(sample)))
        return

    claim_id = args[0]
    try:
        t = trace(claim_id)
    except KeyError as e:
        print(str(e))
        sys.exit(1)
    print_trace(t)
    sys.exit(0 if t["PASS"] else 1)


if __name__ == "__main__":
    main()
