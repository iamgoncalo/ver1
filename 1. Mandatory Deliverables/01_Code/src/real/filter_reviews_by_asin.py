"""Stream-filter a McAuley-Lab Amazon-Reviews-2023 review JSONL from stdin,
keeping only rows whose parent_asin is in the frozen purifier product list.
Never materializes the source file - reads and discards line by line, which
is what makes filtering an 886MB/31GB file tractable without downloading it
to disk first.

Run:  curl -sL <review_url> | python3 src/real/filter_reviews_by_asin.py \
        data/real_raw/purifier_products_frozen.jsonl > data/real_raw/reviews_<cat>.jsonl
"""
import json
import sys


def main():
    allow_path = sys.argv[1]
    allowed = set()
    with open(allow_path, encoding="utf-8") as fh:
        for line in fh:
            rec = json.loads(line)
            if rec.get("parent_asin"):
                allowed.add(rec["parent_asin"])
    print("allowlist size: {}".format(len(allowed)), file=sys.stderr)

    seen = 0
    kept = 0
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        seen += 1
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        if rec.get("parent_asin") in allowed or rec.get("asin") in allowed:
            sys.stdout.write(line + "\n")
            kept += 1
        if seen % 2_000_000 == 0:
            print("...scanned {} reviews, kept {}".format(seen, kept), file=sys.stderr)

    print("DONE. scanned={} kept={}".format(seen, kept), file=sys.stderr)


if __name__ == "__main__":
    main()
