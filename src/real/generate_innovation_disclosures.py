"""Generates one patent-style "Innovation Disclosure" PDF per candidate
currently present in data/processed/decision_framework_real.json's real
`scores` object - however many candidates that is, whatever their real ids
or names are. This script hardcodes NO candidate id, name, theme, or
operator: every candidate the machine currently produces gets a disclosure,
and a candidate the machine drops no longer gets one. Re-run this any time
decision_framework_real.py (or its real upstream dependencies) re-runs - it
is wired into run_pipeline.sh for exactly that reason.

Every section is built from real, already-computed fields in:
  - data/processed/decision_framework_real.json  (scores, verdict)
  - data/processed/magic_box_real.json            (possibility catalogue, by theme)
  - data/processed/criteria_real.json             (per-concept criteria evaluation, by theme)
matched to a candidate by its own real friction theme (parsed from its real
evidence_ids, e.g. "taxonomy:reliability") - never by a hardcoded candidate id.

No physical-product fact (weight, dimensions, materials, manufacturing
process, BOM) is invented: this pipeline has no real data for any of those,
for real OR conceptual products (verified: no weight/dimension field exists
anywhere in the real dataset), so each document says so explicitly.

Every price figure states its real derivation inline, not just its value:
typical market price is the REAL MEDIAN of distinct real products' real
listed prices; price-weighted exposure is the REAL SUM of listed prices
across affected real reviews (a different, larger population than the
distinct-product median) - see wtp_real.py::compute_price_exposure, the one
real implementation both this script and the live API read from.

Run:  python3 src/real/generate_innovation_disclosures.py
Output: web/public/innovation-disclosures/<candidate-id>.pdf (one per real candidate)
"""
import json
import os
import re
from collections import Counter

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether,
)
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Circle, Wedge

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DECISION_PATH = os.path.join(ROOT, "data", "processed", "decision_framework_real.json")
MAGICBOX_PATH = os.path.join(ROOT, "data", "processed", "magic_box_real.json")
CRITERIA_PATH = os.path.join(ROOT, "data", "processed", "criteria_real.json")
OUT_DIR = os.path.join(ROOT, "web", "public", "innovation-disclosures")

INK = colors.HexColor("#14181F")
MUTED = colors.HexColor("#5B6270")
FAINT = colors.HexColor("#8A8F9B")
LINE = colors.HexColor("#E2DECF")
ACCENT = colors.HexColor("#1C3FAA")
TEAL = colors.HexColor("#0E9C8C")
ROSE = colors.HexColor("#B0435A")
AMBER = colors.HexColor("#B07D1C")
PANEL2 = colors.HexColor("#EEEAE0")

STATUS_COLOR = {"PASS": TEAL, "CHALLENGE": AMBER, "NEEDS_EVIDENCE": FAINT, "KILL": ROSE, "N/A": LINE}

styles = getSampleStyleSheet()
S_DOCTYPE = ParagraphStyle("doctype", fontName="Courier", fontSize=8.5, textColor=MUTED, spaceAfter=2, leading=11)
S_TITLE = ParagraphStyle("title", fontName="Times-Bold", fontSize=20, textColor=INK, leading=25, spaceAfter=4)
S_SUB = ParagraphStyle("sub", fontName="Times-Italic", fontSize=11.5, textColor=MUTED, spaceAfter=14, leading=15)
S_H1 = ParagraphStyle("h1", fontName="Times-Bold", fontSize=12.5, textColor=INK, spaceBefore=16, spaceAfter=7, leading=15)
S_BODY = ParagraphStyle("body", fontName="Times-Roman", fontSize=10, textColor=INK, leading=14.5, alignment=TA_JUSTIFY, spaceAfter=8)
S_CAPTION = ParagraphStyle("caption", fontName="Helvetica-Oblique", fontSize=8.5, textColor=FAINT, spaceAfter=4, leading=11)
S_META = ParagraphStyle("meta", fontName="Courier", fontSize=8.5, textColor=MUTED, leading=13)
S_CLAIM = ParagraphStyle("claim", parent=S_BODY, leftIndent=14, spaceAfter=10)
S_HONESTY_HEAD = ParagraphStyle("honestyhead", fontName="Times-Bold", fontSize=11, textColor=ROSE, spaceBefore=14, spaceAfter=6)
S_TABLE_HEAD = ParagraphStyle("tablehead", fontName="Helvetica-Bold", fontSize=8.5, textColor=colors.white)


