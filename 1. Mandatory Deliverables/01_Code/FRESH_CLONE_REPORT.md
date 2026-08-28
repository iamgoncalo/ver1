# Fresh-clone reproduction report

A genuine fresh-clone reproduction — cloned from GitHub into an empty
temporary directory, clean `python3 -m venv` environment, no files copied
from any existing working directory.

| Field | Value |
|---|---|
| commit_sha | `682a26db5cdbd9994bf7063497c35551c7037058` (branch `final-submission`) |
| Python_version | 3.9.6 (macOS system python3, fresh venv) |
| installation_command | `python3 -m venv <venv> && pip install -r "1. Mandatory Deliverables/01_Code/requirements.txt"` |
| reproduction_command | `bash scripts/reproduce_submission.sh` (from `1. Mandatory Deliverables/01_Code/`) |
| tests_run | 47 (`python3 -m unittest discover -s tests -p "test_*.py"`, run inside the script) |
| tests_passed | 47 |
| verifier_result | 229 passed, 0 failed (`scripts/verify_submission.py`) |
| generated_artifacts | Insight Pack PDF, Technical Note PDF, Data Quality Report PDF, AI Use Log PDF, evidence_table.csv |
| evidence_table.csv sha256 | `1da9c92e03172cbbd9270ac36df80d11ce2465a8bd5b2ec745a58b8db2d52737` — **byte-identical** to the working-copy regeneration |
| PDF hashes | differ from working copy only via reportlab's embedded creation timestamp; page content regenerates from the same markdown sources |
| blockers | One found and fixed during this run: `reportlab` was genuinely imported by the PDF release step but missing from requirements.txt — the fresh clone failed at step 10 until it was added. requirements.txt now declares it. No other blocker; exit code 0 end to end after the fix. |

Q3 human validation remains `BLOCKED_HUMAN_VALIDATION_REQUIRED` (the
pipeline prints this itself) — a machine reproduction cannot and does not
clear it.
