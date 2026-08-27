"""Proves the Innovation Funnel Machine is genuinely computed from real
files, never hardcoded, in both the backend (funnel_real.py) and the
frontend (FunnelWorld.tsx).

TEST A - current real data produces stage counts that match a fresh,
         independent len() over the same real source files (not values
         baked into funnel_real.py itself).
TEST B - a controlled fixture (temp copy of magic_box_real.json with fewer
         possibilities) changes the funnel's magic_box/innovations counts
         accordingly - proves the pipeline is a real function of its
         input files, not a fixed dict.
TEST C - idempotency: building the funnel twice on unchanged inputs
         produces identical machine_state counts and does not grow
         funnel_run_history.json.
TEST D - no funnel-specific numeric literal (today's real stage counts)
         appears as a bare JSX text node in FunnelWorld.tsx - every count
         rendered in the frontend must come from the fetched API response,
         never be typed into the source as a literal.
"""
import json
import os
import re
import shutil
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))
sys.path.insert(0, os.path.join(ROOT, "src", "real"))

import funnel_real  # noqa: E402


class TestA_RealCountsMatchIndependentRecount(unittest.TestCase):
    def test_stage_counts_match_fresh_independent_recount(self):
        doc = funnel_real.build()
        stages = {s["id"]: s for s in doc["stages"]}

        with open(os.path.join(ROOT, "data", "processed", "products_real.json"), encoding="utf-8") as fh:
            self.assertEqual(stages["products"]["count"], len(json.load(fh)["products"]))
        with open(os.path.join(ROOT, "data", "processed", "rivals_real.json"), encoding="utf-8") as fh:
            self.assertEqual(stages["competitors"]["count"], len(json.load(fh)["rivals"]))
        with open(os.path.join(ROOT, "data", "processed", "magic_box_real.json"), encoding="utf-8") as fh:
            mb = json.load(fh)
            self.assertEqual(stages["innovations"]["count"], len(mb["possibilities"]))
            self.assertEqual(stages["finalists"]["count"], len(mb["finalists"]))
        with open(os.path.join(ROOT, "data", "processed", "criteria_real.json"), encoding="utf-8") as fh:
            self.assertEqual(stages["criteria"]["count"], len(json.load(fh)["criteria_library"]))


class TestB_FixtureSwapChangesFunnel(unittest.TestCase):
    """Proves compute_stages()/compute_patterns() are real functions of
    data/processed content - not a fixed dict - by pointing PROC at a
    temp directory holding real files EXCEPT a deliberately truncated
    magic_box_real.json, and confirming the funnel's counts change
    exactly as truncated. Never writes to the real data/processed dir."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        for kind, name in funnel_real.SNAPSHOT_INPUTS:
            src_dir = funnel_real.PROC if kind == "processed" else funnel_real.RAW
            shutil.copy(os.path.join(src_dir, name), os.path.join(self.tmp, name))
        # also copy files compute_* reads but that aren't in SNAPSHOT_INPUTS
        for extra in ("products_real.json",):
            shutil.copy(os.path.join(funnel_real.PROC, extra), os.path.join(self.tmp, extra))

        with open(os.path.join(self.tmp, "magic_box_real.json"), encoding="utf-8") as fh:
            mb = json.load(fh)
        self.original_possibility_count = len(mb["possibilities"])
        mb["possibilities"] = mb["possibilities"][:3]  # truncate from 12 real ones to 3
        with open(os.path.join(self.tmp, "magic_box_real.json"), "w", encoding="utf-8") as fh:
            json.dump(mb, fh)

        self._orig_proc, self._orig_raw = funnel_real.PROC, funnel_real.RAW
        funnel_real.PROC = self.tmp
        funnel_real.RAW = self.tmp

    def tearDown(self):
        funnel_real.PROC, funnel_real.RAW = self._orig_proc, self._orig_raw
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_truncated_magic_box_changes_innovations_count(self):
        patterns = funnel_real.compute_patterns()
        signal_families = funnel_real.compute_signal_families()
        stages = funnel_real.compute_stages(patterns, signal_families)
        innovations = next(s for s in stages if s["id"] == "innovations")
        self.assertEqual(innovations["count"], 3)
        self.assertNotEqual(innovations["count"], self.original_possibility_count)


class TestC_Idempotency(unittest.TestCase):
    def test_two_builds_on_unchanged_inputs_do_not_duplicate_run_history(self):
        doc1 = funnel_real.build()
        history_len_1 = doc1["machine_state"]["total_runs_recorded"]
        doc2 = funnel_real.build()
        history_len_2 = doc2["machine_state"]["total_runs_recorded"]
        self.assertEqual(history_len_1, history_len_2)
        self.assertFalse(doc2["machine_state"]["changed_since_last_run"])
        self.assertEqual(doc1["machine_state"]["input_snapshot_hash"], doc2["machine_state"]["input_snapshot_hash"])
        stage_counts_1 = {s["id"]: s["count"] for s in doc1["stages"]}
        stage_counts_2 = {s["id"]: s["count"] for s in doc2["stages"]}
        self.assertEqual(stage_counts_1, stage_counts_2)


class TestD_NoHardcodedCountsInFrontend(unittest.TestCase):
    def test_funnel_world_never_types_a_literal_stage_count(self):
        path = os.path.join(ROOT, "web", "src", "worlds", "FunnelWorld.tsx")
        with open(path, encoding="utf-8") as fh:
            source = fh.read()

        doc = funnel_real.build()
        real_counts = {s["count"] for s in doc["stages"]}
        real_counts |= {v["count"] for v in doc["signal_families"].values()}
        real_counts |= {len(v) for v in doc["patterns"].values()}
        real_counts.discard(0)  # 0 is too common a benign literal (e.g. array index) to be a useful signal

        # A literal count "leaked" into JSX would appear as a bare number
        # between > and < (a JSX text child), NOT inside a {...} expression.
        jsx_text_numbers = set(re.findall(r">\s*(\d+)\s*<", source))
        leaked = {n for n in jsx_text_numbers if int(n) in real_counts}
        self.assertEqual(leaked, set(),
                         "FunnelWorld.tsx appears to render a real stage/pattern/family count as a bare "
                         "literal instead of from the fetched API response: {}".format(leaked))


if __name__ == "__main__":
    unittest.main()