def money(v):
    return f"${v:,.2f}" if isinstance(v, (int, float)) else "no real figure for this"


def pct(v):
    return f"{v:g}%" if isinstance(v, (int, float)) else "no real figure for this"


def humanize(s):
    """This pipeline's own status codes (PASS, NEEDS_EVIDENCE, CHALLENGE,
    SURVIVOR...) are real data, just written in shouting-case for a machine
    to key off. Never alters the real value, only how it reads on the page."""
    return s.replace("_", " ").lower() if isinstance(s, str) else s


STATUS_TOKENS_IN_PROSE = re.compile(
    r"\b(PASS|CHALLENGE|NEEDS_EVIDENCE|KILL|N/A|SURVIVOR|FINALIST|REJECTED)\b"
)


def humanize_note(text):
    """A note string can be a real quotation from this pipeline's own JSON
    that embeds one of its status constants mid-sentence (e.g. "reported
    NEEDS_EVIDENCE, never assumed"). Only those known, finite status tokens
    are lowercased - real acronyms in the same text (IP, QA, WTP, CSAT...)
    are left alone rather than guessed at with a blanket capital-letter rule."""
    return STATUS_TOKENS_IN_PROSE.sub(lambda m: humanize(m.group(0)), text) if isinstance(text, str) else text


def bulleted(items):
    return "<br/>".join(f"&bull; {item}" for item in items) if items else "None recorded."


def theme_of(cand):
    """The candidate's own real friction theme, parsed from its real
    evidence_ids - never hardcoded per candidate."""
    for eid in cand.get("evidence_ids", []):
        if eid.startswith("taxonomy:"):
            return eid.split(":", 1)[1]
    return None


def real_directions_for_theme(theme, crit_concepts):
    """Every real design-operator possibility this pipeline's own possibility
    generator (magic_box_real.py) catalogued for this real friction theme -
    zero, one, or many. Never assumes or hand-picks a single "the" mechanism
    for a candidate: lists what's really there."""
    if not theme:
        return []
    return sorted(
        (c for c in crit_concepts.values() if c.get("friction_theme") == theme),
        key=lambda c: c["id"],
    )


def pick_status(cid, cand, verdict):
    if cid == verdict.get("recommended"):
        return "Recommended — the current pick", ACCENT
    if not cand["consumer_pain"].get("gate_passed"):
        return "Not pursued — the evidence wasn't there", ROSE
    return "A real alternative, not selected", TEAL


# ------------------------------------------------------------- figures

def funnel_position_diagram(theme, cid, status_label, accent):
    """Fig. 1 - where this disclosure sits in the app's own real 5-stage
    funnel (Products -> Signals -> Magic Box -> Criteria -> Innovations).
    Generic across every candidate: only the highlighted stage and the two
    real dynamic labels (theme, candidate id) change."""
    stages = ["Products", "Signals", "Magic Box", "Criteria", "Innovations"]
    w, h = 460, 110
    d = Drawing(w, h)
    d.add(Rect(0, 0, w, h, fillColor=colors.white, strokeColor=LINE, strokeWidth=1))
    n = len(stages)
    margin = 14
    gap = 10
    bw = (w - 2 * margin - (n - 1) * gap) / n
    bh = 34
    y = h - 52
    for i, label in enumerate(stages):
        x = margin + i * (bw + gap)
        is_last = i == n - 1
        fill = accent if is_last else PANEL2
        text_color = colors.white if is_last else INK
        d.add(Rect(x, y, bw, bh, fillColor=fill, strokeColor=accent if is_last else LINE, strokeWidth=1.2, rx=6, ry=6))
        d.add(String(x + bw / 2, y + bh / 2 - 3, label, fontName="Helvetica-Bold", fontSize=7.5, fillColor=text_color, textAnchor="middle"))
        if i < n - 1:
            ax = x + bw + 1
            d.add(Line(ax, y + bh / 2, ax + gap - 2, y + bh / 2, strokeColor=MUTED, strokeWidth=1.2))
    theme_label = f'real friction theme "{theme}"' if theme else "no real taxonomy theme (keyword search only)"
    d.add(String(w / 2, y - 22, f"This disclosure: candidate {cid}, {theme_label}", fontName="Helvetica-Bold", fontSize=8.5, fillColor=INK, textAnchor="middle"))
    d.add(String(w / 2, y - 36, f"Real status at the Innovations stage: {status_label}", fontName="Helvetica-Oblique", fontSize=8, fillColor=MUTED, textAnchor="middle"))
    return d


