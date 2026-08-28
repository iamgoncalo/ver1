# Fresh-clone reproduction report

A genuine fresh-clone reproduction — cloned from GitHub into an empty
temporary directory, clean `python3 -m venv` environment, no files copied
from any existing working directory.

| Field | Value |
|---|---|
| commit_sha | `ecdc92a367317e0e766668fcea7aa5402f6b5bed` (branch `final-submission`) |
| Python_version | 3.9.6 (macOS system python3, fresh venv) |
| installation_command | `python3 -m venv <venv> && pip install -r "1. Mandatory Deliverables/01_Code/requirements.txt"` |
| reproduction_command | `bash scripts/reproduce_submission.sh` (from `1. Mandatory Deliverables/01_Code/`) |
| tests_run | 49 (`python3 -m unittest discover -s tests -p "test_*.py"`, run inside the script) |
| tests_passed | 49 |
| verifier_result | 301 passed, 0 failed (`scripts/verify_submission.py`) |
| generated_artifacts | Insight Pack PDF, Technical Note PDF, Data Quality Report PDF, AI Use Log PDF, evidence_table.csv |
| evidence_table.csv sha256 | `7f4ef06f82eff821aab4c5604a09b6536cd219a44ff4447f4494daf82efe56c0` — **byte-identical** to the working-copy regeneration |
| PDF hashes | differ from working copy only via reportlab's embedded creation timestamp; page content regenerates from the same markdown sources |
| blockers | None — exit code 0 end to end at this commit. (An earlier fresh-clone run at `682a26d` caught `reportlab` missing from requirements.txt; it is now declared, and this run verifies the fix.) |

Q3 human validation remains `BLOCKED_HUMAN_VALIDATION_REQUIRED` (the
pipeline prints this itself) — a machine reproduction cannot and does not
clear it.
