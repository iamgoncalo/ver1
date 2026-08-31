"""Pass 2 semantic tests - Paths epistemology, per-path Field grounding,
and Magic Box lineage/mutation sensitivity.

These assert MEANING, not copy: an object of one epistemic class must never
wear another class's label, every path must carry a typed derivable test,
each path owns its own field grounding, and removing a parent evidence
object must genuinely weaken the possibilities built on it.
"""
import copy
import json
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROC = os.path.join(ROOT, "data", "processed")
sys.path.insert(0, os.path.join(ROOT, "src", "real"))
sys.path.insert(0, os.path.join(ROOT, "src"))


def j(name):
    with open(os.path.join(PROC, name), encoding="utf-8") as fh:
        return json.load(fh)


class TestPathOntology(unittest.TestCase):
    def setUp(self):
        hf = j("funnel_real.json")["homepage_funnel"]
        self.paths = hf["paths"]
        self.ontology = hf["path_ontology"]
        self.signals = {s["id"]: s for s in j("signals_real.json")["signals"]}

    def test_three_classes_and_no_fabricated_trajectory(self):
        classes = {p["epistemic_class"] for p in self.paths}
        self.assertTrue(classes <= {"TRAJECTORY", "TENSION", "ASSUMPTION_TO_TEST"})
        # This corpus has no temporal evidence: publishing zero trajectories
        # is the only defensible output, and the note must say why.
        self.assertEqual(self.ontology["classes"]["TRAJECTORY"], 0)
        self.assertTrue(self.ontology["trajectory_note"]["why"])
        # Forward-compat: if a trajectory ever appears it MUST carry
        # explicit temporal evidence - fail loudly otherwise.
        for p in self.paths:
            if p["epistemic_class"] == "TRAJECTORY":
                self.assertTrue(p.get("temporal_evidence"),
                                f"{p['id']} claims TRAJECTORY without temporal evidence")

    def test_tension_is_never_labelled_movement(self):
        for p in self.paths:
            if p["epistemic_class"] == "TENSION":
                self.assertEqual(p["relation"], "TRADE_OFF",
                                 f"{p['id']}: a tension is a trade-off, not a movement")
                self.assertNotIn("supported", p["evidence_state"])

    def test_assumption_is_never_labelled_observed_movement(self):
        for p in self.paths:
            if p["epistemic_class"] == "ASSUMPTION_TO_TEST":
                self.assertNotIn("supported", p["evidence_state"],
                                 f"{p['id']}: an assumption must not read as observed movement")

    def test_reclassifications_are_machine_checked(self):
        reclassified = {r["id"] for r in self.ontology["reclassifications"]}
        self.assertEqual(reclassified, {"tension:T4", "tension:T5"})
        # the machine-checkable conditions the reclassification cites must
        # actually hold in the live signals layer
        self.assertEqual(self.signals["sensor_trust"]["state"], "CONVERGING")
        self.assertEqual(self.signals["spatial_resuspension"]["state"], "SINGLE_SOURCE_FAMILY")
        for p in self.paths:
            if p["id"] in reclassified:
                self.assertEqual(p["epistemic_class"], "ASSUMPTION_TO_TEST")
                self.assertTrue(p.get("reclassification_why"))

    def test_every_path_has_a_typed_test_and_the_old_fallback_is_dead(self):
        for p in self.paths:
            self.assertIsNotNone(p.get("test"), f"{p['id']} has no test object")
            self.assertIn(p["test"]["type"], {"FALSIFIER", "RESOLUTION_QUESTION", "CHALLENGE_TEST", "TEST_PROPOSAL"})
            if p["test"]["derivation"] == "DETERMINISTIC_FROM_STORED_FIELDS":
                self.assertTrue(p["test"]["derived_from"])
            if p["test"]["type"] == "TEST_PROPOSAL":
                self.assertEqual(p["test"]["verification_state"], "UNVERIFIED_PROPOSAL")
        raw = json.dumps(j("funnel_real.json"))
        self.assertNotIn("no falsifier established", raw)
        self.assertNotIn("NO VERIFIED DATA", json.dumps(self.paths))

    def test_forbidden_fallback_not_in_frontend_source(self):
        web_src = os.path.join(ROOT, "web", "src")
        for dirpath, _, files in os.walk(web_src):
            for f in files:
                if f.endswith((".ts", ".tsx")):
                    with open(os.path.join(dirpath, f), encoding="utf-8") as fh:
                        self.assertNotIn("no falsifier established", fh.read(),
                                         f"forbidden fallback survives in {f}")

    def test_proposals_only_where_no_stored_field_exists(self):
        proposals = [p["id"] for p in self.paths if p["test"]["type"] == "TEST_PROPOSAL"]
        self.assertEqual(sorted(proposals), ["assumption:A2", "assumption:A7"])


