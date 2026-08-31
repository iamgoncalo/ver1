#!/usr/bin/env python3
"""Innovation dossiers - public Extra Project artefacts.

Writes web/public/innovation-dossiers/<innovation_id with ':' -> '_'>.pdf,
one 5-page dossier per innovation in data/processed/innovations_real.json.

Ten-section outline (spread across 5 pages so nothing is force-cramped):
  Page 1  1. What is it?              - name + one-sentence proposition
          2. Physical architecture    - product archetype (+ form_factor if
                                        Agent 2 has added it), the redrawn
                                        concept figure, mechanism/operator
  Page 2  3. Why it exists            - the 3-part why_here derivation
                                        verbatim, plus target user/context
          4. Evidence and lineage     - parent paths (name, epistemic class,
                                        falsifier test, reverse
                                        derived_possibility_ids if present),
                                        evidence ids, design-DNA table
  Page 3  5. Comparable products      - the OBSERVED_COMPARABLE envelope rows
                                        with their source/n, as real
                                        comparables, not this concept's spec
          6. Engineering envelope     - the full typed table (CADR, coverage,
                                        acoustic, mass, power, dimensions)
  Page 4  7. Economics                - price-weighted exposure + comparable
                                        market median (explicitly not this
                                        concept's price) + both caveats
          8. Prototype                - prototype_state, honestly stating
                                        nothing more exists
          9. Experiment / next learning - next_experiment, kill_criterion
  Page 5  10. What could kill it?     - state_why (rejected/challenged) or
                                        kill_criterion + contradictions +
                                        uncertainties, critic dimensions,
                                        criteria summary, lineage/provenance

Honesty rules (same as the rest of the pipeline):
- every substantive string is taken from the stored JSON, never invented;
- UNKNOWN stays UNKNOWN, epistemic types are printed next to the data - only
  their CASING is normalised for display (see LABEL_MAP / desnake_lead), the
  words themselves are never changed or removed;
- the obsolete funnel wording is never used.

This file must not touch src/real/generate_innovation_disclosures.py or
web/public/innovation-disclosures/* (the formal case's artifacts).
"""

import json
import os
import re
from collections import Counter

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas as pdfcanvas

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
INNOV_PATH = os.path.join(ROOT, "data", "processed", "innovations_real.json")
FUNNEL_PATH = os.path.join(ROOT, "data", "processed", "funnel_real.json")
SPEC_DIR = os.path.join(ROOT, "web", "public", "concept-visuals")
OUT_DIR = os.path.join(ROOT, "web", "public", "innovation-dossiers")

PAGE_W, PAGE_H = LETTER
MARGIN = 48
CONTENT_W = PAGE_W - 2 * MARGIN
BOTTOM = 58
FOOTER_Y = 36
N_PAGES = 5

# ---------------------------------------------------------------- palette
INK = HexColor("#1a1d23")
MUT = HexColor("#5b6470")
FAINT = HexColor("#8a919c")
RULE = HexColor("#d7dbe2")
PANEL = HexColor("#f4f5f7")
TEAL = HexColor("#1f7a6d")     # observed / real evidence
BLUE = HexColor("#3a6ea5")     # method choice / design rule
AMBER = HexColor("#a06a14")    # challenged
RED = HexColor("#a33a3a")      # rejected / kill
GREEN = HexColor("#2f7d4f")    # developing
GRAY = HexColor("#6b7280")     # unknown / needs evidence

STATE_COLORS = {
    "developing": GREEN,
    "challenged": AMBER,
    "rejected": RED,
    "paused": GRAY,
}

TAG_COLORS = {
    "OBSERVED_COMPARABLE": TEAL,
    "REFERENCE_MARKET_PRICE": BLUE,
    "UNKNOWN": GRAY,
    "PRESENT": TEAL,
    "MISSING_UNVERIFIED": GRAY,
    "METHOD_CHOICE": BLUE,
    "DESIGN_RULE": BLUE,
    "PASS": TEAL,
    "SURVIVE": TEAL,
    "CHALLENGE": AMBER,
    "NEEDS_EVIDENCE": GRAY,
    "KILL": RED,
    "REJECT": RED,
    "TENSION": AMBER,
    "ASSUMPTION_TO_TEST": BLUE,
    "NOT_MODELLED": GRAY,
    "N/A": GRAY,
}

F = "Helvetica"
FB = "Helvetica-Bold"
FO = "Helvetica-Oblique"
M = "Courier"
MB = "Courier-Bold"

# reportlab base-14 fonts are latin-1; map the few non-latin-1 glyphs the
# corpus actually contains, then hard-guarantee latin-1.
_REPL = {
    "—": "-", "–": "-", "→": "->", "←": "<-",
    "⇄": "<->", "★": "*", "☆": "*", "✕": "x",
    "✓": "v", "™": "(TM)", "‘": "'", "’": "'",
    "“": '"', "”": '"', "•": "-", "…": "...",
    " ": " ",
}


def S(text):
    if text is None:
        return ""
    t = str(text)
    for k, v in _REPL.items():
        t = t.replace(k, v)
    return t.encode("latin-1", "replace").decode("latin-1")


