"""Generate data/raw/consumer_reviews.csv - 3,500 synthetic smart air purifier
reviews carrying three deliberately planted data defects.

Defects (disjoint row sets, indexed in data/manifest.json):
  (a) 300 automated duplicate reviews burst-posted inside a 3-day window
  (b)  50 reviews whose star rating contradicts the sentiment of the text
  (c) 120 malformed / unparseable review_date strings

Run:  python3 src/generate_reviews.py
"""
import csv
import json
import os
import random
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config as C

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "data", "raw", "consumer_reviews.csv")

FIELDS = [
    "review_id", "product_sku", "product_name", "brand", "marketplace",
    "country", "language", "review_date", "rating", "review_title",
    "review_text", "verified_purchase", "helpful_votes", "reviewer_id",
    "reviewer_review_count", "source_ingested_at",
]

# ---------------------------------------------------------------- text pools
POS = {
    "air_quality": [
        "The PM2.5 readout drops from red to blue within about twenty minutes in our living room.",
        "Hay fever season was genuinely bearable this year for the first time.",
        "Cooking smells from the kitchen are gone long before we finish eating.",
        "Our bedroom air feels noticeably lighter overnight and I wake up without a blocked nose.",
    ],
    "app": [
        "The app paired on the first try and the scheduling actually works.",
        "I like being able to check the air quality history for the past week from my phone.",
        "Setting up a night schedule in the app took under a minute.",
    ],
    "noise": [
        "On sleep mode it is quieter than my old fan by a wide margin.",
        "At speed one you genuinely cannot hear it from the bed.",
        "Whisper quiet at the lower settings, which is all we need overnight.",
    ],
    "auto": [
        "Auto mode ramps up when I open a window and settles back down on its own.",
        "The sensor is responsive enough that I mostly just leave it on auto and forget it.",
    ],
    "build": [
        "Build quality feels solid and the filter change is a thirty second job.",
        "It looks like a piece of furniture rather than an appliance, which sold my partner on it.",
        "Compact footprint, does not dominate the room.",
    ],
    "value": [
        "Cheaper to run than I expected, the energy draw on auto is minimal.",
        "Worth the money for the coverage it gives in an open plan space.",
    ],
}
NEG = {
    "connectivity": [
        "It drops off the Wi-Fi every couple of days and needs a full re-pair.",
        "Constant Wi-Fi disconnects, the app shows it offline more often than online.",
        "Will not hold a connection to my 2.4GHz network for more than a week at a time.",
        "The device falls off the network after every router reboot and re-pairing is painful.",
    ],
    "app": [
        "The app is slow, logs me out at random and lost all my schedules after an update.",
        "Firmware update bricked the app connection and support had no answer.",
        "App crashes on Android every time I open the air quality history.",
    ],
    "noise": [
        "On anything above speed two it is far too loud to sit in the same room.",
        "There is a high pitched whine from the motor that I cannot unhear.",
        "Turbo mode sounds like a hairdryer, we never use it.",
    ],
    "filter": [
        "Replacement filters cost almost half the price of the unit, which is absurd.",
        "The filter life indicator reset itself and now demands a new filter every two months.",
        "Filters are expensive and only available from one supplier.",
    ],
    "sensor": [
        "The air quality sensor seems to read whatever it likes, it sat on red in an empty clean room.",
        "Sensor readings disagree completely with my standalone PM2.5 meter.",
    ],
    "reliability": [
        "Stopped responding entirely after four months and had to be replaced under warranty.",
        "The touch panel became unresponsive within weeks.",
    ],
}
NEU = [
    "Does the job. Nothing remarkable either way.",
    "Fine for a medium sized room, would not push it much bigger than that.",
    "Works as described, though the manual is close to useless.",
    "Decent unit but the smart features are more of a novelty than a reason to buy.",
    "Good hardware, average software.",
]

POS_TITLES = ["Exactly what we needed", "Big difference in the bedroom", "Very happy with it",
              "Quiet and effective", "Worth it for allergy season", "Excellent purifier"]
NEG_TITLES = ["Disappointing smart features", "Terrible Wi-Fi disconnects", "Not worth the money",
              "Loud and unreliable", "Good hardware ruined by the app", "Filter costs are a scam"]
NEU_TITLES = ["Does the job", "Mixed feelings", "Fine, not exceptional", "Reasonable purchase"]

# Automated duplicate payload for defect (a)
BOT_TEXTS = [
    "Amazing product! Best air purifier ever! Fast delivery and great quality! Highly recommend to everyone!",
    "Excellent purifier, works perfectly, five stars, very good price, recommend to all my friends!",
    "Great quality product, arrived fast, works very good, best purchase this year, recommend!",
]
BOT_TITLES = ["Amazing product!!!", "Best purchase ever!!!", "Five stars!!!", "Highly recommend!!!"]

