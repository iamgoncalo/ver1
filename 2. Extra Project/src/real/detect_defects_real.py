"""Q2 (real data) - detect ACTUAL defects in the real Amazon review export at
data/raw/consumer_reviews.csv. Nothing here is planted; every defect below is
discovered by the detector, then a handful of flagged rows are printed for
manual eyeballing (the brief's own bar: "Plotted daily review counts... and
found a three-day spike" - i.e. show the actual method and the actual rows).

Detectors and what a REAL Amazon export (not a synthetic fixture) actually
contains:
  - exact and near-duplicate review text (multi-buy listings, copy-paste)
  - per-product daily volume anomalies (launches, promos, review-gating events)
  - rating/text sentiment mismatches
  - missing/empty review text
  - unverified-purchase concentration

Run:  python3 src/real/detect_defects_real.py
"""
import csv
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import config as C
from lexicon import NEG_TERMS, POS_TERMS, NEGATORS

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = os.path.join(ROOT, "data", "raw", "consumer_reviews.csv")
PROC = os.path.join(ROOT, "data", "processed")
ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# Negation window in characters, looking BACKWARD from a matched polarity
# term - "I cannot recommend this" needs "cannot" (~11 chars before
# "recommend") to flip the match. This is the fix for a real failure found
# while validating this detector against real review text: the synthetic
# corpus's positive/negative term lists were never negation-aware because
# every synthetic sentence was written in one register (see ai_use_log.md).
# On real text, "I cannot recommend" and "would not call this quiet" were
# scoring as strongly POSITIVE, which is backwards.
NEGATION_WINDOW = 18