def pretty_key(k):
    return S(k).replace("_", " ")


# --------------------------------------------------------- epistemic labels
# Every epistemic-type / status enum this pipeline actually produces, mapped
# to a human, sentence-case phrase. The pipeline data itself never changes -
# only how a bare enum token is *displayed* when our own code draws it as a
# label or chip. Free-text sentences copied verbatim from the JSON (e.g.
# state_why, detail fields) are never rewritten, even if they happen to
# mention an enum mid-sentence - only strings that ARE a bare tag, or that
# are a stored "TAG - clause" record (product_archetype/mechanism
# epistemic_type, the per-field UNKNOWN notes), get relabelled.
LABEL_MAP = {
    "UNKNOWN": "Unknown",
    "OBSERVED_COMPARABLE": "Observed comparable",
    "REFERENCE_MARKET_PRICE": "Reference market price",
    "PRESENT": "Present",
    "MISSING_UNVERIFIED": "Missing / unverified",
    "METHOD_CHOICE": "Method choice",
    "DESIGN_RULE": "Design rule",
    "PASS": "Pass",
    "SURVIVE": "Survive",
    "CHALLENGE": "Challenge",
    "NEEDS_EVIDENCE": "Needs evidence",
    "KILL": "Kill",
    "REJECT": "Reject",
    "TENSION": "Tension",
    "ASSUMPTION_TO_TEST": "Assumption to test",
    "CONCEPT_VISUAL": "Concept visual",
    "OBSERVED": "Observed",
    "RESEARCH_TENSION": "Research tension",
    "FEASIBILITY_PRECEDENT": "Feasibility precedent",
    "NOT_MODELLED": "Not modelled",
    "N/A": "N/A",
    "developing": "Developing",
    "challenged": "Challenged",
    "rejected": "Rejected",
    "paused": "Paused",
}

_LEAD_RE = re.compile(r"^([A-Za-z][A-Za-z0-9_/]*)\s*[-—–]\s*(.*)$",
                       re.S)


def LBL(tag):
    """Human, sentence-case label for a bare epistemic-type/status token."""
    tag = "" if tag is None else str(tag)
    if tag in LABEL_MAP:
        return LABEL_MAP[tag]
    if tag.isupper():
        return tag.replace("_", " ").capitalize()
    return tag


def desnake_lead(text):
    """For a stored 'TOKEN - clause' record, relabel only the leading token
    (must be a known enum in LABEL_MAP) and keep the rest of the sentence
    exactly as authored. Anything else is returned untouched."""
    text = "" if text is None else str(text)
    m = _LEAD_RE.match(text)
    if not m:
        return text
    token, rest = m.group(1), m.group(2)
    if token in LABEL_MAP:
        return "%s - %s" % (LABEL_MAP[token], rest)
    return text


# friendly names for the engineering-envelope metrics (mirrors the web UI's
# ENV_LABEL in InnovationsWorld.tsx so the two artefacts read consistently)
ENV_LABEL = {
    "performance_cadr_m3h": "clean-air delivery rate (CADR)",
    "room_coverage_m2": "room coverage",
    "acoustic_min_dba": "minimum noise",
    "target_mass_kg": "target mass",
    "target_power_w": "target power",
    "target_dimensions": "target dimensions",
    "reference_market_price_usd": "reference market price",
}