def evidence_chart(stats, accent):
    """Fig. 2 - real evidence numbers already computed by this pipeline, shown
    as separate labeled stat panels (never as bars sharing one axis: the
    figures here are different units - stars, percent, review counts, dollars
    - and a shared axis would visually imply a false comparability)."""
    stats = [s for s in stats if s is not None]
    w, h = 460, 130
    d = Drawing(w, h)
    d.add(Rect(0, 0, w, h, fillColor=colors.white, strokeColor=LINE, strokeWidth=1))
    d.add(String(w / 2, h - 22, "Real evidence values (this pipeline's own computed output)", fontName="Helvetica-Bold", fontSize=9, fillColor=INK, textAnchor="middle"))
    n = max(len(stats), 1)
    margin = 16
    gap = 12
    bw = (w - 2 * margin - (n - 1) * gap) / n
    bh = 68
    y = 20
    for i, (value_str, label) in enumerate(stats):
        x = margin + i * (bw + gap)
        d.add(Rect(x, y, bw, bh, fillColor=PANEL2, strokeColor=accent, strokeWidth=1, rx=6, ry=6))
        d.add(String(x + bw / 2, y + bh - 30, value_str, fontName="Helvetica-Bold", fontSize=14, fillColor=accent, textAnchor="middle"))
        for li, line in enumerate(label.split("\n")):
            d.add(String(x + bw / 2, y + 16 - li * 10, line, fontName="Helvetica", fontSize=7.2, fillColor=MUTED, textAnchor="middle"))
    return d


def criteria_donut(status_counts, total):
    """Fig. 3 - the real distribution of this candidate's full real
    criteria-library evaluation (all real statuses this pipeline assigned,
    not just the highlighted rows in the table below). A real, often
    evidence-thin picture - shown honestly rather than only the flattering
    highlight rows."""
    w, h = 460, 160
    d = Drawing(w, h)
    d.add(Rect(0, 0, w, h, fillColor=colors.white, strokeColor=LINE, strokeWidth=1))
    cx, cy, r = 95, 82, 55
    start = 90.0
    order = ["PASS", "CHALLENGE", "NEEDS_EVIDENCE", "KILL", "N/A"]
    for status in order:
        n = status_counts.get(status, 0)
        if not n:
            continue
        extent = 360.0 * n / total
        d.add(Wedge(cx, cy, r, start - extent, start, fillColor=STATUS_COLOR.get(status, FAINT), strokeColor=colors.white, strokeWidth=1.5))
        start -= extent
    d.add(Circle(cx, cy, r * 0.55, fillColor=colors.white, strokeColor=colors.white))
    d.add(String(cx, cy - 4, str(total), fontName="Helvetica-Bold", fontSize=16, fillColor=INK, textAnchor="middle"))
    d.add(String(cx, cy - 16, "criteria", fontName="Helvetica", fontSize=7.5, fillColor=MUTED, textAnchor="middle"))
    lx, ly = 200, 130
    d.add(String(lx, ly + 14, "Real full criteria-library result", fontName="Helvetica-Bold", fontSize=9, fillColor=INK))
    for i, status in enumerate(order):
        n = status_counts.get(status, 0)
        if not n:
            continue
        yy = ly - i * 16
        d.add(Rect(lx, yy - 2, 9, 9, fillColor=STATUS_COLOR.get(status, FAINT), strokeColor=None))
        d.add(String(lx + 14, yy - 1, f"{humanize(status)} — {n} of {total}", fontName="Helvetica", fontSize=8, fillColor=MUTED))
    return d


# ------------------------------------------------------------- tables

