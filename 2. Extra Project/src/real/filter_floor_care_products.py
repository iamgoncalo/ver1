"""Stream-filter the McAuley Lab Amazon-Reviews-2023 metadata files for
genuine FLOOR CARE products (vacuums, robot vacuums, mops, carpet/floor
cleaners), applying explicit inclusion/exclusion rules - the Floor Care
counterpart of filter_purifier_products.py, authored as the category's
STREAM FILTER (a declared category definition, per docs: eligibility rules
only - no prewritten frictions, paths, or innovations).

Reads JSONL from stdin (one product per line), writes matching products
(with a classification reason) as JSONL to stdout, and prints a count
summary to stderr. Never loads the whole multi-GB file into memory.

Run:  curl -sL <meta_url> | python3 src/real/filter_floor_care_products.py \
        > data/real_raw/floor_care_products_hk.jsonl
"""
import json
import re
import sys

INCLUDE_TERMS = [
    "vacuum cleaner", "robot vacuum", "robotic vacuum", "stick vacuum",
    "upright vacuum", "canister vacuum", "cordless vacuum",
    "carpet cleaner", "carpet shampooer", "steam mop", "electric mop",
    "floor scrubber", "hardwood floor cleaner machine", "vacuum mop",
]
# A bare "vacuum" matches too much (vacuum-sealed bags, vacuum flasks) -
# only counted when paired with a floor-care cue.
FLOOR_CONTEXT_TERMS = ["carpet", "hardwood", "floor", "pet hair", "suction", "dust", "sweep"]

EXCLUDE_TERMS = [
    # accessories / consumables - not products
    "replacement filter", "filter replacement", "vacuum bag", "vacuum bags",
    "replacement bag", "replacement belt", "brush roll", "brushroll",
    "replacement part", "replacement parts", "filter for", "bags for",
    "belt for", "compatible with", "attachment kit", "accessory kit",
    "replacement head", "mop pad", "mop pads", "mop head refill",
    "cleaning solution", "carpet shampoo solution", "detergent",
    # out-of-segment machines
    "shop vac", "shop-vac", "wet/dry vac", "wet dry vac", "car vacuum",
    "handheld vacuum", "hand vacuum", "leaf vacuum", "leaf blower",
    "pool vacuum", "aquarium", "nail vacuum", "dust collector for",
    # non-floor "vacuum" products
    "vacuum sealer", "vacuum sealed", "vacuum storage", "vacuum flask",
    "vacuum insulated", "vacuum pump", "vacuum chamber",
]


def classify(title, description_text):
    t = (title or "").lower()
    d = (description_text or "").lower()
    blob = t + " " + d

    for ex in EXCLUDE_TERMS:
        if ex in blob:
            return None, "excluded:" + ex

    for inc in INCLUDE_TERMS:
        if inc in blob:
            return "floor_care", "matched:" + inc

    if "vacuum" in t and any(c in blob for c in FLOOR_CONTEXT_TERMS):
        return "floor_care", "matched:vacuum+floor_context"

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