# ---------------------------------------------------------------- layout
class Flow:
    """A vertical flow of wrapped text inside a column.

    In dry mode nothing is drawn; overflow is recorded instead so the caller
    can retry the whole page at a smaller scale.  This is what guarantees
    zero overflow: a page is only really drawn at a scale whose dry run fit.
    """

    def __init__(self, c, x, w, y_top, y_bottom, scale=1.0, dry=False):
        self.c = c
        self.x = x
        self.w = w
        self.y = y_top
        self.bottom = y_bottom
        self.k = scale
        self.dry = dry
        self.overflow = False

    def _use(self, h):
        self.y -= h
        if self.y < self.bottom - 0.5:
            self.overflow = True

    def gap(self, h):
        self._use(h * self.k)

    def rule(self, color=RULE, width=0.7):
        self._use(3)
        if not self.dry and not self.overflow:
            self.c.setStrokeColor(color)
            self.c.setLineWidth(width)
            self.c.line(self.x, self.y, self.x + self.w, self.y)
        self._use(3)

    def section(self, title, color=INK, size=10.6):
        """Top-level numbered section header (sentence case, never typed in
        caps - the rule above + bold weight carry the visual emphasis)."""
        size *= self.k
        self._use(5 * self.k)
        if not self.dry and not self.overflow:
            self.c.setStrokeColor(INK)
            self.c.setLineWidth(1.1)
            self.c.line(self.x, self.y, self.x + self.w, self.y)
        self._use(size + 5 * self.k)
        if not self.dry and not self.overflow:
            self.c.setFont(FB, size)
            self.c.setFillColor(color)
            self.c.drawString(self.x, self.y, S(title))
        self._use(4 * self.k)

    def label(self, text, color=MUT, size=6.9):
        size *= self.k
        self._use(size + 3 * self.k)
        if not self.dry and not self.overflow:
            self.c.setFont(FB, size)
            self.c.setFillColor(color)
            self.c.drawString(self.x, self.y, S(text))
        self._use(2.2 * self.k)

    def para(self, text, font=F, size=8.0, color=INK, gap=3.0, indent=0,
             leading=None):
        size *= self.k
        leading = (leading or size * 1.32)
        lines = simpleSplit(S(text), font, size, self.w - indent)
        for ln in lines:
            self._use(leading)
            if not self.dry and not self.overflow:
                self.c.setFont(font, size)
                self.c.setFillColor(color)
                self.c.drawString(self.x + indent, self.y, ln)
        self._use(gap * self.k)

    def kv(self, key, value, key_font=FB, key_size=7.4, val_font=F,
           val_size=7.4, key_color=INK, val_color=INK, gap=2.5):
        """key in bold, value wrapped with a hanging indent."""
        key_size *= self.k
        val_size *= self.k
        key_txt = S(key)
        kw = stringWidth(key_txt, key_font, key_size) + 4 * self.k
        leading = max(key_size, val_size) * 1.32
        lines = simpleSplit(S(value), val_font, val_size, self.w - kw)
        if not lines:
            lines = [""]
        first = True
        for ln in lines:
            self._use(leading)
            if not self.dry and not self.overflow:
                if first:
                    self.c.setFont(key_font, key_size)
                    self.c.setFillColor(key_color)
                    self.c.drawString(self.x, self.y, key_txt)
                self.c.setFont(val_font, val_size)
                self.c.setFillColor(val_color)
                self.c.drawString(self.x + kw, self.y, ln)
            first = False
        self._use(gap * self.k)

    def chip_line(self, chips, lead_text=None, lead_font=FB, lead_size=8.4,
                  gap=4.0):
        """One line: optional lead text followed by small colored pills.
        If lead + chips would exceed the column width, the lead is wrapped
        as its own paragraph and the chips drop to the next line."""
        if lead_text:
            need = stringWidth(S(lead_text), lead_font, lead_size * self.k)
            need += sum(stringWidth(S(t), FB, 6.3 * self.k) + 12 * self.k
                        for t, _ in chips) + 6 * self.k
            if need > self.w:
                self.para(lead_text, font=lead_font, size=lead_size, gap=1.0)
                lead_text = None
        lead_size *= self.k
        ch = 10.5 * self.k
        self._use(max(lead_size * 1.25, ch + 2 * self.k))
        if not self.dry and not self.overflow:
            x = self.x
            if lead_text:
                self.c.setFont(lead_font, lead_size)
                self.c.setFillColor(INK)
                self.c.drawString(x, self.y, S(lead_text))
                x += stringWidth(S(lead_text), lead_font, lead_size) + 6 * self.k
            for text, color in chips:
                x = draw_chip(self.c, x, self.y - 1.5 * self.k, text, color,
                              self.k)
                x += 4 * self.k
        self._use(gap * self.k)

    def row(self, cells, gap=1.6, min_h=None):
        """cells: list of (x_off, width, text, font, size, color).
        All cells wrapped; row height = tallest cell."""
        wrapped = []
        max_lines = 1
        for (xo, cw, text, font, size, color) in cells:
            size = size * self.k
            lines = simpleSplit(S(text), font, size, cw)
            if not lines:
                lines = [""]
            wrapped.append((xo, lines, font, size, color))
            max_lines = max(max_lines, len(lines))
        leading = max(s for (_, _, _, s, _) in wrapped) * 1.28
        h = max_lines * leading
        if min_h:
            h = max(h, min_h * self.k)
        top = self.y
        self._use(h)
        if not self.dry and not self.overflow:
            for (xo, lines, font, size, color) in wrapped:
                yy = top
                for ln in lines:
                    yy -= leading
                    self.c.setFont(font, size)
                    self.c.setFillColor(color)
                    self.c.drawString(self.x + xo, yy, ln)
        self._use(gap * self.k)


def draw_chip(c, x, y, text, color, k=1.0):
    """Small rounded pill; returns the x just after the pill."""
    size = 6.3 * k
    text = S(text)
    tw = stringWidth(text, FB, size)
    w = tw + 8 * k
    h = 10 * k
    c.saveState()
    c.setFillColor(color)
    c.setStrokeColor(color)
    c.setLineWidth(0.6)
    c.setFillAlpha(0.12)
    c.roundRect(x, y - 2.5 * k, w, h, 2.6 * k, stroke=1, fill=1)
    c.setFillAlpha(1)
    c.setFillColor(color)
    c.setFont(FB, size)
    c.drawString(x + 4 * k, y, text)
    c.restoreState()
    return x + w


def tag_color(tag):
    tag = str(tag)
    for key, color in TAG_COLORS.items():
        if tag.startswith(key):
            return color
    return GRAY


