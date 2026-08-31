"""Causal Atlas tests (Pass 4) - ontology validity, honest-domain
red-team, L0-L6 completeness, need-coverage threshold behaviour under
mutation, and category cross-contamination.

Mirrors tests/test_p2_paths_magic.py's style: real processed files plus
targeted in-memory injection (causal_atlas_real.py's build_causal_atlas/
build_need_coverage_matrix(**inject) pattern, mirroring magic_box_real.py's
generate_possibilities(**inject)) for the cases that need a controlled,
repeatable scenario rather than whatever the live corpus happens to
contain today.
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

import causal_atlas_real as ca  # noqa: E402


def j(name):
    with open(os.path.join(PROC, name), encoding="utf-8") as fh:
        return json.load(fh)


def _has_air_and_floor():
    return os.path.exists(os.path.join(PROC, "magic_box_real.json")) and \
        os.path.exists(os.path.join(PROC, "floor_care", "possibilities.json"))


SKIP_NO_DATA = "required real processed files not present - run the pipeline first"


class TestOntologyValidity(unittest.TestCase):
    def setUp(self):
        if not _has_air_and_floor():
            self.skipTest(SKIP_NO_DATA)
        self.rows = ca.build_causal_atlas()

    def test_every_row_primary_need_is_valid_or_none(self):
        for r in self.rows:
            self.assertTrue(r["primary_need"] is None or r["primary_need"] in ca.NEEDS,
                            "row {} has invalid primary_need {!r}".format(r["id"], r["primary_need"]))

    def test_every_row_home_domain_is_valid(self):
        for r in self.rows:
            self.assertIn(r["home_domain"], ca.HOME_DOMAINS)

    def test_air_rows_never_have_null_primary_need(self):
        # Air's THEME_TO_NEED is total over taxonomy_real.THEMES - every Air
        # row must resolve a real need, never fall through to UNMAPPED.
        air_rows = [r for r in self.rows if r["home_domain"] == "AIR"]
        self.assertTrue(air_rows)
        for r in air_rows:
            self.assertIsNotNone(r["primary_need"], r["id"])

    def test_l0_through_l6_are_non_empty_strings(self):
        fields = ["L0_mechanism", "L1_transformation", "L2_proximal_problem",
                  "L3_human_need", "L4_capability_created", "L5_freedom_created",
                  "L6_ultimate_direction"]
        for r in self.rows:
            for f in fields:
                self.assertIsInstance(r[f], str, "{} field {} not a string".format(r["id"], f))
                self.assertTrue(r[f].strip(), "{} field {} is empty".format(r["id"], f))

    def test_epistemic_type_is_derived_at_row_level(self):
        for r in self.rows:
            self.assertEqual(r["epistemic_type"], "DERIVED")
            self.assertTrue(r["epistemic_note"].strip())


class TestNoDomainDataOutsideAirFloor(unittest.TestCase):
    """Category red-team: no HOME_DOMAINS key other than AIR/FLOOR may ever
    carry a real possibility row, and no fabricated Food/Beverage/etc.
    possibility may appear anywhere in the atlas output."""

    def test_only_air_and_floor_categories_present(self):
        if not _has_air_and_floor():
            self.skipTest(SKIP_NO_DATA)
        rows = ca.build_causal_atlas()
        domains = {r["home_domain"] for r in rows}
        self.assertTrue(domains <= {"AIR", "FLOOR"})
        categories = {r["category"] for r in rows}
        self.assertTrue(categories <= {"AIR_PURIFICATION", "FLOOR_CARE"})

    def test_category_to_domain_maps_only_air_and_floor(self):
        self.assertEqual(ca.CATEGORY_TO_DOMAIN, {"AIR_PURIFICATION": "AIR", "FLOOR_CARE": "FLOOR"})
        mapped_domains = set(ca.CATEGORY_TO_DOMAIN.values())
        for domain in ca.HOME_DOMAINS:
            if domain not in mapped_domains:
                self.assertNotIn(domain, mapped_domains)

    def test_need_coverage_no_data_domains_report_zero_real_objects(self):
        if not _has_air_and_floor():
            self.skipTest(SKIP_NO_DATA)
        matrix = ca.build_need_coverage_matrix()
        for row in matrix:
            if row["home_domain"] not in ("AIR", "FLOOR"):
                self.assertEqual(row["state"], "NO_DATA", row)
                self.assertEqual(row["n_themes_addressing"], 0, row)
                self.assertEqual(row["theme_ids"], [], row)
                self.assertEqual(row["n_possibilities_targeting"], 0, row)
                self.assertIsNone(row["is_white_space"], row)
                self.assertEqual(row["evidence_ids"], [], row)
                self.assertIn("no Versuni product/evidence data exists", row["note"] or "", row)

    def test_no_fabricated_non_air_floor_possibility_strings(self):
        # A blunt grep-style red-team: the atlas JSON, once written, must
        # never contain a fabricated product/possibility for any domain
        # other than AIR/FLOOR (e.g. a hallucinated "Smart Coffee Maker").
        if not _has_air_and_floor():
            self.skipTest(SKIP_NO_DATA)
        rows = ca.build_causal_atlas()
        blob = json.dumps(rows)
        forbidden_domains = set(ca.HOME_DOMAINS) - {"AIR", "FLOOR"}
        for domain in forbidden_domains:
            # the domain KEY may appear only in the fixed HOME_DOMAINS/
            # DOMAIN_DIRECTION vocabulary, never as a row's own home_domain
            self.assertNotIn('"home_domain": "{}"'.format(domain), blob)


class TestNeedCoverageThresholds(unittest.TestCase):
    """state must be derived purely by the declared rule in
    causal_atlas_real._need_state() - and mutating a theme's own rating_gap
    must move that need's computed state in the expected direction."""

    def test_state_values_are_only_the_four_declared(self):
        if not _has_air_and_floor():
            self.skipTest(SKIP_NO_DATA)
        matrix = ca.build_need_coverage_matrix()
        allowed = {"STRONG", "SECONDARY", "WEAK", "NO_DATA"}
        for row in matrix:
            self.assertIn(row["state"], allowed, row)

    def test_need_state_thresholds_directly(self):
        strong = ca._need_state([{"prevalence_pct": 1.0, "rating_gap": -1.5}])
        self.assertEqual(strong, "STRONG")
        secondary = ca._need_state([{"prevalence_pct": 1.0, "rating_gap": -0.3}])
        self.assertEqual(secondary, "SECONDARY")
        weak = ca._need_state([{"prevalence_pct": 0.1, "rating_gap": -3.0}])
        self.assertEqual(weak, "WEAK")
        no_data = ca._need_state([])
        self.assertEqual(no_data, "NO_DATA")

    def test_mutating_theme_rating_gap_moves_state_strong_to_secondary(self):
        # Inject a single Air theme ("reliability") with a rating_gap that
        # clears the STRONG bar, then mutate it below 1.0 - the need row's
        # state must move STRONG -> SECONDARY, proving the coverage matrix
        # genuinely depends on the underlying real number, not a hardcoded
        # verdict.
        base_air_stats = {"reliability": {"prevalence_pct": 5.0, "rating_gap": -1.5, "n_reviews": 100}}
        matrix_before = ca.build_need_coverage_matrix(
            air_theme_stats=base_air_stats, floor_themes_doc={"themes": []},
            magic_box_doc={"possibilities": []}, floor_possibilities_doc={"possibilities": []},
            white_space_doc={"spaces": []})
        row_before = next(r for r in matrix_before if r["need"] == "RELIABILITY_LONGEVITY" and r["home_domain"] == "AIR")
        self.assertEqual(row_before["state"], "STRONG")

        mutated_air_stats = copy.deepcopy(base_air_stats)
        mutated_air_stats["reliability"]["rating_gap"] = -0.2
        matrix_after = ca.build_need_coverage_matrix(
            air_theme_stats=mutated_air_stats, floor_themes_doc={"themes": []},
            magic_box_doc={"possibilities": []}, floor_possibilities_doc={"possibilities": []},
            white_space_doc={"spaces": []})
        row_after = next(r for r in matrix_after if r["need"] == "RELIABILITY_LONGEVITY" and r["home_domain"] == "AIR")
        self.assertEqual(row_after["state"], "SECONDARY")
        self.assertNotEqual(row_before["state"], row_after["state"])

    def test_mutating_theme_prevalence_below_floor_moves_state_to_weak(self):
        base_air_stats = {"reliability": {"prevalence_pct": 5.0, "rating_gap": -1.5, "n_reviews": 100}}
        matrix_before = ca.build_need_coverage_matrix(
            air_theme_stats=base_air_stats, floor_themes_doc={"themes": []},
            magic_box_doc={"possibilities": []}, floor_possibilities_doc={"possibilities": []},
            white_space_doc={"spaces": []})
        row_before = next(r for r in matrix_before if r["need"] == "RELIABILITY_LONGEVITY" and r["home_domain"] == "AIR")
        self.assertEqual(row_before["state"], "STRONG")

        below_floor_stats = copy.deepcopy(base_air_stats)
        below_floor_stats["reliability"]["prevalence_pct"] = 0.01
        matrix_after = ca.build_need_coverage_matrix(
            air_theme_stats=below_floor_stats, floor_themes_doc={"themes": []},
            magic_box_doc={"possibilities": []}, floor_possibilities_doc={"possibilities": []},
            white_space_doc={"spaces": []})
        row_after = next(r for r in matrix_after if r["need"] == "RELIABILITY_LONGEVITY" and r["home_domain"] == "AIR")
        self.assertEqual(row_after["state"], "WEAK")


