"""Second-pass, tightened classifier for candidate purifier products.

The first pass (filter_purifier_products.py) matched on title+description+
features and produced real false positives on manual inspection: vacuum
cleaners and unrelated home-decor items whose DESCRIPTION happened to mention
"air purifier" in cross-sell copy, plus replacement-filter/accessory products
whose titles used phrasing ("direct replacement for...", "...Filter B",
"3-in-1 Filter Set fits...") that didn't match the first pass's exact-phrase
exclusion list.

This pass matches on TITLE ONLY (cross-sell text in a description is not
evidence the product itself is a purifier) and uses regex-based, word-order-
agnostic exclusion for the accessory/replacement/vacuum/wearable families.

Run: python3 src/real/reclassify_purifiers.py \
       data/real_raw/purifier_products.jsonl data/real_raw/purifier_products_hk.jsonl \
       > data/real_raw/purifier_products_final.jsonl
"""
import json
import re
import sys

INCLUDE_RE = re.compile(
    r"\bair purifier\b|\bair cleaner\b|\btrue hepa\b.{0,20}\bpurifier\b|\bair purification\b",
    re.I,
)

# Word-order-agnostic: catches "replacement...Filter", "Filter...replacement",
# "Filter Set fits", "direct replacement for", "compatible with", etc.
EXCLUDE_RE = re.compile(
    r"replacement|filter\s*(set|kit|pack|b\b|c\b)|compatible with|fits\s+[A-Z]|"
    r"direct replacement|vacuum cleaner|vacuum bags|humidifier|dehumidifier|"
    r"hvac|furnace filter|duct|media filter|merv\s*\d|"
    r"water filter|water purifier|essential oil|diffuser|air freshener|"
    r"charcoal filter|carbon filter|hepa filter\b(?!.{0,15}\bpurifier\b)|"
    r"cartridge|conversion kit|tapestry|eucalyptus|pillow|wine aerator|"
    r"fountain|candle|incense|wall hanging|"
    r"^\s*filter\b|purifier filter\b|aroma pad|scent refill|\brefill\b|"
    r"carrying case",
    re.I,
)

# Own product TYPE, not the "portable/HEPA/smart" purifier scope this corpus
# targets - ozone generators use a fundamentally different (and regulator-
# contested) mechanism from filtration purifiers. Excluded as a documented
# scope decision, not a false-positive correction.
OZONE_RE = re.compile(r"ozone generator|ozone machine|plasma.{0,10}ozone", re.I)

# Excluded regardless of any other match - the brief explicitly names these
# out of scope, and a title matching UNIT_OVERRIDE below must not bypass it.
WEARABLE_RE = re.compile(
    r"necklace|wearable|neck fan|personal\s+(mini|ionic)?\s*(air\s+)?purifier\s*,?\s*(necklace|around)",
    re.I,
)

# A title matching EXCLUDE_RE can still be a genuine purifier UNIT if it also
# clearly names itself as one up front (brand + "Air Purifier" as the core
# noun phrase, not an accessory for one).
UNIT_OVERRIDE_RE = re.compile(
    r"^[\w\s&'\-]{2,40}\bair purifier\b(?!\s*(filter|replacement))", re.I
)


def classify(title):
    t = (title or "").strip()
    if not t:
        return None, "empty_title"
    if WEARABLE_RE.search(t):
        return None, "excluded:wearable"
    if OZONE_RE.search(t):
        return None, "excluded:ozone_generator_out_of_scope"
    if EXCLUDE_RE.search(t):
        return None, "excluded"
    if UNIT_OVERRIDE_RE.search(t):
        return "air_purifier", "unit_override"
    if INCLUDE_RE.search(t):
        return "air_purifier", "included"
    return None, "no_match"


def main():
    seen_asins = set()
    kept = 0
    total = 0
    for path in sys.argv[1:]:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                total += 1
                rec = json.loads(line)
                label, reason = classify(rec.get("title"))
                if label and rec.get("parent_asin") not in seen_asins:
                    seen_asins.add(rec.get("parent_asin"))
                    rec["reclassification_reason"] = reason
                    print(json.dumps(rec))
                    kept += 1
    print("scanned={} kept={}".format(total, kept), file=sys.stderr)


if __name__ == "__main__":
    main()
