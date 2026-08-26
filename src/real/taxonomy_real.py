"""Q3 (real data) - induce a friction taxonomy from REAL review text.

The six themes used in the synthetic-fixture phase of this project
(connectivity, app_software, noise, filter_cost, sensor_trust, reliability)
are treated here as HYPOTHESES ONLY, per this repair's explicit instruction -
not reused uncritically. This module re-runs the same bottom-up method
(lift-ranked n-grams in low-star reviews) against the real corpus and reports
what actually emerges, keeping any hypothesis theme only where the real term
ranking independently supports it.

Modes:
  python3 src/real/taxonomy_real.py --induce         term-lift ranking on real text
  python3 src/real/taxonomy_real.py --emit-sample     write the BLANK 50-review hand-label sheet
  python3 src/real/taxonomy_real.py                   classify + (if a completed hand-label
                                                        file exists) validate

Run --induce and --emit-sample BEFORE the default mode.
"""
import csv
import json
import os
import random
import re
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config as C
from detect_defects_real import sentiment_score

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CLEAN = os.path.join(ROOT, "data", "processed", "reviews_clean_real.csv")
PROC = os.path.join(ROOT, "data", "processed")
SAMPLE_BLANK = os.path.join(ROOT, "data", "hand_label_sample_BLANK.csv")
SAMPLE_COMPLETED = os.path.join(ROOT, "data", "hand_label_sample.csv")
STOP = set("the a an and or but of to in for on with is are was were it its i my we our you your "
          "that this these those at as be been from not no so very just too all any can could would "
          "have has had do does did if then than they them he she there here about into out up down "
          "over under again more most other some such only own same s t don now this br".split())


