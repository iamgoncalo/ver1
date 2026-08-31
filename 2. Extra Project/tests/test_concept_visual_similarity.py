"""Concept-visual similarity guard.

concept_visuals.py::spec_for() is supposed to render a genuinely different
silhouette per physical topology class (see magic_box_real.py::
FORM_FACTOR_TOPOLOGIES / FORM_FACTOR_RULE / compute_form_factor), not the
same tower() for almost everything. This test proves that structurally,
without eyeballing SVGs:

- for every pair of the 16 real Magic Box possibilities, build a
  "silhouette signature" - the geometric fingerprint of only the LEFT-side
  drawing region (header/silhouette/operator-decoration/caption), excluding
  the right-column real-evidence/comparable-envelope/unknown text block and
  the header/footer text that only ever restates the concept's own name/id;
- possibilities in DIFFERENT topology classes must never share a silhouette
  signature (that would mean two structurally different concepts render
  identically, the exact bug this test exists to catch);
- possibilities in the SAME topology class are allowed to share a
  silhouette signature (same base shape is honest - it is the operator that
  differs, not the topology), but must still differ somewhere in their full
  text content (name/id are unique per concept by construction; friction
  stats also differ whenever the friction theme differs).

Also asserts every drawn coordinate/size across all 16 concepts is a finite,
non-NaN number within (or reasonably near) the 640x420 canvas, and prints
the topology-class distribution across all 16 concepts so a human can sanity
-check that real differentiation happened (expect meaningfully more than 2
classes used).
"""
import math
import os
import sys
import unittest
from collections import defaultdict
from itertools import combinations

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))
sys.path.insert(0, os.path.join(ROOT, "src", "real"))

from concept_visuals import spec_for  # noqa: E402
from magic_box_real import FORM_FACTOR_TOPOLOGIES, generate_possibilities  # noqa: E402

# Right-column real-evidence text starts at x=350 (see concept_visuals.py's
# rx0); the header (concept name/subtitle) sits at y<60 and the footer
# (provenance/id) sits at y>340 - both restate identity, not topology.
RIGHT_COLUMN_X = 340
HEADER_Y_MAX = 60
FOOTER_Y_MIN = 340


def _shape_xy(s):
    if s["t"] == "text" or s["t"] == "rect":
        return s["x"], s["y"]
    if s["t"] == "line":
        return s["x1"], s["y1"]
    if s["t"] == "circle":
        return s["cx"], s["cy"]
    raise AssertionError("unknown primitive type: {}".format(s.get("t")))


def HEADER_Y_MIN_OK(y):
    return HEADER_Y_MAX <= y <= FOOTER_Y_MIN


def silhouette_signature(shapes):
    """A structural fingerprint of only the left-side silhouette/decoration
    region: primitive type + rounded position/size, excluding real-data
    text. Two concepts with an identical signature draw the same silhouette
    with the same decorations."""
    sig = []
    for s in shapes:
        x, y = _shape_xy(s)
        if x >= RIGHT_COLUMN_X or not HEADER_Y_MIN_OK(y):
            continue
        if s["t"] == "text":
            sig.append(("text", round(x), round(y), s["s"]))
        elif s["t"] == "rect":
            sig.append(("rect", round(x), round(y), round(s["w"]), round(s["h"]), bool(s.get("dash"))))
        elif s["t"] == "line":
            sig.append(("line", round(s["x1"]), round(s["y1"]), round(s["x2"]), round(s["y2"]), bool(s.get("dash"))))
        elif s["t"] == "circle":
            sig.append(("circle", round(s["cx"]), round(s["cy"]), round(s["r"]), bool(s.get("dash"))))
    return tuple(sorted(sig))


def full_text_signature(shapes):
    """Every text string drawn anywhere in the spec (header, silhouette,
    caption, right-column real evidence, footer id) - used to prove two
    same-topology concepts still differ SOMEWHERE, honestly (never forced)."""
    return tuple(s["s"] for s in shapes if s["t"] == "text")


