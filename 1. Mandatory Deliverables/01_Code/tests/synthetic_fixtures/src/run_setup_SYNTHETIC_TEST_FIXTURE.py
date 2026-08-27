"""Run the full raw-layer build in dependency order.

Usage:  python3 src/run_setup.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import generate_reviews
import generate_market_metrics
import generate_trend_corpus
import generate_aftermarket_signals
import build_manifest


def main():
    steps = [
        ("1/5 consumer reviews", generate_reviews.main),
        ("2/5 market metrics", generate_market_metrics.main),
        ("3/5 trend corpus", generate_trend_corpus.main),
        ("4/5 aftermarket signals", generate_aftermarket_signals.main),
        ("5/5 manifest", build_manifest.main),
    ]
    for label, fn in steps:
        print("\n[{}]".format(label))
        fn()
    print("\nRaw layer built. Verify with: python3 -m unittest discover -s tests -v")


if __name__ == "__main__":
    main()
