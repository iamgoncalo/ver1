"""PASS_3 Floor Care generalization - honest-separation and determinism tests.

Data-dependent tests SKIP with a clear reason while the background review
stream has not yet produced data/processed/floor_care/reviews_clean.csv -
the suite must pass before the stream lands. Synthetic rows exist ONLY here
(FIXTURE_*), are clearly labelled, and are never written under data/.
"""
import csv
import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(HERE, "src"))
sys.path.insert(0, os.path.join(HERE, "src", "real"))

import floor_care_pipeline as fcp  # noqa: E402
from category_state import compute_category_state, CATEGORIES  # noqa: E402

FLOOR_DIR = os.path.join(HERE, "data", "processed", "floor_care")
REVIEWS_CLEAN = os.path.join(FLOOR_DIR, "reviews_clean.csv")
INDUCED_THEMES = os.path.join(FLOOR_DIR, "induced_themes.json")
POSSIBILITIES = os.path.join(FLOOR_DIR, "possibilities.json")
STATE = os.path.join(FLOOR_DIR, "state.json")
FLOOR_FROZEN = os.path.join(HERE, "data", "real_raw", "floor_care_products_frozen.jsonl")
AIR_FROZEN = os.path.join(HERE, "data", "real_raw", "purifier_products_frozen.jsonl")
AIR_REVIEWS = os.path.join(HERE, "data", "raw", "consumer_reviews.csv")

AIR_THEME_IDS = {"reliability", "noise", "value_effectiveness",
                 "customer_service", "filter_cost", "ozone_odor_safety"}

SKIP_NO_CLEAN = ("data/processed/floor_care/reviews_clean.csv does not exist yet - "
                 "the background review stream has not landed / the pipeline has "
                 "not been run. Run python3 src/real/floor_care_pipeline.py after "
                 "the stream completes.")

# Synthetic fixture rows - TEST-ONLY, never written to data/. Text content is
# generic filler for exercising the deterministic machinery, not domain claims.
FIXTURE_ROWS = [
    {"review_id": "FCR-000001", "product_sku": "TESTASIN01", "rating": 1.0,
     "review_title": "t", "review_text": "It stopped working after two days. Terrible.",
     "review_date": "2022-01-01", "verified_purchase": "true",
     "reviewer_hash": "aa", "is_duplicate_text": "false"},
    {"review_id": "FCR-000002", "product_sku": "TESTASIN02", "rating": 2.0,
     "review_title": "t", "review_text": "Stopped working, total waste of money.",
     "review_date": "2022-02-01", "verified_purchase": "false",
     "reviewer_hash": "bb", "is_duplicate_text": "false"},
    {"review_id": "FCR-000003", "product_sku": "TESTASIN01", "rating": 5.0,
     "review_title": "t", "review_text": "Great product, works perfectly.",
     "review_date": "2022-03-01", "verified_purchase": "true",
     "reviewer_hash": "cc", "is_duplicate_text": "false"},
    {"review_id": "FCR-000004", "product_sku": "TESTASIN03", "rating": 4.0,
     "review_title": "t", "review_text": "Good overall. Battery could last longer.",
     "review_date": "2022-04-01", "verified_purchase": "true",
     "reviewer_hash": "dd", "is_duplicate_text": "false"},
    {"review_id": "FCR-000005", "product_sku": "TESTASIN02", "rating": 1.0,
     "review_title": "t", "review_text": "Stopped working, total waste of money.",
     "review_date": "2022-05-01", "verified_purchase": "true",
     "reviewer_hash": "ee", "is_duplicate_text": "true"},
]
FIXTURE_THEMES = [{"theme_id": "stopped working",
                   "member_terms": ["stopped working", "waste money"]}]


def _load_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _frozen_asins(path):
    asins = set()
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                asins.add(json.loads(line).get("parent_asin"))
    return asins


class TestCorpusSeparation(unittest.TestCase):
    def test_product_asin_overlap_between_frozen_stores(self):
        floor = _frozen_asins(FLOOR_FROZEN)
        air = _frozen_asins(AIR_FROZEN)
        overlap = sorted(floor & air)
        self.assertEqual(overlap, [],
                         "parent_asins present in BOTH frozen stores: {}".format(overlap))

    def test_review_id_namespaces_disjoint(self):
        if not os.path.exists(REVIEWS_CLEAN):
            self.skipTest(SKIP_NO_CLEAN)
        with open(REVIEWS_CLEAN, newline="", encoding="utf-8") as fh:
            floor_ids = [r["review_id"] for r in csv.DictReader(fh)]
        self.assertTrue(floor_ids, "reviews_clean.csv has no rows")
        self.assertTrue(all(i.startswith("FCR-") for i in floor_ids),
                        "floor care review ids must live in the FCR- namespace")
        if os.path.exists(AIR_REVIEWS):
            with open(AIR_REVIEWS, newline="", encoding="utf-8") as fh:
                air_ids = {r["review_id"] for r in csv.DictReader(fh)}
            self.assertEqual(air_ids & set(floor_ids), set())
            self.assertTrue(all(i.startswith("CR-") for i in air_ids))


