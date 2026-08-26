"""Q4 (real data) - what would consumers pay to have a friction solved.

Honest answer up front, per this repair's explicit instruction: THE ASSEMBLED
REAL EVIDENCE DOES NOT DIRECTLY MEASURE WILLINGNESS TO PAY. No conjoint,
Gabor-Granger, or stated-preference instrument exists in this dataset, and
no behavioural consumable-switching data (which the earlier synthetic phase
fabricated as aftermarket_signals.csv) is obtainable from a public product
review export either - Amazon does not expose "bought a competitor's filter
instead" data anywhere retrievable here.

What IS available and real:
  - OBSERVED_PRICE: real listed prices for 75 of 237 real purifier products
    (from the McAuley-Lab Amazon-Reviews-2023 product metadata).
  - REVIEW_LANGUAGE_PROXY: how often price/value/cost language co-occurs
    with each real friction theme in real review text.

Neither is WTP. Both are reported and explicitly labelled as what they are.

Run:  python3 src/real/wtp_real.py
"""
import csv
import json
import os
import re
import statistics
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config as C
from taxonomy_real import THEMES, classify, load_clean

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROD_FILE = os.path.join(ROOT, "data", "real_raw", "purifier_products_frozen.jsonl")
PROC = os.path.join(ROOT, "data", "processed")

VALUE_LANGUAGE_RE = re.compile(
    r"waste of money|waste money|worth it|worth every|expensive|overpriced|"
    r"cheap(?!ly made)|price|cost|money back|refund|value for money", re.I)


def load_prices():
    prices = {}
    with open(PROD_FILE, encoding="utf-8") as fh:
        for line in fh:
            rec = json.loads(line)
            p = rec.get("price")
            asin = rec.get("parent_asin")
            if asin and p not in (None, "None", ""):
                try:
                    prices[asin] = float(p)
                except (TypeError, ValueError):
                    pass
    return prices


def compute_price_exposure(rows, prices):
    """Pure function: per-theme price-weighted exposure for an arbitrary row
    set. The ONE implementation used by main() below AND
    dashboard/app.py's Scenario Lab.

    Classifies each row exactly once (previously classify() ran once PER
    THEME PER ROW inside the loop below - 6x redundant work that made the
    live scenario endpoint take 6+ real seconds per request; same output,
    same classify() logic, just not recomputed six times over)."""
    classified = [(r, classify(r["review_text"])) for r in rows]
    by_theme = {}
    for r, tid in classified:
        by_theme.setdefault(tid, []).append(r)

    per_theme = {}
    for tid, (name, _kws) in THEMES.items():
        affected = by_theme.get(tid, [])
        affected_priced = [r for r in affected if r["product_sku"] in prices]
        value_language_hits = sum(1 for r in affected
                                  if VALUE_LANGUAGE_RE.search(r["review_text"] or ""))
        price_weighted_exposure = sum(prices[r["product_sku"]] for r in affected_priced)
        distinct_affected_prices = sorted({prices[r["product_sku"]] for r in affected_priced})
        median_real_price_usd = (round(statistics.median(distinct_affected_prices), 2)
                                 if distinct_affected_prices else None)
        per_theme[tid] = {
            "theme_name": name,
            "n_reviews_affected": len(affected),
            "n_affected_with_known_real_price": len(affected_priced),
            "price_weighted_exposure_usd": round(price_weighted_exposure, 2),
            "price_weighted_exposure_caveat": (
                "SUM of real observed listed prices across affected reviews with a known "
                "price. This is a RELATIVE exposure indicator, not a revenue or market-size "
                "estimate - it has no units-sold, conversion-rate, or time-period basis. "
                "It answers 'which friction touches more expensive products' not 'how much "
                "money is at stake per year.'"),
            "median_real_price_usd": median_real_price_usd,
            "n_distinct_priced_products_affected": len(distinct_affected_prices),
            "median_real_price_caveat": (
                "MEDIAN real listed price across the {} distinct real products affected by "
                "this friction that have a known price. This is what products in this "
                "segment actually cost today - not a proposed price for a new concept, "
                "which this evidence cannot establish.".format(len(distinct_affected_prices))
                if distinct_affected_prices else
                "No real product in this friction's affected set has a known listed price."),
            "value_language_prevalence_pct": round(
                100.0 * value_language_hits / len(affected), 1) if affected else None,
            "value_language_note": (
                "REVIEW_LANGUAGE_PROXY - share of affected reviews that also use "
                "price/value/refund language. This is a proxy for whether the friction is "
                "ALSO experienced as a value-for-money complaint, not a WTP measurement."),
        }
    return per_theme


def main():
    rows = load_clean()
    if not rows:
        print("No cleaned real reviews yet.")
        return
    prices = load_prices()

    n_with_price = sum(1 for r in rows if r["product_sku"] in prices)
    per_theme = compute_price_exposure(rows, prices)

    price_summary = None
    priced_values = list(prices.values())
    if priced_values:
        priced_values.sort()
        price_summary = {
            "n_products_with_real_observed_price": len(priced_values),
            "n_products_total": len(set(r["product_sku"] for r in rows)),
            "min_usd": priced_values[0], "median_usd": priced_values[len(priced_values) // 2],
            "max_usd": priced_values[-1],
        }

    out = {
        "_provenance": "REAL observed prices (McAuley-Lab Amazon-Reviews-2023 product "
                       "metadata) and REAL review text. No fabricated behavioural WTP proxy.",
        "generated_by": "src/real/wtp_real.py",
        "direct_wtp_available": False,
        "direct_wtp_statement": (
            "The assembled evidence does not directly measure willingness to pay. No "
            "conjoint, Gabor-Granger, or stated-preference instrument was collected, and no "
            "real consumable-switching/attach-rate behavioural data is obtainable from a "
            "public product review export."
        ),
        "what_would_replace_the_proxy": [
            "A Gabor-Granger or conjoint study asking real owners to trade dollars against "
            "each of the six real friction themes directly.",
            "OEM/retailer consumable sell-through data (not obtainable from a public review "
            "dataset) to measure real filter-repurchase and third-party-attach behaviour.",
            "A/B priced pilot on a reliability-extended-warranty offer, observing real "
            "take-up rates.",
        ],
        "real_price_coverage": price_summary,
        "n_reviews_with_known_real_price": n_with_price,
        "per_theme": per_theme,
    }
    os.makedirs(PROC, exist_ok=True)
    with open(os.path.join(PROC, "wtp_real.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print("Q4 (real data) - willingness to pay")
    print("  DIRECT WTP: NOT AVAILABLE in the assembled evidence (stated explicitly)")
    print("  real observed prices: {}/{} products".format(
        price_summary["n_products_with_real_observed_price"] if price_summary else 0,
        price_summary["n_products_total"] if price_summary else 0))
    for tid, st in sorted(per_theme.items(), key=lambda kv: -kv[1]["price_weighted_exposure_usd"]):
        print("  {:<45} n={:>4} price_exposure=${:>9,.2f}  value_lang={}%".format(
            st["theme_name"], st["n_reviews_affected"], st["price_weighted_exposure_usd"],
            st["value_language_prevalence_pct"]))
    return out


if __name__ == "__main__":
    main()
