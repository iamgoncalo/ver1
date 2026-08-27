"""Convert a markdown deliverable to a clean PDF for submission.

Pure-Python (reportlab + markdown), no system dependencies (no pandoc/
wkhtmltopdf/weasyprint required) - keeps this a one-shot export step, not a
new dependency in the reproducible analysis pipeline itself. The .md file
remains the source of truth; this PDF is a rendered copy for submission.

Run:  python3 scripts/md_to_pdf.py <input.md> <output.pdf> [--landscape]
"""
import re
import sys

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, ListFlowable,
                                 ListItem, HRFlowable, Table, TableStyle, PageBreak)
from reportlab.lib import colors


def inline_md(text):
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<i>\1</i>", text)
    text = re.sub(r"`([^`]+?)`", r"<font face='Courier'>\1</font>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"<link href='\2'><u>\1</u></link>", text)
    return text


def convert(md_path, pdf_path, landscape_mode=False):
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=13, spaceAfter=4, spaceBefore=1, textColor=colors.HexColor("#1a2b4a"))
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=10, spaceAfter=2, spaceBefore=5, textColor=colors.HexColor("#2f6f5b"), keepWithNext=True)
    h3 = ParagraphStyle("H3", parent=styles["Heading3"], fontSize=9, spaceAfter=1, spaceBefore=4, keepWithNext=True)
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontSize=7.3, leading=9.2, spaceAfter=2.5, alignment=TA_LEFT)
    bullet = ParagraphStyle("Bullet", parent=body, fontSize=7.3, leading=9)

    with open(md_path, encoding="utf-8") as fh:
        lines = fh.read().split("\n")

    story = []
    i = 0
    list_buf = []

    def flush_list():
        if list_buf:
            story.append(ListFlowable(
                [ListItem(Paragraph(inline_md(t), bullet), leftIndent=4, spaceAfter=1) for t in list_buf],
                bulletType="bullet", start="circle", leftIndent=10,
            ))
            story.append(Spacer(1, 2))
            list_buf.clear()

    while i < len(lines):
        line = lines[i].rstrip()
        if not line.strip():
            flush_list()
            i += 1
            continue
        if line.strip() == "---":
            flush_list()
            story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#cccccc"), spaceBefore=6, spaceAfter=6))
        elif line.startswith("# "):
            flush_list()
            story.append(Paragraph(inline_md(line[2:]), h1))
        elif line.startswith("## "):
            flush_list()
            story.append(Paragraph(inline_md(line[3:]), h2))
        elif line.startswith("### "):
            flush_list()
            story.append(Paragraph(inline_md(line[4:]), h3))
        elif line.startswith("- ") or line.startswith("* "):
            list_buf.append(line[2:])
        elif re.match(r"^\d+\.\s", line):
            list_buf.append(re.sub(r"^\d+\.\s", "", line))
        elif line.startswith("|"):
            flush_list()
            table_rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                row = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not re.match(r"^:?-+:?$", row[0]):
                    table_rows.append(row)
                i += 1
            i -= 1
            if table_rows:
                t = Table([[Paragraph(inline_md(c), body) for c in r] for r in table_rows], repeatRows=1)
                t.setStyle(TableStyle([
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#dddddd")),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef2f5")),
                    ("FONTSIZE", (0, 0), (-1, -1), 7.2),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ("LEFTPADDING", (0, 0), (-1, -1), 3),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ]))
                story.append(t)
                story.append(Spacer(1, 4))
        else:
            flush_list()
            story.append(Paragraph(inline_md(line), body))
        i += 1
    flush_list()

    pagesize = landscape(A4) if landscape_mode else A4
    doc = SimpleDocTemplate(pdf_path, pagesize=pagesize,
                             topMargin=12 * mm, bottomMargin=12 * mm,
                             leftMargin=14 * mm, rightMargin=14 * mm,
                             title=md_path.split("/")[-1])
    count = len(story)
    doc.build(story)
    print("wrote {} ({} flowables)".format(pdf_path, count))


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    convert(args[0], args[1], landscape_mode="--landscape" in sys.argv)