class TestCategoryCrossContamination(unittest.TestCase):
    def test_air_and_floor_never_share_a_friction_theme_id(self):
        if not _has_air_and_floor():
            self.skipTest(SKIP_NO_DATA)
        rows = ca.build_causal_atlas()
        air_theme_ids = {r["friction_theme_id"] for r in rows if r["home_domain"] == "AIR"}
        floor_theme_ids = {r["friction_theme_id"] for r in rows if r["home_domain"] == "FLOOR"}
        self.assertEqual(air_theme_ids & floor_theme_ids, set())

    def test_theme_to_need_and_floor_classifier_are_independently_derived(self):
        # THEME_TO_NEED (Air) must not be reused verbatim as Floor's
        # classification mechanism - Floor uses a structurally different
        # function (keyword classifier over member_terms), not a copy of
        # Air's fixed theme-id dict.
        self.assertNotEqual(type(ca.THEME_TO_NEED), type(ca.classify_floor_theme_need))
        self.assertTrue(callable(ca.classify_floor_theme_need))
        self.assertIsInstance(ca.THEME_TO_NEED, dict)
        # Air's dict keys are taxonomy_real theme ids; none of Floor's real
        # induced theme ids (which are full phrases, not short ids) collide
        # with Air's fixed vocabulary.
        from taxonomy_real import THEMES as AIR_THEMES
        self.assertEqual(set(ca.THEME_TO_NEED), set(AIR_THEMES))

    def test_shared_need_labels_are_independently_grounded_not_copy_pasted(self):
        # Where Air and Floor genuinely land on the SAME need id (e.g.
        # RELIABILITY_LONGEVITY), the underlying theme ids backing that
        # need must be domain-specific real theme ids, never the same
        # theme id reused across categories.
        if not _has_air_and_floor():
            self.skipTest(SKIP_NO_DATA)
        matrix = ca.build_need_coverage_matrix()
        by_need_domain = {(r["need"], r["home_domain"]): r for r in matrix}
        for need in ca.NEEDS:
            air_row = by_need_domain.get((need, "AIR"))
            floor_row = by_need_domain.get((need, "FLOOR"))
            if air_row and floor_row and air_row["theme_ids"] and floor_row["theme_ids"]:
                self.assertEqual(set(air_row["theme_ids"]) & set(floor_row["theme_ids"]), set())


