"""Convert the streamed-and-filtered real Amazon reviews (JSONL, McAuley Lab
Amazon-Reviews-2023 schema) into data/raw/consumer_reviews.csv, joined
against the frozen, manually-validated purifier product list so every row
carries a real product title/brand alongside the real review.

This replaces the fully synthetic src/generate_reviews.py output. No defects
are planted here - whatever duplicates, bursts, or date oddities exist in
this file are whatever a real Amazon export actually contains, discovered
(not manufactured) by src/real/detect_defects_real.py afterward.

Run:  python3 src/real/build_reviews_csv.py
"""
import csv
import hashlib
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import config as C

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROD_FILE = os.path.join(ROOT, "data", "real_raw", "purifier_products_frozen.jsonl")
REVIEW_FILES = [
    os.path.join(ROOT, "data", "real_raw", "reviews_appliances.jsonl"),
    os.path.join(ROOT, "data", "real_raw", "reviews_hk.jsonl"),
]
OUT = os.path.join(ROOT, "data", "raw", "consumer_reviews.csv")

FIELDS = [
    "review_id", "product_sku", "product_name", "brand", "marketplace",
    "review_date", "review_date_raw_epoch_ms", "rating", "review_title",
    "review_text", "verified_purchase", "helpful_votes", "reviewer_hash",
    "source_ingested_at",
]


def load_products():
    by_asin = {}
    with open(PROD_FILE, encoding="utf-8") as fh:
        for line in fh:
            rec = json.loads(line)
            asin = rec.get("parent_asin")
            if asin:
                by_asin[asin] = rec
    return by_asin


def main():
    products = load_products()
    rows = []
    seen_review_keys = set()
    for path in REVIEW_FILES:
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                rec = json.loads(line)
                asin = rec.get("parent_asin") or rec.get("asin")
                prod = products.get(asin)
                if not prod:
                    continue
                # Amazon's own dedup key: same user + same asin + same text can
                # legitimately appear once per exported file split; guard against
                # counting an identical row twice if the two category streams
                # happened to both match (parent_asin/asin edge cases).
                key = (rec.get("user_id"), asin, rec.get("timestamp"), rec.get("text"))
                if key in seen_review_keys:
                    continue
                seen_review_keys.add(key)

                ts_ms = rec.get("timestamp")
                if isinstance(ts_ms, (int, float)) and ts_ms > 0:
                    dt = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc)
                    date_str = dt.strftime("%Y-%m-%d")
                else:
                    date_str = ""

                rows.append({
                    "_sort_ts": ts_ms or 0,
                    "product_sku": asin,
                    "product_name": prod.get("title"),
                    "brand": prod.get("store") or "",
                    "marketplace": "amazon_us",
                    "review_date": date_str,
                    "review_date_raw_epoch_ms": ts_ms,
                    "rating": rec.get("rating"),
                    "review_title": rec.get("title") or "",
                    "review_text": rec.get("text") or "",
                    "verified_purchase": "true" if rec.get("verified_purchase") else "false",
                    "helpful_votes": rec.get("helpful_vote") or 0,
                    # identity used transiently for dedup above; only a one-way hash ships
                    "reviewer_hash": hashlib.sha256((rec.get("user_id") or "").encode()).hexdigest()[:16],
                    "source_ingested_at": C.RETRIEVAL_TS,
                })

    rows.sort(key=lambda r: r["_sort_ts"])
    for i, r in enumerate(rows, start=1):
        r["review_id"] = "CR-{:06d}".format(i)
        del r["_sort_ts"]

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

    n_products = len({r["product_sku"] for r in rows})
    date_min = min((r["review_date"] for r in rows if r["review_date"]), default=None)
    date_max = max((r["review_date"] for r in rows if r["review_date"]), default=None)
    print("wrote {} ({} real reviews, {} distinct real products, {} .. {})".format(
        OUT, len(rows), n_products, date_min, date_max))
    return rows


if __name__ == "__main__":
    main()