def kv_table(rows):
    data = [[Paragraph(f"<b>{k}</b>", S_META), Paragraph(str(v), S_BODY)] for k, v in rows]
    t = Table(data, colWidths=[130, 330])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def directions_table(directions):
    header = [Paragraph("Design direction (real)", S_TABLE_HEAD), Paragraph("Operator", S_TABLE_HEAD), Paragraph("Real transform applied", S_TABLE_HEAD)]
    rows = [header]
    for c in directions:
        rows.append([Paragraph(c["name"], S_BODY), Paragraph(f'<font face="Courier">{humanize(c["operator"])}</font>', S_META), Paragraph(c["operator_definition"], S_BODY)])
    t = Table(rows, colWidths=[145, 90, 225])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def criteria_table(criteria_dict, ids):
    header = [Paragraph("ID", S_TABLE_HEAD), Paragraph("Status", S_TABLE_HEAD), Paragraph("Real note", S_TABLE_HEAD)]
    rows = [header]
    for cid in ids:
        entry = criteria_dict.get(cid)
        if not entry:
            continue
        rows.append([Paragraph(f"<b>{cid}</b>", S_META), Paragraph(humanize(entry["status"]), S_META), Paragraph(humanize_note(entry["note"]), S_BODY)])
    t = Table(rows, colWidths=[42, 85, 333])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def comparative_table(all_scores):
    rows = [("Candidate", "Real prevalence", "Real CSAT impact", "Real typical price", "Real status")]
    for cid, c in all_scores.items():
        cp = c["consumer_pain"]
        rows.append((
            f'{cid} — {c["name"][:40]}',
            pct(cp.get("prevalence_pct")),
            f'{cp["severity_csat"]:.3f}' if cp.get("severity_csat") is not None else "no signal",
            money(c.get("typical_market_price_usd")),
            humanize(c["dominance_status"]),
        ))
    t = Table(rows, colWidths=[168, 68, 72, 78, 108])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.8),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("BACKGROUND", (0, 1), (-1, -1), PANEL2),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


# ------------------------------------------------------------- sections

def cover(story, cid, status_label, status_color, cand):
    story.append(Paragraph("Internal innovation disclosure — not a filed patent application", S_DOCTYPE))
    story.append(Paragraph(
        "Generated entirely from real, already-computed pipeline outputs (src/real/decision_framework_real.py, "
        "regenerated automatically whenever that pipeline re-runs). No claim below reflects legal patent counsel review.",
        S_DOCTYPE))
    story.append(Spacer(1, 10))
    story.append(Paragraph(cand["name"], S_TITLE))
    story.append(Paragraph(cand.get("usage_context", ""), S_SUB))
    badge = Table([[Paragraph(f'<font color="white"><b>{status_label}</b></font>', ParagraphStyle("b", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white))]], colWidths=[220])
    badge.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), status_color), ("TOPPADDING", (0, 0), (-1, -1), 6),
                                ("BOTTOMPADDING", (0, 0), (-1, -1), 6), ("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    story.append(badge)
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"Disclosure ID: {cid} &nbsp;&middot;&nbsp; Versuni Disruptive Innovation Team, Amsterdam &nbsp;&middot;&nbsp; Generated by decision_framework_real.py", S_META))
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", color=LINE, thickness=1))
    story.append(Spacer(1, 10))


def price_substantiation(cand):
    """Every price figure with its exact real derivation, not just its
    value - per wtp_real.py::compute_price_exposure, the one real
    implementation this and the live API both read."""
    n_typical = cand.get("typical_market_price_n_products")
    if cand.get("typical_market_price_usd") is not None:
        typical_note = (
            f"{money(cand['typical_market_price_usd'])} — the median of {n_typical} distinct real products' own "
            "real listed prices, restricted to real products classified under this friction theme that have a known "
            "price. Not a proposed price for this concept — the real going rate for this segment today.")
    else:
        typical_note = "No real product classified under this friction theme has a known listed price yet."
    if cand.get("economic_value") is not None:
        exposure_note = (
            f"{money(cand['economic_value'])} — the sum of real listed prices across every real review classified "
            "under this friction theme with a known product price (a review counts its product's price once per review, "
            "so a popular product's price is summed multiple times — a different, larger population than the distinct-"
            "product median above). A relative indicator of which friction touches more expensive products, not a "
            "revenue or market-size estimate: no units-sold or conversion-rate basis exists in this real evidence.")
    else:
        exposure_note = "No priced real review is classified under this friction theme yet."
    return kv_table([
        ("Typical real market price", typical_note),
        ("Price-weighted exposure", exposure_note),
    ])


