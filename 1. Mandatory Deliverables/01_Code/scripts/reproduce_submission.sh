#!/usr/bin/env bash
# One canonical command that regenerates or verifies every final artifact of
# the official submission, in order, and fails loudly if any step fails -
# no partial success is reported as a pass.
#
#   bash scripts/reproduce_submission.sh
#
# Offline by default (equivalent to run_pipeline.sh --analysis-only). Pass
# --refresh to re-fetch source data over the network first (~15-20 min).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."   # -> 01_Code/
ROOT="$(pwd)"
DELIV_ROOT="$ROOT/.."

REFRESH=0
for arg in "$@"; do
  [ "$arg" = "--refresh" ] && REFRESH=1
done

echo "== step 1-9/13: verify frozen inputs + run offline analysis + evidence table + full test discovery =="
if [ "$REFRESH" -eq 1 ]; then
  bash run_pipeline.sh
else
  bash run_pipeline.sh --analysis-only
fi
# run_pipeline.sh's own final stage already IS full test discovery
# (python3 -m unittest discover -s tests -p "test_*.py") - steps 1-9 above
# cover: verify frozen inputs (test_manifest_checksums_match), offline
# analysis (stages 5-8j), evidence table (stage 9), and full test
# discovery, all inside that one call.

echo
echo "== step 10-11/13: render Insight Pack + Technical Note PDFs =="
python3 scripts/md_to_pdf.py deliverables/insight_pack.md "$DELIV_ROOT/03_Insight_Pack/Versuni_Insight_Pack.pdf"
python3 scripts/md_to_pdf.py deliverables/technical_note.md "$DELIV_ROOT/04_Technical_Note/Versuni_Technical_Note.pdf"

echo
echo "== step 12/13: render/verify required appendix PDFs =="
python3 scripts/md_to_pdf.py deliverables/data_quality_report.md "$DELIV_ROOT/05_Mandatory_Appendices/data_quality_report.pdf"
python3 scripts/md_to_pdf.py deliverables/ai_use_log.md "$DELIV_ROOT/05_Mandatory_Appendices/ai_use_log.pdf"
cp deliverables/evidence_table.csv "$DELIV_ROOT/05_Mandatory_Appendices/evidence_table.csv"

echo
echo "== step 13/13: submission verifier =="
python3 scripts/verify_submission.py

echo
echo "== final artifact hashes =="
python3 - "$DELIV_ROOT" <<'PY'
import hashlib
import os
import sys

deliv_root = sys.argv[1]
targets = [
    "03_Insight_Pack/Versuni_Insight_Pack.pdf",
    "04_Technical_Note/Versuni_Technical_Note.pdf",
    "05_Mandatory_Appendices/data_quality_report.pdf",
    "05_Mandatory_Appendices/ai_use_log.pdf",
    "05_Mandatory_Appendices/evidence_table.csv",
]
for rel in targets:
    path = os.path.join(deliv_root, rel)
    with open(path, "rb") as fh:
        digest = hashlib.sha256(fh.read()).hexdigest()
    print("  {}  {}".format(digest, rel))
PY

echo
echo "Reproduction complete. Every step above must have exited 0 for this to"
echo "be a genuine pass - this script uses 'set -euo pipefail', so a failed"
echo "step stops execution here rather than being silently skipped."