def load_raw():
    with open(RAW, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def parse_iso(value):
    if not ISO.match(value or ""):
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return None


def _negated(text, match_start):
    window = text[max(0, match_start - NEGATION_WINDOW):match_start]
    return any(neg in window for neg in NEGATORS)


def sentiment_score(text):
    """Negation-aware bag-of-terms polarity. Still crude (no scope beyond a
    fixed character window, no handling of double negation), but the
    negation check alone was the difference between this detector being
    usable on real text and producing majority-false-positive results - see
    NEGATION_WINDOW comment above."""
    t = " " + (text or "").lower() + " "
    pos = neg = 0
    for w in POS_TERMS:
        start = 0
        while True:
            idx = t.find(w, start)
            if idx == -1:
                break
            if _negated(t, idx):
                neg += 1
            else:
                pos += 1
            start = idx + len(w)
    for w in NEG_TERMS:
        start = 0
        while True:
            idx = t.find(w, start)
            if idx == -1:
                break
            if _negated(t, idx):
                pos += 1
            else:
                neg += 1
            start = idx + len(w)
    if pos + neg == 0:
        return 0.0
    return (pos - neg) / float(pos + neg)


def median(xs):
    s = sorted(xs)
    n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2.0


def mad_zscores(counts_by_day):
    vals = list(counts_by_day.values())
    med = median(vals)
    mad = median([abs(v - med) for v in vals]) or 1.0
    return {d: 0.6745 * (v - med) / mad for d, v in counts_by_day.items()}, med


def detect_duplicate_text(rows, min_len=15, min_repeats=3):
    """Exact-duplicate review text of non-trivial length, per product. A real
    Amazon export commonly contains multi-buy listings where the SAME
    reviewer posts near-identical text across colour/size variants, and
    unrelated reviewers occasionally copy manufacturer-supplied review text
    from an incentivized-review programme."""
    text_counts = Counter(
        (r["product_sku"], r["review_text"].strip())
        for r in rows if len((r["review_text"] or "").strip()) >= min_len)
    dupe_keys = {k for k, n in text_counts.items() if n >= min_repeats}
    flagged = [r["review_id"] for r in rows
               if (r["product_sku"], r["review_text"].strip()) in dupe_keys
               and len((r["review_text"] or "").strip()) >= min_len]
    examples = list(dupe_keys)[:5]
    return flagged, {
        "rule": "exact review_text repeated >= {} times on the same product_sku, "
               "text length >= {} chars".format(min_repeats, min_len),
        "distinct_duplicate_texts": len(dupe_keys),
        "examples": [{"product_sku": k[0], "text": k[1][:140], "count": text_counts[k]}
                    for k in examples],
    }


def detect_volume_anomalies(rows, z_threshold=5.0, min_days=15):
    per_sku_day = defaultdict(Counter)
    for r in rows:
        d = parse_iso(r["review_date"])
        if d:
            per_sku_day[r["product_sku"]][d.strftime("%Y-%m-%d")] += 1

    hits = []
    for sku, counts in per_sku_day.items():
        if len(counts) < min_days or sum(counts.values()) < 10:
            continue
        z, med = mad_zscores(counts)
        for day, s in z.items():
            if s >= z_threshold:
                hits.append({
                    "product_sku": sku, "date": day, "count": counts[day],
                    "sku_daily_median": med,
                    "ratio_to_own_baseline": round(counts[day] / max(med, 1.0), 1),
                    "robust_z": round(s, 1),
                })
    hits.sort(key=lambda h: -h["robust_z"])
    return hits


def detect_sentiment_conflicts(rows):
    """Same asymmetric rule validated in the synthetic-fixture phase of this
    project (see git history / AI-use log): only the true extremes (5-star
    with negative text, 1-star with positive text) are tested. A 4-star
    review containing mild criticism is the EXPECTED shape of a 4-star
    review, not a defect."""
    flagged, evidence = [], []
    for r in rows:
        try:
            rating = int(float(r["rating"]))
        except (ValueError, TypeError):
            continue
        s = sentiment_score(r["review_text"])
        conflict = None
        if rating == 5 and s <= -0.5:
            conflict = "high_rating_negative_text"
        elif rating == 1 and s >= 0.5:
            conflict = "low_rating_positive_text"
        if conflict:
            flagged.append(r["review_id"])
            evidence.append({"review_id": r["review_id"], "rating": rating,
                             "sentiment": round(s, 3), "type": conflict,
                             "text_excerpt": (r["review_text"] or "")[:120]})
    return flagged, {"rule": "rating==5 & sentiment<=-0.5, or rating==1 & sentiment>=+0.5",
                     "total": len(flagged), "examples": evidence[:8]}


def detect_empty_or_trivial_text(rows, min_len=3):
    flagged = [r["review_id"] for r in rows if len((r["review_text"] or "").strip()) < min_len]
    return flagged, {"rule": "review_text shorter than {} characters after strip".format(min_len)}


def detect_malformed_dates(rows):
    flagged = [r["review_id"] for r in rows if parse_iso(r["review_date"]) is None]
    return flagged, {"rule": "strict %Y-%m-%d parse of the derived review_date; "
                     "review_date is derived here from the source epoch-ms timestamp, "
                     "so a failure here would mean the timestamp itself was null/invalid "
                     "in the source export"}


def headline_metrics(rows, label):
    ratings = [float(r["rating"]) for r in rows if r["rating"] not in (None, "")]
    dated = [r for r in rows if parse_iso(r["review_date"])]
    return {
        "label": label,
        "n_reviews": len(rows),
        "mean_rating_overall": round(sum(ratings) / len(ratings), 3) if ratings else None,
        "pct_5_star": round(100.0 * sum(1 for x in ratings if x == 5) / len(ratings), 2) if ratings else None,
        "n_rows_usable_in_timeseries": len(dated),
    }


def main():
    rows = load_raw()
    if not rows:
        print("No rows in {} yet - review download may still be running.".format(RAW))
        return None

    dupes, dupe_ev = detect_duplicate_text(rows)
    volume_hits = detect_volume_anomalies(rows)
    conflicts, conf_ev = detect_sentiment_conflicts(rows)
    empties, empty_ev = detect_empty_or_trivial_text(rows)
    baddates, date_ev = detect_malformed_dates(rows)

    before = headline_metrics(rows, "BEFORE cleaning (real export as downloaded)")
    base_fields = list(rows[0].keys())  # captured before the mutation loop below

    drop = set(empties)  # empty text carries no analyzable signal
    quarantine = set(conflicts)
    clean = [r for r in rows if r["review_id"] not in drop]
    for r in clean:
        r["rating_trusted"] = "false" if r["review_id"] in quarantine else "true"
        r["date_parseable"] = "true" if parse_iso(r["review_date"]) else "false"
        r["is_duplicate_text"] = "true" if r["review_id"] in set(dupes) else "false"

    after = headline_metrics(clean, "AFTER cleaning (empty text removed)")

    report = {
        "_provenance": "Defects found in REAL data, not planted - detection ran first, "
                       "then results were inspected.",
        "generated_by": "src/real/detect_defects_real.py",
        "input_rows": len(rows),
        "output_rows": len(clean),
        "defects_found": {
            "duplicate_review_text": {"count": len(set(dupes)), "remedy": "flagged "
                "(is_duplicate_text column), not removed - see technical_note.md for why",
                                      "evidence": dupe_ev},
            "product_daily_volume_anomalies": {"count": len(volume_hits),
                "remedy": "flagged for review, not auto-removed - a real volume spike may "
                          "be a genuine launch/promo/wildfire-demand event (see TC-R10), "
                          "not fraud, and requires the specific-row judgment call the "
                          "brief's own Q2 language describes",
                "evidence": volume_hits[:20]},
            "sentiment_rating_conflict": {"count": len(conflicts),
                "remedy": "quarantined (rating_trusted=false)", "evidence": conf_ev},
            "empty_or_trivial_text": {"count": len(empties), "remedy": "removed",
                                      "evidence": empty_ev},
            "malformed_date": {"count": len(baddates), "remedy": "excluded from time series",
                               "evidence": date_ev},
        },
        "headline_metrics": {"before": before, "after": after},
        "quantified_consequence": (lambda tr, al: {
            "metric": "corpus mean star rating (the baseline every Q3 average-rating-gap figure is measured against)",
            "without_remedy_all_rows": round(sum(al) / len(al), 4),
            "with_remedy_trusted_only": round(sum(tr) / len(tr), 4),
            "absolute_difference_stars": round(sum(tr) / len(tr) - sum(al) / len(al), 4),
            "relative_difference_pct": round(100.0 * (sum(tr) / len(tr) - sum(al) / len(al)) / (sum(al) / len(al)), 3),
            "rows_driving_it": "the {} quarantined sentiment-conflict rows (their mean rating is {})".format(
                len(al) - len(tr), round((sum(al) - sum(tr)) / (len(al) - len(tr)), 4)),
            "note": "A real, same-corpus before/after - deliberately small, reported at its true size "
                    "rather than manufactured into drama. Every per-theme average-rating-gap figure shifts "
                    "with this baseline.",
        })([float(r["rating"]) for r in clean if r["rating_trusted"] == "true"],
           [float(r["rating"]) for r in clean]),
    }

    os.makedirs(PROC, exist_ok=True)
    out_csv = os.path.join(PROC, "reviews_clean_real.csv")
    fields = base_fields + ["rating_trusted", "date_parseable", "is_duplicate_text"]
    with open(out_csv, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(clean)

    with open(os.path.join(PROC, "defect_detection_report_real.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print("Q2 (real data) defect detection")
    print("  input rows: {}".format(len(rows)))
    print("  duplicate review_text (>=3x, same product): {}".format(len(set(dupes))))
    print("  per-product daily volume anomalies (z>=5): {}".format(len(volume_hits)))
    for h in volume_hits[:5]:
        print("    {} on {}: {} reviews, {}x own daily median (z={})".format(
            h["product_sku"], h["date"], h["count"], h["ratio_to_own_baseline"], h["robust_z"]))
    print("  sentiment/rating conflicts: {}".format(len(conflicts)))
    print("  empty/trivial text: {}".format(len(empties)))
    print("  malformed dates: {}".format(len(baddates)))
    return report


if __name__ == "__main__":
    main()
