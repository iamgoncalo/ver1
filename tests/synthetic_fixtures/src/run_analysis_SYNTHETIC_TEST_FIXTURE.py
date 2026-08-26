"""Run the full Q1-Q6 analytical pipeline in dependency order, on top of an
already-built raw layer (run src/run_setup.py first, or via 'all' below).

Usage:
  python3 src/run_analysis.py         # analysis only (raw layer must exist)
  python3 src/run_analysis.py all     # raw layer + analysis, one command
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import detect_defects
import taxonomy
import willingness_to_pay
import decision_framework


def main():
    if "all" in sys.argv:
        import run_setup
        run_setup.main()

    steps = [
        ("Q2 defect detection", detect_defects.main),
        ("Q3 taxonomy + hand-label validation", lambda: taxonomy.main()),
        ("Q4 willingness-to-pay proxy", willingness_to_pay.main),
        ("Q6 decision framework", decision_framework.main),
    ]
    for label, fn in steps:
        print("\n=== {} ===".format(label))
        fn()
    print("\nAnalysis complete. Build deliverables with: python3 src/build_deliverables.py")


if __name__ == "__main__":
    main()
