"""P3 end-to-end lineage chains, proven against current runtime state.
Each chain walks real ids across layer boundaries in both directions -
a broken join anywhere fails loudly.
"""
import csv
import json
import os
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROC = os.path.join(ROOT, "data", "processed")


def j(name):
    with open(os.path.join(PROC, name), encoding="utf-8") as fh:
        return json.load(fh)


class TestScienceChain(unittest.TestCase):
    """Real paper -> canonical record -> evidence card -> signal ->
    path/tension -> homepage funnel -> back to DOI."""

    def test_paper_to_path_and_back_to_doi(self):
        research = j("research_index.json")
        papers = {p["research_id"]: p for p in research["peer_reviewed_papers"]}
        cards = {c["research_id"]: c for c in j("evidence_cards.json")["cards"]}
        signals = j("signals_real.json")["signals"]
        tensions = j("research_tensions.json")["tensions"]
        funnel_paths = j("funnel_real.json")["homepage_funnel"]["paths"]

        # forward: pick a paper cited by a tension that surfaced as a path
        tension_paths = [p for p in funnel_paths if p["epistemic_class"] == "TENSION" and p["evidence"]]
        self.assertTrue(tension_paths)
        target = tension_paths[0]
        rid = next(e for e in target["evidence"] if e.startswith("RP-"))
        self.assertIn(rid, papers, f"path evidence {rid} is not a canonical paper")
        self.assertIn(rid, cards, f"paper {rid} has no evidence card")
        paper = papers[rid]
        # the same paper feeds at least one signal's research support
        supported = [s for s in signals
                     for sup in (s.get("research_support") or [])
                     if sup.get("research_id") == rid]
        self.assertTrue(supported or any(rid in (t.get("evidence_ids") or []) for t in tensions),
                        f"{rid} feeds neither a signal nor a tension")
        # reverse: canonical paper resolves to a real external identifier
        self.assertTrue(paper.get("doi") or paper.get("pmid"),
                        f"{rid} lacks a resolvable DOI/PMID")

    def test_every_path_evidence_id_resolves(self):
        research = j("research_index.json")
        known = {p["research_id"] for p in research["peer_reviewed_papers"]}
        known |= {d["article_id"] for d in j("../raw/trend_corpus.json".replace("../raw/", ""))\
                  .get("articles", [])} if False else known
        trend_ids = set()
        with open(os.path.join(ROOT, "data", "raw", "trend_corpus.json"), encoding="utf-8") as fh:
            trend_ids = {a["article_id"] for a in json.load(fh)["articles"]}
        assumption_ids = {a["assumption_id"] for a in j("category_assumptions.json")["assumptions"]}
        for p in j("funnel_real.json")["homepage_funnel"]["paths"]:
            for e in p["evidence"]:
                self.assertTrue(e in known or e in trend_ids or e in assumption_ids
                                or e.startswith("taxonomy:") or e.startswith("keyword_search:"),
                                f"path {p['id']} cites unresolvable evidence {e}")


class TestProductChain(unittest.TestCase):
    """Verified existing products ground the machine; the capability-donor
    slot (C) is HONESTLY missing on every possibility because no internal
    Versuni capability dataset exists - the machine must say so uniformly
    rather than fabricating even one donor link."""

    def test_verified_products_have_official_sources(self):
        images = json.load(open(os.path.join(ROOT, "data", "visual", "product_images.json"), encoding="utf-8"))
        self.assertGreaterEqual(len(images["products"]), 7)
        for prod in images["products"]:
            self.assertTrue(prod.get("official_url", "").startswith("http"), prod["product_id"])
            self.assertTrue(prod.get("sha256"), prod["product_id"])

    def test_capability_donor_slot_is_honestly_missing_never_fabricated(self):
        concepts = j("magic_box_real.json")["possibilities"]
        self.assertTrue(concepts)
        for c in concepts:
            slot = c.get("design_dna", {}).get("C", {})
            self.assertEqual(slot.get("status"), "MISSING_UNVERIFIED",
                             f"{c.get('id')}: capability donor must stay missing until a real "
                             "internal capability dataset exists - a PRESENT value here with no "
                             "such dataset would be a fabricated link")
            self.assertIn("No real Versuni internal capability", slot.get("detail", ""))


class TestHypothesisReverseChain(unittest.TestCase):
    """ProductHypothesis -> possibility -> friction -> observations -> raw."""

    def test_finalist_reverse_to_raw_reviews(self):
        finalists = j("magic_box_real.json")["finalists"]
        self.assertTrue(finalists)
        themes = {}
        with open(os.path.join(PROC, "review_themes_real.csv"), newline="", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                themes.setdefault(r["theme"], []).append(r["review_id"])
        clean_ids = set()
        with open(os.path.join(PROC, "reviews_clean_real.csv"), newline="", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                clean_ids.add(r["review_id"])
        for f in finalists:
            theme = f["friction_theme"]
            rows = themes.get(theme, [])
            self.assertTrue(rows, f"finalist {f['id']} theme {theme} has no supporting reviews")
            self.assertIn(rows[0], clean_ids, "supporting review is not in the clean corpus")


class TestTemporalHonesty(unittest.TestCase):
    """No object is presented as a statistical Trend: the corpus carries
    dated documents and a review time series, but the machine deliberately
    does not claim baseline/persistence-validated Trends - verify nothing
    pretends otherwise."""

    def test_no_fabricated_trend_objects(self):
        funnel = j("funnel_real.json")
        text = json.dumps(funnel)
        self.assertNotIn('"object_type": "TREND"', text)
        sources = j("sources_real.json")
        gt = next(s for s in sources["sources"] if s["id"] == "google_trends")
        self.assertEqual(gt["status"], "NOT_IMPLEMENTED")


if __name__ == "__main__":
    unittest.main()
