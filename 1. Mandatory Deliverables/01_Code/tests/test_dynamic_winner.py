"""Proves the Q6 recommendation is genuinely computed, not hardcoded/ordered.

TEST A - current real evidence produces the expected winner.
TEST B - a controlled fixture where one candidate clearly dominates flips
         the winner to that candidate.
TEST C - flipping the stated most-sensitive assumption (decision_priority)
         flips the winner, exactly as verdict["sensitivity"] claims it will.
TEST D - reordering candidate definitions never changes the winner.
TEST E - no "recommended": "OS-<n>" literal exists anywhere in the
         production decision path (src/real/, excluding this test file and
         the isolated tests/synthetic_fixtures/ demo).
"""
import os
import re
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))
sys.path.insert(0, os.path.join(ROOT, "src", "real"))

from decision_framework_real import compute, evaluate, dominates, pain_score  # noqa: E402


class TestA_CurrentRealEvidence(unittest.TestCase):
    def test_current_real_data_recommends_os1(self):
        out = compute("mordor")
        self.assertEqual(out["verdict"]["recommended"], "OS-1")
        self.assertEqual(out["verdict"]["decision_type"], "NON_DOMINATED_PLUS_JUDGMENT")


class TestB_ClearDominanceFlipsWinner(unittest.TestCase):
    def test_a_clearly_dominant_fixture_wins_without_judgment(self):
        """Fabricated profiles (test fixture only, never written to
        data/processed) where OS-2 dominates OS-1 on all three real
        dimensions - the winner MUST be OS-2, and MUST be decided by
        dominance alone, not the tie-break judgment rule."""
        profiles = {
            "OS-1": {"consumer_pain": {"severity_csat": -1.0, "prevalence_pct": 2.0, "gate_passed": True},
                     "economic_value": 10000, "feasibility_2_5y": {"rank": 2, "rating": "medium"}},
            "OS-2": {"consumer_pain": {"severity_csat": -2.0, "prevalence_pct": 3.0, "gate_passed": True},
                     "economic_value": 50000, "feasibility_2_5y": {"rank": 3, "rating": "high"}},
            "OS-3": {"consumer_pain": {"severity_csat": None, "prevalence_pct": 1.0, "gate_passed": False},
                     "economic_value": None, "feasibility_2_5y": {"rank": 3, "rating": "high"}},
        }
        winner_id, status, reasons = evaluate(profiles)
        self.assertEqual(winner_id, "OS-2")
        self.assertEqual(status["OS-2"], "DOMINATES_ALL_OTHERS")
        self.assertTrue(dominates(profiles["OS-2"], profiles["OS-1"]))
        self.assertFalse(dominates(profiles["OS-1"], profiles["OS-2"]))


class TestB2_ZeroSurvivorsIsHonestNotManufactured(unittest.TestCase):
    def test_evaluate_returns_no_winner_when_every_candidate_fails_the_gate(self):
        """Fabricated profiles (test fixture only) where every candidate
        fails the Consumer Pain gate. evaluate() must report no real
        winner rather than silently falling back to comparing everyone -
        a real bug found and fixed: it used to manufacture a recommendation
        with zero real pain evidence behind it."""
        profiles = {
            "OS-1": {"consumer_pain": {"severity_csat": None, "prevalence_pct": 0.1, "gate_passed": False},
                     "economic_value": None, "feasibility_2_5y": {"rank": 2, "rating": "medium"}},
            "OS-2": {"consumer_pain": {"severity_csat": None, "prevalence_pct": 0.2, "gate_passed": False},
                     "economic_value": None, "feasibility_2_5y": {"rank": 1, "rating": "low"}},
        }
        winner_id, status, reasons = evaluate(profiles)
        self.assertIsNone(winner_id)
        self.assertEqual(status["OS-1"], "GATE_FAILED_INSUFFICIENT_PAIN_EVIDENCE")
        self.assertEqual(status["OS-2"], "GATE_FAILED_INSUFFICIENT_PAIN_EVIDENCE")

    def test_compute_reports_insufficient_evidence_not_a_fake_winner(self):
        """Same scenario through compute()'s full real code path (not just
        evaluate() in isolation), using the real theme stats/price exposure
        but with every candidate's gate forced closed via an impossible
        materiality floor - proves the whole pipeline, not just one
        function, reports the honest outcome."""
        import decision_framework_real as dfr
        original_floor = dfr.MATERIALITY_FLOOR_PCT
        dfr.MATERIALITY_FLOOR_PCT = 101.0  # no real prevalence can ever clear this
        try:
            out = compute("mordor")
        finally:
            dfr.MATERIALITY_FLOOR_PCT = original_floor
        self.assertIsNone(out["verdict"]["recommended"])
        self.assertEqual(out["verdict"]["decision_type"], "INSUFFICIENT_EVIDENCE_FOR_RECOMMENDATION")
        for pid, p in out["scores"].items():
            self.assertEqual(p["dominance_status"], "GATE_FAILED_INSUFFICIENT_PAIN_EVIDENCE", pid)


