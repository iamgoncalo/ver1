"""P1 truth-gate tests: the machine's outputs must genuinely depend on its
evidence inputs (mutation), and unchanged inputs must change nothing
(idempotency). All mutations run against TEMPORARY COPIES or in-memory row
sets - frozen evidence and the real processed state are never modified.
"""
import csv
import json
import os
import shutil
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))
sys.path.insert(0, os.path.join(ROOT, "src", "real"))


def load_clean_rows():
    with open(os.path.join(ROOT, "data", "processed", "reviews_clean_real.csv"),
              newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


class TestReviewEvidenceMutation(unittest.TestCase):
    """Changing review-derived friction evidence must change the decision -
    in memory, via compute(rows=...), never touching disk."""

    def test_removing_reliability_evidence_changes_the_verdict(self):
        import decision_framework_real as dfr
        rows = load_clean_rows()
        baseline = dfr.compute(rows=list(rows))
        base_rec = baseline["verdict"].get("recommended")

        themes = {r["review_id"]: r["theme"] for r in csv.DictReader(
            open(os.path.join(ROOT, "data", "processed", "review_themes_real.csv"),
                 newline="", encoding="utf-8"))}
        mutated = [r for r in rows if themes.get(r["review_id"]) != "reliability"]
        self.assertLess(len(mutated), len(rows))
        out = dfr.compute(rows=mutated)
        # With every reliability-theme review gone, OS-1 cannot win on the
        # same evidence: either another candidate wins or the honest
        # insufficient-evidence path fires. Same-winner would mean the
        # verdict does not actually depend on the evidence.
        changed = (out["verdict"].get("recommended") != base_rec
                   or out["verdict"]["decision_type"] != baseline["verdict"]["decision_type"])
        self.assertTrue(changed, "verdict did not react to removal of its own evidence base")

    def test_unchanged_rows_reproduce_identical_scores(self):
        import decision_framework_real as dfr
        rows = load_clean_rows()
        a = dfr.compute(rows=list(rows))
        b = dfr.compute(rows=list(rows))
        self.assertEqual(a["verdict"]["recommended"], b["verdict"]["recommended"])
        self.assertEqual(
            {k: v["consumer_pain"] for k, v in a["scores"].items()},
            {k: v["consumer_pain"] for k, v in b["scores"].items()})


class TestFunnelInputMutation(unittest.TestCase):
    """The funnel's input-snapshot hash and object counts must react to a
    changed paper and a changed signal - tested against a TEMP COPY of the
    processed state, with the module's path restored afterwards."""

    def _build_with_temp_proc(self, mutate):
        import funnel_real
        tmp = tempfile.mkdtemp(prefix="p1_funnel_")
        try:
            shutil.copytree(os.path.join(ROOT, "data", "processed"),
                            os.path.join(tmp, "processed"))
            shutil.copytree(os.path.join(ROOT, "data", "raw"),
                            os.path.join(tmp, "raw"))
            mutate(os.path.join(tmp, "processed"))
            orig_proc, orig_raw = funnel_real.PROC, funnel_real.RAW
            funnel_real.PROC = os.path.join(tmp, "processed")
            funnel_real.RAW = os.path.join(tmp, "raw")
            try:
                return funnel_real.compute_input_snapshot_hash()
            finally:
                funnel_real.PROC, funnel_real.RAW = orig_proc, orig_raw
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_removing_one_paper_changes_the_input_snapshot(self):
        baseline = self._build_with_temp_proc(lambda proc: None)
        def drop_paper(proc):
            path = os.path.join(proc, "research_index.json")
            doc = json.load(open(path, encoding="utf-8"))
            self.assertGreater(len(doc["peer_reviewed_papers"]), 1)
            doc["peer_reviewed_papers"] = doc["peer_reviewed_papers"][1:]
            json.dump(doc, open(path, "w", encoding="utf-8"))
        mutated = self._build_with_temp_proc(drop_paper)
        self.assertNotEqual(baseline, mutated, "snapshot hash blind to a removed paper")

    def test_removing_one_signal_changes_the_input_snapshot(self):
        baseline = self._build_with_temp_proc(lambda proc: None)
        def drop_signal(proc):
            path = os.path.join(proc, "signals_real.json")
            doc = json.load(open(path, encoding="utf-8"))
            self.assertGreater(len(doc["signals"]), 1)
            doc["signals"] = doc["signals"][1:]
            doc["count"] = len(doc["signals"])
            json.dump(doc, open(path, "w", encoding="utf-8"))
        mutated = self._build_with_temp_proc(drop_signal)
        self.assertNotEqual(baseline, mutated, "snapshot hash blind to a removed signal")

    def test_untouched_copy_reproduces_identical_snapshot_hash(self):
        a = self._build_with_temp_proc(lambda proc: None)
        b = self._build_with_temp_proc(lambda proc: None)
        self.assertEqual(a, b, "snapshot hash is not deterministic over identical inputs")


class TestReviewProvenance(unittest.TestCase):
    """The consumer corpus is exactly one source - the McAuley-Lab
    Amazon-Reviews-2023 dataset - via committed raw artifacts. Counts and
    the dedup delta are pinned so silent corpus swaps/merges fail loudly."""

    def test_corpus_counts_and_single_source(self):
        raw_n = 0
        for fn in ("reviews_hk.jsonl", "reviews_appliances.jsonl"):
            with open(os.path.join(ROOT, "data", "real_raw", fn), encoding="utf-8") as fh:
                for line in fh:
                    row = json.loads(line)
                    # native Amazon-export schema - a foreign corpus (e.g.
                    # Bazaarvoice) would not carry exactly these fields
                    self.assertIn("parent_asin", row)
                    self.assertIn("user_id", row)
                    raw_n += 1
        with open(os.path.join(ROOT, "data", "raw", "consumer_reviews.csv"),
                  newline="", encoding="utf-8") as fh:
            norm = list(csv.DictReader(fh))
        self.assertEqual(raw_n, 10653)
        self.assertEqual(len(norm), 10547)   # 106 documented cross-variant dupes dropped
        self.assertEqual(len({r["product_sku"] for r in norm}), 237)

    def test_no_foreign_review_source_referenced(self):
        for dirpath, dirs, files in os.walk(os.path.join(ROOT, "src")):
            for fn in files:
                if fn.endswith(".py"):
                    text = open(os.path.join(dirpath, fn), encoding="utf-8", errors="ignore").read().lower()
                    self.assertNotIn("bazaarvoice", text, fn)


if __name__ == "__main__":
    unittest.main()