# ---------------------------------------------------------------- figure
def draw_spec_figure(c, spec, x0, y_top, target_w):
    """Redraw the neutral concept-visual drawing spec (640x420, SVG y-down)
    with reportlab primitives so PDF figure == web SVG figure."""
    k = target_w / 640.0
    h = 420.0 * k
    c.saveState()
    c.translate(x0, y_top - h)
    c.scale(k, k)

    def col(v):
        return None if (v is None or v == "none") else HexColor(v)

    def dash(v):
        if v:
            c.setDash([float(t) for t in str(v).replace(",", " ").split()])
        else:
            c.setDash([])

    for p in spec:
        t = p.get("t")
        if t == "rect":
            fill = col(p.get("fill"))
            stroke = col(p.get("stroke"))
            if stroke:
                c.setStrokeColor(stroke)
            c.setLineWidth(p.get("sw") or 1)
            dash(p.get("dash"))
            if fill:
                c.setFillColor(fill)
            y = 420.0 - p["y"] - p["h"]
            rx = p.get("rx") or 0
            c.roundRect(p["x"], y, p["w"], p["h"], rx,
                        stroke=1 if stroke else 0, fill=1 if fill else 0)
        elif t == "line":
            stroke = col(p.get("stroke"))
            if stroke:
                c.setStrokeColor(stroke)
            c.setLineWidth(p.get("sw") or 1)
            dash(p.get("dash"))
            c.line(p["x1"], 420.0 - p["y1"], p["x2"], 420.0 - p["y2"])
        elif t == "circle":
            fill = col(p.get("fill"))
            stroke = col(p.get("stroke"))
            if stroke:
                c.setStrokeColor(stroke)
            c.setLineWidth(p.get("sw") or 1)
            dash(p.get("dash"))
            if fill:
                c.setFillColor(fill)
            c.circle(p["cx"], 420.0 - p["cy"], p["r"],
                     stroke=1 if stroke else 0, fill=1 if fill else 0)
        elif t == "text":
            font = (MB if p.get("bold") else M) if p.get("mono") else \
                   (FB if p.get("bold") else F)
            c.setFont(font, p.get("size") or 10)
            c.setFillColor(col(p.get("fill")) or INK)
            c.setDash([])
            txt = S(p.get("s", ""))
            y = 420.0 - p["y"]
            anchor = p.get("anchor") or "start"
            if anchor == "middle":
                c.drawCentredString(p["x"], y, txt)
            elif anchor == "end":
                c.drawRightString(p["x"], y, txt)
            else:
                c.drawString(p["x"], y, txt)
    c.setDash([])
    c.restoreState()
    return h


# ---------------------------------------------------------------- chrome
def page_chrome(c, innovation, page_no, section_title):
    name = S(innovation["name"])
    iid = S(innovation["innovation_id"])
    # header (pages 2-5 get a compact one; page 1 draws its own title)
    if page_no > 1:
        c.setFont(FB, 8.2)
        c.setFillColor(INK)
        c.drawString(MARGIN, PAGE_H - 40, S(section_title))
        c.setFont(M, 7.2)
        c.setFillColor(MUT)
        c.drawRightString(PAGE_W - MARGIN, PAGE_H - 40, iid)
        c.setStrokeColor(RULE)
        c.setLineWidth(0.8)
        c.line(MARGIN, PAGE_H - 46, PAGE_W - MARGIN, PAGE_H - 46)
    # footer
    c.setStrokeColor(RULE)
    c.setLineWidth(0.8)
    c.line(MARGIN, FOOTER_Y + 10, PAGE_W - MARGIN, FOOTER_Y + 10)
    c.setFont(F, 6.6)
    c.setFillColor(MUT)
    left_txt = "%s  -  %s" % (name, iid)
    c.drawString(MARGIN, FOOTER_Y, left_txt)
    brand = "VERSUNI Extra Project - Innovation Dossier"
    left_end = MARGIN + stringWidth(left_txt, F, 6.6)
    brand_start = PAGE_W / 2 - stringWidth(brand, F, 6.6) / 2
    if left_end + 12 < brand_start:
        c.drawCentredString(PAGE_W / 2, FOOTER_Y, brand)
    c.drawRightString(PAGE_W - MARGIN, FOOTER_Y, "page %d/%d" % (page_no,
                                                                 N_PAGES))


NO_PARENTS_LINE = ("No parent paths - this innovation cites no tension or "
                   "assumption paths; its grounding is the friction evidence "
                   "in section 3, why it exists.")

PROTO_MEANING = ("Concept visual means a schematic exists, nothing more: no "
                 "digital model, no physical prototype, no test data.")

# literal section-header strings, drawn verbatim by Flow.section() below and
# reused by tests/test_dossiers.py to slice out one section's text - keep
# these two definitions in sync.
SECTION2_HEADER = "2. Physical architecture"
SECTION3_HEADER = "3. Why it exists"


