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
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROC = os.path.join(ROOT, "data", "processed")
OUT = os.path.join(ROOT, "web", "public", "concept-visuals")

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
    text(24, 52, "{} x {} - concept schematic".format(
        concept["friction_theme_name"], ops), size=11, fill=DIM)
    rect(0.5, 0.5, W - 1, H - 1, stroke=LINE, rx=14, sw=1)

    # ---- silhouette region (left, varies by archetype/operator) ----
    cx, cy = 170, 220

    def tower(x=cx, y=cy, w=90, h=150):
        rect(x - w / 2, y - h / 2, w, h, fill=SURFACE, stroke=INK, rx=14)
        line(x - w / 2 + 12, y - h / 2 + 22, x + w / 2 - 12, y - h / 2 + 22, stroke=FAINT)
        line(x - w / 2 + 12, y - h / 2 + 34, x + w / 2 - 12, y - h / 2 + 34, stroke=FAINT)
        circle(x, y + h / 2 - 26, 10, stroke=DIM)

    if ops == "DISTRIBUTE":
        for dx, dy in ((-70, -40), (0, 50), (70, -40)):
            rect(cx + dx - 28, cy + dy - 38, 56, 76, fill=SURFACE, stroke=INK, rx=10)
        line(cx - 42, cy - 20, cx - 14, cy + 26, stroke=FAINT, dash="4 3")
        line(cx + 42, cy - 20, cx + 14, cy + 26, stroke=FAINT, dash="4 3")
        text(cx, cy + 118, "several small nodes (operator rule)", size=10, fill=DIM, anchor="middle")
    elif ops == "CONCENTRATE":
        rect(cx - 110, cy - 55, 52, 90, fill="none", stroke=FAINT, rx=10, dash="4 3")
        rect(cx + 58, cy - 55, 52, 90, fill="none", stroke=FAINT, rx=10, dash="4 3")
        tower()
        line(cx - 56, cy - 8, cx - 46, cy - 8, stroke=DIM)
        line(cx + 56, cy - 8, cx + 46, cy - 8, stroke=DIM)
        text(cx, cy + 118, "several systems fold into one (operator rule)", size=10, fill=DIM, anchor="middle")
    elif ops == "PERSONALISE":
        circle(cx - 40, cy - 40, 16, stroke=INK)
        line(cx - 40, cy - 24, cx - 40, cy + 30, stroke=INK)
        line(cx - 40, cy - 8, cx - 64, cy + 12, stroke=INK)
        line(cx - 40, cy - 8, cx - 16, cy + 12, stroke=INK)
        rect(cx + 20, cy - 26, 52, 52, fill=SURFACE, stroke=INK, rx=12)
        line(cx - 14, cy - 2, cx + 18, cy - 2, stroke=TEAL, dash="3 3")
        text(cx, cy + 118, "scope: room -> individual (operator rule)", size=10, fill=DIM, anchor="middle")
    elif ops == "MOVE":
        tower(h=120)
        circle(cx - 28, cy + 74, 9, stroke=INK)
        circle(cx + 28, cy + 74, 9, stroke=INK)
        line(cx + 62, cy + 40, cx + 96, cy + 40, stroke=TEAL, sw=2)
        line(cx + 88, cy + 33, cx + 96, cy + 40, stroke=TEAL, sw=2)
        line(cx + 88, cy + 47, cx + 96, cy + 40, stroke=TEAL, sw=2)
        text(cx, cy + 118, "relocatable by construction (operator rule)", size=10, fill=DIM, anchor="middle")
    elif ops == "CROSS_CATEGORY_TRANSFER":
        tower()
        rect(cx - 160, cy - 40, 84, 60, fill="none", stroke=ROSE, rx=10, dash="5 4")
        text(cx - 118, cy - 12, "donor:", size=10, fill=ROSE, anchor="middle")
        text(cx - 118, cy + 2, "MISSING", size=10, fill=ROSE, anchor="middle", bold=True)
        line(cx - 74, cy - 10, cx - 48, cy - 10, stroke=ROSE, dash="5 4")
        text(cx, cy + 118, "transfer is a hypothesis until a donor exists", size=10, fill=ROSE, anchor="middle")
    elif ops == "TEMPORAL_SHIFT":
        tower()
        circle(cx + 84, cy - 66, 22, stroke=BLUE)
        line(cx + 84, cy - 66, cx + 84, cy - 80, stroke=BLUE)
        line(cx + 84, cy - 66, cx + 94, cy - 62, stroke=BLUE)
        text(cx, cy + 118, "the job moves earlier/later (operator rule)", size=10, fill=DIM, anchor="middle")
    elif ops in ("PREDICT", "AMBIENT", "MATERIALISE"):
        tower()
        for r in (18, 28, 38):
            circle(cx + 74, cy - 62, r, stroke=BLUE, dash="2 4", sw=1.1)
        text(cx, cy + 118, "sensing-led behaviour (operator rule)", size=10, fill=DIM, anchor="middle")
    else:  # MERGE / REMOVE / INVERT and any future operator
        tower()
        text(cx, cy + 118, "{} (operator rule)".format(ops.lower().replace("_", " ")),
             size=10, fill=DIM, anchor="middle")

    # ---- right column: what is real vs unknown ----
    rx0 = 350
    text(rx0, 96, "REAL EVIDENCE", size=10, fill=TEAL, bold=True, mono=True)
    text(rx0, 114, "friction: {}% of trusted reviews".format(concept["consumer_pain_prevalence_pct"]), size=11)
    text(rx0, 130, "rating gap: {}* ({} reviews)".format(
        concept["consumer_pain_csat"], (concept.get("consumer_pain_methodology") or {}).get("n_reviews")), size=11)

    y = 158
    text(rx0, y, "COMPARABLE ENVELOPE", size=10, fill=BLUE, bold=True, mono=True)
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
    text(rx0, y, "UNKNOWN (never invented)", size=10, fill=ROSE, bold=True, mono=True)
    y += 18
    for label in ("mass", "power", "dimensions", "target price"):
        text(rx0, y, "{}: no comparable publishes this".format(label), size=11, fill=FAINT)
        y += 15

    # footer provenance
    line(24, H - 44, W - 24, H - 44, stroke=LINE, sw=1)
    text(24, H - 26, "CONCEPT_VISUAL - machine-composed schematic from this innovation's own "
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
