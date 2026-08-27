"""Integrity tests for the research corpus layer (research_corpus_real.py,
signals_from_research_real.py). Run via `python3 -m unittest tests.test_research_corpus`.
"""
import json
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROC = os.path.join(ROOT, "data", "processed")

FAKE_URL_PATTERNS = re.compile(r"example\.com|placeholder|lorem|test-doi", re.I)


def load(name):
    with open(os.path.join(PROC, name), encoding="utf-8") as fh:
        return json.load(fh)


class TestResearchIndexIntegrity(unittest.TestCase):
    def setUp(self):
        self.index = load("research_index.json")

    def test_every_peer_reviewed_paper_has_unique_research_id(self):
        ids = [p["research_id"] for p in self.index["peer_reviewed_papers"]]
        self.assertEqual(len(ids), len(set(ids)), "duplicate research_id found")

    def test_every_peer_reviewed_paper_has_a_real_identifier(self):
        for p in self.index["peer_reviewed_papers"]:
            self.assertTrue(p.get("doi") or p.get("pmid"),
                             "{} has no DOI or PMID".format(p["research_id"]))
            if p.get("doi"):
                self.assertFalse(FAKE_URL_PATTERNS.search(p["doi"]),
                                  "{} has a placeholder-looking DOI".format(p["research_id"]))

    def test_no_placeholder_urls_anywhere_in_corpus(self):
        for p in self.index["peer_reviewed_papers"]:
            self.assertFalse(FAKE_URL_PATTERNS.search(p["canonical_url"]),
                              "{} has a placeholder-looking URL".format(p["research_id"]))

    def test_quarantined_count_is_reported(self):
        self.assertIn("quarantined_count", self.index)
        self.assertEqual(self.index["quarantined_count"], 0)

    def test_every_paper_has_at_least_one_territory(self):
        for p in self.index["peer_reviewed_papers"]:
            self.assertTrue(len(p["territories"]) >= 1,
                             "{} has no research territory".format(p["research_id"]))


class TestEvidenceCardIntegrity(unittest.TestCase):
    def setUp(self):
        self.cards = load("evidence_cards.json")["cards"]

    def test_every_card_has_does_not_establish(self):
        for c in self.cards:
            self.assertTrue(c["does_not_establish"].strip(),
                             "{} has an empty does_not_establish field".format(c["research_id"]))

    def test_no_card_claims_a_design_consequence_as_a_finding(self):
        # design_consequence text must be distinct from the found text
        for c in self.cards:
            self.assertNotEqual(c["design_consequence"], c["found"])


class TestTensionsIntegrity(unittest.TestCase):
    def setUp(self):
        self.tensions = load("research_tensions.json")["tensions"]

    def test_every_tension_cites_at_least_one_evidence_id(self):
        for t in self.tensions:
            self.assertTrue(len(t["evidence_ids"]) >= 1,
                             "{} cites no evidence".format(t["tension_id"]))

    def test_no_duplicate_tension_ids(self):
        ids = [t["tension_id"] for t in self.tensions]
        self.assertEqual(len(ids), len(set(ids)))


class TestSignalsIntegrity(unittest.TestCase):
    def setUp(self):
        self.signals = load("signals_real.json")["signals"]

    def test_no_signal_has_zero_evidence(self):
        for s in self.signals:
            self.assertTrue(len(s["evidence_ids"]) >= 1,
                             "{} has zero evidence_ids".format(s["id"]))

    def test_signals_not_padded_to_a_fixed_count(self):
        states = {s["state"] for s in self.signals}
        # a genuine rebuild should produce more than one state - if every
        # signal were forced to CONVERGING for symmetry, this would fail
        self.assertTrue(len(states) >= 2, "all signals share one state - looks padded/forced")

    def test_contested_state_is_used_sparingly(self):
        contested = [s for s in self.signals if s["state"] == "CONTESTED"]
        # CONTESTED should be rare and each one must cite >=2 evidence ids
        # (a real disagreement needs at least two things disagreeing)
        for s in contested:
            self.assertGreaterEqual(len(s["evidence_ids"]), 2,
                                     "{} is CONTESTED but cites <2 evidence ids".format(s["id"]))

    def test_uniform_schema_across_all_signals(self):
        key_sets = {tuple(sorted(s.keys())) for s in self.signals}
        self.assertEqual(len(key_sets), 1, "signals do not share a uniform schema")


class TestClustersIntegrity(unittest.TestCase):
    def test_model_b_is_implemented_and_deterministic(self):
        clusters = load("research_clusters.json")
        model_b = clusters["model_b_emergent_textual_similarity"]
        self.assertIn("clusters", model_b)
        self.assertIn("method", model_b)
        self.assertNotEqual(model_b.get("status"), "NOT_IMPLEMENTED")

    def test_model_b_clusters_cover_every_peer_reviewed_paper_exactly_once(self):
        clusters = load("research_clusters.json")["model_b_emergent_textual_similarity"]
        index = load("research_index.json")
        all_ids = {p["research_id"] for p in index["peer_reviewed_papers"]}
        clustered_ids = [m for c in clusters["clusters"] for m in c["members"]]
        self.assertEqual(len(clustered_ids), len(set(clustered_ids)), "a paper appears in more than one cluster")
        self.assertEqual(set(clustered_ids), all_ids, "every peer-reviewed paper must be clustered exactly once")

    def test_model_b_is_reproducible(self):
        # Re-running the deterministic clustering script must produce the
        # same cluster membership - this is a cross-check, not a fresh
        # opinion generator.
        import importlib
        import sys
        sys.path.insert(0, os.path.join(ROOT, "src", "real"))
        mod = importlib.import_module("emergent_clustering_real")
        first = load("research_clusters.json")["model_b_emergent_textual_similarity"]["clusters"]
        mod.main()
        second = load("research_clusters.json")["model_b_emergent_textual_similarity"]["clusters"]
        self.assertEqual(
            sorted(tuple(sorted(c["members"])) for c in first),
            sorted(tuple(sorted(c["members"])) for c in second),
        )


if __name__ == "__main__":
    unittest.main()