# Malformed date renderings for defect (c)
def malformed_date(rng, true_dt):
    style = rng.choice([
        "eu_slash", "us_slash", "long_text", "impossible_month", "impossible_day",
        "null_literal", "empty", "epoch", "iso_no_pad", "dotted", "trailing_junk",
    ])
    if style == "eu_slash":
        return true_dt.strftime("%d/%m/%Y")
    if style == "us_slash":
        return true_dt.strftime("%m/%d/%Y")
    if style == "long_text":
        return true_dt.strftime("%b %d, %Y")
    if style == "impossible_month":
        return "{}-{:02d}-{:02d}".format(true_dt.year, rng.choice([13, 14, 00]), true_dt.day)
    if style == "impossible_day":
        return "{}-{:02d}-{}".format(true_dt.year, true_dt.month, rng.choice([32, 33, 45, 00]))
    if style == "null_literal":
        return rng.choice(["NULL", "null", "N/A", "-", "unknown"])
    if style == "empty":
        return ""
    if style == "epoch":
        return str(int((true_dt - datetime(1970, 1, 1)).total_seconds()))
    if style == "iso_no_pad":
        return "{}-{}-{}".format(true_dt.year, true_dt.month, true_dt.day)
    if style == "dotted":
        return true_dt.strftime("%d.%m.%y")
    return true_dt.strftime("%Y-%m-%d") + rng.choice([" 00:00:00 UTC+1", "T", "  ", "Z?"])


def sentence_pick(rng, pool, n):
    keys = rng.sample(list(pool.keys()), min(n, len(pool)))
    return " ".join(rng.choice(pool[k]) for k in keys)


def build_text(rng, rating):
    """Text whose sentiment is CONSISTENT with the star rating."""
    if rating >= 4:
        body = sentence_pick(rng, POS, rng.choice([1, 2, 2, 3]))
        if rating == 4 and rng.random() < 0.45:
            body += " " + rng.choice(NEU)
        return rng.choice(POS_TITLES), body
    if rating == 3:
        body = rng.choice(NEU)
        if rng.random() < 0.6:
            body += " " + sentence_pick(rng, POS, 1) + " " + sentence_pick(rng, NEG, 1)
        return rng.choice(NEU_TITLES), body
    body = sentence_pick(rng, NEG, rng.choice([1, 2, 2]))
    return rng.choice(NEG_TITLES), body


def rand_dt(rng, start, end):
    span = int((end - start).total_seconds())
    return start + timedelta(seconds=rng.randrange(span))


