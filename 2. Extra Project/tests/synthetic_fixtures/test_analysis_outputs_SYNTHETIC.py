"""Integrity tests for the Q2-Q6 analytical outputs (data/processed/*.json).
Run after src/run_analysis.py (or via run_pipeline.sh, which always runs both).
"""
import json
import os
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROC = os.path.join(ROOT, "data", "processed")


def load(name):
    with open(os.path.join(PROC, name), encoding="utf-8") as fh:
        return json.load(fh)


class TestDefectDetection(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = load("defect_detection_report.json")

    def test_all_three_defects_detected_at_high_recall(self):
        for key in ("a_burst_duplicate", "b_sentiment_rating_conflict", "c_malformed_date"):
            sc = self.doc["defects"][key]["scoring"]
            self.assertGreaterEqual(sc["precision"], 0.95, key)
            self.assertGreaterEqual(sc["recall"], 0.95, key)

    def test_before_after_shows_hero_sku_inflation(self):
        before = self.doc["headline_metrics"]["before"]["mean_rating_hero_sku"]
        after = self.doc["headline_metrics"]["after"]["mean_rating_hero_sku"]
        self.assertGreater(before, after, "burst should inflate the hero SKU's rating")
        self.assertGreater(before - after, 0.3)


class TestTaxonomy(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = load("taxonomy_themes.json")

    def test_six_themes_present(self):
        self.assertEqual(len(self.doc["themes"]), 6)

    def test_every_theme_is_a_real_friction(self):
        # A friction theme must depress satisfaction, by construction of the
        # polarity gate - a positive CSAT impact would mean the classifier is
        # scoring topic mentions rather than complaints.
        for tid, st in self.doc["themes"].items():
            self.assertLess(st["csat_impact"], 0, tid)

    def test_hand_label_validation_ran(self):
        v = self.doc["validation"]
        self.assertEqual(v["n_labelled"], 50)
        self.assertGreaterEqual(v["raw_agreement_pct"], 75.0)


class TestWTP(unittest.TestCase):
    def test_filter_cost_is_the_only_directly_ranked_friction(self):
        doc = load("wtp_proxy.json")
        direct = [r for r in doc["friction_ranking_by_wtp_evidence"] if r["wtp_signal"].startswith("DIRECT")]
        self.assertEqual(len(direct), 1)
        self.assertEqual(direct[0]["friction"], "filter_cost")


class TestDecisionFramework(unittest.TestCase):
    def test_recommendation_and_two_kills(self):
        doc = load("decision_framework.json")
        v = doc["verdict"]
        self.assertEqual(v["recommended"], "OS-1")
        self.assertEqual({k["id"] for k in v["killed"]}, {"OS-2", "OS-3"})

    def test_kills_have_zero_corpus_evidence(self):
        doc = load("decision_framework.json")
        self.assertEqual(doc["scores"]["OS-2"]["friction_prevalence_pct"], 0.0)
        self.assertEqual(doc["scores"]["OS-3"]["friction_prevalence_pct"], 0.0)


class TestEvidenceTable(unittest.TestCase):
    def test_every_insight_pack_number_traces_to_evidence_table(self):
        import csv
        import re
        pack = open(os.path.join(ROOT, "deliverables", "insight_pack.md"), encoding="utf-8").read()
        with open(os.path.join(ROOT, "deliverables", "evidence_table.csv"), encoding="utf-8") as fh:
            table_values = {row["value_as_cited"] for row in csv.DictReader(fh)}
        # Every distinct figure with >=2 significant digits appearing in the pack
        # must appear verbatim as a cited value somewhere in the evidence table.
        candidates = set(re.findall(r"-?\d+\.\d+%?|\€?\d[\d,]*\.\d+m?", pack))
        untraced = []
        for c in candidates:
            if not any(c.strip("€%") in v for v in table_values):
                untraced.append(c)
        self.assertEqual(untraced, [], "numbers in insight_pack.md with no evidence_table.csv row: {}".format(untraced))


if __name__ == "__main__":
    unittest.main(verbosity=2)