# ---------------------------------------------------------------- page 1
def render_page1_title(c, inn):
    """Fixed-size title block; returns the vertical space it used."""
    c.setFont(M, 8)
    c.setFillColor(MUT)
    c.drawString(MARGIN, PAGE_H - 46, S(inn["innovation_id"]))
    state = inn["state"]
    state_txt = LBL(state)
    draw_chip(c, PAGE_W - MARGIN - stringWidth(state_txt, FB, 6.3) - 8,
              PAGE_H - 46, state_txt, STATE_COLORS.get(state, GRAY))
    c.setFont(FB, 16)
    c.setFillColor(INK)
    c.drawString(MARGIN, PAGE_H - 66, S(inn["name"]))
    c.setFont(F, 8)
    c.setFillColor(MUT)
    c.drawString(MARGIN, PAGE_H - 79, "Innovation dossier")
    c.setStrokeColor(INK)
    c.setLineWidth(1.1)
    c.line(MARGIN, PAGE_H - 86, PAGE_W - MARGIN, PAGE_H - 86)
    return 96


def render_page1(c, inn, spec, top_used, scale, dry):
    y_top = PAGE_H - top_used
    fig_w = 300.0
    gap = 16.0
    right_x = MARGIN + fig_w + gap
    right_w = CONTENT_W - fig_w - gap

    full = Flow(c, MARGIN, CONTENT_W, y_top, BOTTOM, scale, dry)
    full.section("1. What is it?")
    full.para(inn["proposition"], size=8.6, gap=8)

    full.section(SECTION2_HEADER)
    region_top = full.y

    # left column: the concept figure + its concept-visual caption
    left = Flow(c, MARGIN, fig_w, region_top, BOTTOM, scale, dry)
    fig_h = 420.0 / 640.0 * fig_w
    left._use(fig_h)
    if not dry and not left.overflow:
        draw_spec_figure(c, spec, MARGIN, region_top, fig_w)
    left.gap(6)
    prov_note = ""
    arts = inn.get("artifacts") or []
    if arts:
        prov_note = arts[0].get("provenance", {}).get("note", "")
    left.chip_line([(LBL("CONCEPT_VISUAL"), BLUE)], lead_text="Figure:",
                   lead_size=7.2)
    if prov_note:
        left.para(prov_note, size=6.4, color=MUT, gap=2)
    if arts:
        left.para("artifact %s  -  %s" % (arts[0].get("id", ""),
                                          arts[0].get("path", "")),
                  font=M, size=6.0, color=FAINT, gap=0)

    # right column: product archetype (+ form_factor if present) + mechanism
    right = Flow(c, right_x, right_w, region_top, BOTTOM, scale, dry)
    pa = inn["product_archetype"]
    right.label("Product archetype", color=BLUE)
    for k, v in pa.items():
        if k == "epistemic_type":
            continue
        right.kv(pretty_key(k) + ":", desnake_lead(v), key_size=7.0,
                 val_size=7.0)
    if "form_factor" not in pa:
        right.para("Form factor: not yet classified.", font=FO, size=6.6,
                   color=MUT, gap=2)
    right.para(desnake_lead(pa.get("epistemic_type", "")), size=6.4,
               color=MUT, gap=5)

    arch = inn.get("architecture")
    if arch:
        right.label("System architecture", color=MUT)
        right.para(desnake_lead(arch), size=6.8, color=MUT, gap=5)

    mech = inn["mechanism"]
    right.label("Method choice", color=BLUE)
    right.para("%s - %s" % (mech["operator"], mech["definition"]), font=FB,
               size=7.8, gap=1.5)
    right.para(desnake_lead(mech.get("epistemic_type", "")), size=6.6,
               color=MUT, gap=0)

    return not (full.overflow or left.overflow or right.overflow)


