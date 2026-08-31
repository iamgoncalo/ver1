"""Category eligibility - a REAL computation input, not a frontend label.

For each registered category, run the SAME eligibility filters over the
SAME real evidence stores and report what genuinely exists. A category with
no eligible evidence gets an honest INSUFFICIENT state - never Air data
wearing a different label, never authored placeholder results.

Registry entries define only the FILTER (keyword rules over real titles/
text), never any output value.
"""
import csv
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")
RAW = os.path.join(ROOT, "data", "raw")

CATEGORIES = {
    "AIR_PURIFICATION": {
        "label": "Air purification",
        "include": re.compile(r"air\s*purif|purifier|hepa|air\s*clean", re.I),
        "exclude": re.compile(r"vacuum|mop|floor|carpet", re.I),
        "research_terms": re.compile(r"air (purif|filtr|clean)|hepa|particulate|pm2\.?5|aerosol|indoor air", re.I),
    },
    "FLOOR_CARE": {
        "label": "Floor care",
        "include": re.compile(r"vacuum|mop|floor\s*(care|clean)|carpet clean|robot.?vac|sweep", re.I),
        "exclude": re.compile(r"air\s*purif|hepa\s*air", re.I),
        "research_terms": re.compile(r"vacuum clean|floor clean|carpet|dust mite remov|robotic clean", re.I),
        # REAL per-category evidence stores (PASS_3): Floor Care now has its
        # own frozen product list and derived outputs, so its counts come
        # from THOSE files - never from Air's stores wearing a filter.
        # Eligibility for the frozen store was applied at freeze time by
        # src/real/freeze_floor_care_products.py (declared METHOD_CHOICE:
        # keyword classification + rating_number >= 500 evidence floor).
        # Families with no real Floor Care evidence (trend documents, market
        # reports) have NO store entry and honestly report 0.
        "stores": {
            "products_frozen": os.path.join(ROOT, "data", "real_raw", "floor_care_products_frozen.jsonl"),
            "reviews_clean": os.path.join(PROC, "floor_care", "reviews_clean.csv"),
            "themes": os.path.join(PROC, "floor_care", "induced_themes.json"),
            "rivals": os.path.join(PROC, "floor_care", "rivals.json"),
            "research_candidates": os.path.join(PROC, "floor_care", "research_candidates.json"),
        },
    },
}


_REVIEW_COUNT_CACHE = {}