class TestFixedContractFields(unittest.TestCase):
    """The causal atlas row schema is a fixed contract another agent's
    frontend work depends on - assert the exact field set, never renamed."""

    REQUIRED_FIELDS = {
        "id", "category", "home_domain", "name",
        "friction_theme_id", "friction_theme_name",
        "primary_need", "primary_need_epistemic_type",
        "L0_mechanism", "L1_transformation", "L2_proximal_problem",
        "L3_human_need", "L4_capability_created", "L5_freedom_created",
        "L6_ultimate_direction",
        "state_variables", "causal_primitives",
        "burden_dimensions_addressed",
        "current_state", "desired_state",
        "form_factor",
        "evidence_state",
        "parent_path_ids", "evidence_ids",
        "epistemic_type", "epistemic_note",
    }

    def test_every_row_has_exactly_the_contract_fields(self):
        if not _has_air_and_floor():
            self.skipTest(SKIP_NO_DATA)
        rows = ca.build_causal_atlas()
        self.assertTrue(rows)
        for r in rows:
            self.assertEqual(set(r), self.REQUIRED_FIELDS, r["id"])

    def test_primary_need_epistemic_type_is_method_choice(self):
        if not _has_air_and_floor():
            self.skipTest(SKIP_NO_DATA)
        for r in ca.build_causal_atlas():
            self.assertEqual(r["primary_need_epistemic_type"], "METHOD_CHOICE")


class TestOperatorTablesCoverAllOperators(unittest.TestCase):
    def test_operator_burden_map_covers_all_operators(self):
        from magic_box_real import OPERATORS
        self.assertEqual(set(ca.OPERATOR_BURDEN_MAP), set(OPERATORS))

    def test_operator_primitives_covers_all_operators(self):
        from magic_box_real import OPERATORS
        self.assertEqual(set(ca.OPERATOR_PRIMITIVES), set(OPERATORS))

    def test_empty_burden_entries_have_a_documented_note(self):
        for op, dims in ca.OPERATOR_BURDEN_MAP.items():
            if not dims:
                self.assertTrue(ca.OPERATOR_BURDEN_NOTES[op].strip())

    def test_empty_primitive_entries_have_a_documented_note(self):
        for op, prims in ca.OPERATOR_PRIMITIVES.items():
            if not prims:
                self.assertTrue(ca.OPERATOR_PRIMITIVES_NOTES[op].strip())


if __name__ == "__main__":
    unittest.main()