# ---------------------------------------------------------------- page 2
def render_page2(c, inn, paths_by_id, scale, dry):
    y_top = PAGE_H - 56
    col_w = (CONTENT_W - 18) / 2.0
    left = Flow(c, MARGIN, col_w, y_top, BOTTOM, scale, dry)
    right = Flow(c, MARGIN + col_w + 18, col_w, y_top, BOTTOM, scale, dry)

    wh = inn["why_here"]
    left.section(SECTION3_HEADER)
    left.chip_line([(LBL("OBSERVED"), TEAL)], lead_text="Reality",
                   lead_size=7.8, gap=1.5)
    left.para(wh["reality"], size=7.3, gap=3)
    tuc = inn.get("target_user_context") or {}
    if tuc.get("evidence_based"):
        left.para(tuc["evidence_based"], size=7.0, color=MUT, gap=2)
    if tuc.get("persona"):
        left.para(desnake_lead(tuc["persona"]), font=FO, size=6.7,
                  color=MUT, gap=5)

    left.chip_line([(LBL("METHOD_CHOICE"), BLUE)], lead_text="Transformation",
                   lead_size=7.8, gap=1.5)
    left.para(wh["transformation"], size=7.3, gap=4)

    cb = wh.get("consequence_basis", "")
    left.chip_line([(LBL(cb), BLUE)],
                   lead_text="Product consequence", lead_size=7.8, gap=1.5)
    left.para(wh["product_consequence"], size=7.3, gap=6)

    # right column ------------------------------------------------------
    right.section("4. Evidence and lineage")
    right.label("Parent paths", color=MUT)
    parent_ids = inn.get("parent_path_ids") or []
    seen_titles = []
    if not parent_ids:
        right.para(NO_PARENTS_LINE, font=FO, size=6.9, color=MUT, gap=4)
    for pid in parent_ids:
        p = paths_by_id.get(pid)
        if p is None:
            right.para(pid, font=M, size=7, color=MUT)
            continue
        right.chip_line(
            [(LBL(p["epistemic_class"]), tag_color(p["epistemic_class"]))],
            lead_text="%s - %s" % (pid, p["name"]), lead_size=7.0, gap=1.2)
        right.kv("test:", p["test"]["text"], key_size=6.6, val_size=6.6,
                key_color=MUT, val_color=INK, gap=2.4)
        derived = p.get("derived_possibility_ids")
        if derived:
            right.para("derived possibilities: " + ", ".join(derived),
                      size=6.2, color=MUT, gap=2)
        for ev in p.get("field", {}).get("supporting_evidence", []):
            title = ev.get("title")
            if title and title not in seen_titles:
                seen_titles.append(title)
    right.gap(2)
    right.kv("evidence ids:", ", ".join(inn.get("evidence_ids") or []),
            key_size=6.8, val_size=6.8, val_color=MUT, gap=3)

    assumptions = inn.get("assumptions") or {}
    if assumptions.get("ids"):
        right.kv("category assumptions:", ", ".join(assumptions["ids"]),
                 key_size=6.8, val_size=6.8, gap=3)
    elif assumptions.get("note"):
        right.kv("category assumptions:", assumptions["note"], key_size=6.8,
                 val_size=6.4, val_color=MUT, gap=3)

    if seen_titles:
        right.label("Field evidence behind these paths (titles)", color=MUT)
        for title in seen_titles:
            right.para("- " + title, size=6.2, color=MUT, gap=0.8)
    right.gap(3)

    right.label("Design DNA", color=MUT)
    for letter, row in inn["design_dna"].items():
        status = row.get("status", "")
        head = "%s  %s" % (letter, pretty_key(row.get("kind", "")))
        detail = row.get("detail", "")
        if row.get("brands"):
            detail += "  [" + ", ".join(row["brands"]) + "]"
        if row.get("id"):
            head += "  (%s)" % row["id"]
        right.chip_line([(LBL(status), tag_color(status))], lead_text=head,
                        lead_size=6.7, gap=0.6)
        right.para(detail, size=6.2, color=MUT, gap=2.0)

    return not (left.overflow or right.overflow)


# ---------------------------------------------------------------- page 3
def render_page3(c, inn, scale, dry):
    y_top = PAGE_H - 56
    fl = Flow(c, MARGIN, CONTENT_W, y_top, BOTTOM, scale, dry)
    ee = inn["engineering_envelope"]

    fl.section("5. Comparable products")
    if "comparable_basis" in ee:
        fl.kv("comparable set:", ee["comparable_basis"], key_size=7.0,
              val_size=7.0, gap=3)
    if ee.get("form_factor_note"):
        fl.para(ee["form_factor_note"], font=FO, size=6.8, color=AMBER,
                gap=4)
    observed = [(k, v) for k, v in ee.items()
                if isinstance(v, dict)
                and v.get("epistemic_type") == "OBSERVED_COMPARABLE"]
    if not observed:
        fl.para("No observed-comparable metrics recorded for this concept.",
                size=7.2, color=MUT, gap=4)
    for key, block in observed:
        label = ENV_LABEL.get(key, pretty_key(key))
        fl.kv(label + ":", "%s-%s %s across %s real comparables" % (
                  block.get("min"), block.get("max"), block.get("unit", ""),
                  block.get("n_comparables")),
              key_size=7.2, val_size=7.2, gap=1.4)
        if block.get("source"):
            fl.para("source: " + block["source"], size=6.2, color=FAINT,
                    gap=3)
    fl.gap(4)

    fl.section("6. Engineering envelope")
    c0, c1, c2 = 0, 132, 372
    fl.row([(c0, c1 - c0 - 6, "metric", FB, 6.4, MUT),
            (c1, c2 - c1 - 6, "value from verified comparables", FB, 6.4,
             MUT),
            (c2, CONTENT_W - c2, "epistemic type", FB, 6.4, MUT)], gap=1)
    if not dry:
        c.setStrokeColor(RULE)
        c.setLineWidth(0.6)
        c.line(MARGIN, fl.y - 1.5, MARGIN + CONTENT_W, fl.y - 1.5)
    fl.gap(3)
    skip_keys = {"comparable_basis", "reference_market_price_usd",
                 "form_factor_note"}
    for key, block in ee.items():
        if key in skip_keys or not isinstance(block, dict) \
                or "epistemic_type" not in block:
            continue
        et = block["epistemic_type"]
        if et == "OBSERVED_COMPARABLE":
            val = "%s-%s %s  (n=%s comparables)" % (
                block.get("min"), block.get("max"), block.get("unit", ""),
                block.get("n_comparables"))
        else:
            val = block.get("note", "no comparable publishes this")
        fl.row([(c0, c1 - c0 - 6, ENV_LABEL.get(key, pretty_key(key)), FB,
                 7.2, INK),
                (c1, c2 - c1 - 6, val, F, 7.2,
                 INK if et != "UNKNOWN" else MUT),
                (c2, CONTENT_W - c2, LBL(et), MB, 6.2, tag_color(et))])

    return not fl.overflow


