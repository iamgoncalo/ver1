"""CONCEPT_VISUAL generator - one machine-composed schematic per Innovation.

Each visual is a deterministic function of the innovation's own real data
(operator, archetype rule, friction stats, engineering-envelope comparables)
- never a design rendering, never an invented product image. The same
neutral drawing spec is rendered to SVG here (for the web) and redrawn with
reportlab primitives by the dossier generator, so the web and PDF figures
are one artefact, not two hand-drawn ones.

Epistemic state: CONCEPT_VISUAL (the lowest prototype state - a visual of
the concept, NOT a digital model, functional simulation, physical
prototype, or user test). Provenance is stored beside every file.

Run:  python3 src/real/concept_visuals.py
"""
import json
import os
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")
OUT = os.path.join(ROOT, "web", "public", "concept-visuals")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
# form_factor is the SAME METHOD_CHOICE table magic_box_real.py uses to
# populate product_archetype.form_factor - imported, not re-authored here,
# so the two are never at risk of drifting apart. See magic_box_real.py::
# FORM_FACTOR_RULE/FORM_FACTOR_TOPOLOGIES/compute_form_factor for the full,
# documented reasoning behind every topology assignment.
from magic_box_real import FORM_FACTOR_TOPOLOGIES, compute_form_factor  # noqa: E402

W, H = 640, 420
INK = "#22262d"
DIM = "#6b7280"
FAINT = "#9aa1ab"
TEAL = "#1f7a6d"
BLUE = "#3a6ea5"
ROSE = "#a6433f"
LINE = "#d7dbe2"
SURFACE = "#f6f7f9"