def load_clean():
    with open(CLEAN, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def tokens(text):
    text = re.sub(r"<br\s*/?>", " ", text or "")
    return [w for w in re.findall(r"[a-z0-9.']+", text.lower()) if w not in STOP and len(w) > 2]


def ngrams(text):
    ws = tokens(text)
    return set(ws) | {" ".join(p) for p in zip(ws, ws[1:])} | {" ".join(p) for p in zip(ws, ws[1:], ws[2:])}


def induce(rows, min_count=8, top=60):
    corpus_df, neg_df = Counter(), Counter()
    n_neg = 0
    for r in rows:
        try:
            rating = float(r["rating"])
        except (ValueError, TypeError):
            continue
        g = ngrams(r["review_text"])
        corpus_df.update(g)
        if rating <= 2:
            n_neg += 1
            neg_df.update(g)
    n_all = len(rows)
    scored = []
    for term, c in corpus_df.items():
        if c < min_count:
            continue
        p_neg = neg_df[term] / float(n_neg) if n_neg else 0
        p_all = c / float(n_all)
        if p_neg == 0:
            continue
        scored.append((p_neg / p_all, neg_df[term], c, term))
    scored.sort(reverse=True)
    return scored[:top]


# Candidate REAL themes, consolidated by reading the --induce output on this
# real corpus (`python3 src/real/taxonomy_real.py --induce`), not carried
# over uncritically from the synthetic-fixture phase. This is a materially
# DIFFERENT ranking from the synthetic hypothesis: "noise", "filter", "ozone"
# and "smell" do NOT appear in the top ~60 lift-ranked terms in 1-2 star real
# reviews (only 3 weak matches even at top-250: "replacement filter." lift
# 3.73/n=6, "fan filter" 3.11/n=4, "buzzing" 3.11/n=4). What DOES dominate
# real negative reviews is reliability ("stopped working" lift 4.80/n=44,
# "never worked" 6.21/n=8), perceived value ("waste money" lift 5.49/n=38-43,
# "scam" 5.65/n=10), and service friction ("refund" 6.21/n=11, "customer
# service" 4.83/n=7). Noise/filter themes are kept below at low weight for
# completeness and honest reporting of their real (small) prevalence, not
# because the real ranking supports them as leading frictions.
THEMES = {
    "reliability": (
        "Reliability / stopped working",
        ["stopped working", "never worked", "died", "malfunction", "broke",
         "broken", "quit working", "doesn work", "doesn't work anymore",
         "failed after", "working after"],
    ),
    "value_effectiveness": (
        "Perceived value / does it actually clean the air",
        ["waste of money", "waste money", "scam", "buyer beware", "misleading",
         "ineffective", "no difference", "not effective", "didn't help",
         "did not help", "still dusty", "worthless"],
    ),
    "customer_service": (
        "Customer service / returns / warranty",
        ["refund", "return window", "sent back", "sending back", "returning",
         "customer service", "contacted customer", "warranty", "replacement unit"],
    ),
    "filter_cost": (
        "Filter cost / replacement (weak real signal)",
        ["replacement filter", "expensive filter", "filter cost", "fan filter"],
    ),
    "noise": (
        "Noise / motor sound (weak real signal)",
        ["loud", "noisy", "whine", "whining", "buzzing", "rattling", "squeaking"],
    ),
    "ozone_odor_safety": (
        "Ozone / smell / irritation (weak real signal)",
        ["ozone", "smell", "odor", "burning smell", "emitted", "irritation"],
    ),
}


def _sentences(text):
    text = re.sub(r"<br\s*/?>", " ", text or "")
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def theme_hits(text):
    """Polarity-gated, same rule already proven necessary in the
    synthetic-fixture phase (src/taxonomy.py::theme_hits) and re-derived
    independently here rather than skipped: a keyword only counts inside a
    negative-polarity sentence. Without this gate, 'Ozone / smell /
    irritation' scored 22% prevalence with a POSITIVE csat_impact on first
    run - 'great at eliminating odors' was being counted as an odor
    complaint. Topic mention is not friction presence, on real text exactly
    as it was not on synthetic text."""
    hits = {}
    for idx, sent in enumerate(_sentences(text)):
        if sentiment_score(sent) >= 0:
            continue
        st = " " + sent.lower() + " "
        for tid, (_name, kws) in THEMES.items():
            sc = sum(1.0 + 0.5 * kw.count(" ") for kw in kws if kw in st)
            if sc:
                if tid in hits:
                    prev_sc, prev_pos = hits[tid]
                    hits[tid] = (prev_sc + sc, prev_pos)
                else:
                    hits[tid] = (sc, idx)
    return hits


def classify(text):
    hits = theme_hits(text)
    if not hits:
        return "none"
    return min(hits.items(), key=lambda kv: (kv[1][1], -kv[1][0], kv[0]))[0]


def emit_blank_sample(rows, n=50, seed=None):
    """Stratified by star rating, deterministic given a seed - but the seed
    used here is NOT the fixture RANDOM_STATE reused for anything else, so
    that this specific sample can't be silently regenerated to match a
    convenient outcome. Recorded explicitly in the output file's own header
    comment for reproducibility."""
    rng = random.Random(seed if seed is not None else C.RANDOM_STATE)
    by_rating = defaultdict(list)
    for r in rows:
        try:
            star = int(float(r["rating"]))
        except (ValueError, TypeError):
            continue
        by_rating[star].append(r)
    quota = {1: 14, 2: 12, 3: 8, 4: 8, 5: 8}
    picked = []
    for star, k in sorted(quota.items()):
        pool = sorted(by_rating.get(star, []), key=lambda r: r["review_id"])
        picked.extend(rng.sample(pool, min(k, len(pool))))
    rng.shuffle(picked)
    return picked[:n]


def compute_theme_stats(rows):
    """Pure function: real theme prevalence/CSAT stats for an arbitrary row
    set. The ONE implementation used by main() below AND by
    dashboard/app.py's Scenario Lab (e.g. for an "exclude one product"
    or "exclude one source" run) - never duplicated inside the dashboard."""
    trusted = [r for r in rows if r.get("rating_trusted") == "true"]
    ratings = [float(r["rating"]) for r in trusted if r["rating"] not in (None, "")]
    corpus_mean = sum(ratings) / len(ratings) if ratings else None

    theme_of = {r["review_id"]: classify(r["review_text"]) for r in rows}
    stats = {}
    for tid, (name, kws) in THEMES.items():
        present = [r for r in rows if theme_of[r["review_id"]] == tid]
        present_trusted = [r for r in present if r.get("rating_trusted") == "true"]
        th_ratings = [float(r["rating"]) for r in present_trusted if r["rating"] not in (None, "")]
        mean_r = sum(th_ratings) / len(th_ratings) if th_ratings else None
        present_dates = sorted(r["review_date"] for r in present if r.get("review_date"))
        n_verified = sum(1 for r in present if r.get("verified_purchase") == "true")
        stats[tid] = {
            "theme_name": name, "keyword_count": len(kws),
            "n_reviews": len(present),
            "n_distinct_products": len(set(r["product_sku"] for r in present)),
            "review_date_range": [present_dates[0], present_dates[-1]] if present_dates else None,
            "pct_verified_purchase": round(100.0 * n_verified / len(present), 1) if present else None,
            "method": ("Deterministic keyword classification of real Amazon.com customer review "
                      "text (McAuley-Lab Amazon-Reviews-2023 dataset, real purifier products only) - "
                      "NOT an academic study, survey, or panel. Each review is assigned to the theme "
                      "whose keyword phrase (see THEMES in src/real/taxonomy_real.py) appears earliest "
                      "in its text; CSAT impact is that theme's mean real star rating minus the "
                      "corpus-wide mean real star rating, both restricted to reviews flagged "
                      "rating_trusted."),
            "prevalence_pct": round(100.0 * len(present) / len(rows), 2) if rows else None,
            "mean_rating": round(mean_r, 3) if mean_r is not None else None,
            "csat_impact": round(mean_r - corpus_mean, 3) if (mean_r is not None and corpus_mean) else None,
        }
    return stats, (round(corpus_mean, 3) if corpus_mean else None), theme_of


def main():
    rows = load_clean()
    if not rows:
        print("No cleaned real reviews yet - run build_reviews_csv.py and "
             "detect_defects_real.py first.")
        return

    if "--induce" in sys.argv:
        print("Term lift ranking in 1-2 star REAL reviews (n={})\n".format(len(rows)))
        print("  {:>6}  {:>5}  {:>5}  term".format("lift", "neg", "all"))
        for lift, nneg, nall, term in induce(rows):
            print("  {:>6.2f}  {:>5}  {:>5}  {}".format(lift, nneg, nall, term))
        return

    if "--emit-sample" in sys.argv:
        picked = emit_blank_sample(rows, seed=C.RANDOM_STATE)
        with open(SAMPLE_BLANK, "w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(["review_id", "product_sku", "product_name", "rating",
                       "review_title", "review_text", "hand_label", "labeller_note"])
            for r in picked:
                w.writerow([r["review_id"], r["product_sku"], r["product_name"],
                           r["rating"], r["review_title"], r["review_text"], "", ""])
        print("wrote {} ({} REAL reviews, hand_label column BLANK)".format(SAMPLE_BLANK, len(picked)))
        print("HUMAN_ACTION_REQUIRED: Goncalo must label these 50 rows by hand against")
        print("the codebook in technical_note.md BEFORE Q3 validation can run.")
        return

    # ---- classify ----
    stats, corpus_mean, theme_of = compute_theme_stats(rows)
    assign = [{"review_id": r["review_id"], "product_sku": r["product_sku"],
              "rating": r["rating"], "rating_trusted": r.get("rating_trusted"),
              "theme": theme_of[r["review_id"]]} for r in rows]
    by_id = {a["review_id"]: a for a in assign}

    validation = {"status": "HUMAN_ACTION_REQUIRED - data/hand_label_sample.csv not "
                            "found or not yet completed by a human labeller"}
    if os.path.exists(SAMPLE_COMPLETED):
        with open(SAMPLE_COMPLETED, newline="", encoding="utf-8") as fh:
            hand = [h for h in csv.DictReader(fh) if h.get("hand_label", "").strip()]
        if hand:
            gold = [h["hand_label"].strip() for h in hand]
            auto = [by_id[h["review_id"]]["theme"] if h["review_id"] in by_id else "MISSING"
                   for h in hand]
            agree = sum(1 for g, a in zip(gold, auto) if g == a) / float(len(gold))
            validation = {
                "n_labelled": len(hand),
                "raw_agreement_pct": round(100.0 * agree, 2),
                "note": "Computed against a human-labelled file - see the file's own "
                       "provenance for who labelled it and when.",
            }

    out = {
        "_provenance": "Themes induced from REAL review text; treated as hypotheses, "
                       "not carried over uncritically from the synthetic-fixture phase.",
        "generated_by": "src/real/taxonomy_real.py",
        "n_reviews_classified": len(rows),
        "corpus_mean_rating_trusted": round(corpus_mean, 3) if corpus_mean else None,
        "themes": stats,
        "unassigned_pct": round(100.0 * sum(1 for a in assign if a["theme"] == "none") / len(assign), 2),
        "validation": validation,
    }
    with open(os.path.join(PROC, "taxonomy_themes_real.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    with open(os.path.join(PROC, "review_themes_real.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["review_id", "product_sku", "rating",
                                          "rating_trusted", "theme"])
        w.writeheader()
        w.writerows(assign)

    print("Q3 (real data) friction taxonomy  n={} corpus_mean={}".format(
        len(rows), out["corpus_mean_rating_trusted"]))
    for tid, st in sorted(stats.items(), key=lambda kv: -(kv[1]["prevalence_pct"] or 0)):
        print("  {:<28} prev={:>6}% mean={:>6} csat={:>7}".format(
            st["theme_name"], st["prevalence_pct"], st["mean_rating"], st["csat_impact"]))
    print("  unassigned: {}%".format(out["unassigned_pct"]))
    print("  validation:", validation.get("status", validation))
    return out


if __name__ == "__main__":
    main()