class TestNoAirLeakage(unittest.TestCase):
    def test_induced_theme_ids_contain_no_air_theme_id(self):
        if not os.path.exists(INDUCED_THEMES):
            self.skipTest(SKIP_NO_CLEAN)
        doc = _load_json(INDUCED_THEMES)
        ids = {t["theme_id"] for t in doc["themes"]}
        self.assertEqual(ids & AIR_THEME_IDS, set(),
                         "Air theme ids leaked into Floor Care induced themes")

    def test_possibilities_contain_no_air_purifier_strings(self):
        if not os.path.exists(POSSIBILITIES):
            self.skipTest(SKIP_NO_CLEAN)
        doc = _load_json(POSSIBILITIES)
        from magic_box_real import POSSIBILITY_NAMES
        air_names = set(POSSIBILITY_NAMES.values())
        for p in doc["possibilities"]:
            self.assertNotIn("Air Purifier", json.dumps(p),
                             "Air Purifier string in possibility {}".format(p["id"]))
            self.assertNotIn(p["name"], air_names,
                             "Air-authored possibility name reused: {}".format(p["name"]))


class TestPerProductMedianSemantics(unittest.TestCase):
    def test_median_is_per_distinct_product_not_per_distinct_price(self):
        # FIXTURE: two distinct products share the SAME price - per-product
        # dedup must keep both values; per-value dedup would drop one and
        # shift the median (the exact Pass 2 red-team defect wtp_real fixed).
        fixture_prices = {"TESTASIN01": 100.0, "TESTASIN02": 100.0, "TESTASIN03": 300.0}
        rows = [r for r in FIXTURE_ROWS if r["is_duplicate_text"] == "false"
                and r["product_sku"] in fixture_prices]
        econ = fcp.theme_economics(rows, fixture_prices)
        self.assertEqual(econ["median_real_price_usd"], 100.0)  # [100,100,300] -> 100
        self.assertEqual(econ["n_distinct_priced_products_affected"], 3)

    def test_one_real_theme_median_recomputed_by_hand(self):
        if not (os.path.exists(POSSIBILITIES) and os.path.exists(REVIEWS_CLEAN)
                and os.path.exists(INDUCED_THEMES)):
            self.skipTest(SKIP_NO_CLEAN)
        doc = _load_json(POSSIBILITIES)
        if not doc["possibilities"]:
            self.skipTest("no possibility cleared the materiality floor on the current "
                          "corpus - no real median to recompute (honest absence)")
        poss = doc["possibilities"][0]
        tid = poss["theme_id"]
        themes_doc = _load_json(INDUCED_THEMES)
        themes = [{"theme_id": t["theme_id"], "member_terms": t["member_terms"]}
                  for t in themes_doc["themes"]]
        rows = fcp.stats_corpus(fcp.load_clean_rows())
        theme_of = fcp.classify_rows(rows, themes)
        products = fcp.load_frozen_products()
        prices = fcp.load_prices(products)
        by_product = {}
        for r in rows:
            if theme_of[r["review_id"]] == tid and r["product_sku"] in prices:
                by_product[r["product_sku"]] = prices[r["product_sku"]]
        vals = sorted(by_product.values())
        hand = fcp._median(vals)
        self.assertEqual(round(hand, 2) if hand is not None else None,
                         poss["economics"]["median_real_price_usd"])


class TestDeterminism(unittest.TestCase):
    def test_theme_stats_stage_is_deterministic_on_fixture(self):
        a = fcp.compute_theme_doc(FIXTURE_ROWS, FIXTURE_THEMES)
        b = fcp.compute_theme_doc(FIXTURE_ROWS, FIXTURE_THEMES)
        self.assertEqual(json.dumps(a, sort_keys=True), json.dumps(b, sort_keys=True))
        # and it actually classifies: two low-star fixture rows carry the term
        th = a["themes"][0]
        self.assertEqual(th["n_reviews"], 2)  # dup-flagged row excluded from stats
        self.assertEqual(th["theme_id"], "stopped working")

    def test_theme_stats_stage_is_deterministic_on_real_rows(self):
        if not os.path.exists(REVIEWS_CLEAN) or not os.path.exists(INDUCED_THEMES):
            self.skipTest(SKIP_NO_CLEAN)
        rows = fcp.load_clean_rows()[:2000]  # bounded slice for runtime
        themes_doc = _load_json(INDUCED_THEMES)
        themes = [{"theme_id": t["theme_id"], "member_terms": t["member_terms"]}
                  for t in themes_doc["themes"]]
        a = fcp.compute_theme_doc(rows, themes)
        b = fcp.compute_theme_doc(rows, themes)
        self.assertEqual(json.dumps(a, sort_keys=True), json.dumps(b, sort_keys=True))


