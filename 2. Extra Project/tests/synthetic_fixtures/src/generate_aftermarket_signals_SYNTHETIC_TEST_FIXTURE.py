"""Generate data/raw/aftermarket_signals.csv - per-SKU consumable (filter)
behaviour, the observable base for the Q4 willingness-to-pay proxy.

Two columns carry the Q4 argument:
  oem_filter_repurchase_rate      -> its complement is REPLACEMENT FILTER CHURN
  third_party_filter_attach_rate  -> revealed price sensitivity on consumables

These are the only behavioural (non-stated) signals in the repository, which is
why Q4 leans on them. They are still a proxy: they measure what owners DID
about filters, not what they WOULD pay to have a friction removed.

Run:  python3 src/generate_aftermarket_signals.py
"""
import csv
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config as C

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "data", "raw", "aftermarket_signals.csv")

FIELDS = ["product_sku", "product_name", "brand", "connected",
          "installed_base_units_eu", "msrp_eur", "oem_filter_price_eur",
          "third_party_filter_price_eur", "filters_per_year",
          "oem_filter_repurchase_rate", "third_party_filter_attach_rate",
          "filter_subscription_attach_rate", "observation_window",
          "source", "confidence"]

# Anchored per-SKU behaviour. Premium connected SKUs leak least to third party;
# cheap connected SKUs leak most - the pattern the Q4 proxy reads.
ANCHOR = {
    "VS-AP-8000i":  (0.71, 0.19, 0.21),
    "VS-AP-4000i":  (0.64, 0.26, 0.14),
    "VS-AP-3000i":  (0.58, 0.33, 0.11),
    "VS-AP-2000":   (0.49, 0.42, 0.03),
    "VS-AC-1000i":  (0.44, 0.48, 0.06),
    "CP-DY-TP09":   (0.76, 0.15, 0.24),
    "CP-LV-C400S":  (0.41, 0.53, 0.09),
    "CP-XM-4PRO":   (0.37, 0.58, 0.05),
    "CP-BB-DM5440": (0.62, 0.29, 0.13),
}
BASE = {
    "VS-AP-8000i": 118_000, "VS-AP-4000i": 264_000, "VS-AP-3000i": 391_000,
    "VS-AP-2000": 302_000, "VS-AC-1000i": 173_000, "CP-DY-TP09": 96_000,
    "CP-LV-C400S": 214_000, "CP-XM-4PRO": 287_000, "CP-BB-DM5440": 131_000,
}


def main():
    rng = random.Random(C.RANDOM_STATE)
    rows = []
    for sku, name, brand, connected, msrp in C.PRODUCTS:
        repurchase, third_party, sub = ANCHOR[sku]
        oem_price = round(msrp * rng.uniform(0.16, 0.24), 2)
        rows.append({
            "product_sku": sku, "product_name": name, "brand": brand,
            "connected": "true" if connected else "false",
            "installed_base_units_eu": BASE[sku],
            "msrp_eur": msrp,
            "oem_filter_price_eur": oem_price,
            "third_party_filter_price_eur": round(oem_price * rng.uniform(0.38, 0.55), 2),
            "filters_per_year": round(rng.uniform(1.4, 2.2), 2),
            "oem_filter_repurchase_rate": round(repurchase, 4),
            "third_party_filter_attach_rate": round(third_party, 4),
            "filter_subscription_attach_rate": round(sub, 4),
            "observation_window": "2025-09-01/2026-08-20",
            "source": "SYNTHETIC - stands in for OEM consumable sell-through + panel data",
            "confidence": "low",
        })
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)
    print("wrote {} ({} SKUs)".format(OUT, len(rows)))
    return rows


if __name__ == "__main__":
    main()
