"""Q3 - induce a friction taxonomy from the review text, classify the corpus,
and validate the classifier against a hand-labelled sample.

Three modes:
  python3 src/taxonomy.py --induce        show the term ranking the taxonomy came from
  python3 src/taxonomy.py --emit-sample   write the 50-review sheet for hand labelling
  python3 src/taxonomy.py                 classify + score agreement (default)

The taxonomy is derived bottom-up: terms are ranked by LIFT in 1-2 star reviews
over their corpus base rate, and the head terms are consolidated into themes.
The brief's own vocabulary was deliberately not used as a seed - if a theme is
not in the reviewers' words it does not get to be a theme.
"""
import csv
import json
import os
import random
import re
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config_SYNTHETIC_TEST_FIXTURE as C
from lexicon import THEMES, NEG_TERMS, POS_TERMS

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLEAN = os.path.join(ROOT, "data", "processed", "reviews_clean.csv")
PROC = os.path.join(ROOT, "data", "processed")
SAMPLE = os.path.join(ROOT, "data", "hand_labeled_sample.csv")
STOP = set("the a an and or but of to in for on with is are was were it its i my we our you your "
           "that this these those at as be been from not no so very just too all any can could would "
           "have has had do does did if then than they them he she there here about into out up down "
           "over under again more most other some such only own same s t don now".split())


