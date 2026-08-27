"""Stream-filter the McAuley Lab Amazon-Reviews-2023 Appliances metadata file
for genuine air purifier products, applying explicit inclusion/exclusion
rules. Reads JSONL from stdin (one product per line), writes matching
products (with a classification reason) as JSONL to stdout, and prints a
count summary to stderr.

Never loads the whole 272MB file into memory - reads and discards line by
line, which is what makes filtering an 886MB review file downstream tractable
on an ordinary laptop.

Run:  curl -sL <meta_url> | python3 src/real/filter_purifier_products.py \
        > data/real_raw/purifier_products.jsonl
"""
import json
import re
import sys

INCLUDE_TERMS = [
    "air purifier", "air cleaner", "hepa purifier", "true hepa",
    "smart air purifier", "air purification",
]
# A bare "purifier" with no air-quality context matches too much (water
# purifiers, purifying soap) - only counted if paired with an air-quality cue.
AIR_CONTEXT_TERMS = ["air", "hepa", "allergen", "smoke", "odor", "pm2.5", "voc"]

EXCLUDE_TERMS = [
    "replacement filter", "filter replacement", "filter cartridge",
    "carbon filter pack", "pre-filter", "prefilter",
    "hvac filter", "furnace filter", "ac filter", "air conditioner filter",
    "air freshener", "essential oil diffuser", "aroma diffuser",
    "humidifier", "dehumidifier",
    "car air purifier", "vehicle air purifier", "auto air purifier",
    "personal wearable", "neck fan", "necklace purifier",
    "industrial", "commercial extraction", "duct", "exhaust fan",
    "replacement part", "filter for", "compatible with",
    "water purifier", "water filter",
]

FAN_COMBO_ALLOW = ["purifier fan", "fan purifier", "2-in-1 purifier"]


def classify(title, description_text):
    t = (title or "").lower()
    d = (description_text or "").lower()
    blob = t + " " + d

    for ex in EXCLUDE_TERMS:
        if ex in blob:
            # A combo product can still legitimately be a purifier even if it
            # mentions "filter" (every purifier does) - only hard-exclude on
            # replacement/accessory-specific phrasing, not the bare word.
            if ex in ("humidifier", "dehumidifier") and any(a in blob for a in FAN_COMBO_ALLOW):
                continue
            return None, "excluded:" + ex

    for inc in INCLUDE_TERMS:
        if inc in blob:
            return "air_purifier", "matched:" + inc

    if "purifier" in blob and any(c in blob for c in AIR_CONTEXT_TERMS):
        return "air_purifier", "matched:purifier+air_context"

    return None, "no_match"


def main():
    kept = 0
    seen = 0
    reasons = {}
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        seen += 1
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        title = rec.get("title", "")
        desc = " ".join(rec.get("description", []) or [])
        features = " ".join(rec.get("features", []) or [])
        label, reason = classify(title, desc + " " + features)
        reasons[reason.split(":")[0]] = reasons.get(reason.split(":")[0], 0) + 1
        if label:
            out = {
                "parent_asin": rec.get("parent_asin"),
                "title": rec.get("title"),
                "main_category": rec.get("main_category"),
                "average_rating": rec.get("average_rating"),
                "rating_number": rec.get("rating_number"),
                "price": rec.get("price"),
                "store": rec.get("store"),
                "categories": rec.get("categories"),
                "classification_reason": reason,
            }
            sys.stdout.write(json.dumps(out) + "\n")
            kept += 1
        if seen % 200000 == 0:
            print("...scanned {} products, kept {}".format(seen, kept), file=sys.stderr)

    print("DONE. scanned={} kept={} reasons={}".format(seen, kept, reasons), file=sys.stderr)


if __name__ == "__main__":
    main()