# ---------------------------------------------------------------- page 4
def render_page4(c, inn, scale, dry):
    y_top = PAGE_H - 56
    fl = Flow(c, MARGIN, CONTENT_W, y_top, BOTTOM, scale, dry)

    fl.section("7. Economics")
    econ = inn.get("economics") or {}
    fl.kv("price-weighted exposure:",
          "$%s" % econ.get("price_weighted_exposure_usd"),
          key_size=7.4, val_size=7.4, gap=1.5)
    fl.para(econ.get("caveat", ""), size=6.6, color=MUT, gap=4)
    fl.kv("comparable market median:",
          "$%s (n=%s products) - not this concept's price" % (
              econ.get("comparable_market_median_usd"),
              econ.get("comparable_market_median_n_products")),
          key_size=7.4, val_size=7.4, gap=1.5)
    fl.para(econ.get("comparable_market_median_caveat", ""), size=6.6,
            color=MUT, gap=4)
    tpr = inn.get("target_price_range") or {}
    if tpr.get("note"):
        fl.kv("target price:", "%s - %s" % (LBL(tpr.get("status", "")),
                                             tpr["note"]),
              key_size=7.0, val_size=6.8, val_color=MUT, gap=4)
    fl.gap(2)

    fl.section("8. Prototype")
    fl.chip_line([(LBL(inn["prototype_state"]), BLUE)], lead_text="State:",
                 lead_size=8.0, gap=1.5)
    fl.para(PROTO_MEANING, size=7.2, color=MUT, gap=2)
    arts = inn.get("artifacts") or []
    if arts:
        fl.para(arts[0].get("provenance", {}).get("note", ""), size=6.6,
                color=FAINT, gap=5)
    fl.gap(2)

    fl.section("9. Experiment and next learning")
    fl.label("Next experiment", color=TEAL)
    fl.para(inn["next_experiment"], size=7.8, gap=5)
    fl.label("Kill criterion", color=RED)
    fl.para(inn["kill_criterion"], size=7.8, gap=4)

    return not fl.overflow


# ---------------------------------------------------------------- page 5
def render_page5(c, inn, meta, scale, dry):
    y_top = PAGE_H - 56
    fl = Flow(c, MARGIN, CONTENT_W, y_top, BOTTOM, scale, dry)

    fl.section("10. What could kill it?")
    state = inn["state"]
    if state == "rejected":
        fl.chip_line([("rejected - graveyard", RED)],
                     lead_text="Where this idea stands:", lead_size=8.4,
                     gap=1.5)
        fl.para(inn["state_why"], size=7.6, color=RED, gap=5)
    else:
        fl.chip_line([(LBL(state), STATE_COLORS.get(state, GRAY))],
                     lead_text="Where this idea stands:", lead_size=8.4,
                     gap=1.5)
        fl.para(inn["state_why"], size=7.6, color=MUT, gap=5)

    fl.kv("kill criterion:", inn.get("kill_criterion", ""), key_size=7.2,
          val_size=7.2, val_color=INK, gap=3)
    contradictions = inn.get("contradictions") or []
    if contradictions:
        fl.label("Contradictions", color=MUT)
        for ctr in contradictions:
            fl.para("- " + str(ctr), size=6.8, gap=1.3)
    uncertainties = inn.get("uncertainties") or []
    fl.label("Uncertainties", color=MUT)
    if uncertainties:
        for u in uncertainties:
            fl.para("- " + u, size=6.8, color=INK, gap=1.3)
    else:
        fl.para("- none recorded", size=6.8, color=MUT, gap=1.3)
    fl.gap(3)

    fl.label("Critic dimensions", color=MUT)
    c0, c1, c2 = 0, 96, 196
    for dim, row in inn["critic_dimensions"].items():
        fl.row([(c0, c1 - c0 - 8, LBL(dim), FB, 7.0, INK),
                (c1, c2 - c1 - 8, LBL(row.get("verdict", "")), MB, 6.4,
                 tag_color(row.get("verdict", ""))),
                (c2, CONTENT_W - c2, row.get("reasoning", ""), F, 6.8, MUT)],
               gap=1.6)
    fl.kv("critic overall:", LBL(inn.get("critic_overall", "")),
          key_size=7.2, val_size=7.2,
          val_color=tag_color(inn.get("critic_overall", "")), gap=5)

    fl.label("Criteria results", color=MUT)
    counts = Counter(r["status"] for r in inn["criteria_results"].values())
    fl.para("  -  ".join("%s: %d" % (LBL(s), n) for s, n in
                         sorted(counts.items(), key=lambda kv: -kv[1])),
            font=M, size=6.8, color=MUT, gap=3)
    flagged = [(cid, r) for cid, r in inn["criteria_results"].items()
               if r["status"] in ("KILL", "CHALLENGE")]
    if flagged:
        for cid, r in flagged:
            fl.row([(0, 30, cid, FB, 7.0, INK),
                    (34, 66, LBL(r["status"]), MB, 6.4,
                     tag_color(r["status"])),
                    (104, CONTENT_W - 104, r.get("note", ""), F, 6.8, MUT)],
                   gap=1.6)
    else:
        fl.para("no kill or challenge rows - remaining criteria are pass or "
                "needs-evidence (see counts above)", size=6.6, color=MUT,
                gap=2)
    fl.gap(4)

    fl.label("Lineage and provenance", color=MUT)
    rh = inn.get("run_history") or {}
    fl.kv("generated by:", meta.get("generated_by", ""), key_size=6.6,
          val_size=6.6, val_font=M, val_color=MUT, gap=1.1)
    for k, v in rh.items():
        fl.kv(pretty_key(k) + ":", v, key_size=6.6, val_size=6.0, val_font=M,
              val_color=MUT, gap=1.1)
    arts = inn.get("artifacts") or []
    if arts:
        prov = arts[0].get("provenance", {})
        fl.kv("figure source:",
              "%s  (generated %s by %s)" % (arts[0].get("path", ""),
                                            prov.get("generated_at", ""),
                                            prov.get("tool", "")),
              key_size=6.6, val_size=6.0, val_font=M, val_color=MUT, gap=1.1)
    fl.kv("data source:",
          "data/processed/innovations_real.json + data/processed/"
          "funnel_real.json (deterministic; no invented fields)",
          key_size=6.6, val_size=6.0, val_font=M, val_color=MUT, gap=1.1)
    fl.kv("dossier generator:", "src/real/generate_innovation_dossiers.py",
          key_size=6.6, val_size=6.0, val_font=M, val_color=MUT, gap=0)

    return not fl.overflow


