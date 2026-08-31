"""Innovation lifecycle tests - forward/reverse lineage, the 8-value
lifecycle enum, idempotent no-fake-novelty reruns, and proof that removing
is_finalist from the state rule genuinely decouples state from the
magic-box top-3-by-pain cut.

Mirrors tests/test_p2_paths_magic.py's style: real processed files plus
targeted in-memory injection (magic_box_real.py's generate_possibilities/
run_funnel(**inject) pattern, and innovations_real.py's own
update_registry(records, registry=..., input_hash=...) pattern) for the
cases that need a controlled, repeatable scenario rather than whatever the
live corpus happens to contain today.
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

import innovations_real  # noqa: E402


def j(name):
    with open(os.path.join(PROC, name), encoding="utf-8") as fh:
        return json.load(fh)


class TestForwardLineage(unittest.TestCase):
    """Every non-empty parent_path_ids id an innovation cites must resolve
    to a real funnel path - lineage that points nowhere would be worse than
    no lineage at all."""

    def test_parent_path_ids_resolve(self):
        doc = j("innovations_real.json")
        path_ids = {p["id"] for p in j("funnel_real.json")["homepage_funnel"]["paths"]}
        seen_non_empty = False
        for i in doc["innovations"]:
            for pid in i.get("parent_path_ids") or []:
                seen_non_empty = True
                self.assertIn(pid, path_ids, f"{i['innovation_id']} cites unknown path {pid}")
        self.assertTrue(seen_non_empty, "no innovation carries any parent_path_ids - lineage test is vacuous")


class TestReverseLineage(unittest.TestCase):
    """Every path's derived_possibility_ids must be the exact set of Magic
    Box possibilities whose own parent_path_ids cite that path - not a
    superset, not a subset, not invented."""

    def setUp(self):
        self.paths = j("funnel_real.json")["homepage_funnel"]["paths"]
        self.possibilities = j("magic_box_real.json")["possibilities"]

    def test_derived_possibility_ids_are_correct_and_complete(self):
        possibility_ids = {p["id"] for p in self.possibilities}
        expected_by_path = {}
        for p in self.possibilities:
            for pid in (p.get("parent_path_ids") or []):
                expected_by_path.setdefault(pid, set()).add(p["id"])

        any_non_empty = False
        for path in self.paths:
            derived = path.get("derived_possibility_ids")
            self.assertIsNotNone(derived, f"{path['id']} has no derived_possibility_ids field")
            # every id in the list is a real possibility id
            for pid in derived:
                self.assertIn(pid, possibility_ids, f"{path['id']}.derived_possibility_ids cites unknown possibility {pid}")
            # the set is exactly what a fresh independent scan produces
            self.assertEqual(set(derived), expected_by_path.get(path["id"], set()),
                             f"{path['id']}.derived_possibility_ids does not match an independent recount")
            if derived:
                any_non_empty = True
        self.assertTrue(any_non_empty, "no path carries any derived_possibility_ids - reverse lineage test is vacuous")

    def test_empty_where_genuinely_none(self):
        possibility_ids = {p["id"] for p in self.possibilities}
        cited_path_ids = set()
        for p in self.possibilities:
            cited_path_ids.update(p.get("parent_path_ids") or [])
        for path in self.paths:
            if path["id"] not in cited_path_ids:
                self.assertEqual(path["derived_possibility_ids"], [],
                                 f"{path['id']} is not cited by any possibility but has non-empty derived_possibility_ids")
        del possibility_ids  # only used for readability above


class TestLifecycleEnum(unittest.TestCase):
    def test_lifecycle_is_one_of_eight_values(self):
        doc = j("innovations_real.json")
        values = set(innovations_real.LIFECYCLE_VALUES)
        self.assertEqual(len(values), 8)
        for i in doc["innovations"]:
            self.assertIn(i["lifecycle"], values, f"{i['innovation_id']} has an invalid lifecycle {i['lifecycle']!r}")
        # archived ids never appear in the active population
        self.assertTrue(all(i["lifecycle"] != "archived" for i in doc["innovations"]))

    def test_archived_entries_carry_reason_run_and_date(self):
        doc = j("innovations_real.json")
        for a in doc["archived_innovations"]:
            self.assertTrue(a.get("reason"))
            self.assertTrue(a.get("run_id"))
            self.assertTrue(a.get("date"))
            self.assertIn("fingerprint", a.get("previous_evidence") or {})

    def test_state_rule_no_longer_reads_is_finalist(self):
        src_path = os.path.join(ROOT, "src", "real", "innovations_real.py")
        with open(src_path, encoding="utf-8") as fh:
            src = fh.read()
        # the function body itself must never branch on is_finalist - only
        # comments/docstrings may still mention the word to explain why not
        import ast
        tree = ast.parse(src)
        fn = next(n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name == "innovation_state")
        fn_src = ast.get_source_segment(src, fn)
        self.assertNotIn("is_finalist", fn_src)


class TestNoFakeNovelty(unittest.TestCase):
    """Rerunning innovations_real.py twice on byte-identical inputs must
    report new_this_run: [] the second time - Air's fixed 16 (theme,
    operator) pairs regenerating is not novelty."""

    def test_second_build_reports_no_new_innovations(self):
        doc1 = innovations_real.build()
        self.assertIn("new_this_run", doc1)
        doc2 = innovations_real.build()
        self.assertEqual(doc2["new_this_run"], [])
        # every id present in run 1 is still present, with a stable lifecycle
        # field (not necessarily "new" any more, but not fabricated either)
        ids1 = {i["innovation_id"] for i in doc1["innovations"]}
        ids2 = {i["innovation_id"] for i in doc2["innovations"]}
        self.assertEqual(ids1, ids2)


class TestFinalistDoesNotDriveLifecycle(unittest.TestCase):
    """Mutating a concept's is_finalist in memory must not change the
    resulting state - everything else held equal. Proven directly against
    innovation_state(), which is the only function that used to read it."""

    def test_is_finalist_mutation_is_inert(self):
        criteria = j("criteria_real.json")
        graveyard_by_id = {g["id"]: g for g in criteria["graveyard"]}
        concept = next(c for c in criteria["concepts"] if c["id"] not in graveyard_by_id)

        as_true = copy.deepcopy(concept)
        as_true["is_finalist"] = True
        as_false = copy.deepcopy(concept)
        as_false["is_finalist"] = False

        state_true, why_true = innovations_real.innovation_state(as_true, graveyard_by_id)
        state_false, why_false = innovations_real.innovation_state(as_false, graveyard_by_id)
        self.assertEqual(state_true, state_false)
        self.assertEqual(why_true, why_false)


class TestSupersessionMechanism(unittest.TestCase):
    """Air's fixed table produces zero real supersessions today (every
    operator sharing a theme shares that theme's exact evidence set, never
    a strict superset) - proven here, alongside an injected scenario that
    proves the detection mechanism itself fires correctly when a genuine
    superset does exist."""

    def test_zero_supersessions_on_real_current_corpus(self):
        criteria = j("criteria_real.json")
        concepts_by_id = {c["id"]: c for c in criteria["concepts"]}
        result = innovations_real.detect_supersession(concepts_by_id)
        self.assertEqual(result, {})

    def test_mechanism_fires_on_a_genuine_superset(self):
        concepts_by_id = {
            "themeA:OP1": {"friction_theme": "themeA", "source_evidence_ids": ["RP-01"],
                          "critic_overall": "NEEDS_EVIDENCE"},
            "themeA:OP2": {"friction_theme": "themeA", "source_evidence_ids": ["RP-01", "RP-02"],
                          "critic_overall": "SURVIVE"},
        }
        result = innovations_real.detect_supersession(concepts_by_id)
        self.assertEqual(result, {"themeA:OP1": "themeA:OP2"})

    def test_equal_evidence_within_a_theme_is_not_supersession(self):
        # what Air's real table actually produces: same theme, same
        # evidence, different operator - parallel design variety, not a
        # duplicate.
        concepts_by_id = {
            "themeA:OP1": {"friction_theme": "themeA", "source_evidence_ids": ["RP-01"],
                          "critic_overall": "SURVIVE"},
            "themeA:OP2": {"friction_theme": "themeA", "source_evidence_ids": ["RP-01"],
                          "critic_overall": "SURVIVE"},
        }
        result = innovations_real.detect_supersession(concepts_by_id)
        self.assertEqual(result, {})


class TestRegistryIdempotencyAndStaleness(unittest.TestCase):
    """Exercises update_registry() directly with a fully in-memory registry
    and persist=False (never touching data/processed/innovation_registry.json
    - persist=False is REQUIRED here, otherwise these synthetic 'themeX:OP1'
    scratch records would overwrite the real ledger) to prove: a recheck on
    an unchanged hash advances nothing; a genuinely new run with unchanged
    fingerprints advances staleness counters; and STALE_AFTER_RUNS
    consecutive unchanged genuine runs produces 'stale'."""

    def _records(self, evidence=("RP-01",)):
        return [{"id": "themeX:OP1", "friction_theme": "themeX", "operator": "OP1",
                 "parent_path_ids": ["tension:T1"], "source_evidence_ids": list(evidence),
                 "state": "developing", "critic_overall": "NEEDS_EVIDENCE"}]

    def _update(self, records, registry, input_hash):
        return innovations_real.update_registry(records, registry=registry, input_hash=input_hash, persist=False)

    def test_recheck_does_not_advance_state(self):
        registry = {"last_input_hash": None, "run_counter": 0, "innovations": {}}
        registry, new1, _ = self._update(self._records(), registry, "h1")
        self.assertEqual(new1, ["themeX:OP1"])
        entry_after_run1 = copy.deepcopy(registry["innovations"]["themeX:OP1"])

        registry, new2, _ = self._update(self._records(), registry, "h1")
        self.assertEqual(new2, [])
        self.assertEqual(registry["innovations"]["themeX:OP1"]["lifecycle"], entry_after_run1["lifecycle"])
        self.assertEqual(registry["innovations"]["themeX:OP1"]["consecutive_unchanged_runs"],
                         entry_after_run1["consecutive_unchanged_runs"])

    def test_stale_after_n_consecutive_unchanged_genuine_runs(self):
        registry = {"last_input_hash": None, "run_counter": 0, "innovations": {}}
        registry, _, _ = self._update(self._records(), registry, "h0")
        for n in range(1, innovations_real.STALE_AFTER_RUNS + 1):
            registry, _, _ = self._update(self._records(), registry, f"h{n}")
        self.assertEqual(registry["innovations"]["themeX:OP1"]["lifecycle"], "stale")

    def test_updated_when_fingerprint_changes(self):
        registry = {"last_input_hash": None, "run_counter": 0, "innovations": {}}
        registry, _, _ = self._update(self._records(), registry, "h0")
        registry, _, _ = self._update(self._records(evidence=("RP-01", "RP-02")), registry, "h1")
        self.assertEqual(registry["innovations"]["themeX:OP1"]["lifecycle"], "updated")

    def test_archived_after_grace_period_and_never_deleted(self):
        rejected_records = [{"id": "themeX:OP1", "friction_theme": "themeX", "operator": "OP1",
                             "parent_path_ids": [], "source_evidence_ids": ["RP-01"],
                             "state": "rejected", "critic_overall": "REJECT"}]
        registry = {"last_input_hash": None, "run_counter": 0, "innovations": {}}
        registry, _, archived0 = self._update(rejected_records, registry, "h0")
        self.assertEqual(archived0, [])
        for n in range(1, innovations_real.ARCHIVE_GRACE_RUNS + 1):
            registry, _, archived = self._update(rejected_records, registry, f"h{n}")
        self.assertEqual([a["innovation_id"] for a in archived], ["themeX:OP1"])
        # never deleted - the full history survives inside the registry
        self.assertTrue(registry["innovations"]["themeX:OP1"]["history"])


if __name__ == "__main__":
    unittest.main()
