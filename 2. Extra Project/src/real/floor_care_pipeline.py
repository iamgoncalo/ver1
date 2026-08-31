"""FLOOR CARE - one deterministic pipeline over the REAL floor-care corpus.

PASS_3 category generalization. Everything domain-specific in this module is
INDUCED from the real corpus (data/real_raw/floor_care_*.jsonl) or honestly
absent. NOTHING is prewritten for Floor Care: no authored themes, no authored
possibility names, no authored pairing table, no borrowed Air Purification
output. What IS reused is category-independent METHOD, imported from the Air
reference implementations and cited inline:

  - taxonomy_real.induce            lift-ranked n-gram induction (the math)
  - taxonomy_real.ngrams/_sentences tokenization + sentence split
  - detect_defects_real.sentiment_score  negation-aware sentence polarity
  - magic_box_real.OPERATORS        the 12-operator design vocabulary
                                    (category-independent; THEME_OPERATORS /
                                    POSSIBILITY_NAMES are Air-authored and
                                    are deliberately NOT imported)
  - decision_framework_real.MATERIALITY_FLOOR_PCT  the one materiality floor
  - rivals_real.MIN_REVIEWS         the brand evidence floor
  - research_discovery_real._http_get_json  stdlib PubMed E-utilities HTTP

Run:  python3 src/real/floor_care_pipeline.py
Every stage that has input runs; every stage that doesn't prints an honest
reason and is recorded as SKIPPED in data/processed/floor_care/state.json.

HONEST LIMITATION recorded up front: data/real_raw/floor_care_reviews_hk.jsonl
is written by a long-running background streaming job over the 31GB
Home_and_Kitchen review export. This pipeline processes whatever rows exist
at run time and records the source line counts it saw; the run must be
repeated after the stream completes for final numbers.
"""
import csv
import hashlib
import json
import os
import random
import re
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config as C                                              # noqa: E402
from detect_defects_real import sentiment_score                 # noqa: E402
from taxonomy_real import induce, ngrams, _sentences            # noqa: E402
from magic_box_real import OPERATORS                            # noqa: E402
from decision_framework_real import MATERIALITY_FLOOR_PCT       # noqa: E402
from rivals_real import MIN_REVIEWS                             # noqa: E402
from research_discovery_real import _http_get_json              # noqa: E402
import category_state                                           # noqa: E402
import urllib.parse                                             # noqa: E402
import time as _time                                            # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = os.path.join(ROOT, "data", "real_raw")
OUT_DIR = os.path.join(ROOT, "data", "processed", "floor_care")

FROZEN = os.path.join(RAW, "floor_care_products_frozen.jsonl")
REVIEW_FILES = [
    os.path.join(RAW, "floor_care_reviews_hk.jsonl"),
    os.path.join(RAW, "floor_care_reviews_appliances.jsonl"),
]

REVIEWS_CLEAN = os.path.join(OUT_DIR, "reviews_clean.csv")
INDUCED_TERMS = os.path.join(OUT_DIR, "induced_terms.csv")
INDUCED_THEMES = os.path.join(OUT_DIR, "induced_themes.json")
HAND_LABEL_BLANK = os.path.join(OUT_DIR, "floor_care_hand_label_BLANK.csv")
RIVALS = os.path.join(OUT_DIR, "rivals.json")
POSSIBILITIES = os.path.join(OUT_DIR, "possibilities.json")
RESEARCH_CANDIDATES = os.path.join(OUT_DIR, "research_candidates.json")
STATE = os.path.join(OUT_DIR, "state.json")

# METHOD_CHOICE (declared, like the rating_number>=500 floor in
# freeze_floor_care_products.py): induction counts a term only if it clears
# the SAME corpus DENSITY the Air reference run declared - Air used
# min_count=8 over its 10,529-review corpus (0.076% of rows), so a flat
# absolute count on a 30x larger corpus would rank only ultra-rare
# only-in-negative phrases (lift saturates at its ceiling and the top of
# the table stops describing the category). Scaling the floor by corpus
# size is the reference method applied at this corpus's scale, not a
# result-driven tuning - the density constant is fixed here, before the
# themes are read. Top 80 terms by lift are kept.
AIR_REFERENCE_MIN_COUNT_DENSITY = 8 / 10529  # taxonomy_real.induce default over the Air corpus
INDUCE_TOP = 80


def induce_min_count(n_rows):
    return max(10, round(AIR_REFERENCE_MIN_COUNT_DENSITY * n_rows))

CSV_FIELDS = ["review_id", "product_sku", "rating", "review_title",
              "review_text", "review_date", "verified_purchase",
              "reviewer_hash", "is_duplicate_text"]

THEME_METHOD = (
    "MACHINE-INDUCED keyword classification of real Amazon.com customer review "
    "text (McAuley-Lab Amazon-Reviews-2023, real floor-care products only) - "
    "NOT a survey, panel, or academic study, and the theme labels are "
    "machine-generated (each theme is named by its own highest-lift member "
    "term, verbatim - no human naming). Terms were lift-ranked in 1-2 star "
    "reviews (same math as taxonomy_real.induce), grouped by shared token "
    "stem, and matched back with a POLARITY GATE mirroring "
    "taxonomy_real.theme_hits: a member-term hit only counts if the review's "
    "star rating is <= 3 OR the sentence containing the term scores negative "
    "under detect_defects_real.sentiment_score (negation-aware bag-of-terms "
    "polarity). Each review is assigned to at most ONE theme - the theme of "
    "its earliest gated hit - so prevalence figures are conservative lower "
    "bounds on friction prevalence, not point estimates. Statistics are "
    "computed over the corpus with exact duplicate texts counted once "
    "(is_duplicate_text rows excluded) so a copy-pasted review cannot "
    "inflate any count."
)


