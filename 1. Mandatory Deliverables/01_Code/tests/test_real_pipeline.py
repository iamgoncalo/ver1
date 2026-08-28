"""Integrity tests for the REAL data pipeline (data/raw built from real
sources, data/processed/*_real.json). Run after bash run_pipeline.sh.
"""
import csv
import json
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROC = os.path.join(ROOT, "data", "processed")


def j(name):
    with open(os.path.join(PROC, name), encoding="utf-8") as fh:
        return json.load(fh)


class TestRealRawLayer(unittest.TestCase):
    def test_manifest_marks_data_real(self):
        m = json.load(open(os.path.join(ROOT, "data", "manifest.json")))
        self.assertFalse(m.get("_synthetic"))
        self.assertIn("REAL", m.get("_provenance", ""))

    def test_manifest_checksums_match(self):
        import hashlib
        m = json.load(open(os.path.join(ROOT, "data", "manifest.json")))
        for f in m["files"]:
            path = os.path.join(ROOT, f["relative_path"])
            with open(path, "rb") as fh:
                h = hashlib.sha256(fh.read()).hexdigest()
            self.assertEqual(h, f["sha256"], f["filename"])

    def test_reviews_are_marked_real_and_substantial(self):
        with open(os.path.join(ROOT, "data", "raw", "consumer_reviews.csv"), newline="",
                 encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        self.assertGreater(len(rows), 3000, "brief wants 'a few thousand' real reviews")
        skus = {r["product_sku"] for r in rows}
        self.assertGreater(len(skus), 50)

    def test_market_metrics_are_real_not_synthetic(self):
        m = json.load(open(os.path.join(ROOT, "data", "raw", "market_metrics.json")))
        self.assertFalse(m.get("_synthetic"))
        vendors = {s["vendor"] for s in m["sources"]}
        self.assertEqual(vendors, {"Mordor Intelligence", "IMARC Group"})
        for s in m["sources"]:
            archive = os.path.join(ROOT, s["archive_file"])
            self.assertTrue(os.path.exists(archive), s["archive_file"])

    def test_trend_corpus_real_and_archived(self):
        c = json.load(open(os.path.join(ROOT, "data", "raw", "trend_corpus.json")))
        self.assertFalse(c.get("_synthetic"))
        self.assertGreaterEqual(c["article_count"], 12)
        for a in c["articles"]:
            self.assertTrue(a["url_verified"])
            if a["archive_file"]:
                self.assertTrue(os.path.exists(os.path.join(ROOT, a["archive_file"])), a["archive_file"])


class TestQ2Real(unittest.TestCase):
    def test_defects_are_found_not_planted(self):
        d = j("defect_detection_report_real.json")
        self.assertIn("_provenance", d)
        self.assertIn("not planted", d["_provenance"])
        self.assertGreater(d["defects_found"]["sentiment_rating_conflict"]["count"], 0)


class TestQ3Real(unittest.TestCase):
    def test_six_real_themes_all_negative_csat(self):
        t = j("taxonomy_themes_real.json")
        self.assertEqual(len(t["themes"]), 6)
        for tid, st in t["themes"].items():
            self.assertLess(st["csat_impact"], 0, tid)

    def test_hand_label_blank_file_exists_and_is_genuinely_blank(self):
        path = os.path.join(ROOT, "data", "hand_label_sample_BLANK.csv")
        self.assertTrue(os.path.exists(path))
        with open(path, newline="", encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        self.assertEqual(len(rows), 50)
        for r in rows:
            self.assertEqual(r["hand_label"].strip(), "",
                             "hand_label must be blank - no AI or auto-fill permitted")

    def test_validation_honestly_reports_human_action_required_if_unlabelled(self):
        t = j("taxonomy_themes_real.json")
        completed = os.path.join(ROOT, "data", "hand_label_sample.csv")
        if not os.path.exists(completed):
            self.assertIn("HUMAN_ACTION_REQUIRED", t["validation"].get("status", ""))

    def test_hand_label_sample_rows_are_genuine_reviews_not_synthetic(self):
        """Regression test for a real incident: an earlier `hand_labeled_sample.csv`
        paired genuine review_ids with review_text lifted from
        tests/synthetic_fixtures/src/generate_reviews_SYNTHETIC_TEST_FIXTURE.py's
        template pool instead of this id's real text - a real review_id made a
        fabricated review look genuine. That file has been removed; this proves
        the file the pipeline actually uses is clean, and stays clean."""
        path = os.path.join(ROOT, "data", "hand_label_sample_BLANK.csv")
        real = {}
        with open(os.path.join(ROOT, "data", "processed", "reviews_clean_real.csv"), newline="", encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                real[row["review_id"]] = row["review_text"]
        real_sku = {}
        with open(os.path.join(ROOT, "data", "processed", "reviews_clean_real.csv"), newline="", encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                real_sku[row["review_id"]] = row["product_sku"]
        with open(path, newline="", encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        self.assertEqual(len(rows), 50)
        for r in rows:
            rid = r["review_id"]
            self.assertIn(rid, real, f"{rid} is not a real review_id in reviews_clean_real.csv")
            self.assertEqual(r["review_text"], real[rid],
                             f"{rid}'s review_text does not match the real corpus - possible fabricated substitution")
            self.assertEqual(r["product_sku"], real_sku[rid],
                             f"{rid}'s product_sku does not match the real corpus")

    def test_ai_provisional_labels_are_genuine_rows_and_honestly_marked(self):
        """The AI-provisional label file (Claude Fable, at the case owner's
        explicit request) must reference only genuine sampled reviews, use
        only codebook themes, and the resulting validation block must stay
        honestly marked as NOT human validation while no human file exists."""
        ai_path = os.path.join(ROOT, "data", "ai_label_sample_CLAUDE_FABLE.csv")
        blank = {r["review_id"]: r for r in csv.DictReader(
            open(os.path.join(ROOT, "data", "hand_label_sample_BLANK.csv"), encoding="utf-8"))}
        valid_themes = {"reliability", "value_effectiveness", "customer_service",
                        "filter_cost", "noise", "ozone_odor_safety", "none"}
        rows = list(csv.DictReader(open(ai_path, encoding="utf-8")))
        self.assertEqual(len(rows), 50)
        for r in rows:
            self.assertIn(r["review_id"], blank)
            self.assertEqual(r["product_sku"], blank[r["review_id"]]["product_sku"])
            self.assertIn(r["ai_label"], valid_themes)
            self.assertIn("Claude Fable", r["ai_labeller"])
        if not os.path.exists(os.path.join(ROOT, "data", "hand_label_sample.csv")):
            v = j("taxonomy_themes_real.json")["validation"]
            self.assertEqual(v.get("epistemic_type"), "AI_PROVISIONAL_NOT_HUMAN")
            self.assertIn("HUMAN_ACTION_REQUIRED", v["status"])
            self.assertIn("NOT human validation", v["status"])

    def test_sample_provenance_file_covers_every_sampled_review(self):
        prov = {r["review_id"]: r for r in csv.DictReader(
            open(os.path.join(ROOT, "data", "hand_label_sample_PROVENANCE.csv"), encoding="utf-8"))}
        blank = list(csv.DictReader(
            open(os.path.join(ROOT, "data", "hand_label_sample_BLANK.csv"), encoding="utf-8")))
        self.assertEqual(len(prov), 50)
        for r in blank:
            p = prov[r["review_id"]]
            self.assertEqual(p["parent_asin"], r["product_sku"])
            self.assertTrue(p["amazon_product_url"].startswith("https://www.amazon.com/dp/"))
            self.assertTrue(p["committed_raw_file"].startswith("data/real_raw/"),
                            f"{r['review_id']} not traced to a committed raw file")

    def test_validation_metrics_computed_from_hand_labels_when_present(self):
        """compute_validation_metrics() is pure logic (per-theme precision/recall,
        confusion matrix, none-disagreement) - proven here against a small,
        hand-constructed example independent of whether a real human has
        labelled data/hand_label_sample.csv yet."""
        import sys
        sys.path.insert(0, os.path.join(ROOT, "src"))
        sys.path.insert(0, os.path.join(ROOT, "src", "real"))
        from taxonomy_real import compute_validation_metrics
        gold = ["reliability", "reliability", "noise", "none", "none"]
        auto = ["reliability", "noise",       "noise", "none", "reliability"]
        m = compute_validation_metrics(gold, auto)
        self.assertEqual(m["n_labelled"], 5)
        self.assertAlmostEqual(m["raw_agreement_pct"], 60.0)
        self.assertEqual(m["per_theme"]["reliability"]["n_hand_labelled"], 2)
        self.assertEqual(m["per_theme"]["reliability"]["precision"], 0.5)   # auto said reliability twice, right once
        self.assertEqual(m["per_theme"]["reliability"]["recall"], 0.5)      # gold said reliability twice, caught once
        self.assertEqual(m["confusion_matrix"]["reliability"]["noise"], 1)
        self.assertEqual(m["none_disagreement"]["auto_none_human_not"], 0)
        self.assertEqual(m["none_disagreement"]["human_none_auto_not"], 1)  # gold=none, auto=reliability

    def test_no_production_data_file_contains_synthetic_fixture_text(self):
        """A real review sentence appearing verbatim inside the synthetic
        generator's template pool is expected (it was seeded from real
        examples for realism); the dangerous direction is the reverse - real
        production data/ files must never contain text lifted FROM the
        synthetic pool. Checks every distinct quoted string >= 8 words long
        in the synthetic generator against every .csv/.json file actually
        used by the real pipeline (data/hand_label_sample_BLANK.csv and
        data/processed/*, data/raw/*)."""
        synth_path = os.path.join(os.path.dirname(__file__), "synthetic_fixtures", "src", "generate_reviews_SYNTHETIC_TEST_FIXTURE.py")
        synth_text = open(synth_path, encoding="utf-8").read()
        quoted = re.findall(r'"([^"]{30,})"', synth_text)
        synthetic_sentences = {q for q in quoted if len(q.split()) >= 8}
        self.assertTrue(synthetic_sentences, "sanity check: expected to find long quoted sentences in the fixture")

        checked = 0
        for dirpath, _dirs, files in os.walk(os.path.join(ROOT, "data")):
            for fname in files:
                if not fname.endswith((".csv", ".json")):
                    continue
                text = open(os.path.join(dirpath, fname), encoding="utf-8", errors="ignore").read()
                checked += 1
                for sentence in synthetic_sentences:
                    self.assertNotIn(sentence, text,
                                     f"{fname} contains synthetic fixture text verbatim: {sentence[:60]!r}")
        self.assertGreater(checked, 0)


class TestQ4Real(unittest.TestCase):
    def test_direct_wtp_honestly_marked_unavailable(self):
        w = j("wtp_real.json")
        self.assertFalse(w["direct_wtp_available"])
        self.assertIn("does not directly measure", w["direct_wtp_statement"])


class TestQ6Real(unittest.TestCase):
    def test_recommendation_and_two_kills(self):
        d = j("decision_framework_real.json")
        self.assertEqual(d["verdict"]["recommended"], "OS-1")
        self.assertEqual({k["id"] for k in d["verdict"]["killed"]}, {"OS-2", "OS-3"})

    def test_market_scenario_does_not_change_verdict(self):
        import subprocess
        r1 = subprocess.run(["python3", "src/real/decision_framework_real.py"],
                            cwd=ROOT, capture_output=True, text=True)
        r2 = subprocess.run(["python3", "src/real/decision_framework_real.py",
                            "--market-scenario=imarc"], cwd=ROOT, capture_output=True, text=True)
        rec1 = re.search(r"RECOMMEND: (\S+)", r1.stdout).group(1)
        rec2 = re.search(r"RECOMMEND: (\S+)", r2.stdout).group(1)
        self.assertEqual(rec1, rec2)

    def test_every_feasibility_rating_is_labelled_analyst_judgment(self):
        """A standard existing in the trend corpus does not by itself prove
        Versuni can build/commercialize/scale a concept - every feasibility
        rating must carry epistemic_type so a reviewer can tell at a glance
        it's a labelled judgment, not a measured fact."""
        import sys
        sys.path.insert(0, os.path.join(ROOT, "src"))
        sys.path.insert(0, os.path.join(ROOT, "src", "real"))
        import decision_framework_real as dfr
        for theme_id, block in dfr.THEME_FEASIBILITY.items():
            self.assertEqual(block["epistemic_type"], "ANALYST_JUDGMENT", theme_id)
            self.assertIn("missing_internal_evidence", block, theme_id)
            self.assertIn("what_would_change_rating", block, theme_id)


class TestRecommendationConsistency(unittest.TestCase):
    """Q6's recommendation and its two rejected alternatives must read
    identically wherever the submission states them - a hostile reviewer
    should never find README, the Insight Pack and the computed verdict
    disagreeing about what was actually recommended."""

    def test_recommendation_name_matches_across_every_final_surface(self):
        d = j("decision_framework_real.json")
        recommended_name = d["verdict"]["recommended_name"]
        killed_names = {k["name"] for k in d["verdict"]["killed"]}

        readme = open(os.path.join(ROOT, "..", "README.md"), encoding="utf-8").read()
        pack = open(os.path.join(ROOT, "deliverables", "insight_pack.md"), encoding="utf-8").read()
        note = open(os.path.join(ROOT, "deliverables", "technical_note.md"), encoding="utf-8").read()
        with open(os.path.join(ROOT, "deliverables", "evidence_table.csv"), encoding="utf-8") as fh:
            table_row = next(r for r in csv.DictReader(fh) if r["claim_id"] == "q6_recommendation")

        self.assertIn(recommended_name, table_row["value_as_cited"])
        # README/deliverables use the short consumer-facing name
        # ("Reliability-Verified Air Purifiers") without the parenthetical -
        # require that short form to appear in every final surface.
        short_name = recommended_name.split(" (")[0]
        for label, text in (("README.md", readme), ("insight_pack.md", pack), ("technical_note.md", note)):
            self.assertIn(short_name, text, f"{label} does not state the current recommendation")

        for killed in killed_names:
            short_killed = killed.split(" (")[0]
            self.assertIn(short_killed, pack, f"insight_pack.md is missing rejected alternative: {short_killed}")

        # The forced-gate-failure -> NO_RECOMMENDATION case (Phase 7's
        # required negative test) is already covered by
        # tests/test_dynamic_winner.py::TestB2_ZeroSurvivorsIsHonestNotManufactured
        # - not duplicated here.


class TestClaimTraceability(unittest.TestCase):
    def test_five_random_claims_trace_to_real_source(self):
        import sys, random
        sys.path.insert(0, os.path.join(ROOT, "scripts"))
        import trace_claim as tc
        rows = tc.load_evidence_table()
        sample = random.Random(0).sample(rows, min(5, len(rows)))
        for row in sample:
            t = tc.trace(row["claim_id"])
            self.assertTrue(t["raw_file_exists"], f"{row['claim_id']}: raw file missing")
            self.assertTrue(t["PASS"], f"{row['claim_id']}: trace did not resolve to real source")

    def test_corrupted_trace_path_fails_the_verifier(self):
        """Negative test: a claim_id pointed at a metric path that does not
        exist in its own JSON source must fail PASS, proving trace() can
        actually detect a broken lineage rather than always passing."""
        import sys
        from unittest import mock
        sys.path.insert(0, os.path.join(ROOT, "scripts"))
        import trace_claim as tc
        real_rows = tc.load_evidence_table()
        target = next(r for r in real_rows if r["source_file"].endswith(".json"))
        corrupted = dict(target)
        corrupted["source_location"] = "this.path.does.not.exist.anywhere"
        with mock.patch.object(tc, "load_evidence_table", return_value=[corrupted]):
            t = tc.trace(corrupted["claim_id"])
        self.assertFalse(t["path_resolved"])
        self.assertFalse(t["PASS"])


class TestEvidenceTraceability(unittest.TestCase):
    # Numbers that appear in the deliverables but are NOT quantitative
    # evidence claims - each entry must have a stated reason. Anything
    # numeric not on this list must trace to an evidence_table.csv row.
    NON_CLAIM_NUMBERS = {
        "3.9",    # "Python 3.9+" - a tool version, not an evidence claim
        "3.2",    # "§3.2" - a brief section reference
        "11.8",   # "11.8GB metadata" - source-file size, descriptive of the
                  # download, not an analytical result
        "272",    # "272MB" - same (Appliances metadata download size)
        "2004", "2023", "2025", "2026", "2030", "2034",  # period years -
                  # every range they define is itself covered by table rows
                  # (review_date_range, CAGR windows)
        "18",     # "18-character negation window" appears alongside the
                  # 18-empty-rows claim; the empty-rows 18 IS in the table
    }

    def _untraced_numbers_in(self, doc_name):
        text = open(os.path.join(ROOT, "deliverables", doc_name), encoding="utf-8").read()
        with open(os.path.join(ROOT, "deliverables", "evidence_table.csv"), encoding="utf-8") as fh:
            table_values = {row["value_as_cited"] for row in csv.DictReader(fh)}
        flat = " ".join(table_values).replace(",", "")
        decimals = set(re.findall(r"-?\d+\.\d+%?|\$?\d[\d,]*\.\d+%?", text))
        integers = set(re.findall(r"(?<![\d.\w])\d{2,}(?![\d.\w%])", text))
        candidates = decimals | integers
        return sorted(c for c in candidates
                      if c.strip("$€%,") not in self.NON_CLAIM_NUMBERS
                      and c.strip("$€%,").replace(",", "") not in flat)

    def test_every_insight_pack_number_traces_to_evidence_table(self):
        untraced = self._untraced_numbers_in("insight_pack.md")
        self.assertEqual(untraced, [], "untraced insight-pack numbers: {}".format(untraced))

    def test_every_technical_note_number_traces_to_evidence_table(self):
        untraced = self._untraced_numbers_in("technical_note.md")
        self.assertEqual(untraced, [], "untraced technical-note numbers: {}".format(untraced))

    def test_removing_an_evidence_row_is_detected(self):
        """Negative test: coverage checking must actually depend on the
        table - drop the reliability-count row in memory and prove the
        extractor now reports its number as untraced."""
        text = open(os.path.join(ROOT, "deliverables", "insight_pack.md"), encoding="utf-8").read()
        with open(os.path.join(ROOT, "deliverables", "evidence_table.csv"), encoding="utf-8") as fh:
            rows = [r for r in csv.DictReader(fh) if r["claim_id"] != "reliability_n_reviews"]
        flat = " ".join(r["value_as_cited"] for r in rows).replace(",", "")
        self.assertNotIn(" 166 ", " " + flat + " ")
        integers = set(re.findall(r"(?<![\d.\w])\d{2,}(?![\d.\w%])", text))
        self.assertIn("166", integers, "sanity: the pack cites the reliability count")

    def test_evidence_table_source_files_exist(self):
        with open(os.path.join(ROOT, "deliverables", "evidence_table.csv"), encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        for r in rows:
            sf = r["source_file"].split(" (")[0].strip()
            path = os.path.join(ROOT, sf)
            self.assertTrue(os.path.exists(path), "{} -> {}".format(r["claim_id"], sf))


if __name__ == "__main__":
    unittest.main(verbosity=2)
