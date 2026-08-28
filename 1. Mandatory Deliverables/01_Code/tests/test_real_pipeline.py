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
        with open(path, newline="", encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        self.assertEqual(len(rows), 50)
        for r in rows:
            rid = r["review_id"]
            self.assertIn(rid, real, f"{rid} is not a real review_id in reviews_clean_real.csv")
            self.assertEqual(r["review_text"], real[rid],
                             f"{rid}'s review_text does not match the real corpus - possible fabricated substitution")

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


class TestEvidenceTraceability(unittest.TestCase):
    def test_every_insight_pack_number_traces_to_evidence_table(self):
        pack = open(os.path.join(ROOT, "deliverables", "insight_pack.md"), encoding="utf-8").read()
        with open(os.path.join(ROOT, "deliverables", "evidence_table.csv"), encoding="utf-8") as fh:
            table_values = {row["value_as_cited"] for row in csv.DictReader(fh)}
        candidates = set(re.findall(r"-?\d+\.\d+%?|\$?\d[\d,]*\.\d+%?", pack))
        untraced = [c for c in candidates
                   if not any(c.strip("$€%,").replace(",", "") in v.replace(",", "") for v in table_values)]
        self.assertEqual(untraced, [], "untraced numbers: {}".format(untraced))

    def test_evidence_table_source_files_exist(self):
        with open(os.path.join(ROOT, "deliverables", "evidence_table.csv"), encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        for r in rows:
            sf = r["source_file"].split(" (")[0].strip()
            path = os.path.join(ROOT, sf)
            self.assertTrue(os.path.exists(path), "{} -> {}".format(r["claim_id"], sf))


if __name__ == "__main__":
    unittest.main(verbosity=2)