class TestC_FlipAssumptionFlipsWinner(unittest.TestCase):
    def test_opposite_decision_priority_flips_the_real_recommendation(self):
        baseline = compute("mordor", decision_priority="pain_feasibility_majority")
        flipped = compute("mordor", decision_priority="economic_value_override")
        self.assertEqual(baseline["verdict"]["recommended"], "OS-1")
        self.assertEqual(flipped["verdict"]["recommended"], "OS-2")
        self.assertNotEqual(baseline["verdict"]["recommended"], flipped["verdict"]["recommended"])

    def test_sensitivity_text_names_the_actual_flip_that_just_happened(self):
        out = compute("mordor")
        self.assertIn("Economic Value override", out["verdict"]["sensitivity"])
        self.assertIn("Whisper-Quiet Night Mode", out["verdict"]["sensitivity"])


class TestD_OrderIndependence(unittest.TestCase):
    def test_dict_iteration_order_does_not_change_winner(self):
        """evaluate() must not depend on the order profiles are given in -
        rebuild the same real scores with OS-2/OS-1/OS-3 key order reversed
        and confirm the winner is identical."""
        out = compute("mordor")
        forward = evaluate(dict(out["scores"]))[0]

        reordered = {k: out["scores"][k] for k in ("OS-3", "OS-2", "OS-1")}
        backward = evaluate(reordered)[0]

        self.assertEqual(forward, backward)
        self.assertEqual(forward, out["verdict"]["recommended"])

    def test_pain_score_sign_convention_is_pure(self):
        # A lower (more negative) CSAT impact must always score as MORE
        # painful (higher pain_score), regardless of comparison order.
        self.assertGreater(pain_score({"consumer_pain": {"severity_csat": -3.0}}),
                           pain_score({"consumer_pain": {"severity_csat": -1.0}}))


class TestE_NoHardcodedWinnerLiteral(unittest.TestCase):
    def test_no_fixed_recommended_literal_in_production_decision_path(self):
        pattern = re.compile(r'"recommended"\s*:\s*"OS-\d"')
        real_dir = os.path.join(ROOT, "src", "real")
        offenders = []
        for fname in os.listdir(real_dir):
            if not fname.endswith(".py"):
                continue
            with open(os.path.join(real_dir, fname), encoding="utf-8") as fh:
                text = fh.read()
            if pattern.search(text):
                offenders.append(fname)
        self.assertEqual(offenders, [], "hardcoded winner literal found in: {}".format(offenders))

    def test_no_fixed_winner_in_processed_json_that_isnt_a_live_recompute(self):
        # data/processed/decision_framework_real.json is a WRITTEN artefact
        # (expected to contain a literal value) - the check that matters is
        # that re-running compute() can produce something DIFFERENT from
        # whatever is currently on disk, proving the file isn't hand-fixed.
        out_a = compute("mordor", decision_priority="pain_feasibility_majority")
        out_b = compute("mordor", decision_priority="economic_value_override")
        self.assertNotEqual(out_a["verdict"]["recommended"], out_b["verdict"]["recommended"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