class TestHonestAbsence(unittest.TestCase):
    def test_state_marks_trend_and_market_missing(self):
        if not os.path.exists(STATE):
            self.skipTest(SKIP_NO_CLEAN)
        state = _load_json(STATE)
        self.assertEqual(state["counts"]["trend_documents"], 0)
        self.assertEqual(state["counts"]["market_reports"], 0)
        self.assertEqual(state["stages"]["trend_corpus"]["status"], "SKIPPED")
        self.assertEqual(state["stages"]["market_metrics"]["status"], "SKIPPED")

    def test_validation_is_human_labels_pending(self):
        if not os.path.exists(INDUCED_THEMES):
            self.skipTest(SKIP_NO_CLEAN)
        doc = _load_json(INDUCED_THEMES)
        self.assertEqual(doc["validation"]["status"], "HUMAN_LABELS_PENDING")

    def test_hand_label_blank_is_actually_blank(self):
        blank = os.path.join(FLOOR_DIR, "floor_care_hand_label_BLANK.csv")
        if not os.path.exists(blank):
            self.skipTest(SKIP_NO_CLEAN)
        with open(blank, newline="", encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        self.assertTrue(rows)
        self.assertTrue(all(r["hand_label"] == "" for r in rows),
                        "the machine must never fill hand_label")

    def test_possibilities_all_not_promoted_and_machine_labelled(self):
        if not os.path.exists(POSSIBILITIES):
            self.skipTest(SKIP_NO_CLEAN)
        doc = _load_json(POSSIBILITIES)
        for p in doc["possibilities"]:
            self.assertTrue(p["promotion"].startswith("NOT_PROMOTED"))
            self.assertEqual(p["state"], "exploratory")
            self.assertTrue(p["machine_labelled"])
            self.assertEqual(p["engineering_envelope"]["status"][:7], "UNKNOWN")
            if p["operator"] == "CROSS_CATEGORY_TRANSFER":
                self.assertTrue(p["donor_state"].startswith("MISSING"))

    def test_research_candidates_never_promoted(self):
        path = os.path.join(FLOOR_DIR, "research_candidates.json")
        if not os.path.exists(path):
            self.skipTest("research_candidates.json not written yet - pipeline not run")
        doc = _load_json(path)
        if doc.get("status") == "DISCOVERY_ATTEMPT_FAILED":
            self.assertIn("error", doc)  # honest failure record is valid
            return
        for c in doc["candidates"]:
            self.assertEqual(c["status"], "CANDIDATE")
            for forbidden in ("evidence_card", "accepted", "promoted"):
                self.assertNotIn(forbidden, c)


class TestCategoryStateSeparation(unittest.TestCase):
    def test_air_numbers_untouched_by_floor_store_wiring(self):
        """Air must still be computed the legacy way: recompute its product
        count independently from products_real.json with the registry's own
        filters and compare."""
        air = compute_category_state("AIR_PURIFICATION")
        products = _load_json(os.path.join(HERE, "data", "processed", "products_real.json"))
        cat = CATEGORIES["AIR_PURIFICATION"]
        expected = sum(1 for p in products["products"]
                       if cat["include"].search(p.get("name") or "")
                       and not cat["exclude"].search(p.get("name") or ""))
        self.assertEqual(air["families"]["products"]["count"], expected)
        self.assertNotIn("stores", cat, "AIR must stay on the legacy eligibility path")

    def test_floor_counts_come_from_floor_stores(self):
        floor = compute_category_state("FLOOR_CARE")
        n_frozen = len(_frozen_asins(FLOOR_FROZEN))
        self.assertEqual(floor["families"]["products"]["count"], n_frozen)
        air = compute_category_state("AIR_PURIFICATION")
        self.assertNotEqual(floor["families"]["products"]["count"],
                            air["families"]["products"]["count"])
        if os.path.exists(REVIEWS_CLEAN):
            with open(REVIEWS_CLEAN, newline="", encoding="utf-8") as fh:
                n_reviews = sum(1 for _ in csv.DictReader(fh))
            self.assertEqual(floor["families"]["reviews"]["count"], n_reviews)
            self.assertNotEqual(floor["families"]["reviews"]["count"],
                                air["families"]["reviews"]["count"])
        else:
            self.assertEqual(floor["families"]["reviews"]["count"], 0)

    def test_floor_readiness_never_above_evidence(self):
        floor = compute_category_state("FLOOR_CARE")
        self.assertFalse(floor["machine_runnable"],
                         "floor care cannot be runnable with zero trend/market evidence")
        self.assertIn(floor["families"]["research"]["state"],
                      ("INSUFFICIENT", "CANDIDATE_ONLY"))
        self.assertNotEqual(floor["stage_readiness"]["radar"], "SUFFICIENT")
        self.assertNotEqual(floor["stage_readiness"]["innovations"], "SUFFICIENT")


if __name__ == "__main__":
    unittest.main()