def evidence_and_mechanism_section(story, section_no, cand, theme, directions):
    story.append(Paragraph(f"{section_no}. Real Evidence &amp; Design Directions", S_H1))
    m = cand["consumer_pain"].get("methodology")
    if m:
        story.append(Paragraph(
            f"{m['n_reviews']} real reviews across {m['n_distinct_products']} distinct real products from "
            f"{m['source']} were classified to this friction theme, spanning {m['review_date_range'][0]} to "
            f"{m['review_date_range'][1]} — {m['pct_verified_purchase']}% of which are verified purchases. "
            f"The resulting real customer-satisfaction impact is {cand['consumer_pain']['severity_csat']:.3f} "
            f"star-ratings below the corpus-wide mean, at a real observed prevalence of "
            f"{pct(cand['consumer_pain']['prevalence_pct'])} of all classified reviews.", S_BODY))
        story.append(Paragraph(f"<i>Methodology.</i> {m['method']}", S_CAPTION))
    else:
        story.append(Paragraph(
            f"No polarity-gated satisfaction methodology exists for this theme in this pipeline. Real evidence: "
            f"{cand.get('evidence', 'not recorded')}.", S_BODY))

    if directions:
        story.append(Paragraph(
            f"This pipeline's own possibility-generation module (magic_box_real.py) catalogues {len(directions)} "
            f"real design direction{'s' if len(directions) != 1 else ''} for this friction theme — distinct named "
            "transforms applied to the same real evidence above, not asserted as one single correct mechanism:",
            S_BODY))
        story.append(directions_table(directions))
    else:
        story.append(Paragraph(
            "No real design-operator possibilities are catalogued for this theme in this pipeline's possibility "
            "grid (this theme did not reach that stage of the funnel).", S_BODY))


