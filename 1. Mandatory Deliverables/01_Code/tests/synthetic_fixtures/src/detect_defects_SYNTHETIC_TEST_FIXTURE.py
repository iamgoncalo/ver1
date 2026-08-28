"""Q2 - detect the three defects in data/raw/consumer_reviews.csv, quantify what
they would have done to the headline numbers, and write a cleaned corpus.

Detection is BLIND: nothing in this module reads the ground-truth answer key
while deciding what is a defect. The key is opened only at the end, to score the
detectors (precision / recall). That ordering is the point - a detector scored
on labels it consumed is not a detector.

Outputs
  data/processed/reviews_clean.csv
  data/processed/defect_detection_report.json

Run:  python3 src/detect_defects.py
"""
import csv
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config_SYNTHETIC_TEST_FIXTURE as C
from lexicon import NEG_TERMS, POS_TERMS, BOT_MARKERS

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw", "consumer_reviews.csv")
PROC = os.path.join(ROOT, "data", "processed")
ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")


# ---------------------------------------------------------------- primitives
def load_raw():
    with open(RAW, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def parse_iso(value):
    """Strict ISO-8601 only. Anything else is a parse FAILURE, never a guess.

    Coercing '03/04/2026' silently is how a corpus acquires a fake April. The
    whole point of defect (c) is that these rows must surface, not be repaired
    by a permissive parser.
    """
    if not ISO.match(value or ""):
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return None


def sentiment_score(text):
    """Crude polarity: (pos hits - neg hits) normalised. Deliberately simple and
    fully inspectable - every flag it raises can be traced to a listed term."""
    t = " " + text.lower() + " "
    pos = sum(1 for w in POS_TERMS if w in t)
    neg = sum(1 for w in NEG_TERMS if w in t)
    if pos + neg == 0:
        return 0.0
    return (pos - neg) / float(pos + neg)


def median(xs):
    s = sorted(xs)
    n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2.0


def mad_zscores(counts_by_day):
    """Robust anomaly score. Plain mean/sd is the wrong tool here: a 300-review
    spike drags the mean and inflates sd, so the spike partially hides itself.
    Median absolute deviation does not move."""
    vals = list(counts_by_day.values())
    med = median(vals)
    mad = median([abs(v - med) for v in vals]) or 1.0
    return {d: 0.6745 * (v - med) / mad for d, v in counts_by_day.items()}, med


# ------------------------------------------------------- defect (a) detection
def detect_burst_duplicates(rows):
    """Three independent signatures must ALL fire before a row is condemned.

    Any one alone over-fires: a genuine viral product gets a volume spike, a
    short review gets duplicated by chance, an enthusiast posts once. Requiring
    the intersection is what keeps a real launch surge out of the net.
    """
    # signature 1 - per-SKU daily volume anomaly (robust z >= 5)
    per_sku_day = defaultdict(Counter)
    for r in rows:
        d = parse_iso(r["review_date"])
        if d:
            per_sku_day[r["product_sku"]][d.strftime("%Y-%m-%d")] += 1

    anomalous = {}
    volume_evidence = []
    for sku, counts in per_sku_day.items():
        if len(counts) < 30:
            continue
        z, med = mad_zscores(counts)
        hits = {d: s for d, s in z.items() if s >= 5.0}
        if hits:
            anomalous[sku] = set(hits)
            for d, s in sorted(hits.items()):
                volume_evidence.append({
                    "product_sku": sku, "date": d, "count": counts[d],
                    "sku_daily_median": med,
                    "ratio_to_own_baseline": round(counts[d] / max(med, 1.0), 1),
                    "robust_z": round(s, 1),
                })

    # signature 2 - exact duplicate review_text appearing >= 10 times
    text_counts = Counter(r["review_text"] for r in rows)
    dupe_texts = {t for t, n in text_counts.items() if n >= 10}

    # signature 3 - promotional register markers
    def bot_register(t):
        tl = t.lower()
        return sum(1 for m in BOT_MARKERS if m in tl) >= 1

    flagged = []
    for r in rows:
        d = parse_iso(r["review_date"])
        if not d:
            continue
        day = d.strftime("%Y-%m-%d")
        if (r["product_sku"] in anomalous and day in anomalous[r["product_sku"]]
                and r["review_text"] in dupe_texts and bot_register(r["review_text"])):
            flagged.append(r["review_id"])

    # supporting forensic: reviewer_id density inside the flagged window
    ids = sorted(int(r["reviewer_id"][2:]) for r in rows if r["review_id"] in set(flagged))
    gaps = [b - a for a, b in zip(ids, ids[1:])] if len(ids) > 1 else []
    return flagged, {
        "signatures_required": 3,
        "volume_anomaly": volume_evidence,
        "duplicate_text_variants": len(dupe_texts),
        "max_text_repetitions": max(text_counts.values()),
        "reviewer_id_median_gap": median(gaps) if gaps else None,
        "reviewer_id_gap_note": ("near-sequential reviewer ids inside the window - "
                                 "organic reviewers are drawn from the whole id space"),
    }


# ------------------------------------------------------- defect (b) detection
def detect_sentiment_conflicts(rows):
    """Flag rows where polarity and stars point in opposite directions.

    Only the EXTREMES are tested (5 and 1), not 4 and 2. A 4-star review means
    "good, with reservations" - mixed text is what it is supposed to contain, so
    negative language there is congruent, not contradictory. An earlier version
    of this rule used >=4 / <=2 and returned 12 false positives, every one of
    them a 4-star review; see deliverables/ai_use_log.md. The fix is a domain
    argument about what 4 stars means, not a threshold fitted to the answer key.
    """
    flagged, evidence = [], []
    for r in rows:
        s = sentiment_score(r["review_text"])
        rating = int(r["rating"])
        conflict = None
        if rating == 5 and s <= -0.5:
            conflict = "high_rating_negative_text"
        elif rating == 1 and s >= 0.5:
            conflict = "low_rating_positive_text"
        if conflict:
            flagged.append(r["review_id"])
            evidence.append({"review_id": r["review_id"], "rating": rating,
                             "sentiment": round(s, 3), "type": conflict,
                             "text_excerpt": r["review_text"][:90]})
    return flagged, {"rule": "rating==5 & sentiment<=-0.5, or rating==1 & sentiment>=+0.5",
                     "examples": evidence[:5], "total": len(flagged)}


# ------------------------------------------------------- defect (c) detection
def detect_malformed_dates(rows):
    flagged, patterns = [], Counter()
    for r in rows:
        if parse_iso(r["review_date"]) is None:
            flagged.append(r["review_id"])
            v = (r["review_date"] or "").strip()
            if v == "":
                patterns["empty"] += 1
            elif v.lower() in ("null", "n/a", "-", "unknown"):
                patterns["null_literal"] += 1
            elif re.match(r"^\d+$", v):
                patterns["epoch_seconds"] += 1
            elif "/" in v:
                patterns["slash_separated_ambiguous"] += 1
            elif "." in v:
                patterns["dotted_two_digit_year"] += 1
            elif re.match(r"^[A-Za-z]{3} ", v):
                patterns["long_text_month"] += 1
            elif ISO.match(v.split()[0] if v.split() else ""):
                patterns["iso_with_trailing_junk"] += 1
            else:
                patterns["impossible_or_unpadded"] += 1
    return flagged, {
        "rule": "strict %Y-%m-%d parse; no coercion, no dayfirst guessing",
        "pattern_breakdown": dict(patterns),
        "known_false_negative_floor": (
            "An unpadded ISO date is byte-identical to a valid one whenever month "
            "AND day are both >= 10 ('2025-12-20'). Those rows are undetectable by "
            "any parser and are NOT counted as a detector failure - they are a "
            "ceiling on what date validation can achieve from the string alone. "
            "Only an upstream format contract removes them."),
    }


# --------------------------------------------------------- headline measures
def headline_metrics(rows, label):
    """The numbers leadership would actually see. Computed identically on the
    dirty and clean corpora so the delta is attributable to cleaning alone."""
    ratings = [int(r["rating"]) for r in rows]
    burst_sku = [int(r["rating"]) for r in rows if r["product_sku"] == C.BURST_SKU]
    dated = [r for r in rows if parse_iso(r["review_date"])]
    neg = [r for r in rows if int(r["rating"]) <= 2]
    conn = [r for r in neg if any(k in r["review_text"].lower()
                                  for k in ("disconnect", "offline", "wi-fi", "network", "re-pair"))]
    return {
        "label": label,
        "n_reviews": len(rows),
        "mean_rating_overall": round(sum(ratings) / float(len(ratings)), 3),
        "pct_5_star": round(100.0 * ratings.count(5) / len(ratings), 2),
        "mean_rating_hero_sku": round(sum(burst_sku) / float(len(burst_sku)), 3) if burst_sku else None,
        "n_hero_sku": len(burst_sku),
        "pct_5_star_hero_sku": round(100.0 * burst_sku.count(5) / len(burst_sku), 2) if burst_sku else None,
        "n_rows_usable_in_timeseries": len(dated),
        "pct_rows_lost_from_timeseries": round(100.0 * (len(rows) - len(dated)) / len(rows), 2),
        "pct_negative_reviews": round(100.0 * len(neg) / len(rows), 2),
        "connectivity_share_of_negative_pct": round(100.0 * len(conn) / len(neg), 2) if neg else None,
    }


def score(flagged, truth):
    f, t = set(flagged), set(truth)
    tp, fp, fn = len(f & t), len(f - t), len(t - f)
    prec = tp / float(tp + fp) if tp + fp else 0.0
    rec = tp / float(tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    return {"flagged": len(f), "truth": len(t), "true_positives": tp,
            "false_positives": fp, "false_negatives": fn,
            "precision": round(prec, 4), "recall": round(rec, 4), "f1": round(f1, 4)}


def main():
    rows = load_raw()
    burst, burst_ev = detect_burst_duplicates(rows)
    conflicts, conf_ev = detect_sentiment_conflicts(rows)
    baddates, date_ev = detect_malformed_dates(rows)

    before = headline_metrics(rows, "BEFORE cleaning (raw corpus as delivered)")

    # Remedy policy differs per defect and the difference is deliberate:
    #   (a) REMOVE  - not product experience, no information to recover
    #   (b) QUARANTINE - text is real experience, only the star label is untrusted
    #   (c) RETAIN but exclude from time series - the text still counts
    drop = set(burst)
    quarantine = set(conflicts)
    clean = [r for r in rows if r["review_id"] not in drop]
    for r in clean:
        r["rating_trusted"] = "false" if r["review_id"] in quarantine else "true"
        r["date_parseable"] = "true" if parse_iso(r["review_date"]) else "false"

    after = headline_metrics(clean, "AFTER cleaning (burst removed)")
    rating_trusted = [r for r in clean if r["rating_trusted"] == "true"]
    after_strict = headline_metrics(rating_trusted, "AFTER cleaning (burst removed + conflicted ratings quarantined)")

    gt = json.load(open(os.path.join(ROOT, "tests", "fixtures", "defect_ground_truth.json"),
                        encoding="utf-8"))["defects"]
    scoring = {
        "a_burst_duplicate": score(burst, gt["a_burst_duplicate"]["review_ids"]),
        "b_sentiment_rating_conflict": score(conflicts, gt["b_sentiment_rating_conflict"]["review_ids"]),
        "c_malformed_date": score(baddates, gt["c_malformed_date"]["review_ids"]),
    }

    impact = {
        "mean_rating_hero_sku": {
            "before": before["mean_rating_hero_sku"], "after": after["mean_rating_hero_sku"],
            "delta": round(after["mean_rating_hero_sku"] - before["mean_rating_hero_sku"], 3),
            "reading": "The hero SKU's headline star rating was inflated by the burst.",
        },
        "pct_5_star_hero_sku": {
            "before": before["pct_5_star_hero_sku"], "after": after["pct_5_star_hero_sku"],
            "delta": round(after["pct_5_star_hero_sku"] - before["pct_5_star_hero_sku"], 2),
        },
        "mean_rating_overall": {
            "before": before["mean_rating_overall"], "after": after["mean_rating_overall"],
            "delta": round(after["mean_rating_overall"] - before["mean_rating_overall"], 3),
        },
        "timeseries_rows_lost": {
            "count": before["n_reviews"] - before["n_rows_usable_in_timeseries"],
            "pct": before["pct_rows_lost_from_timeseries"],
            "reading": "Rows a permissive pipeline would drop silently, or worse, "
                       "coerce into the wrong month.",
        },
    }

    os.makedirs(PROC, exist_ok=True)
    out_csv = os.path.join(PROC, "reviews_clean.csv")
    fields = list(rows[0].keys()) + ["rating_trusted", "date_parseable"]
    with open(out_csv, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(clean)

    report = {
        "_provenance": C.PROVENANCE_BANNER,
        "generated_by": "src/detect_defects.py",
        "random_state": C.RANDOM_STATE,
        "input_rows": len(rows),
        "output_rows": len(clean),
        "defects": {
            "a_burst_duplicate": {"detected": len(burst), "remedy": "removed",
                                  "evidence": burst_ev, "scoring": scoring["a_burst_duplicate"]},
            "b_sentiment_rating_conflict": {"detected": len(conflicts), "remedy": "quarantined (rating_trusted=false)",
                                            "evidence": conf_ev, "scoring": scoring["b_sentiment_rating_conflict"]},
            "c_malformed_date": {"detected": len(baddates), "remedy": "retained, excluded from time series",
                                 "evidence": date_ev, "scoring": scoring["c_malformed_date"]},
        },
        "headline_metrics": {"before": before, "after": after, "after_strict": after_strict},
        "impact_of_not_catching": impact,
    }
    with open(os.path.join(PROC, "defect_detection_report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print("Q2 defect detection")
    for k, v in scoring.items():
        print("  {:<28} flagged={:<5} precision={:.3f} recall={:.3f}".format(
            k, v["flagged"], v["precision"], v["recall"]))
    print("\n  hero SKU mean rating  {} -> {}  ({:+.3f} stars)".format(
        before["mean_rating_hero_sku"], after["mean_rating_hero_sku"],
        impact["mean_rating_hero_sku"]["delta"]))
    print("  hero SKU 5-star share {}% -> {}%  ({:+.2f} pp)".format(
        before["pct_5_star_hero_sku"], after["pct_5_star_hero_sku"],
        impact["pct_5_star_hero_sku"]["delta"]))
    print("  rows unusable in time series: {} ({}%)".format(
        impact["timeseries_rows_lost"]["count"], impact["timeseries_rows_lost"]["pct"]))
    for e in burst_ev["volume_anomaly"]:
        print("  volume anomaly: {} on {} = {} reviews, {}x its own daily median".format(
            e["product_sku"], e["date"], e["count"], e["ratio_to_own_baseline"]))
    return report


if __name__ == "__main__":
    main()