def _load_json(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        return None


def _sufficiency(n, minimum):
    if n == 0:
        return "INSUFFICIENT"
    if n < minimum:
        return "PARTIAL"
    return "SUFFICIENT"


def _stage_state(families, *fams):
    states = [families[f]["state"] for f in fams]
    if all(s == "SUFFICIENT" for s in states):
        return "SUFFICIENT"
    if all(s == "INSUFFICIENT" for s in states):
        return "INSUFFICIENT"
    return "PARTIAL"


def _stages_and_verdict(families):
    stages = {
        "product_universe": _stage_state(families, "products"),
        "radar": _stage_state(families, "reviews", "research", "trend_documents",
                              "competitors", "market_reports"),
        "paths_field": _stage_state(families, "research", "reviews"),
        "magic_box": _stage_state(families, "reviews", "research"),
        "innovations": _stage_state(families, "reviews", "market_reports"),
    }
    return stages, all(s == "SUFFICIENT" for s in stages.values())


def _compute_from_stores(category_id, cat):
    """PASS_3 path: a category with its OWN real evidence stores reports the
    counts of THOSE files. Nothing is filtered out of another category's
    store, nothing is zero-filled - a missing file is an honest 0, and
    research candidates are counted but can never make the research family
    SUFFICIENT (state CANDIDATE_ONLY: candidates are not an accepted,
    reproducible corpus)."""
    stores = cat["stores"]

    n_products = 0
    try:
        with open(stores["products_frozen"], encoding="utf-8") as fh:
            n_products = sum(1 for line in fh if line.strip())
    except FileNotFoundError:
        pass

    n_reviews = 0
    reviews_bundled = True
    try:
        # The clean corpus is 160MB / ~384k rows - counting it on every
        # request is real work for a number that only changes when the file
        # does, so the count is cached against the file's (mtime, size).
        st = os.stat(stores["reviews_clean"])
        cache_key = (stores["reviews_clean"], st.st_mtime_ns, st.st_size)
        if _REVIEW_COUNT_CACHE.get("key") == cache_key:
            n_reviews = _REVIEW_COUNT_CACHE["count"]
        else:
            with open(stores["reviews_clean"], newline="", encoding="utf-8") as fh:
                n_reviews = sum(1 for _ in csv.DictReader(fh))
            _REVIEW_COUNT_CACHE["key"] = cache_key
            _REVIEW_COUNT_CACHE["count"] = n_reviews
    except FileNotFoundError:
        # The clean review corpus (160MB) is too large to bundle in the
        # repository (see data/DATA_NOTICE.md - the stream scripts are the
        # primary acquisition route). A fresh clone reports the RECORDED
        # count from the run ledger, explicitly flagged as not bundled -
        # never a silent zero and never a fabricated store.
        reviews_bundled = False
        state_doc = _load_json(os.path.join(PROC, "floor_care", "state.json")) or {}
        n_reviews = (state_doc.get("counts") or {}).get("reviews", 0)

    rivals = _load_json(stores["rivals"]) or {"rivals": []}
    n_rivals = len(rivals.get("rivals", []))

    research = _load_json(stores["research_candidates"]) or {}
    candidates = research.get("candidates", []) or []
    n_candidates = len(candidates)

    families = {
        "products": {"count": n_products, "state": _sufficiency(n_products, 50)},
        "reviews": dict({"count": n_reviews, "state": _sufficiency(n_reviews, 1000)},
                         **({} if reviews_bundled else {
                             "store_bundled": False,
                             "note": "Count from the recorded run ledger (state.json); the 160MB clean "
                                     "corpus is not bundled - refetch via the documented stream scripts."})),
        # CANDIDATE_ONLY: real discovered candidates exist, but no accepted,
        # human-promoted research corpus does - never reported SUFFICIENT.
        "research": {"count": n_candidates,
                     "state": "CANDIDATE_ONLY" if n_candidates else "INSUFFICIENT"},
        "trend_documents": {"count": 0, "state": "INSUFFICIENT"},
        "competitors": {"count": n_rivals, "state": _sufficiency(n_rivals, 10)},
        "market_reports": {"count": 0, "state": "INSUFFICIENT"},
    }
    stages, runnable = _stages_and_verdict(families)
    return {
        "_provenance": "Computed live by src/real/category_state.py from this "
                       "category's OWN real evidence stores (see the registry's "
                       "'stores' entry) - never another category's data relabeled. "
                       "Families with no real store honestly report 0; research "
                       "counts are discovery CANDIDATES only (CANDIDATE_ONLY), "
                       "never an accepted corpus.",
        "category": category_id,
        "label": cat["label"],
        "families": families,
        "stage_readiness": stages,
        "machine_runnable": runnable,
        "honest_note": ("Every stage of the machine currently has sufficient eligible evidence "
                        "for this category." if runnable else
                        "The machine cannot honestly run for this category yet: real product "
                        "and review evidence exists, but the research corpus is candidates-"
                        "only and no trend or market evidence has been acquired. Acquiring "
                        "it means real acquisition runs with this category's filters - not "
                        "relabeling another category's data."),
        "registered_categories": sorted(CATEGORIES),
    }


def compute_category_state(category_id):
    if category_id not in CATEGORIES:
        raise ValueError("unknown category {!r} - registered: {}".format(
            category_id, sorted(CATEGORIES)))
    cat = CATEGORIES[category_id]
    if "stores" in cat:
        return _compute_from_stores(category_id, cat)
    inc, exc = cat["include"], cat["exclude"]

    def eligible(text):
        text = text or ""
        return bool(inc.search(text)) and not exc.search(text)

    products = _load_json(os.path.join(PROC, "products_real.json")) or {"products": []}
    eligible_products = [p for p in products["products"] if eligible(p.get("name"))]
    eligible_skus = {p["id"] for p in eligible_products}

    n_reviews = 0
    try:
        with open(os.path.join(PROC, "reviews_clean_real.csv"), newline="", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                if r["product_sku"] in eligible_skus:
                    n_reviews += 1
    except FileNotFoundError:
        pass

    research = _load_json(os.path.join(PROC, "research_index.json")) or {}
    papers = research.get("peer_reviewed_papers", [])
    rterms = cat["research_terms"]
    eligible_papers = [p for p in papers
                       if rterms.search((p.get("title") or "") + " " + (p.get("found") or ""))]

    # market evidence is category-LINKED: each real market source counts only
    # if its own recorded scope/name matches this category's terms
    market = _load_json(os.path.join(RAW, "market_metrics.json")) or {}
    n_market = 0
    for s in (market.get("sources") or []):
        blob = " ".join(str(s.get(k, "")) for k in ("name", "scope", "metric", "notes", "title"))
        if cat["research_terms"].search(blob) or inc.search(blob):
            n_market += 1

    trends = _load_json(os.path.join(RAW, "trend_corpus.json")) or {"articles": []}
    eligible_trends = [a for a in trends["articles"]
                       if rterms.search((a.get("title") or "") + " " + (a.get("scope_note") or ""))]

    rivals = _load_json(os.path.join(PROC, "rivals_real.json")) or {"rivals": []}
    # rivals are category-filtered for real: a rival counts only if its brand
    # actually appears among this category's eligible products
    eligible_brands = { (p.get("brand") or "").strip().lower()
                        for p in eligible_products if p.get("brand") }
    n_rivals = sum(1 for r in rivals["rivals"]
                   if (r.get("brand") or r.get("name") or "").strip().lower() in eligible_brands)

    families = {
        "products": {"count": len(eligible_products), "state": _sufficiency(len(eligible_products), 50)},
        "reviews": {"count": n_reviews, "state": _sufficiency(n_reviews, 1000)},
        "research": {"count": len(eligible_papers), "state": _sufficiency(len(eligible_papers), 5)},
        "trend_documents": {"count": len(eligible_trends), "state": _sufficiency(len(eligible_trends), 5)},
        "competitors": {"count": n_rivals, "state": _sufficiency(n_rivals, 10)},
        "market_reports": {"count": n_market, "state": _sufficiency(n_market, 2)},
    }
    def stage_state(*fams):
        states = [families[f]["state"] for f in fams]
        if all(s == "SUFFICIENT" for s in states):
            return "SUFFICIENT"
        if all(s == "INSUFFICIENT" for s in states):
            return "INSUFFICIENT"
        return "PARTIAL"

    stages = {
        "product_universe": stage_state("products"),
        "radar": stage_state("reviews", "research", "trend_documents", "competitors", "market_reports"),
        "paths_field": stage_state("research", "reviews"),
        "magic_box": stage_state("reviews", "research"),
        "innovations": stage_state("reviews", "market_reports"),
    }
    runnable = all(s == "SUFFICIENT" for s in stages.values())
    return {
        "_provenance": "Computed live by src/real/category_state.py - the same keyword-"
                       "eligibility filters over the same real evidence stores for every "
                       "registered category. Nothing here is authored per category.",
        "category": category_id,
        "label": cat["label"],
        "families": families,
        "stage_readiness": stages,
        "machine_runnable": runnable,
        "honest_note": ("Every stage of the machine currently has sufficient eligible evidence "
                        "for this category." if runnable else
                        "The machine cannot honestly run for this category yet: the frozen "
                        "evidence base contains too little eligible material. Acquiring it "
                        "means re-running the acquisition pipeline with this category's "
                        "filters (network, hours) - not relabeling another category's data."),
        "registered_categories": sorted(CATEGORIES),
    }


if __name__ == "__main__":
    for cid in CATEGORIES:
        s = compute_category_state(cid)
        print(cid, {k: v["count"] for k, v in s["families"].items()}, "runnable:", s["machine_runnable"])