def gap_and_criteria_section(story, section_no, theme, directions, criteria):
    story.append(Paragraph(f"{section_no}. Competitive Gap &amp; Evaluation Record", S_H1))
    if not directions:
        story.append(Paragraph(
            "No matching Criteria-stage evaluation exists for this theme (it did not reach the possibility grid), "
            "so no competitive-gap or criteria record is available — reported as unavailable, not estimated.", S_BODY))
        return None
    for c in directions:
        gap_brands = c.get("competitor_gap_brands") or []
        story.append(Paragraph(
            f'<b>{c["name"]}</b> ({humanize(c["operator"])}) — real white-space check: '
            f"{'no real competitor product addresses this theme with this direction' if c.get('is_white_space') else 'at least one real competitor already addresses this theme'}. "
            f"Real competitor brands checked with no matching product: {', '.join(gap_brands) if gap_brands else 'none recorded'}. "
            f'Independent critic verdict (real, rule-based): <b>{humanize(c.get("critic_overall")) or "not available"}</b>.',
            S_BODY))
    representative = directions[0]
    status_counts = Counter(v["status"] for v in representative["criteria"].values())
    total = sum(status_counts.values())
    story.append(Spacer(1, 6))
    story.append(KeepTogether([
        criteria_donut(status_counts, total),
        Paragraph(f'Fig. — Full real criteria-library result for "{representative["name"]}" (representative direction for this theme; '
                  "the same automated critic pass CriteriaWorld runs against every Magic Box concept, not a self-assessment by this disclosure).", S_CAPTION),
    ]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Selected real criteria evaluations (evidence reality, hypothesis framing, and Versuni-specific capability checks):", S_CAPTION))
    highlight_ids = ["E1", "H1", "H2", "D2", "V1", "V2"]
    story.append(criteria_table(representative["criteria"], highlight_ids))
    return representative


def claims_section(story, section_no, cand, theme, directions):
    story.append(Paragraph(f"{section_no}. Design &amp; Business Claims", S_H1))
    story.append(Paragraph(
        "The following claims describe the disclosed concept for internal evaluation purposes, generated from this "
        "candidate's own real evaluated fields, and are not filed with, or reviewed by, any patent office.", S_CAPTION))
    claims = [
        f"A connected household appliance addressing a real, evidence-derived friction: {cand['friction']}",
        f"The appliance of claim 1, intended for the real usage context: {cand.get('usage_context', 'not recorded')}.",
    ]
    if directions:
        op_list = "; ".join(f'{humanize(d["operator"])} ({d["operator_definition"]})' for d in directions)
        claims.append(
            "The appliance of claim 1, applying a design transform selected from the real catalogued directions "
            f"for this friction theme: {op_list}."
        )
    claims.append(
        "A method of evaluating such an appliance concept using this pipeline's real Consumer Pain evidence-"
        "sufficiency gate, real Economic Value computation, and real 2-5 year Feasibility rating, exactly as "
        "disclosed in this document."
    )
    for i, c in enumerate(claims, 1):
        story.append(Paragraph(f"{i}. {c}", S_CLAIM))


def not_yet_specified(story, section_no):
    story.append(Paragraph(f"{section_no}. What this doesn't cover yet", S_HONESTY_HEAD))
    story.append(Paragraph(
        "This pipeline's real evidence base has no physical-prototype, industrial-design, or manufacturing data of "
        "any kind — for this concept or for any real product in the underlying dataset (weight and dimension fields "
        "do not exist anywhere in the corpus, verified directly). So this disclosure leaves them open rather than "
        "guessing: physical weight and dimensions, bill of materials, housing material, the fabrication or "
        "manufacturing process, exact sensor part numbers, and firmware architecture. Filling any of these in "
        "without a real industrial-design phase would be invention, not evidence.", S_BODY))


def build_disclosure(cid, cand, verdict, all_scores, crit_concepts):
    story = []
    status_label, status_color = pick_status(cid, cand, verdict)
    theme = theme_of(cand)
    directions = real_directions_for_theme(theme, crit_concepts)
    gate_passed = cand["consumer_pain"].get("gate_passed", False)

    cover(story, cid, status_label, status_color, cand)

    story.append(Paragraph("1. Field of the Invention", S_H1))
    story.append(Paragraph(
        f"This disclosure concerns connected household appliances, and specifically a concept addressing the "
        f"following real, evidence-derived friction: {cand['friction']}", S_BODY))

    story.append(KeepTogether([
        funnel_position_diagram(theme, cid, status_label, status_color),
        Paragraph("Fig. 1 — This disclosure's real position in the app's own 5-stage funnel.", S_CAPTION),
    ]))

    evidence_and_mechanism_section(story, 2, cand, theme, directions)

    story.append(Paragraph("3. Market &amp; Economic Rationale — Fully Substantiated", S_H1))
    story.append(price_substantiation(cand))
    story.append(Spacer(1, 8))
    cp = cand["consumer_pain"]
    story.append(KeepTogether([
        evidence_chart([
            (f'{cp["severity_csat"]:.2f}', "CSAT impact\n(stars vs. corpus mean)") if cp.get("severity_csat") is not None else None,
            (pct(cp.get("prevalence_pct")), "Prevalence\n(of classified reviews)"),
            (f'{cand.get("n_reviews_supporting", 0)}', "Reviews\nsupporting"),
        ], status_color),
        Paragraph("Fig. 2 — Real evidence figures computed by this pipeline for this friction theme.", S_CAPTION),
    ]))

    story.append(Paragraph("4. Feasibility &amp; Technical Risk", S_H1))
    story.append(kv_table([
        ("2–5yr feasibility rating", f"{cand['feasibility_2_5y']['rating']} (rank {cand['feasibility_2_5y']['rank']} of {len(all_scores)} real candidates evaluated)"),
        ("Feasibility rationale", cand["feasibility_2_5y"]["rationale"]),
        ("Assumptions", bulleted(cand.get("assumptions"))),
        ("Known uncertainty", bulleted(cand.get("uncertainty"))),
    ]))

    gap_and_criteria_section(story, 5, theme, directions, crit_concepts)

    story.append(Paragraph("6. Why This Real Outcome", S_H1))
    if cid == verdict.get("recommended"):
        story.append(Paragraph(verdict["why"], S_BODY))
        for k in verdict.get("killed", []):
            story.append(Paragraph(f'<b>{k["name"]} ({k["id"]})</b> — {k["reason"]}', S_BODY))
        story.append(Paragraph(f'<b>Sensitivity.</b> {verdict["sensitivity"]}', S_BODY))
        story.append(Paragraph(f'<b>First experiment.</b> {verdict["first_experiment"]}', S_BODY))
        story.append(Paragraph(f'<b>Abandon signal.</b> {verdict["abandon_signal"]}', S_BODY))
    elif gate_passed:
        killed_entry = next((k for k in verdict.get("killed", []) if k["id"] == cid), None)
        story.append(Paragraph(
            "This concept passed the real evidence-sufficiency gate — it is not being disclosed as a failure. "
            f"Under the decision rule currently in force ({verdict.get('decision_priority_used')}), it was not selected: "
            f'{killed_entry["reason"] if killed_entry else "see comparative context below."}', S_BODY))
        story.append(Paragraph(f'<b>Sensitivity.</b> {verdict.get("sensitivity", "")}', S_BODY))
    else:
        killed_entry = next((k for k in verdict.get("killed", []) if k["id"] == cid), None)
        story.append(Paragraph(
            f'{killed_entry["reason"] if killed_entry else cand.get("decision_reason", "")}', S_BODY))
        story.append(Paragraph(
            "Notably, technical feasibility alone does not rescue this candidate — high feasibility does not "
            "compensate for a failed Consumer Pain evidence gate (see Section 4 above for the real rationale).",
            S_BODY))

    not_yet_specified(story, 7)
    claims_section(story, 8, cand, theme, directions)

    story.append(Paragraph("9. Comparative Context", S_H1))
    story.append(Paragraph("Real evidence values computed by this pipeline for every candidate evaluated in this funnel stage, for reference:", S_BODY))
    story.append(comparative_table(all_scores))

    story.append(Paragraph("10. Evidence Appendix", S_H1))
    story.append(Paragraph("Real evidence identifiers referenced in this disclosure: " + ", ".join(cand.get("evidence_ids", [])) + ".", S_BODY))
    story.append(Paragraph(f"Underlying computation: {cand.get('evidence', 'not recorded')}.", S_BODY))
    ms = verdict.get("market_scenario")
    if ms:
        story.append(Paragraph(f"Market scenario used for category context: {ms['used']} ({ms['cagr_pct']}% CAGR). {ms['note']}", S_BODY))
    return story


def render(cid, story):
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, f"{cid}.pdf")
    doc = SimpleDocTemplate(
        path, pagesize=LETTER,
        topMargin=20 * mm, bottomMargin=18 * mm, leftMargin=20 * mm, rightMargin=20 * mm,
        title=f"Innovation Disclosure — {cid}",
    )
    doc.build(story)
    n_pages = doc.canv.getPageNumber() - 1
    print(f"  wrote {path} ({n_pages} pages)")


def main():
    decision = json.load(open(DECISION_PATH, encoding="utf-8"))
    magicbox = json.load(open(MAGICBOX_PATH, encoding="utf-8"))
    criteria = json.load(open(CRITERIA_PATH, encoding="utf-8"))
    crit_concepts = {c["id"]: c for c in criteria.get("concepts", [])}
    scores = decision["scores"]
    verdict = decision["verdict"]

    # Clear stale disclosures for candidates the machine no longer produces,
    # so this directory never silently keeps a PDF for a dropped candidate.
    os.makedirs(OUT_DIR, exist_ok=True)
    live_ids = set(scores.keys())
    for fname in os.listdir(OUT_DIR):
        if fname.endswith(".pdf") and fname[:-4] not in live_ids:
            os.remove(os.path.join(OUT_DIR, fname))
            print(f"  removed stale {fname} (no longer produced by the machine)")

    print(f"Generating real-data-only Innovation Disclosure PDFs for {len(scores)} real candidate(s)...")
    for cid, cand in scores.items():
        render(cid, build_disclosure(cid, cand, verdict, scores, crit_concepts))
    print("Done.")


if __name__ == "__main__":
    main()
