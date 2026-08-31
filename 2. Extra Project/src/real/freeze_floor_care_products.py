"""Second-pass validation + freeze for the FLOOR_CARE product corpus.

Title-only validation (mirrors reclassify_purifiers.py: the stream filter
matches description text too, which lets accessories whose copy mentions a
unit slip through; a product IS what its title says it is), dedup on
parent_asin, then a declared evidence floor.

METHOD_CHOICE - evidence floor: rating_number >= 500. Floor care on Amazon
is a vastly larger segment than air purification (7,385 title-valid
candidates vs 309 for air), so the freeze floor is set higher than Air's
(>= 5) to keep every frozen product individually well-evidenced; at 500
the frozen set is 572 real products carrying ~1.74M lifetime ratings from
real brands (Bissell, Dyson, Hoover, iRobot, Miele, eufy, ECOVACS...).
The floor is a declared method constant, never tuned per result.

Run:  python3 src/real/freeze_floor_care_products.py
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = os.path.join(ROOT, "data", "real_raw")

RATING_FLOOR = 500

INCLUDE_RE = re.compile(
    r"vacuum cleaner|robot(ic)? vacuum|stick vacuum|upright vacuum|canister vacuum|"
    r"cordless vacuum|carpet (cleaner|shampooer)|steam mop|electric mop|floor scrubber|"
    r"vacuum mop|\bvacuum\b", re.I)
EXCLUDE_RE = re.compile(
    r"replacement|filter[s]? for|bag[s]? for|belt|brush ?roll|attachment|accessor|"
    r"part[s]? for|compatible|mop pad|refill|solution|shampoo\b|deterg|hose|nozzle|"
    r"crevice|extension wand|hepa filter[s]?$|filter kit|side brush|roller|caster|"
    r"charger for|battery for|stand for|sealer|sealed|storage bag|space saver|"
    r"insulated|flask|pump|wine|food|jar|blender", re.I)


def main():
    rows = {}
    for name in ("floor_care_products_hk.jsonl", "floor_care_products.jsonl"):
        path = os.path.join(RAW, name)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                rec = json.loads(line)
                a = rec.get("parent_asin")
                if a and a not in rows:
                    rows[a] = rec

    frozen = []
    dropped = {"title_invalid": 0, "below_floor": 0}
    for rec in rows.values():
        title = rec.get("title") or ""
        if not INCLUDE_RE.search(title) or EXCLUDE_RE.search(title):
            dropped["title_invalid"] += 1
            continue
        if (rec.get("rating_number") or 0) < RATING_FLOOR:
            dropped["below_floor"] += 1
            continue
        frozen.append(rec)

    frozen.sort(key=lambda r: -(r.get("rating_number") or 0))
    out = os.path.join(RAW, "floor_care_products_frozen.jsonl")
    with open(out, "w", encoding="utf-8") as fh:
        for rec in frozen:
            fh.write(json.dumps(rec) + "\n")
    print("frozen {} floor-care products (dropped: {}), sum lifetime ratings {:,}".format(
        len(frozen), dropped, sum(r.get("rating_number") or 0 for r in frozen)))


if __name__ == "__main__":
    main()