def load_clean():
    with open(CLEAN, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def tokens(text):
    return [w for w in re.findall(r"[a-z0-9.']+", text.lower()) if w not in STOP and len(w) > 2]


def ngrams(text):
    ws = tokens(text)
    return set(ws) | {" ".join(p) for p in zip(ws, ws[1:])}


def induce_candidate_terms(rows, min_count=15, top=45):
    """Rank terms by lift in low-star reviews. This is the step that produced the
    keyword sets now frozen in src/lexicon.py::THEMES."""
    corpus_df, neg_df = Counter(), Counter()
    n_neg = 0
    for r in rows:
        g = ngrams(r["review_text"])
        corpus_df.update(g)
        if int(r["rating"]) <= 2:
            n_neg += 1
            neg_df.update(g)
    n_all = len(rows)
    scored = []
    for term, c in corpus_df.items():
        if c < min_count:
            continue
        p_neg = neg_df[term] / float(n_neg)
        p_all = c / float(n_all)
        if p_neg == 0:
            continue
        scored.append((p_neg / p_all, neg_df[term], c, term))
    scored.sort(reverse=True)
    return scored[:top]


def sentences(text):
    return [x.strip() for x in re.split(r"(?<=[.!?])\s+", text) if x.strip()]


def sentence_polarity(sent):
    t = " " + sent.lower() + " "
    pos = sum(1 for w in POS_TERMS if w in t)
    neg = sum(1 for w in NEG_TERMS if w in t)
    if pos + neg == 0:
        return 0.0
    return (pos - neg) / float(pos + neg)


def theme_hits(text):
    """Return {theme_id: (score, first_position)} for FRICTION-bearing mentions.

    Two rules, both of which cost real agreement in v1 of this classifier:

    1. POLARITY GATE. A keyword only counts when the sentence carrying it is
       negative. "Whisper quiet at the lower settings" mentions noise and is
       praise; counting it made 'Noise at night' score a POSITIVE CSAT impact,
       which is incoherent for a friction. Topic presence is not friction
       presence, and v1 conflated them.

    2. POSITION TIE-BREAK. When a review carries several frictions the primary
       one is the FIRST mentioned, not the highest-scoring. That is the rule the
       hand-labelling codebook states, so the classifier now follows the same
       rule instead of a different one.
    """
    hits = {}
    for idx, sent in enumerate(sentences(text)):
        if sentence_polarity(sent) >= 0:
            continue
        st = " " + sent.lower() + " "
        for tid, (_name, kws, _surface) in THEMES.items():
            sc = sum(1.0 + 0.5 * kw.count(" ") for kw in kws if kw in st)
            if sc:
                if tid in hits:
                    prev_sc, prev_pos = hits[tid]
                    hits[tid] = (prev_sc + sc, prev_pos)
                else:
                    hits[tid] = (sc, idx)
    return hits


def classify(text):
    """Primary friction theme: earliest-mentioned, score as tie-break.

    Reviews matching nothing are 'none' rather than being forced into the
    nearest bucket - a taxonomy that cannot say "this is not a friction" will
    overstate every theme it has.
    """
    hits = theme_hits(text)
    if not hits:
        return "none", {}
    best = min(hits.items(), key=lambda kv: (kv[1][1], -kv[1][0], kv[0]))
    return best[0], {k: v[0] for k, v in hits.items()}


def all_themes(text):
    """Every FRICTION theme present (reviews are multi-topic)."""
    return sorted(theme_hits(text).keys())


def all_topics(text):
    """Every theme MENTIONED regardless of polarity - kept separate from
    all_themes so the topic/friction distinction stays visible in the outputs."""
    t = " " + text.lower() + " "
    return sorted(tid for tid, (_n, kws, _s) in THEMES.items() if any(kw in t for kw in kws))


def emit_sample(rows, n=50):
    """Stratified by star rating so the sheet is not 70% five-star praise, which
    would leave the friction themes with almost no labelled examples."""
    rng = random.Random(C.RANDOM_STATE)
    by_rating = defaultdict(list)
    for r in rows:
        by_rating[int(r["rating"])].append(r)
    quota = {1: 14, 2: 12, 3: 8, 4: 8, 5: 8}
    picked = []
    for star, k in sorted(quota.items()):
        pool = sorted(by_rating[star], key=lambda r: r["review_id"])
        picked.extend(rng.sample(pool, min(k, len(pool))))
    rng.shuffle(picked)
    return picked[:n]


def cohens_kappa(a, b, labels):
    n = len(a)
    po = sum(1 for x, y in zip(a, b) if x == y) / float(n)
    ca, cb = Counter(a), Counter(b)
    pe = sum((ca[l] / float(n)) * (cb[l] / float(n)) for l in labels)
    return (po - pe) / (1 - pe) if pe < 1 else 1.0, po


def main():
    rows = load_clean()

    if "--induce" in sys.argv:
        print("Term lift ranking in 1-2 star reviews (bottom-up taxonomy input)\n")
        print("  {:>6}  {:>5}  {:>5}  term".format("lift", "neg", "all"))
        for lift, nneg, nall, term in induce_candidate_terms(rows):
            print("  {:>6.2f}  {:>5}  {:>5}  {}".format(lift, nneg, nall, term))
        return

    if "--emit-sample" in sys.argv:
        picked = emit_sample(rows)
        out = os.path.join(ROOT, "data", "hand_labeled_sample_TEMPLATE.csv")
        with open(out, "w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(["review_id", "rating", "review_text", "hand_label", "labeller_note"])
            for r in picked:
                w.writerow([r["review_id"], r["rating"], r["review_text"], "", ""])
        print("wrote {} ({} rows to label)".format(out, len(picked)))
        return

    # ---- classify the corpus -------------------------------------------
    trusted = [r for r in rows if r["rating_trusted"] == "true"]
    corpus_mean = sum(int(r["rating"]) for r in trusted) / float(len(trusted))

    assign = []
    for r in rows:
        primary, _ = classify(r["review_text"])
        assign.append({"review_id": r["review_id"], "product_sku": r["product_sku"],
                       "rating": r["rating"], "rating_trusted": r["rating_trusted"],
                       "primary_theme": primary,
                       "all_themes": "|".join(all_themes(r["review_text"]))})
    by_id = {a["review_id"]: a for a in assign}

    stats = {}
    for tid, (name, kws, surface) in THEMES.items():
        present = [r for r in rows if tid in all_themes(r["review_text"])]
        topic_present = [r for r in rows if tid in all_topics(r["review_text"])]
        present_trusted = [r for r in present if r["rating_trusted"] == "true"]
        ratings = [int(r["rating"]) for r in present_trusted]
        mean_r = sum(ratings) / float(len(ratings)) if ratings else None
        stats[tid] = {
            "theme_name": name,
            "monetisable_surface": surface,
            "keyword_count": len(kws),
            "n_reviews": len(present),
            "friction_prevalence_pct": round(100.0 * len(present) / len(rows), 2),
            "n_reviews_topic_mentioned": len(topic_present),
            "topic_prevalence_pct": round(100.0 * len(topic_present) / len(rows), 2),
            "n_reviews_rating_trusted": len(present_trusted),
            "mean_rating": round(mean_r, 3) if mean_r else None,
            "csat_impact": round(mean_r - corpus_mean, 3) if mean_r else None,
            "pct_of_theme_that_is_negative": round(
                100.0 * sum(1 for x in ratings if x <= 2) / len(ratings), 2) if ratings else None,
        }

    # ---- validate against the hand-labelled sample ----------------------
    agreement = {"status": "NOT RUN - data/hand_labeled_sample.csv missing"}
    if os.path.exists(SAMPLE):
        with open(SAMPLE, newline="", encoding="utf-8") as fh:
            hand = [h for h in csv.DictReader(fh) if h["hand_label"].strip()]
        gold = [h["hand_label"].strip() for h in hand]
        auto = [by_id[h["review_id"]]["primary_theme"] if h["review_id"] in by_id else "MISSING"
                for h in hand]
        labels = sorted(set(gold) | set(auto))
        kappa, po = cohens_kappa(gold, auto, labels)
        per_theme = {}
        for l in labels:
            tp = sum(1 for g, a in zip(gold, auto) if g == l and a == l)
            fp = sum(1 for g, a in zip(gold, auto) if g != l and a == l)
            fn = sum(1 for g, a in zip(gold, auto) if g == l and a != l)
            per_theme[l] = {
                "support": gold.count(l),
                "precision": round(tp / float(tp + fp), 3) if tp + fp else None,
                "recall": round(tp / float(tp + fn), 3) if tp + fn else None,
            }
        disagreements = [{"review_id": h["review_id"], "rating": h["rating"],
                          "hand": g, "auto": a, "text": h["review_text"][:110]}
                         for h, g, a in zip(hand, gold, auto) if g != a]
        agreement = {
            "n_labelled": len(hand),
            "raw_agreement_pct": round(100.0 * po, 2),
            "cohens_kappa": round(kappa, 4),
            "target_pct": 85.0,
            "meets_target": bool(100.0 * po >= 85.0),
            "per_theme": per_theme,
            "disagreements": disagreements,
            "labelling_protocol": "data/hand_labeled_sample.csv - one primary theme per "
                                  "review, assigned by reading the text against the codebook "
                                  "in deliverables/technical_note.md before any automated "
                                  "label was computed.",
        }

    # ---- confidence per theme ------------------------------------------
    for tid, st in stats.items():
        support = agreement.get("per_theme", {}).get(tid, {}).get("support", 0) if isinstance(agreement, dict) else 0
        prec = agreement.get("per_theme", {}).get(tid, {}).get("precision") if isinstance(agreement, dict) else None
        if st["n_reviews"] >= 200 and support >= 5 and (prec or 0) >= 0.8:
            conf, why = "high", "large corpus support and validated on >=5 hand-labelled reviews"
        elif st["n_reviews"] >= 200:
            conf, why = "medium", "large corpus support but thin hand-labelled support"
        else:
            conf, why = "low", "fewer than 200 reviews carry the theme"
        st["confidence"] = conf
        st["confidence_reason"] = why

    os.makedirs(PROC, exist_ok=True)
    with open(os.path.join(PROC, "review_themes.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["review_id", "product_sku", "rating",
                                           "rating_trusted", "primary_theme", "all_themes"])
        w.writeheader()
        w.writerows(assign)

    out = {
        "_provenance": C.PROVENANCE_BANNER,
        "generated_by": "src/taxonomy.py",
        "random_state": C.RANDOM_STATE,
        "n_reviews_classified": len(rows),
        "corpus_mean_rating_trusted": round(corpus_mean, 3),
        "method": "lift-ranked term induction (--induce) -> manual consolidation into "
                  "6 themes -> weighted keyword classifier -> hand-label validation",
        "themes": stats,
        "unassigned_pct": round(100.0 * sum(1 for a in assign if a["primary_theme"] == "none") / len(assign), 2),
        "validation": agreement,
    }
    with open(os.path.join(PROC, "taxonomy_themes.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print("Q3 friction taxonomy   (n={}, corpus mean {:.3f})".format(len(rows), corpus_mean))
    print("  {:<32} {:>8} {:>8} {:>8}  {}".format("theme", "prev%", "mean", "CSATd", "conf"))
    for tid, st in sorted(stats.items(), key=lambda kv: -kv[1]["friction_prevalence_pct"]):
        print("  {:<32} {:>8} {:>8} {:>+8} {:>6}".format(
            st["theme_name"], st["friction_prevalence_pct"], st["mean_rating"],
            st["csat_impact"], st["confidence"]))
    print("  unassigned: {}%".format(out["unassigned_pct"]))
    if "raw_agreement_pct" in agreement:
        print("\n  hand-label agreement: {}% (kappa {}) on n={} - target 85%: {}".format(
            agreement["raw_agreement_pct"], agreement["cohens_kappa"],
            agreement["n_labelled"], "MET" if agreement["meets_target"] else "NOT MET"))
    else:
        print("\n  " + agreement["status"])
    return out


if __name__ == "__main__":
    main()