def _numeric_fields(s):
    if s["t"] == "text":
        return [s["x"], s["y"], s["size"]]
    if s["t"] == "rect":
        return [s["x"], s["y"], s["w"], s["h"], s["rx"]]
    if s["t"] == "line":
        return [s["x1"], s["y1"], s["x2"], s["y2"]]
    if s["t"] == "circle":
        return [s["cx"], s["cy"], s["r"]]
    return []


class TestConceptVisualSimilarity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.possibilities = generate_possibilities()
        assert len(cls.possibilities) == 16, \
            "expected the 16 fixed theme x operator possibilities, got {}".format(len(cls.possibilities))
        cls.specs = {p["id"]: spec_for(p) for p in cls.possibilities}
        cls.topology = {
            p["id"]: (p.get("product_archetype") or {}).get("form_factor")
            for p in cls.possibilities
        }

    def test_every_possibility_has_a_declared_topology(self):
        for pid, form_factor in self.topology.items():
            self.assertIn(form_factor, FORM_FACTOR_TOPOLOGIES,
                           "{}: form_factor {!r} is not a declared topology class".format(pid, form_factor))

    def test_meaningfully_more_than_two_topology_classes_used(self):
        by_class = defaultdict(list)
        for p in self.possibilities:
            by_class[self.topology[p["id"]]].append("{} ({})".format(p["id"], p["name"]))

        print("\nTopology-class distribution across {} possibilities:".format(len(self.possibilities)))
        for cls_name in sorted(by_class, key=lambda k: -len(by_class[k])):
            print("  {:<22} {:>2}  {}".format(cls_name, len(by_class[cls_name]), by_class[cls_name]))

        self.assertGreater(len(by_class), 2,
                            "expected meaningfully more than 2 topology classes used across the 16 "
                            "possibilities - got: {}".format(sorted(by_class)))

    def test_different_topology_classes_never_share_a_silhouette_signature(self):
        offenders = []
        for a, b in combinations(self.possibilities, 2):
            if self.topology[a["id"]] == self.topology[b["id"]]:
                continue
            sig_a = silhouette_signature(self.specs[a["id"]])
            sig_b = silhouette_signature(self.specs[b["id"]])
            if sig_a == sig_b:
                offenders.append((a["id"], self.topology[a["id"]], b["id"], self.topology[b["id"]]))
        self.assertEqual(offenders, [],
                          "possibilities in different topology classes produced an identical "
                          "silhouette signature: {}".format(offenders))

    def test_same_topology_class_pairs_still_differ_in_text_content(self):
        for a, b in combinations(self.possibilities, 2):
            if self.topology[a["id"]] != self.topology[b["id"]]:
                continue
            text_a = full_text_signature(self.specs[a["id"]])
            text_b = full_text_signature(self.specs[b["id"]])
            self.assertNotEqual(
                text_a, text_b,
                "{} and {} share a topology class ({}) AND produced byte-identical text content - "
                "no real distinctness left at all".format(a["id"], b["id"], self.topology[a["id"]]))

    def test_no_nan_or_wildly_out_of_canvas_geometry(self):
        # A little slack beyond the 640x420 canvas is fine (dashes/strokes
        # can nudge a box's edge past the border) but NaN, None, or a wildly
        # negative/huge coordinate indicates a real geometry bug.
        for pid, shapes in self.specs.items():
            for s in shapes:
                for v in _numeric_fields(s):
                    self.assertIsInstance(v, (int, float), "{}: non-numeric field in {}".format(pid, s))
                    self.assertFalse(isinstance(v, float) and math.isnan(v), "{}: NaN in {}".format(pid, s))
                    self.assertGreater(v, -50, "{}: suspiciously negative coordinate in {}".format(pid, s))
                    self.assertLess(v, 700, "{}: coordinate far outside the 640x420 canvas in {}".format(pid, s))


if __name__ == "__main__":
    unittest.main()