def utc_now():
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------- stage a --
def load_frozen_products():
    """The frozen, validated floor-care product list. The evidence floor
    used to build it (rating_number >= 500) is a declared METHOD_CHOICE of
    src/real/freeze_floor_care_products.py, not this module's."""
    by_asin = {}
    with open(FROZEN, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            if rec.get("parent_asin"):
                by_asin[rec["parent_asin"]] = rec
    return by_asin


def _norm_text(text):
    """Normalization used ONLY for exact-duplicate detection: strip <br>,
    lowercase, collapse whitespace. Same posture as build_reviews_csv.py's
    dedup (exact text match), made explicit."""
    text = re.sub(r"<br\s*/?>", " ", text or "")
    return re.sub(r"\s+", " ", text.strip().lower())


def build_clean_rows(products):
    """Normalize the streamed raw reviews against the frozen product list.
    Mirrors src/real/build_reviews_csv.py: join on parent_asin (fallback
    asin), guard against the same exported row appearing in two category
    streams via the (user_id, asin, timestamp, text) key, timestamp-ms ->
    UTC date, reviewer identity used transiently and shipped ONLY as
    sha256(user_id)[:16] per data/DATA_NOTICE.md."""
    manifest = {"source_rows_read": 0, "rows_matched_to_frozen_products": 0,
                "rows_dropped_exact_export_dup": 0, "source_files": {}}
    rows, seen_keys = [], set()
    for path in REVIEW_FILES:
        if not os.path.exists(path):
            manifest["source_files"][os.path.relpath(path, ROOT)] = {
                "exists": False, "n_lines_read": 0}
            continue
        n_lines = 0
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except ValueError:
                    # a partially-written trailing line from the live stream
                    # is not data - skipped, counted honestly
                    manifest.setdefault("rows_unparseable_partial", 0)
                    manifest["rows_unparseable_partial"] += 1
                    continue
                n_lines += 1
                asin = rec.get("parent_asin") or rec.get("asin")
                if asin not in products:
                    continue
                key = (rec.get("user_id"), asin, rec.get("timestamp"), rec.get("text"))
                if key in seen_keys:
                    manifest["rows_dropped_exact_export_dup"] += 1
                    continue
                seen_keys.add(key)
                ts_ms = rec.get("timestamp")
                if isinstance(ts_ms, (int, float)) and ts_ms > 0:
                    date_str = datetime.fromtimestamp(
                        ts_ms / 1000.0, tz=timezone.utc).strftime("%Y-%m-%d")
                else:
                    date_str = ""
                reviewer_hash = hashlib.sha256(
                    (rec.get("user_id") or "").encode()).hexdigest()[:16]
                rows.append({
                    "_sort_ts": ts_ms or 0,
                    "product_sku": asin,
                    "rating": rec.get("rating"),
                    "review_title": rec.get("title") or "",
                    "review_text": rec.get("text") or "",
                    "review_date": date_str,
                    "verified_purchase": "true" if rec.get("verified_purchase") else "false",
                    "reviewer_hash": reviewer_hash,
                })
        manifest["source_files"][os.path.relpath(path, ROOT)] = {
            "exists": True, "n_lines_read": n_lines}
        manifest["source_rows_read"] += n_lines

    # Order-stable numbering: sort by (timestamp, user_id hash), with
    # product_sku + normalized text as final tie-breaks so the ordering is
    # fully deterministic even for same-user same-millisecond rows.
    rows.sort(key=lambda r: (r["_sort_ts"], r["reviewer_hash"],
                             r["product_sku"], _norm_text(r["review_text"])))
    seen_texts = set()
    for i, r in enumerate(rows, start=1):
        r["review_id"] = "FCR-{:06d}".format(i)
        del r["_sort_ts"]
        nt = _norm_text(r["review_text"])
        r["is_duplicate_text"] = "true" if (nt and nt in seen_texts) else "false"
        if nt:
            seen_texts.add(nt)

    manifest["rows_matched_to_frozen_products"] = len(rows)
    manifest["rows_flagged_duplicate_text"] = sum(
        1 for r in rows if r["is_duplicate_text"] == "true")
    manifest["rows_clean_for_stats"] = len(rows) - manifest["rows_flagged_duplicate_text"]
    return rows, manifest


def write_reviews_csv(rows):
    with open(REVIEWS_CLEAN, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=CSV_FIELDS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def load_clean_rows():
    with open(REVIEWS_CLEAN, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def stats_corpus(rows):
    """The statistics corpus: exact duplicate texts counted once
    (METHOD_CHOICE, documented in THEME_METHOD)."""
    return [r for r in rows if r.get("is_duplicate_text") != "true"]


# ---------------------------------------------------------------- stage b --
# METHOD_CHOICE - category-independent evaluative/transactional stop-terms.
# An induced term whose tokens are ALL from this lexicon describes the
# reviewer's VERDICT ("total waste", "horrible") or the purchase transaction
# ("refund", "return window"), not a product mechanism - the polarity gate
# already captures negativity, so keeping these as "themes" would only
# rediscover the star rating. A term with at least one content token
# ("completely STOPPED", "BRUSH roll broke") survives untouched. The lexicon
# is sentiment/transaction vocabulary only - it contains no category word,
# so it cannot steer WHICH frictions emerge.
EVALUATIVE_STOP_TOKENS = {
    "horrible", "terrible", "awful", "useless", "worthless", "garbage",
    "junk", "trash", "worst", "worse", "bad", "poor", "poorly", "hate",
    "hated", "disappointed", "disappointing", "disappointment", "waste",
    "wasted", "total", "complete", "completely", "absolutely", "very",
    "really", "ever", "never", "dont", "don", "doesn", "didn", "wouldn",
    "not", "no", "buy", "bought", "purchase", "purchased", "product",
    "item", "unit", "money", "refund", "refunded", "return", "returned",
    "returning", "window", "back", "sent", "send", "avoid", "beware",
    "regret", "sorry", "unhappy", "cheap", "cheaply", "piece", "crap",
    "stay", "away", "zero", "stars", "star", "recommend", "recommended",
    "one", "this", "the", "a", "it", "is", "was", "of", "and", "to", "i",
}


# The category's own name tokens cannot name a friction either - "worst
# VACUUM ever" is a verdict about the category, not a mechanism inside it.
# These come from the category REGISTRY's include terms (its declared
# definition), not from reading results.
CATEGORY_NAME_TOKENS = {"vacuum", "vacuums", "cleaner", "cleaners", "vac",
                        "mop", "mops", "robot", "robotic", "floor", "carpet"}
EVALUATIVE_STOP_TOKENS |= {"wanted", "like", "liked", "hopes", "hope",
                           "nothing", "quality", "anything", "thing",
                           "things", "brand", "new", "work", "works",
                           "worked", "working", "get", "got", "use", "used"}


def _is_evaluative_only(term):
    toks = [w.strip(".''’!?,") .lower() for w in term.split()]
    toks = [w for w in toks if w]
    return bool(toks) and all(
        w in EVALUATIVE_STOP_TOKENS or w in CATEGORY_NAME_TOKENS for w in toks)


def compute_induced_terms(rows):
    """Auditable induction artifact. The math is taxonomy_real.induce
    (imported, not reimplemented): lift = P(term | rating<=2) / P(term | all)
    over uni/bi/tri-grams, corpus count >= induce_min_count(n), top INDUCE_TOP
    by lift. Terms made ONLY of evaluative/transactional tokens are excluded
    (EVALUATIVE_STOP_TOKENS above) - they are the verdict, not the friction;
    the exclusion count is recorded in the state ledger."""
    scored = induce(rows, min_count=induce_min_count(len(rows)), top=INDUCE_TOP * 3)
    kept = [s for s in scored if not _is_evaluative_only(s[3])]
    compute_induced_terms.n_excluded = len(scored) - len(kept)
    return kept[:INDUCE_TOP]


def write_induced_terms(scored):
    with open(INDUCED_TERMS, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["term", "n_negative", "n_total", "lift"])
        for lift, n_neg, n_all, term in scored:
            w.writerow([term, n_neg, n_all, round(lift, 4)])


# ---------------------------------------------------------------- stage c --
def _stem(word):
    """Crude deterministic suffix-stripping stem, used ONLY to decide which
    induced terms group into the same theme. Not a linguistic claim."""
    w = word.strip(".'’")
    if w.endswith("'s"):
        w = w[:-2]
    for suf in ("ings", "ing", "edly", "ed", "ies", "es", "s"):
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            return w[: -len(suf)]
    return w


def group_themes(scored):
    """Deterministic machine grouping: terms are processed in induction
    order (lift desc, then n_negative, n_total, term - exactly the sort
    taxonomy_real.induce already emits); a term joins the FIRST existing
    theme it shares a token stem with, else starts a new theme. A theme's
    id and name are its highest-lift member term, VERBATIM - a machine
    label, no human naming."""
    themes = []  # [{"theme_id", "member_terms", "_stems"}]
    for lift, n_neg, n_all, term in scored:
        stems = {_stem(tok) for tok in term.split()}
        placed = False
        for th in themes:
            if th["_stems"] & stems:
                th["member_terms"].append(term)
                th["_stems"] |= stems
                placed = True
                break
        if not placed:
            themes.append({"theme_id": term, "member_terms": [term],
                           "_stems": set(stems)})
    for th in themes:
        del th["_stems"]
    return themes


def classify_rows(rows, themes):
    """One classification pass, reused by themes/rivals/possibilities.
    Returns {review_id: theme_id or None}. POLARITY GATE (mirrors the idea
    proven necessary in taxonomy_real.theme_hits - topic mention is not
    friction presence): a member-term hit in a sentence only counts if the
    review's rating is <= 3 OR sentiment_score(sentence) < 0. A review is
    assigned to at most one theme: the theme of its earliest gated hit
    (tie-break: theme induction order)."""
    term_sets = [set(th["member_terms"]) for th in themes]
    out = {}
    for r in rows:
        try:
            rating = float(r["rating"])
        except (TypeError, ValueError):
            rating = None
        low_star = rating is not None and rating <= 3
        best = None  # (sentence_idx, theme_idx)
        for s_idx, sent in enumerate(_sentences(r["review_text"])):
            if best is not None and s_idx > best[0]:
                break
            if not (low_star or sentiment_score(sent) < 0):
                continue
            grams = ngrams(sent)
            for t_idx, terms in enumerate(term_sets):
                if terms & grams:
                    cand = (s_idx, t_idx)
                    if best is None or cand < best:
                        best = cand
        out[r["review_id"]] = themes[best[1]]["theme_id"] if best else None
    return out


def compute_theme_doc(rows, themes):
    """Pure + deterministic: same rows -> byte-identical JSON document."""
    corpus = stats_corpus(rows)
    theme_of = classify_rows(corpus, themes)
    ratings = [float(r["rating"]) for r in corpus if r["rating"] not in (None, "")]
    corpus_mean = round(sum(ratings) / len(ratings), 3) if ratings else None

    theme_stats = []
    for th in themes:
        assigned = [r for r in corpus if theme_of[r["review_id"]] == th["theme_id"]]
        th_ratings = [float(r["rating"]) for r in assigned if r["rating"] not in (None, "")]
        mean_r = round(sum(th_ratings) / len(th_ratings), 3) if th_ratings else None
        dates = sorted(r["review_date"] for r in assigned if r.get("review_date"))
        n_verified = sum(1 for r in assigned if r.get("verified_purchase") == "true")
        theme_stats.append({
            "theme_id": th["theme_id"],
            "theme_name": th["theme_id"],  # machine label: highest-lift member term, verbatim
            "label_origin": "MACHINE_GENERATED - highest-lift member term, verbatim",
            "member_terms": th["member_terms"],
            "n_reviews": len(assigned),
            "prevalence_pct": round(100.0 * len(assigned) / len(corpus), 2) if corpus else None,
            "prevalence_caveat": "Detected share - a conservative LOWER BOUND: "
                                 "the polarity-gated keyword classifier misses "
                                 "frictions phrased mildly or outside the induced terms.",
            "n_distinct_products": len({r["product_sku"] for r in assigned}),
            "mean_rating": mean_r,
            "rating_gap_vs_corpus_mean": (round(mean_r - corpus_mean, 3)
                                          if mean_r is not None and corpus_mean is not None
                                          else None),
            "pct_verified_purchase": (round(100.0 * n_verified / len(assigned), 1)
                                      if assigned else None),
            "review_date_range": [dates[0], dates[-1]] if dates else None,
            "method": THEME_METHOD,
        })

    unassigned = sum(1 for v in theme_of.values() if v is None)
    return {
        "_provenance": "MACHINE-INDUCED from the REAL Floor Care review corpus by "
                       "src/real/floor_care_pipeline.py. No prewritten themes, no "
                       "Air Purification theme reused, no human-authored labels.",
        "generated_by": "src/real/floor_care_pipeline.py",
        "n_reviews_classified": len(corpus),
        "corpus_mean_rating": corpus_mean,
        "themes": theme_stats,
        "unassigned_pct": round(100.0 * unassigned / len(corpus), 2) if corpus else None,
        "validation": {
            "status": "HUMAN_LABELS_PENDING",
            "note": "No validation numbers exist for this category. A human must "
                    "hand-label data/processed/floor_care/floor_care_hand_label_BLANK.csv "
                    "(50 stratified real reviews, hand_label column left empty by the "
                    "machine) before any precision/recall/agreement figure may be "
                    "reported. Nothing here is validated until then.",
        },
    }


def emit_hand_label_blank(rows):
    """50 stratified REAL reviews, hand_label column EMPTY - a human must
    fill it; the machine never does. Stratification quotas and seed follow
    taxonomy_real.emit_blank_sample (rating strata 1..5, seed
    config.RANDOM_STATE, pools sorted by review_id for determinism)."""
    corpus = stats_corpus(rows)
    rng = random.Random(C.RANDOM_STATE)
    by_rating = {}
    for r in corpus:
        try:
            star = int(float(r["rating"]))
        except (TypeError, ValueError):
            continue
        by_rating.setdefault(star, []).append(r)
    quota = {1: 14, 2: 12, 3: 8, 4: 8, 5: 8}
    picked = []
    for star, k in sorted(quota.items()):
        pool = sorted(by_rating.get(star, []), key=lambda r: r["review_id"])
        picked.extend(rng.sample(pool, min(k, len(pool))))
    rng.shuffle(picked)
    picked = picked[:50]
    with open(HAND_LABEL_BLANK, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["review_id", "product_sku", "rating", "review_title",
                    "review_text", "hand_label", "labeller_note"])
        for r in picked:
            w.writerow([r["review_id"], r["product_sku"], r["rating"],
                        r["review_title"], r["review_text"], "", ""])
    return len(picked)


# ---------------------------------------------------------------- stage d --
def compute_rivals_doc(rows, themes, products):
    """Per-brand theme gaps, mirroring src/real/rivals_real.py's math:
    brand = the real 'store' field, evidence floor = rivals_real.MIN_REVIEWS,
    gap = (brand theme rate - category theme rate) in percentage points.
    The themes are the machine-induced Floor Care themes - never Air's."""
    corpus = stats_corpus(rows)
    theme_of = classify_rows(corpus, themes)
    theme_ids = [th["theme_id"] for th in themes]

    brand_of = {asin: (rec.get("store") or "Unknown") for asin, rec in products.items()}
    by_brand = {}
    for r in corpus:
        by_brand.setdefault(brand_of.get(r["product_sku"], "Unknown"), []).append(r)

    n_cat = len(corpus)
    cat_counts = {tid: 0 for tid in theme_ids}
    for r in corpus:
        t = theme_of[r["review_id"]]
        if t is not None:
            cat_counts[t] += 1
    cat_rate = {tid: (cat_counts[tid] / n_cat if n_cat else 0.0) for tid in theme_ids}

    rivals = []
    for brand in sorted(by_brand):
        brand_rows = by_brand[brand]
        if len(brand_rows) < MIN_REVIEWS:
            continue
        ratings = [float(r["rating"]) for r in brand_rows if r["rating"] not in (None, "")]
        b_counts = {tid: 0 for tid in theme_ids}
        for r in brand_rows:
            t = theme_of[r["review_id"]]
            if t is not None:
                b_counts[t] += 1
        gaps = []
        for tid in theme_ids:
            b_rate = b_counts[tid] / len(brand_rows)
            gaps.append({
                "theme": tid,
                "brand_rate_pct": round(b_rate * 100, 2),
                "category_rate_pct": round(cat_rate[tid] * 100, 2),
                "delta_pp": round((b_rate - cat_rate[tid]) * 100, 2),
            })
        gaps.sort(key=lambda g: (-g["delta_pp"], g["theme"]))
        rivals.append({
            "brand": brand,
            "n_reviews": len(brand_rows),
            "n_products": len({r["product_sku"] for r in brand_rows}),
            "mean_rating": round(sum(ratings) / len(ratings), 3) if ratings else None,
            "theme_gaps": gaps,
            "biggest_weakness": gaps[0] if gaps and gaps[0]["delta_pp"] > 0 else None,
            "evidence": "src/real/floor_care_pipeline.py, n={} real reviews across "
                        "{} real products".format(
                            len(brand_rows), len({r["product_sku"] for r in brand_rows})),
        })
    rivals.sort(key=lambda r: (-r["n_reviews"], r["brand"]))
    return {
        "_provenance": "Computed from REAL Floor Care review + product-brand data "
                       "('store' field of the frozen floor-care products). Every axis "
                       "is a machine-induced Floor Care theme - no Air theme, no "
                       "invented competitive dimension.",
        "generated_by": "src/real/floor_care_pipeline.py",
        "min_reviews_floor": MIN_REVIEWS,
        "n_category_reviews": n_cat,
        "category_theme_rates_pct": {tid: round(cat_rate[tid] * 100, 2)
                                     for tid in sorted(theme_ids)},
        "rivals": rivals,
    }


# ---------------------------------------------------------------- stage e --
def load_prices(products):
    """Real listed prices from the frozen floor-care product metadata -
    same semantics as wtp_real.load_prices, over the Floor Care store."""
    prices = {}
    for asin, rec in products.items():
        p = rec.get("price")
        if p not in (None, "None", ""):
            try:
                prices[asin] = float(p)
            except (TypeError, ValueError):
                pass
    return prices


def _median(sorted_vals):
    n = len(sorted_vals)
    if not n:
        return None
    mid = n // 2
    if n % 2:
        return sorted_vals[mid]
    return (sorted_vals[mid - 1] + sorted_vals[mid]) / 2.0


def theme_economics(assigned_rows, prices):
    """Mirrors wtp_real.compute_price_exposure semantics exactly:
    price-weighted exposure = SUM of real listed prices over affected
    reviews with a known price; the median is taken over ONE price PER
    DISTINCT PRODUCT - never per distinct price value (the per-PRODUCT
    dedup rule wtp_real adopted after the Pass 2 red-team audit)."""
    affected_priced = [r for r in assigned_rows if r["product_sku"] in prices]
    product_price = {r["product_sku"]: prices[r["product_sku"]] for r in affected_priced}
    distinct_prices = sorted(product_price.values())
    median_price = _median(distinct_prices)
    return {
        "n_reviews_affected": len(assigned_rows),
        "n_affected_with_known_real_price": len(affected_priced),
        "price_weighted_exposure_usd": round(
            sum(prices[r["product_sku"]] for r in affected_priced), 2),
        "price_weighted_exposure_caveat": (
            "SUM of real observed listed prices across affected reviews with a known "
            "price. A RELATIVE exposure indicator, not a revenue or market-size "
            "estimate - no units-sold, conversion-rate, or time-period basis."),
        "median_real_price_usd": round(median_price, 2) if median_price is not None else None,
        "n_distinct_priced_products_affected": len(distinct_prices),
        "median_real_price_caveat": (
            "MEDIAN real listed price across the {} distinct real products affected "
            "by this friction that have a known price (one price PER DISTINCT "
            "PRODUCT). What products in this segment cost today - not a proposed "
            "price for a new concept, which this evidence cannot establish.".format(
                len(distinct_prices))
            if distinct_prices else
            "No real product in this friction's affected set has a known listed price."),
    }


GENERATION_METHOD = (
    "MACHINE_INDUCED_CROSS_PRODUCT — operators are authored category-independent "
    "vocabulary; themes, pairings and labels are machine-induced from the Floor "
    "Care corpus; nothing prewritten"
)


def compute_possibilities_doc(theme_doc, rows, themes, prices):
    """EXPLORATORY generation, PASS_3-compliant: the FULL cross-product of
    magic_box_real.OPERATORS (the category-independent 12-operator design
    vocabulary) x every induced theme clearing MATERIALITY_FLOOR_PCT
    (imported from decision_framework_real - never a new magic number).
    NO authored pairing table (Air's THEME_OPERATORS is not imported),
    NO authored names (Air's POSSIBILITY_NAMES is not imported)."""
    corpus = stats_corpus(rows)
    theme_of = classify_rows(corpus, themes)
    corpus_prices = sorted({prices[r["product_sku"]]
                            for r in corpus if r["product_sku"] in prices})
    corpus_median_price = _median(corpus_prices)

    possibilities = []
    for th_stats in theme_doc["themes"]:
        prev = th_stats["prevalence_pct"]
        if prev is None or prev < MATERIALITY_FLOOR_PCT:
            continue
        tid = th_stats["theme_id"]
        assigned = [r for r in corpus if theme_of[r["review_id"]] == tid]
        econ = theme_economics(assigned, prices)
        ref_price = econ["median_real_price_usd"]
        ref_basis = ("median real listed price of the distinct affected products "
                     "(per-product dedup)")
        if ref_price is None:
            ref_price = (round(corpus_median_price, 2)
                         if corpus_median_price is not None else None)
            ref_basis = ("corpus-wide median real listed price (no affected product "
                         "has a known price)")
        for op in sorted(OPERATORS):
            poss = {
                "id": "{}:{}".format(tid, op),
                "name": "{} × {}".format(op, tid),
                "machine_labelled": True,
                "operator": op,
                "operator_definition": OPERATORS[op],
                "operator_origin": "AUTHORED_VOCABULARY (METHOD_CHOICE, category-"
                                   "independent) - src/real/magic_box_real.py::OPERATORS",
                "theme_id": tid,
                "friction": {k: th_stats[k] for k in (
                    "theme_name", "member_terms", "n_reviews", "prevalence_pct",
                    "n_distinct_products", "mean_rating",
                    "rating_gap_vs_corpus_mean", "review_date_range")},
                "economics": econ,
                "engineering_envelope": {
                    "status": "UNKNOWN — no verified official floor-care product "
                              "pages exist in this pipeline; no engineering spec "
                              "can be asserted for any field.",
                    "reference_market_price_usd": ref_price,
                    "reference_market_price_basis": ref_basis,
                },
                "generation_method": GENERATION_METHOD,
                "state": "exploratory",
                "promotion": "NOT_PROMOTED — no research corpus, no trend corpus, "
                             "no feasibility evidence exists for this category yet",
            }
            if op == "CROSS_CATEGORY_TRANSFER":
                poss["donor_state"] = ("MISSING — no verified donor-category "
                                       "evidence exists in this pipeline for "
                                       "Floor Care")
            possibilities.append(poss)
    doc = {
        "_provenance": "EXPLORATORY machine generation over the REAL Floor Care "
                       "corpus. Operators are the category-independent authored "
                       "vocabulary (magic_box_real.OPERATORS); every theme, pairing "
                       "and label is machine-induced. Air's THEME_OPERATORS and "
                       "POSSIBILITY_NAMES are deliberately NOT used.",
        "generated_by": "src/real/floor_care_pipeline.py",
        "materiality_floor_pct": MATERIALITY_FLOOR_PCT,
        "materiality_floor_source": "src/real/decision_framework_real.py::MATERIALITY_FLOOR_PCT",
        "n_operators": len(OPERATORS),
        "possibilities": possibilities,
    }
    if not possibilities:
        doc["honest_note"] = (
            "EMPTY BY EVIDENCE, not by omission: no machine-induced theme reached "
            "prevalence_pct >= {}. On a corpus this size, pure lift ranking "
            "saturates at its ceiling (terms appearing ONLY in 1-2 star reviews), "
            "so the top-{} induced terms are rare exact phrases and every grouped "
            "theme's detected share stays below the materiality floor. Prevalence "
            "figures are conservative lower bounds; no possibility is fabricated "
            "to fill the gap.".format(MATERIALITY_FLOOR_PCT, INDUCE_TOP))
    return doc


# ---------------------------------------------------------------- stage f --
# Query completions keyed by the alternation branches of category_state.py's
# FLOOR_CARE research_terms regex - the queries are DERIVED from that
# registry entry, and the mapping below only completes each branch into
# valid PubMed E-utilities syntax. A mismatch between this table and the
# registry is reported honestly, never papered over.
FLOOR_RESEARCH_QUERY_COMPLETIONS = {
    "vacuum clean": '"vacuum cleaner"[Title/Abstract] AND (particle OR emission OR dust)',
    "floor clean": '"floor cleaning"[Title/Abstract] AND (hygiene OR dust OR bacteria)',
    "carpet": 'carpet[Title/Abstract] AND (dust OR allergen)',
    "dust mite remov": '"dust mite"[Title/Abstract] AND (removal OR vacuum)',
    "robotic clean": '("robot vacuum"[Title/Abstract] OR "robotic vacuum"[Title/Abstract] OR "robotic cleaning"[Title/Abstract])',
}


def run_research_discovery():
    """REAL, minimal PubMed discovery (stdlib HTTP, no API key - same
    E-utilities approach as src/real/research_discovery_real.py, whose
    _http_get_json is imported). Results are CANDIDATE records only - never
    promoted, never given evidence-card fields. A network failure is
    recorded as an honest DISCOVERY_ATTEMPT_FAILED document."""
    branches = category_state.CATEGORIES["FLOOR_CARE"]["research_terms"].pattern.split("|")
    attempted_queries, errors, candidates = [], [], []
    seen_pmids = set()

    if set(branches) != set(FLOOR_RESEARCH_QUERY_COMPLETIONS):
        return {
            "status": "DISCOVERY_ATTEMPT_FAILED",
            "error": "category_state FLOOR_CARE research_terms branches {} no longer "
                     "match this pipeline's query completions {} - update "
                     "FLOOR_RESEARCH_QUERY_COMPLETIONS.".format(
                         sorted(branches), sorted(FLOOR_RESEARCH_QUERY_COMPLETIONS)),
            "attempted_queries": [],
            "retrieved_at": utc_now(),
        }

    for branch in branches:
        term = FLOOR_RESEARCH_QUERY_COMPLETIONS[branch]
        attempted_queries.append({"registry_branch": branch, "pubmed_term": term})
        esearch = ("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?"
                   + urllib.parse.urlencode({"db": "pubmed", "term": term,
                                             "retmax": "10", "retmode": "json"}))
        data, err = _http_get_json(esearch)
        _time.sleep(0.4)
        if err:
            errors.append({"branch": branch, "step": "esearch", "error": err})
            continue
        idlist = [i for i in data.get("esearchresult", {}).get("idlist", [])
                  if i not in seen_pmids]
        if not idlist:
            continue
        esummary = ("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?"
                    + urllib.parse.urlencode({"db": "pubmed", "id": ",".join(idlist),
                                              "retmode": "json"}))
        summ, err2 = _http_get_json(esummary)
        _time.sleep(0.4)
        if err2:
            errors.append({"branch": branch, "step": "esummary", "error": err2})
            continue
        result = summ.get("result", {})
        for pmid in idlist:
            rec = result.get(pmid)
            if not rec or not rec.get("title"):
                continue
            seen_pmids.add(pmid)
            pubdate = rec.get("pubdate") or ""
            year = pubdate[:4] if pubdate[:4].isdigit() else None
            candidates.append({
                "pmid": pmid,
                "title": rec.get("title", "").rstrip("."),
                "year": int(year) if year else None,
                "journal": rec.get("fulljournalname") or rec.get("source") or None,
                "status": "CANDIDATE",
                "registry_branch": branch,
                "retrieved_at": utc_now(),
            })

    if not candidates and errors and len(errors) >= len(branches):
        return {
            "status": "DISCOVERY_ATTEMPT_FAILED",
            "error": "; ".join("{}: {}".format(e["branch"], e["error"]) for e in errors),
            "attempted_queries": attempted_queries,
            "retrieved_at": utc_now(),
        }
    return {
        "_provenance": "REAL live PubMed E-utilities discovery results. Every record "
                       "is status CANDIDATE - never promoted into any accepted "
                       "corpus, never given evidence-card fields. Queries are "
                       "derived from category_state.py's FLOOR_CARE research_terms.",
        "generated_by": "src/real/floor_care_pipeline.py",
        "status": "CANDIDATES_ONLY",
        "attempted_queries": attempted_queries,
        "errors": errors,
        "candidates": candidates,
        "retrieved_at": utc_now(),
    }


# ------------------------------------------------------------------- main --
def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    stages = {}
    counts = {}
    manifest = None

    products = load_frozen_products()
    counts["products"] = len(products)
    print("frozen floor-care products: {}".format(len(products)))

    have_source = any(os.path.exists(p) for p in REVIEW_FILES)
    if not have_source:
        reason = ("SKIPPED - no raw review source exists yet ({}); the "
                  "background streaming job has not produced it. Nothing is "
                  "zero-filled in its place.".format(
                      ", ".join(os.path.relpath(p, ROOT) for p in REVIEW_FILES)))
        for st in ("reviews_clean", "induced_terms", "induced_themes",
                   "hand_label_blank", "rivals", "possibilities"):
            stages[st] = {"status": "SKIPPED", "reason": reason}
        print(reason)
        rows = []
    else:
        rows, manifest = build_clean_rows(products)
        write_reviews_csv(rows)
        stages["reviews_clean"] = {"status": "RAN",
                                   "n_rows": len(rows),
                                   "output": os.path.relpath(REVIEWS_CLEAN, ROOT)}
        print("wrote {} ({} rows, {} flagged duplicate text)".format(
            REVIEWS_CLEAN, len(rows), manifest["rows_flagged_duplicate_text"]))

    counts["reviews"] = len(rows)
    corpus = stats_corpus(rows)

    if not corpus:
        reason = "SKIPPED - no clean reviews to induce from."
        for st in ("induced_terms", "induced_themes", "hand_label_blank",
                   "rivals", "possibilities"):
            stages.setdefault(st, {"status": "SKIPPED", "reason": reason})
        theme_doc = None
        counts["themes"] = 0
        counts["rivals"] = 0
        counts["possibilities"] = 0
        print(reason)
    else:
        scored = compute_induced_terms(corpus)
        write_induced_terms(scored)
        stages["induced_terms"] = {"status": "RAN", "n_terms": len(scored),
                                   "min_count": induce_min_count(len(corpus)), "top": INDUCE_TOP,
                                   "output": os.path.relpath(INDUCED_TERMS, ROOT)}
        print("wrote {} ({} lift-ranked terms)".format(INDUCED_TERMS, len(scored)))

        if not scored:
            reason = ("SKIPPED - induction produced no terms clearing "
                      "count >= {} (corpus too small so far).".format(induce_min_count(len(corpus))))
            for st in ("induced_themes", "rivals", "possibilities"):
                stages[st] = {"status": "SKIPPED", "reason": reason}
            theme_doc = None
            counts["themes"] = 0
            counts["rivals"] = 0
            counts["possibilities"] = 0
            print(reason)
        else:
            themes = group_themes(scored)
            theme_doc = compute_theme_doc(rows, themes)
            with open(INDUCED_THEMES, "w", encoding="utf-8") as fh:
                json.dump(theme_doc, fh, indent=2, ensure_ascii=False)
                fh.write("\n")
            counts["themes"] = len(themes)
            stages["induced_themes"] = {"status": "RAN", "n_themes": len(themes),
                                        "output": os.path.relpath(INDUCED_THEMES, ROOT)}
            print("wrote {} ({} machine-induced themes, corpus_mean={}, unassigned={}%)".format(
                INDUCED_THEMES, len(themes), theme_doc["corpus_mean_rating"],
                theme_doc["unassigned_pct"]))

            n_blank = emit_hand_label_blank(rows)
            stages["hand_label_blank"] = {
                "status": "RAN", "n_rows": n_blank,
                "output": os.path.relpath(HAND_LABEL_BLANK, ROOT),
                "note": "hand_label column EMPTY - a human must fill it"}
            print("wrote {} ({} rows, hand_label BLANK)".format(HAND_LABEL_BLANK, n_blank))

            rivals_doc = compute_rivals_doc(rows, themes, products)
            with open(RIVALS, "w", encoding="utf-8") as fh:
                json.dump(rivals_doc, fh, indent=2, ensure_ascii=False)
                fh.write("\n")
            counts["rivals"] = len(rivals_doc["rivals"])
            stages["rivals"] = {"status": "RAN", "n_rivals": len(rivals_doc["rivals"]),
                                "output": os.path.relpath(RIVALS, ROOT)}
            print("wrote {} ({} brands >= {} reviews)".format(
                RIVALS, len(rivals_doc["rivals"]), MIN_REVIEWS))

            prices = load_prices(products)
            poss_doc = compute_possibilities_doc(theme_doc, rows, themes, prices)
            with open(POSSIBILITIES, "w", encoding="utf-8") as fh:
                json.dump(poss_doc, fh, indent=2, ensure_ascii=False)
                fh.write("\n")
            counts["possibilities"] = len(poss_doc["possibilities"])
            stages["possibilities"] = {
                "status": "RAN", "n_possibilities": len(poss_doc["possibilities"]),
                "output": os.path.relpath(POSSIBILITIES, ROOT)}
            if not poss_doc["possibilities"]:
                stages["possibilities"]["note"] = poss_doc["honest_note"]
            print("wrote {} ({} exploratory possibilities, all NOT_PROMOTED)".format(
                POSSIBILITIES, len(poss_doc["possibilities"])))

    research_doc = run_research_discovery()
    with open(RESEARCH_CANDIDATES, "w", encoding="utf-8") as fh:
        json.dump(research_doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    counts["research_candidates"] = len(research_doc.get("candidates", []))
    if research_doc.get("status") == "DISCOVERY_ATTEMPT_FAILED":
        stages["research_discovery"] = {"status": "FAILED_HONESTLY",
                                        "reason": research_doc["error"][:300],
                                        "output": os.path.relpath(RESEARCH_CANDIDATES, ROOT)}
        print("research discovery FAILED (recorded honestly): {}".format(
            research_doc["error"][:120]))
    else:
        stages["research_discovery"] = {
            "status": "RAN", "n_candidates": counts["research_candidates"],
            "output": os.path.relpath(RESEARCH_CANDIDATES, ROOT)}
        print("wrote {} ({} CANDIDATE records, {} query errors)".format(
            RESEARCH_CANDIDATES, counts["research_candidates"],
            len(research_doc.get("errors", []))))

    # families that genuinely have NO Floor Care evidence stay honestly absent
    counts["trend_documents"] = 0
    counts["market_reports"] = 0
    stages["trend_corpus"] = {
        "status": "SKIPPED",
        "reason": "SKIPPED - no Floor Care trend corpus exists. Acquiring one means "
                  "running a real acquisition with this category's filters - not "
                  "relabeling Air Purification's trend documents."}
    stages["market_metrics"] = {
        "status": "SKIPPED",
        "reason": "SKIPPED - no Floor Care market source exists in "
                  "data/real_raw/market_sources. Never borrowed from Air."}

    state = {
        "_provenance": "Honest per-stage ledger for the Floor Care pipeline - what "
                       "ran, what was skipped and why, and the real counts observed.",
        "generated_by": "src/real/floor_care_pipeline.py",
        "generated_at": utc_now(),
        "stream_note": "data/real_raw/floor_care_reviews_hk.jsonl (and the appliances "
                       "file after it) are written by a background streaming job over "
                       "the raw McAuley-Lab review exports; counts reflect those files "
                       "as of generated_at, and this pipeline must be re-run after the "
                       "stream completes.",
        "counts": counts,
        "manifest": manifest,
        "stages": stages,
    }
    with open(STATE, "w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote {}".format(STATE))
    print("counts: {}".format(counts))
    return state


if __name__ == "__main__":
    main()