class TestFieldGrounding(unittest.TestCase):
    def setUp(self):
        self.paths = {p["id"]: p for p in j("funnel_real.json")["homepage_funnel"]["paths"]}

    def test_every_path_owns_a_field_and_the_global_brief_is_gone(self):
        hf = j("funnel_real.json")["homepage_funnel"]
        self.assertNotIn("field", hf, "the old global field brief must not be served as grounding")
        self.assertIn("formal_case_brief", hf)
        for p in self.paths.values():
            self.assertIn("field", p, f"{p['id']} has no field grounding")

    def test_two_paths_share_field_content_only_when_evidence_is_shared(self):
        t1 = self.paths["tension:T1"]["field"]
        t4 = self.paths["tension:T4"]["field"]
        # T1 (noise/value papers) and T4 (sensor papers) share no evidence -
        # their field objects must differ materially.
        self.assertNotEqual(t1.get("supporting_evidence"), t4.get("supporting_evidence"))
        self.assertNotEqual(t1, t4)
        # each path's field leads with its OWN research cards
        t1_ids = {c["research_id"] for c in t1["supporting_evidence"]}
        t4_ids = {c["research_id"] for c in t4["supporting_evidence"]}
        self.assertFalse(t1_ids & t4_ids)

    def test_no_evidence_paths_get_honestly_empty_fields(self):
        for pid in ("assumption:A4", "assumption:A7"):
            f = self.paths[pid]["field"]
            self.assertIn("no_evidence", f)
            self.assertNotIn("friction", f, f"{pid} must not borrow a neighbour's friction")
            self.assertNotIn("products", f)

    def test_field_numbers_carry_their_caveats(self):
        f = self.paths["tension:T1"]["field"]
        for e in f["economics"]:
            self.assertIn("RELATIVE", e["caveat"] or "")
        for fr in f["friction"]:
            self.assertIsNotNone(fr["classifier_validation"]["raw_agreement_pct"])


class TestMagicLineage(unittest.TestCase):
    def setUp(self):
        self.doc = j("magic_box_real.json")
        self.possibilities = self.doc["possibilities"]
        self.path_ids = {p["id"] for p in j("funnel_real.json")["homepage_funnel"]["paths"]}

    def test_every_possibility_has_full_lineage(self):
        required = ("possibility_id", "target_category", "parent_path_ids", "friction_ids",
                    "source_evidence_ids", "operator", "operator_origin", "donor_capability_ids",
                    "assumption_challenged", "why_here", "product_archetype",
                    "engineering_envelope", "unknowns", "test",
                    "comparable_market_median_usd", "comparable_market_median_caveat")
        for p in self.possibilities:
            for k in required:
                self.assertIn(k, p, f"{p['id']} lacks {k}")

    def test_parent_paths_resolve_and_method_is_labelled(self):
        for p in self.possibilities:
            for pid in p["parent_path_ids"]:
                self.assertIn(pid, self.path_ids, f"{p['id']} cites unknown path {pid}")
            self.assertIn("METHOD_CHOICE", p["operator_origin"])
            self.assertEqual(p["design_dna"]["O"]["status"], "METHOD_CHOICE")
            self.assertIn("METHOD CHOICE", p["why_here"]["transformation"])

    def test_engineering_ranges_always_carry_provenance(self):
        for p in self.possibilities:
            env = p["engineering_envelope"]
            for key, block in env.items():
                if not isinstance(block, dict):
                    continue
                self.assertIn("epistemic_type", block, f"{p['id']}.{key} has an untyped value")
                if block["epistemic_type"] == "UNKNOWN":
                    self.assertNotIn("min", block, f"{p['id']}.{key}: UNKNOWN must stay empty")
                elif block["epistemic_type"] == "OBSERVED_COMPARABLE":
                    self.assertGreater(block["n_comparables"], 0)
            self.assertEqual(env["target_mass_kg"]["epistemic_type"], "UNKNOWN",
                             "no mass data exists - a value here would be invented")

    def test_reference_price_is_never_a_concept_price(self):
        for p in self.possibilities:
            ref = p["engineering_envelope"]["reference_market_price_usd"]
            self.assertEqual(ref["epistemic_type"], "REFERENCE_MARKET_PRICE")
            self.assertEqual(p["comparable_market_median_usd"], p["typical_market_price_usd"])
            self.assertIn("not a proposed price", p["comparable_market_median_caveat"] or "")

    def test_air_names_are_scoped_to_air(self):
        self.assertIn("AIR_PURIFICATION", self.doc["generation_method"]["scope"])
        for p in self.possibilities:
            self.assertEqual(p["target_category"], "AIR_PURIFICATION")

    def test_run_identity_exists(self):
        self.assertEqual(len(self.doc["run"]["input_snapshot_sha256"]), 64)