def main():
    rng = random.Random(C.SEED)
    p_start = datetime.strptime(C.REVIEW_PERIOD[0], "%Y-%m-%d")
    p_end = datetime.strptime(C.REVIEW_PERIOD[1], "%Y-%m-%d")

    ratings_pop = [5] * 52 + [4] * 21 + [3] * 9 + [2] * 6 + [1] * 12
    rows = []

    # ---- organic reviews -------------------------------------------------
    n_organic = C.N_REVIEWS_TOTAL - C.N_BURST_DUPLICATES
    for _ in range(n_organic):
        sku, name, brand, connected, _msrp = rng.choice(C.PRODUCTS)
        mkt, country, lang = rng.choice(C.MARKETPLACES)
        rating = rng.choice(ratings_pop)
        title, text = build_text(rng, rating)
        dt = rand_dt(rng, p_start, p_end)
        rows.append({
            "_dt": dt, "_defect": "",
            "product_sku": sku, "product_name": name, "brand": brand,
            "marketplace": mkt, "country": country, "language": lang,
            "review_date": dt.strftime("%Y-%m-%d"), "rating": rating,
            "review_title": title, "review_text": text,
            "verified_purchase": "true" if rng.random() < 0.86 else "false",
            "helpful_votes": max(0, int(rng.expovariate(1 / 3.2))),
            "reviewer_id": "RV{:07d}".format(rng.randrange(1, 9_000_000)),
            "reviewer_review_count": rng.choice([1, 1, 2, 3, 5, 8, 14, 27, 61]),
            "source_ingested_at": C.RETRIEVAL_TS,
        })

    # ---- defect (b): rating / text sentiment contradictions --------------
    organic_idx = list(range(len(rows)))
    rng.shuffle(organic_idx)
    conflict_idx = organic_idx[:C.N_SENTIMENT_CONFLICTS]
    for i, ridx in enumerate(conflict_idx):
        r = rows[ridx]
        if i % 5 != 0:
            # 5-star rating attached to clearly negative text (40 of 50)
            r["rating"] = 5
            r["review_title"] = rng.choice(NEG_TITLES)
            r["review_text"] = sentence_pick(rng, NEG, 2)
        else:
            # inverse case: 1-star rating attached to glowing text (10 of 50)
            r["rating"] = 1
            r["review_title"] = rng.choice(POS_TITLES)
            r["review_text"] = sentence_pick(rng, POS, 2)
        r["_defect"] = "sentiment_rating_conflict"

    # ---- defect (c): malformed date strings ------------------------------
    remaining = [i for i in organic_idx[C.N_SENTIMENT_CONFLICTS:]]
    malformed_idx = remaining[:C.N_MALFORMED_DATES]
    for ridx in malformed_idx:
        r = rows[ridx]
        r["review_date"] = malformed_date(rng, r["_dt"])
        r["_defect"] = "malformed_date"

    # ---- defect (a): 3-day burst of automated duplicates -----------------
    b_start = datetime.strptime(C.BURST_WINDOW[0], "%Y-%m-%d")
    b_end = datetime.strptime(C.BURST_WINDOW[1], "%Y-%m-%d") + timedelta(days=1)
    sku, name, brand, _c, _m = [p for p in C.PRODUCTS if p[0] == C.BURST_SKU][0]
    bot_seed_block = rng.randrange(4_000_000, 4_500_000)
    for k in range(C.N_BURST_DUPLICATES):
        mkt, country, lang = rng.choice(C.MARKETPLACES[:4])
        dt = rand_dt(rng, b_start, b_end)
        rows.append({
            "_dt": dt, "_defect": "burst_duplicate",
            "product_sku": sku, "product_name": name, "brand": brand,
            "marketplace": mkt, "country": country, "language": lang,
            "review_date": dt.strftime("%Y-%m-%d"), "rating": 5,
            "review_title": BOT_TITLES[k % len(BOT_TITLES)],
            "review_text": BOT_TEXTS[k % len(BOT_TEXTS)],
            "verified_purchase": "false",
            "helpful_votes": 0,
            # near-sequential reviewer ids = second detectable bot signature
            "reviewer_id": "RV{:07d}".format(bot_seed_block + k * rng.choice([1, 1, 2])),
            "reviewer_review_count": 1,
            "source_ingested_at": C.RETRIEVAL_TS,
        })

    # chronological order by TRUE timestamp, then stable review ids
    rows.sort(key=lambda r: r["_dt"])
    defect_index = {"burst_duplicate": [], "sentiment_rating_conflict": [], "malformed_date": []}
    for n, r in enumerate(rows, start=1):
        r["review_id"] = "CR-{:06d}".format(n)
        if r["_defect"]:
            defect_index[r["_defect"]].append(r["review_id"])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

    # Answer key lives under tests/, never under data/raw/ - the raw layer must
    # look exactly like an untrusted vendor drop with no defect labels attached.
    gt_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "tests", "fixtures", "defect_ground_truth.json")
    os.makedirs(os.path.dirname(gt_path), exist_ok=True)
    with open(gt_path, "w", encoding="utf-8") as fh:
        json.dump({
            "_note": "Ground truth for the planted defects in consumer_reviews.csv.",
            "source_file": "data/raw/consumer_reviews.csv",
            "seed": C.SEED,
            "total_rows": len(rows),
            "defects": {
                "a_burst_duplicate": {
                    "count": len(defect_index["burst_duplicate"]),
                    "window": list(C.BURST_WINDOW),
                    "sku": C.BURST_SKU,
                    "signatures": ["repeated review_text", "near-sequential reviewer_id",
                                   "all 5-star", "verified_purchase=false",
                                   "reviewer_review_count=1"],
                    "review_ids": defect_index["burst_duplicate"],
                },
                "b_sentiment_rating_conflict": {
                    "count": len(defect_index["sentiment_rating_conflict"]),
                    "signatures": ["5-star rating with negative text (40)",
                                   "1-star rating with positive text (10)"],
                    "review_ids": defect_index["sentiment_rating_conflict"],
                },
                "c_malformed_date": {
                    "count": len(defect_index["malformed_date"]),
                    "signatures": ["non-ISO formats", "impossible month/day",
                                   "NULL / empty literals", "epoch seconds",
                                   "unpadded ISO", "trailing junk"],
                    "review_ids": defect_index["malformed_date"],
                },
            },
        }, fh, indent=2)
        fh.write("\n")

    print("wrote {} ({} rows)".format(OUT, len(rows)))
    for k, v in defect_index.items():
        print("  defect {:<26} {:>4} rows".format(k, len(v)))
    print("wrote {}".format(gt_path))
    return defect_index


if __name__ == "__main__":
    main()