def spec_for(concept):
    """Build the neutral drawing spec (list of primitives) from real data."""
    ops = concept["operator"]
    env = concept.get("engineering_envelope") or {}
    arch = concept.get("product_archetype") or {}
    mobility = (arch.get("mobility") or "").lower()
    # Prefer the form_factor already stored on the concept's own
    # product_archetype (the queryable, single-source-of-truth field magic_
    # box_real.py computes). Only fall back to computing it here if this
    # concept's stored data predates that field - never a second, diverging
    # judgment, the same compute_form_factor() function either way.
    form_factor = arch.get("form_factor")
    if not form_factor or form_factor not in FORM_FACTOR_TOPOLOGIES:
        form_factor = compute_form_factor(concept.get("friction_theme"), ops, concept.get("name"))
    shapes = []

    def text(x, y, s, size=12, fill=INK, bold=False, anchor="start", mono=False):
        shapes.append({"t": "text", "x": x, "y": y, "s": s, "size": size, "fill": fill,
                       "bold": bold, "anchor": anchor, "mono": mono})

    def rect(x, y, w, h, fill="none", stroke=INK, rx=8, dash=None, sw=1.6):
        shapes.append({"t": "rect", "x": x, "y": y, "w": w, "h": h, "fill": fill,
                       "stroke": stroke, "rx": rx, "dash": dash, "sw": sw})

    def line(x1, y1, x2, y2, stroke=DIM, dash=None, sw=1.4):
        shapes.append({"t": "line", "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                       "stroke": stroke, "dash": dash, "sw": sw})

    def circle(cx, cy, r, fill="none", stroke=INK, dash=None, sw=1.6):
        shapes.append({"t": "circle", "cx": cx, "cy": cy, "r": r, "fill": fill,
                       "stroke": stroke, "dash": dash, "sw": sw})

    # header
    text(24, 34, concept["name"], size=17, bold=True)
    text(24, 52, "{} x {} - concept schematic (topology: {})".format(
        concept["friction_theme_name"], ops, form_factor), size=11, fill=DIM)
    rect(0.5, 0.5, W - 1, H - 1, stroke=LINE, rx=14, sw=1)

    # ---- silhouette region (left) ----------------------------------------
    # The BASE SILHOUETTE shape is chosen by topology class (form_factor) -
    # see magic_box_real.py::FORM_FACTOR_TOPOLOGIES for what each class means
    # and why this concept landed there. Operator-specific DECORATIONS
    # (sensing rings, a donor-missing box, a clock, merge boxes) are then
    # layered on top independently of topology, because some of them carry
    # honesty-critical information (e.g. CROSS_CATEGORY_TRANSFER's donor gap)
    # that must show regardless of which silhouette the concept uses.
    cx, cy = 170, 220

    def tower(x=cx, y=cy, w=90, h=150):
        rect(x - w / 2, y - h / 2, w, h, fill=SURFACE, stroke=INK, rx=14)
        line(x - w / 2 + 12, y - h / 2 + 22, x + w / 2 - 12, y - h / 2 + 22, stroke=FAINT)
        line(x - w / 2 + 12, y - h / 2 + 34, x + w / 2 - 12, y - h / 2 + 34, stroke=FAINT)
        circle(x, y + h / 2 - 26, 10, stroke=DIM)

    def wall_panel(x=cx, y=cy):
        wall_y = y - 110
        line(x - 140, wall_y, x + 140, wall_y, stroke=INK, sw=2.2)
        for dx in (-120, -90, -60, -30, 0, 30, 60, 90, 120):
            line(x + dx, wall_y, x + dx - 8, wall_y + 10, stroke=FAINT, sw=1)
        pw, ph = 130, 46
        rect(x - pw / 2, wall_y + 14, pw, ph, fill=SURFACE, stroke=INK, rx=8)
        line(x - pw / 2 + 14, wall_y + 14 + 14, x + pw / 2 - 14, wall_y + 14 + 14, stroke=FAINT)
        circle(x, wall_y + 14 + ph - 14, 6, stroke=DIM)
        rect(x - pw / 2 - 6, wall_y + 14 + ph / 2 - 4, 6, 8, fill=INK, stroke=INK, rx=1)
        rect(x + pw / 2, wall_y + 14 + ph / 2 - 4, 6, 8, fill=INK, stroke=INK, rx=1)

    def window_frame(x=cx, y=cy):
        fw, fh = 130, 130
        fx, fy = x - fw / 2, y - fh / 2
        rect(fx - 10, fy - 10, fw + 20, fh + 20, fill="none", stroke=INK, rx=4, sw=2.2)
        rect(fx, fy, fw, fh, fill=SURFACE, stroke=INK, rx=2, sw=1.6)
        line(x, fy, x, fy + fh, stroke=INK, sw=1.4)
        line(fx, y, fx + fw, y, stroke=INK, sw=1.4)
        uw, uh = 60, 26
        rect(x - uw / 2, fy + fh - 4, uw, uh, fill=SURFACE, stroke=TEAL, rx=6)
        circle(x, fy + fh - 4 + uh / 2, 5, stroke=DIM)

    def portable_unit(x=cx, y=cy):
        w, h = 64, 54
        rect(x - w / 2, y - h / 2, w, h, fill=SURFACE, stroke=INK, rx=10)
        hx0, hx1 = x - 18, x + 18
        hy0, hy1 = y - h / 2 - 18, y - h / 2
        line(hx0, hy1, hx0, hy0, stroke=INK, sw=2)
        line(hx1, hy1, hx1, hy0, stroke=INK, sw=2)
        line(hx0, hy0, hx1, hy0, stroke=INK, sw=2)
        line(x - 40, y + h / 2 + 14, x + 40, y + h / 2 + 14, stroke=FAINT, dash="3 3")

    def distributed_nodes(x=cx, y=cy):
        for dx, dy in ((-70, -40), (0, 50), (70, -40)):
            rect(x + dx - 28, y + dy - 38, 56, 76, fill=SURFACE, stroke=INK, rx=10)
        line(x - 42, y - 20, x - 14, y + 26, stroke=FAINT, dash="4 3")
        line(x + 42, y - 20, x + 14, y + 26, stroke=FAINT, dash="4 3")

    def furniture_integrated_unit(x=cx, y=cy):
        fw, fh = 190, 20
        fy = y + 55
        rect(x - fw / 2, fy, fw, fh, fill=SURFACE, stroke=DIM, rx=4)
        for lx in (x - fw / 2 + 10, x + fw / 2 - 18):
            rect(lx, fy + fh, 8, 25, fill=DIM, stroke=DIM, rx=1)
        uw, uh = 70, 60
        rect(x - uw / 2, fy - uh + 8, uw, uh, fill=SURFACE, stroke=INK, rx=10)
        line(x - uw / 2 + 10, fy - uh + 24, x + uw / 2 - 10, fy - uh + 24, stroke=FAINT)
        circle(x, fy - 4, 7, stroke=DIM)

    def mobile_tower(x=cx, y=cy):
        tower(x=x, y=y, h=120)
        circle(x - 28, y + 74, 9, stroke=INK)
        circle(x + 28, y + 74, 9, stroke=INK)
        line(x + 62, y + 40, x + 96, y + 40, stroke=TEAL, sw=2)
        line(x + 88, y + 33, x + 96, y + 40, stroke=TEAL, sw=2)
        line(x + 88, y + 47, x + 96, y + 40, stroke=TEAL, sw=2)

    def wearable_person(x=cx, y=cy):
        circle(x - 40, y - 40, 16, stroke=INK)
        line(x - 40, y - 24, x - 40, y + 30, stroke=INK)
        line(x - 40, y - 8, x - 64, y + 12, stroke=INK)
        line(x - 40, y - 8, x - 16, y + 12, stroke=INK)
        line(x - 40, y + 30, x - 56, y + 70, stroke=INK)
        line(x - 40, y + 30, x - 24, y + 70, stroke=INK)
        circle(x - 40, y - 6, 9, fill=SURFACE, stroke=TEAL, sw=1.8)
        line(x - 40 - 6, y - 6, x - 40 + 6, y - 6, stroke=TEAL, dash="2 2")

    def other_unknown(x=cx, y=cy):
        tower(x=x, y=y)
        rect(x - 45, y - 75, 90, 150, fill="none", stroke=FAINT, dash="3 3", rx=14)
        text(x, y - 90, "?", size=22, fill=FAINT, anchor="middle", bold=True)

    TOPOLOGY_DRAW = {
        "tower": tower, "wall": wall_panel, "window": window_frame,
        "portable": portable_unit, "distributed": distributed_nodes,
        "furniture_integrated": furniture_integrated_unit, "mobile": mobile_tower,
        "wearable_personal": wearable_person, "other": other_unknown,
    }
    TOPOLOGY_DRAW.get(form_factor, other_unknown)()

    # ---- operator decorations (layered on top, independent of topology) --
    if ops == "CROSS_CATEGORY_TRANSFER":
        # donor_state is ALWAYS "MISSING" for this operator in this pipeline
        # (see magic_box_real.py::generate_possibilities) - shown regardless
        # of the concept's topology because it is honesty-critical, not
        # decorative.
        rect(cx - 160, cy - 40, 84, 60, fill="none", stroke=ROSE, rx=10, dash="5 4")
        text(cx - 118, cy - 12, "donor:", size=10, fill=ROSE, anchor="middle")
        text(cx - 118, cy + 2, "MISSING", size=10, fill=ROSE, anchor="middle", bold=True)
        line(cx - 74, cy - 10, cx - 48, cy - 10, stroke=ROSE, dash="5 4")
    elif ops == "CONCENTRATE":
        rect(cx - 110, cy - 55, 52, 90, fill="none", stroke=FAINT, rx=10, dash="4 3")
        rect(cx + 58, cy - 55, 52, 90, fill="none", stroke=FAINT, rx=10, dash="4 3")
        line(cx - 56, cy - 8, cx - 46, cy - 8, stroke=DIM)
        line(cx + 56, cy - 8, cx + 46, cy - 8, stroke=DIM)
    elif ops == "TEMPORAL_SHIFT":
        circle(cx + 84, cy - 66, 22, stroke=BLUE)
        line(cx + 84, cy - 66, cx + 84, cy - 80, stroke=BLUE)
        line(cx + 84, cy - 66, cx + 94, cy - 62, stroke=BLUE)
    elif ops in ("PREDICT", "AMBIENT", "MATERIALISE"):
        # AMBIENT sits on the wall topology, which occupies the upper-centre
        # of the canvas, so its sensing rings are anchored further out to
        # avoid drawing on top of the panel itself.
        rcx, rcy = (cx + 130, cy - 150) if form_factor == "wall" else (cx + 74, cy - 62)
        for r in (18, 28, 38):
            circle(rcx, rcy, r, stroke=BLUE, dash="2 4", sw=1.1)

    # caption naming the operator rule that shaped this concept - independent
    # of which topology/decoration drew above.
    OPERATOR_CAPTIONS = {
        "DISTRIBUTE": "several small nodes (operator rule)",
        "CONCENTRATE": "several systems fold into one (operator rule)",
        "PERSONALISE": "scope: room -> individual (operator rule)",
        "MOVE": "relocatable by construction (operator rule)",
        "CROSS_CATEGORY_TRANSFER": "transfer is a hypothesis until a donor exists",
        "TEMPORAL_SHIFT": "the job moves earlier/later (operator rule)",
        "PREDICT": "sensing-led behaviour (operator rule)",
        "AMBIENT": "sensing-led behaviour (operator rule)",
        "MATERIALISE": "sensing-led behaviour (operator rule)",
    }
    caption = OPERATOR_CAPTIONS.get(ops, "{} (operator rule)".format(ops.lower().replace("_", " ")))
    caption_fill = ROSE if ops == "CROSS_CATEGORY_TRANSFER" else DIM
    text(cx, cy + 118, caption, size=10, fill=caption_fill, anchor="middle")

    # ---- right column: what is real vs unknown ----
    rx0 = 350
    text(rx0, 96, "Real evidence", size=10, fill=TEAL, bold=True, mono=True)
    text(rx0, 114, "friction: {}% of trusted reviews".format(concept["consumer_pain_prevalence_pct"]), size=11)
    text(rx0, 130, "rating gap: {}* ({} reviews)".format(
        concept["consumer_pain_csat"], (concept.get("consumer_pain_methodology") or {}).get("n_reviews")), size=11)

    y = 158
    text(rx0, y, "Comparable envelope", size=10, fill=BLUE, bold=True, mono=True)
    y += 18
    for key, label, unit in (("performance_cadr_m3h", "clean-air delivery", "m3/h"),
                              ("room_coverage_m2", "room coverage", "m2"),
                              ("acoustic_min_dba", "min. noise", "dBA")):
        block = env.get(key) or {}
        if block.get("epistemic_type") == "OBSERVED_COMPARABLE":
            text(rx0, y, "{}: {}-{} {} (n={})".format(
                label, block["min"], block["max"], unit, block["n_comparables"]), size=11)
        else:
            text(rx0, y, "{}: unknown".format(label), size=11, fill=FAINT)
        y += 16
    ref = env.get("reference_market_price_usd") or {}
    if ref.get("median") is not None:
        text(rx0, y, "comparable median: ${} ({} products)".format(
            ref["median"], ref["n_comparables"]), size=11)
        y += 16

    y += 8
    text(rx0, y, "Unknown (never invented)", size=10, fill=ROSE, bold=True, mono=True)
    y += 18
    for label in ("mass", "power", "dimensions", "target price"):
        text(rx0, y, "{}: no comparable publishes this".format(label), size=11, fill=FAINT)
        y += 15

    # footer provenance
    line(24, H - 44, W - 24, H - 44, stroke=LINE, sw=1)
    text(24, H - 26, "Concept visual — machine-composed schematic from this innovation's own "
                     "stored data. Not a design rendering; no invented geometry.", size=9, fill=FAINT)
    text(24, H - 13, "tool: Claude Fable 5 generator (src/real/concept_visuals.py) - id: {}".format(
        concept["id"]), size=9, fill=FAINT, mono=True)
    return shapes


def to_svg(shapes):
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {} {}" width="{}" height="{}">'.format(W, H, W, H),
             '<rect width="{}" height="{}" fill="white"/>'.format(W, H)]
    for s in shapes:
        if s["t"] == "text":
            family = "ui-monospace,Menlo,monospace" if s.get("mono") else "system-ui,Segoe UI,sans-serif"
            parts.append('<text x="{}" y="{}" font-size="{}" fill="{}" font-family="{}"{}{}>{}</text>'.format(
                s["x"], s["y"], s["size"], s["fill"], family,
                ' font-weight="700"' if s.get("bold") else "",
                ' text-anchor="middle"' if s.get("anchor") == "middle" else "",
                s["s"].replace("&", "&amp;").replace("<", "&lt;")))
        elif s["t"] == "rect":
            parts.append('<rect x="{}" y="{}" width="{}" height="{}" rx="{}" fill="{}" stroke="{}" stroke-width="{}"{}/>'.format(
                s["x"], s["y"], s["w"], s["h"], s["rx"], s["fill"], s["stroke"], s["sw"],
                ' stroke-dasharray="{}"'.format(s["dash"]) if s.get("dash") else ""))
        elif s["t"] == "line":
            parts.append('<line x1="{}" y1="{}" x2="{}" y2="{}" stroke="{}" stroke-width="{}"{}/>'.format(
                s["x1"], s["y1"], s["x2"], s["y2"], s["stroke"], s["sw"],
                ' stroke-dasharray="{}"'.format(s["dash"]) if s.get("dash") else ""))
        elif s["t"] == "circle":
            parts.append('<circle cx="{}" cy="{}" r="{}" fill="{}" stroke="{}" stroke-width="{}"{}/>'.format(
                s["cx"], s["cy"], s["r"], s["fill"], s["stroke"], s["sw"],
                ' stroke-dasharray="{}"'.format(s["dash"]) if s.get("dash") else ""))
    parts.append("</svg>")
    return "\n".join(parts)


def main():
    with open(os.path.join(PROC, "criteria_real.json"), encoding="utf-8") as fh:
        concepts = json.load(fh)["concepts"]
    os.makedirs(OUT, exist_ok=True)
    for c in concepts:
        shapes = spec_for(c)
        base = c["id"].replace(":", "_")
        with open(os.path.join(OUT, base + ".svg"), "w", encoding="utf-8") as fh:
            fh.write(to_svg(shapes))
        with open(os.path.join(OUT, base + ".spec.json"), "w", encoding="utf-8") as fh:
            json.dump(shapes, fh)
        with open(os.path.join(OUT, base + ".provenance.json"), "w", encoding="utf-8") as fh:
            json.dump({
                "tool": "Claude Fable 5 generator - src/real/concept_visuals.py",
                "generator_version": "1.0",
                "innovation_id": c["id"],
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "artifact_state": "CONCEPT_VISUAL",
                "note": "Machine-composed schematic from the innovation's stored fields only "
                        "(operator rule, friction stats, comparable envelope). Not a design "
                        "rendering; a Fable render or drawing would also be CONCEPT_VISUAL, "
                        "never a digital model or physical prototype.",
            }, fh, indent=2)
    print("wrote {} concept visuals to web/public/concept-visuals/".format(len(concepts)))


if __name__ == "__main__":
    main()
