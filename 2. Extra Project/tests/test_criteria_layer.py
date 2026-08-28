"""Criteria governance-layer tests: one canonical registry, full rule
provenance, single source of truth for thresholds, honest unknowns, and
both navigation directions (criterion -> objects, object -> criteria).
"""
import json
import os
import re
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROC = os.path.join(ROOT, "data", "processed")
sys.path.insert(0, os.path.join(ROOT, "src"))
sys.path.insert(0, os.path.join(ROOT, "src", "real"))


def registry():
    with open(os.path.join(PROC, "criteria_real.json"), encoding="utf-8") as fh:
        return json.load(fh)


class TestCriteriaRegistry(unittest.TestCase):
    def test_every_criterion_carries_full_provenance(self):
        lib = registry()["criteria_library"]
        self.assertEqual(len(lib), 52)
        for c in lib:
            for field in ("id", "category", "name", "question", "why_it_matters",
                          "how_tested", "pass_condition", "epistemic_type",
                          "threshold_origin", "code_reference", "missing_data_behavior"):
                self.assertIn(field, c, f"{c.get('id')}: missing {field}")
            self.assertEqual(c["epistemic_type"], "METHOD_CHOICE")
            self.assertIn("NEEDS_EVIDENCE", c["missing_data_behavior"])

    def test_materiality_floor_has_one_canonical_source(self):
        """E4's threshold text must carry the LIVE value imported from
        decision_framework_real - and that value must appear nowhere as an
        independent numeric literal in the frontend."""
        import decision_framework_real as dfr
        e4 = next(c for c in registry()["criteria_library"] if c["id"] == "E4")
        self.assertIn(f"({dfr.MATERIALITY_FLOOR_PCT}%)", e4["threshold_origin"])
        self.assertIn("METHOD_DEFINED", e4["threshold_origin"])
        lab = open(os.path.join(ROOT, "web", "src", "components", "Lab.tsx"), encoding="utf-8").read()
        self.assertNotIn('useState("0.5")', lab, "Lab re-declares the floor default")
        self.assertNotIn("Reliability-Verified", lab, "Lab hardcodes candidate names")

    def test_verdict_exposes_the_floor_on_every_path(self):
        import decision_framework_real as dfr
        self.assertEqual(dfr.compute()["verdict"]["materiality_floor_pct"], dfr.MATERIALITY_FLOOR_PCT)
        self.assertEqual(dfr.compute(materiality_floor=3.0)["verdict"]["materiality_floor_pct"], 3.0)
        insuff = dfr.compute(materiality_floor=101.0)["verdict"]
        self.assertEqual(insuff["materiality_floor_pct"], 101.0)
        self.assertEqual(insuff["decision_type"], "INSUFFICIENT_EVIDENCE_FOR_RECOMMENDATION")


class TestCriteriaNavigation(unittest.TestCase):
    def test_object_to_criteria_every_concept_carries_per_criterion_verdicts(self):
        doc = registry()
        concepts = doc["concepts"]
        self.assertTrue(concepts)
        lib_ids = {c["id"] for c in doc["criteria_library"]}
        for concept in concepts:
            crits = concept.get("criteria") or {}
            self.assertTrue(crits, f"{concept.get('possibility_id')} has no criteria verdicts")
            for cid, entry in crits.items():
                self.assertIn(cid, lib_ids, f"verdict cites unknown criterion {cid}")
                self.assertIn(entry.get("status"), ("PASS", "CHALLENGE", "KILL", "NEEDS_EVIDENCE", "N/A"),
                              f"{cid}: {entry.get('status')}")

    def test_criterion_to_objects_aggregation_is_derivable(self):
        """Criterion -> affected objects: for E4, the registry's concept
        verdicts must aggregate to real pass/challenge counts."""
        doc = registry()
        counts = {"PASS": 0, "CHALLENGE": 0, "KILL": 0, "NEEDS_EVIDENCE": 0, "N/A": 0}
        for concept in doc["concepts"]:
            v = (concept.get("criteria") or {}).get("E4", {}).get("status")
            if v in counts:
                counts[v] += 1
        self.assertGreater(sum(counts.values()), 0, "E4 applies to no object")
        self.assertEqual(sum(counts.values()), len(doc["concepts"]))

    def test_unknown_is_never_a_number_or_fail(self):
        doc = registry()
        for concept in doc["concepts"]:
            for cid, entry in (concept.get("criteria") or {}).items():
                if entry.get("status") == "NEEDS_EVIDENCE":
                    reasoning = entry.get("note", "")
                    self.assertFalse(re.search(r"\bscore[d]?\b.*\d", reasoning.lower()),
                                     f"{cid}: NEEDS_EVIDENCE carries a fabricated score")


if __name__ == "__main__":
    unittest.main()