# ---------------------------------------------------------------- driver
SCALES = (1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65)


def fit_and_render(render_fn, c, *args):
    """Dry-run at decreasing scales until the page fits, then draw it."""
    chosen = None
    for scale in SCALES:
        if render_fn(c, *args, scale=scale, dry=True):
            chosen = scale
            break
    if chosen is None:
        raise RuntimeError("page cannot fit even at scale %s" % SCALES[-1])
    render_fn(c, *args, scale=chosen, dry=False)
    return chosen


def build_dossier(inn, paths_by_id, meta, out_path):
    c = pdfcanvas.Canvas(out_path, pagesize=LETTER)
    c.setTitle("%s - innovation dossier" % S(inn["name"]))
    c.setAuthor("VERSUNI Extra Project pipeline")
    c.setSubject(S(inn["innovation_id"]))

    spec_file = os.path.join(
        SPEC_DIR, inn["innovation_id"].replace(":", "_") + ".spec.json")
    with open(spec_file) as fh:
        spec = json.load(fh)

    # page 1 - 1. What is it? / 2. Physical architecture
    top_used = render_page1_title(c, inn)
    fit_and_render(
        lambda cv, scale, dry: render_page1(cv, inn, spec, top_used, scale,
                                            dry), c)
    page_chrome(c, inn, 1, "1-2. What is it / physical architecture")
    c.showPage()

    # page 2 - 3. Why it exists / 4. Evidence and lineage
    fit_and_render(
        lambda cv, scale, dry: render_page2(cv, inn, paths_by_id, scale,
                                            dry), c)
    page_chrome(c, inn, 2, "3-4. Why it exists / evidence and lineage")
    c.showPage()

    # page 3 - 5. Comparable products / 6. Engineering envelope
    fit_and_render(
        lambda cv, scale, dry: render_page3(cv, inn, scale, dry), c)
    page_chrome(c, inn, 3, "5-6. Comparable products / engineering envelope")
    c.showPage()

    # page 4 - 7. Economics / 8. Prototype / 9. Experiment and next learning
    fit_and_render(
        lambda cv, scale, dry: render_page4(cv, inn, scale, dry), c)
    page_chrome(c, inn, 4, "7-9. Economics / prototype / next learning")
    c.showPage()

    # page 5 - 10. What could kill it?
    fit_and_render(
        lambda cv, scale, dry: render_page5(cv, inn, meta, scale, dry), c)
    page_chrome(c, inn, 5, "10. What could kill it")
    c.showPage()

    c.save()


def main():
    with open(INNOV_PATH) as fh:
        data = json.load(fh)
    with open(FUNNEL_PATH) as fh:
        funnel = json.load(fh)
    paths_by_id = {p["id"]: p for p in funnel["homepage_funnel"]["paths"]}
    meta = {"generated_by": data.get("generated_by", "")}

    os.makedirs(OUT_DIR, exist_ok=True)
    for inn in data["innovations"]:
        fname = inn["innovation_id"].replace(":", "_") + ".pdf"
        out_path = os.path.join(OUT_DIR, fname)
        build_dossier(inn, paths_by_id, meta, out_path)
        print("wrote", os.path.relpath(out_path, ROOT))
    print("done: %d dossiers" % len(data["innovations"]))


if __name__ == "__main__":
    main()
