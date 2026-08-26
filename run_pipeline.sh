#!/usr/bin/env bash
# End-to-end reproduction: raw data -> cleaning -> taxonomy -> WTP -> decision
# scoring -> deliverables, from a clean checkout, in one command.
#
#   bash run_pipeline.sh
#
# Every random draw in this pipeline is seeded (random_state=42,
# src/config.py::RANDOM_STATE) so re-running reproduces byte-identical output;
# data/manifest.json records a SHA-256 per raw file as the checksum gate.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

echo "== optional: pinned deps (pipeline itself needs stdlib only) =="
if command -v pip3 >/dev/null 2>&1; then
  pip3 install -q -r requirements.txt || echo "  (pip install skipped/failed - not required, continuing)"
fi

echo "== stage 1/6: raw data layer (data/raw/, data/manifest.json) =="
python3 src/run_setup.py

echo "== stage 2/6: Q2 defect detection + cleaning =="
python3 src/detect_defects.py

echo "== stage 3/6: Q3 taxonomy extraction + hand-label validation =="
python3 src/taxonomy.py

echo "== stage 4/6: Q4 willingness-to-pay proxy =="
python3 src/willingness_to_pay.py

echo "== stage 5/6: Q6 decision framework (score + recommend + kill) =="
python3 src/decision_framework.py

echo "== stage 6/6: deliverables (evidence table etc.) =="
python3 src/build_deliverables.py

echo "== verification: automated tests =="
python3 -m unittest discover -s tests -v

echo
echo "Done. See deliverables/insight_pack.md, technical_note.md,"
echo "data_quality_report.md, ai_use_log.md, evidence_table.csv."