class TestMagicMutation(unittest.TestCase):
    """Removing a parent evidence object must genuinely weaken/invalidate
    the dependent possibilities; unchanged inputs must be idempotent."""

    def _docs(self):
        return {
            "signals_doc": j("signals_real.json"),
            "tensions_doc": j("research_tensions.json"),
            "assumptions_doc": j("category_assumptions.json"),
            "white_space_doc": j("white_space_real.json"),
        }

    def test_removing_signal_support_weakens_dependents(self):
        from magic_box_real import generate_possibilities
        docs = self._docs()
        mutated = copy.deepcopy(docs["signals_doc"])
        for s in mutated["signals"]:
            if s["id"] == "noise":
                s["research_support"] = []
        base = {p["id"]: p for p in generate_possibilities(**docs)}
        mut = {p["id"]: p for p in generate_possibilities(**dict(docs, signals_doc=mutated))}
        for pid in ("noise:AMBIENT", "noise:TEMPORAL_SHIFT", "noise:CROSS_CATEGORY_TRANSFER"):
            self.assertEqual(base[pid]["design_dna"]["T"]["status"], "PRESENT")
            self.assertEqual(mut[pid]["design_dna"]["T"]["status"], "MISSING_UNVERIFIED",
                             f"{pid}: removing its papers must break its tension lineage")
            self.assertEqual(mut[pid]["design_dna"]["A"]["status"], "MISSING_UNVERIFIED")
            self.assertEqual(mut[pid]["parent_path_ids"], [])
            self.assertNotEqual(base[pid]["why_here"]["product_consequence"],
                                mut[pid]["why_here"]["product_consequence"])

    def test_removing_a_tension_removes_it_from_lineage(self):
        from magic_box_real import generate_possibilities
        docs = self._docs()
        mutated = copy.deepcopy(docs["tensions_doc"])
        mutated["tensions"] = [t for t in mutated["tensions"] if t["tension_id"] != "T1"]
        mut = {p["id"]: p for p in generate_possibilities(**dict(docs, tensions_doc=mutated))}
        self.assertNotIn("tension:T1", mut["noise:AMBIENT"]["parent_path_ids"])

    def test_removing_prices_invalidates_economics(self):
        from magic_box_real import run_funnel
        docs = self._docs()
        doc = run_funnel(prices={}, **docs)
        evidence_stage = next(s for s in doc["funnel"] if s["stage"] == "evidence")
        self.assertEqual(evidence_stage["count"], 0,
                         "with no real prices, no possibility may claim economic evidence")
        for p in doc["possibilities"]:
            self.assertEqual(p["design_dna"]["E"]["status"], "MISSING_UNVERIFIED")

    def test_unchanged_inputs_are_idempotent(self):
        from magic_box_real import run_funnel
        docs = self._docs()
        a = json.dumps(run_funnel(**docs), sort_keys=True)
        b = json.dumps(run_funnel(**docs), sort_keys=True)
        self.assertEqual(a, b)


if __name__ == "__main__":
    unittest.main()
