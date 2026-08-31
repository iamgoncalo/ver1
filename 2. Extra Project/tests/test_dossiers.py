"""Tests for the public innovation dossiers (web/public/innovation-dossiers).

For every innovation in data/processed/innovations_real.json:
- the dossier PDF exists, parses, and has exactly 5 pages (the 10-section
  outline: 1-2 on page 1, 3-4 on page 2, 5-6 on page 3, 7-9 on page 4, 10 on
  page 5 - see src/real/generate_innovation_dossiers.py's module docstring);
- its extracted text contains the innovation_id, the name, a snippet of its
  own next_experiment, and at least one of its parent path ids (innovations
  with no parent paths must instead carry the honest no-parents line);
- a pairwise text-similarity guard (Jaccard over word 5-grams) proves the
  dossiers are not copies of one another;
- the first two innovations' "Physical architecture" sections (section 2)
  are not substantively the same dossier re-labelled.

Text extraction probes for the best available tool: pypdf, then pdfminer,
then a byte-level fallback (zlib-decompress the content streams and read the
PDF Tj/TJ string operators - enough for reportlab output).

Similarity thresholds - honest note. The pipeline data is deterministic and
several innovations are siblings from the SAME friction theme, differing only
by design operator: their propositions, envelopes, criteria notes, economics
and parent paths are byte-identical in the source JSON. A dossier that
truthfully shows only stored strings therefore CANNOT push same-theme
similarity below ~0.9 without inventing content, which this pipeline forbids.
So the guard is two-tier:
- pairs from different friction themes must be < 0.60 (genuine uniqueness
  where the data is genuinely distinct);
- same-theme sibling pairs must be < SAME_THEME_MAX (0.92), tuned above the
  real corpus (max observed 0.874) but below what a duplicated body produces
  (a copy of a sibling's body re-labelled with another id/name measures
  0.951 against the original).
The max observed pairwise similarity is printed for inspection.
"""

import json
import os
import re
import unittest
import zlib
from itertools import combinations

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INNOV_PATH = os.path.join(ROOT, "data", "processed", "innovations_real.json")
DOSSIER_DIR = os.path.join(ROOT, "web", "public", "innovation-dossiers")

CROSS_THEME_MAX = 0.60
SAME_THEME_MAX = 0.92

# must match src/real/generate_innovation_dossiers.py
NO_PARENTS_LINE = ("No parent paths - this innovation cites no tension or "
                   "assumption paths; its grounding is the friction evidence "
                   "in section 3, why it exists.")
# section-header markers used to slice out one section's text below - must
# match Flow.section() calls in src/real/generate_innovation_dossiers.py
SECTION2_HEADER = "2. Physical architecture"
SECTION3_HEADER = "3. Why it exists"
_REPL = {
    "—": "-", "–": "-", "→": "->", "←": "<-",
    "⇄": "<->", "★": "*", "☆": "*", "✕": "x",
    "✓": "v", "™": "(TM)", "‘": "'", "’": "'",
    "“": '"', "”": '"', "•": "-", "…": "...",
    " ": " ",
}


def sanitize(text):
    t = str(text)
    for k, v in _REPL.items():
        t = t.replace(k, v)
    return t.encode("latin-1", "replace").decode("latin-1")


# --------------------------------------------------------------- extraction
def _extract_pypdf(path):
    import pypdf  # noqa: probed import
    reader = pypdf.PdfReader(path)
    return "\n".join(p.extract_text() or "" for p in reader.pages), \
        len(reader.pages)


def _extract_pdfminer(path):
    from pdfminer.high_level import extract_text  # noqa: probed import
    from pdfminer.pdfpage import PDFPage
    with open(path, "rb") as fh:
        n_pages = sum(1 for _ in PDFPage.get_pages(fh))
    return extract_text(path), n_pages


_STR_RE = re.compile(rb"\((?:\\.|[^\\()])*\)")
_ESC = {b"n": b"\n", b"r": b"\r", b"t": b"\t", b"b": b"\b", b"f": b"\f",
        b"(": b"(", b")": b")", b"\\": b"\\"}


def _unescape_pdf_string(raw):
    out = bytearray()
    i = 0
    while i < len(raw):
        ch = raw[i:i + 1]
        if ch == b"\\":
            nxt = raw[i + 1:i + 2]
            if nxt and nxt in b"01234567":
                octal = raw[i + 1:i + 4]
                m = re.match(rb"[0-7]{1,3}", octal)
                out += bytes([int(m.group(0), 8) & 0xFF])
                i += 1 + len(m.group(0))
            elif nxt in _ESC:
                out += _ESC[nxt]
                i += 2
            else:
                i += 2
        else:
            out += ch
            i += 1
    return bytes(out)


def _extract_bytes(path):
    """Byte-level fallback: no third-party PDF library available.

    Decompresses every stream and reads the string literals shown by Tj/TJ
    text operators.  Sufficient for reportlab-generated PDFs like ours."""
    with open(path, "rb") as fh:
        data = fh.read()
    if not data.startswith(b"%PDF"):
        raise AssertionError("%s is not a PDF" % path)
    import base64
    chunks = []
    for m in re.finditer(rb"stream\r?\n(.*?)\s*endstream", data, re.S):
        raw = m.group(1)
        decoded = None
        for attempt in (
                lambda b: zlib.decompress(b),
                # reportlab default: ASCII85Decode then FlateDecode
                lambda b: zlib.decompress(
                    base64.a85decode(b.strip(), adobe=True)),
                lambda b: base64.a85decode(b.strip(), adobe=True),
                lambda b: b):
            try:
                decoded = attempt(raw)
                break
            except Exception:
                continue
        chunks.append(decoded if decoded is not None else raw)
    content = b"\n".join(chunks)
    texts = []
    # (string) Tj  and  [(a) -12 (b)] TJ
    for m in re.finditer(
            rb"(\((?:\\.|[^\\()])*\))\s*Tj|\[((?:[^\]\\]|\\.)*)\]\s*TJ",
            content):
        if m.group(1) is not None:
            texts.append(_unescape_pdf_string(m.group(1)[1:-1]))
        else:
            for sm in _STR_RE.finditer(m.group(2)):
                texts.append(_unescape_pdf_string(sm.group(0)[1:-1]))
    text = b" ".join(texts).decode("latin-1", "replace")
    n_pages = len(re.findall(rb"/Type\s*/Page[^s]", data))
    return text, n_pages


def get_extractor():
    try:
        import pypdf  # noqa
        return _extract_pypdf, "pypdf"
    except ImportError:
        pass
    try:
        import pdfminer  # noqa
        return _extract_pdfminer, "pdfminer"
    except ImportError:
        pass
    return _extract_bytes, "byte-level (zlib + Tj/TJ operators)"


def norm(text):
    return re.sub(r"\s+", " ", text).strip().lower()


def word_5grams(text):
    words = re.findall(r"[a-z0-9$%.:/'-]+", text.lower())
    return set(tuple(words[i:i + 5]) for i in range(len(words) - 4))


# --------------------------------------------------------------- the tests
class TestDossiers(unittest.TestCase):
    maxDiff = None

    @classmethod
    def setUpClass(cls):
        with open(INNOV_PATH) as fh:
            cls.data = json.load(fh)
        cls.innovations = cls.data["innovations"]
        cls.extract, cls.extractor_name = get_extractor()
        print("\n[dossier tests] text extractor: %s" % cls.extractor_name)
        cls.texts = {}
        cls.pages = {}
        for inn in cls.innovations:
            iid = inn["innovation_id"]
            path = os.path.join(DOSSIER_DIR, iid.replace(":", "_") + ".pdf")
            if os.path.exists(path):
                text, n = cls.extract(path)
                cls.texts[iid] = text
                cls.pages[iid] = n

    def dossier_path(self, inn):
        return os.path.join(
            DOSSIER_DIR, inn["innovation_id"].replace(":", "_") + ".pdf")

    def test_all_pdfs_exist_and_parse(self):
        for inn in self.innovations:
            path = self.dossier_path(inn)
            self.assertTrue(os.path.exists(path), "missing dossier " + path)
            with open(path, "rb") as fh:
                head = fh.read(5)
            self.assertEqual(head, b"%PDF-", path + " is not a PDF")
            self.assertIn(inn["innovation_id"], self.texts,
                          "text extraction failed for " + path)
            self.assertGreater(len(self.texts[inn["innovation_id"]]), 500,
                               "suspiciously little text in " + path)

    def test_page_count_is_five(self):
        for inn in self.innovations:
            iid = inn["innovation_id"]
            self.assertEqual(
                self.pages.get(iid), 5,
                "%s: expected exactly 5 pages, got %s" % (iid,
                                                          self.pages.get(iid)))

    def test_each_dossier_carries_its_own_content(self):
        for inn in self.innovations:
            iid = inn["innovation_id"]
            text = norm(self.texts[iid])
            self.assertIn(iid.lower(), text, "%s: id missing" % iid)
            self.assertIn(norm(sanitize(inn["name"])), text,
                          "%s: name missing" % iid)
            snippet = norm(sanitize(" ".join(
                inn["next_experiment"].split()[:6])))
            self.assertIn(snippet, text,
                          "%s: next_experiment snippet missing" % iid)

    def test_parent_paths_or_honest_no_parents_line(self):
        for inn in self.innovations:
            iid = inn["innovation_id"]
            text = norm(self.texts[iid])
            parents = inn.get("parent_path_ids") or []
            if parents:
                self.assertTrue(
                    any(p.lower() in text for p in parents),
                    "%s: none of its parent path ids %s appear" % (iid,
                                                                   parents))
            else:
                self.assertIn(norm(sanitize(NO_PARENTS_LINE)), text,
                              "%s: honest no-parents line missing" % iid)

    def test_pairwise_similarity_guard(self):
        grams = {iid: word_5grams(t) for iid, t in self.texts.items()}
        worst = (0.0, None, None)
        failures = []
        for a, b in combinations(sorted(grams), 2):
            ga, gb = grams[a], grams[b]
            j = len(ga & gb) / float(len(ga | gb)) if (ga or gb) else 0.0
            if j > worst[0]:
                worst = (j, a, b)
            same_theme = a.split(":")[0] == b.split(":")[0]
            limit = SAME_THEME_MAX if same_theme else CROSS_THEME_MAX
            if j >= limit:
                failures.append(
                    "%s vs %s: jaccard %.3f >= %.2f (%s-theme limit)" % (
                        a, b, j, limit,
                        "same" if same_theme else "cross"))
        print("[dossier tests] max observed pairwise 5-gram jaccard: "
              "%.3f (%s vs %s)" % worst)
        self.assertFalse(failures, "similarity guard tripped:\n" +
                         "\n".join(failures))

    def test_first_two_dossiers_physical_architecture_differ(self):
        """Direct encoding of the mission requirement that the first and
        second innovation PDFs must NOT be substantively the same: slice out
        just the "Physical architecture" section (section 2, bounded by the
        "3. Why it exists" header that starts section 3) for the first two
        possibilities in innovations_real.json order, and assert they are
        not equal. This is a stronger, more targeted check than the overall
        Jaccard guard above - it isolates exactly the section a lazy
        re-labelling would leave untouched."""
        self.assertGreaterEqual(len(self.innovations), 2,
                                "need at least 2 innovations for this check")
        first, second = self.innovations[0], self.innovations[1]

        def section2_text(inn):
            iid = inn["innovation_id"]
            text = norm(self.texts[iid])
            start = norm(SECTION2_HEADER)
            end = norm(SECTION3_HEADER)
            i = text.find(start)
            j = text.find(end, i + len(start)) if i >= 0 else -1
            self.assertTrue(i >= 0 and j > i,
                            "%s: could not locate the physical architecture "
                            "section (looking for %r ... %r)" % (
                                iid, SECTION2_HEADER, SECTION3_HEADER))
            return text[i + len(start):j].strip()

        sec_a = section2_text(first)
        sec_b = section2_text(second)
        self.assertTrue(len(sec_a) > 20 and len(sec_b) > 20,
                        "physical architecture section suspiciously short")
        self.assertNotEqual(
            sec_a, sec_b,
            "%s and %s have byte-identical Physical architecture sections - "
            "the dossiers are substantively the same, not just re-labelled"
            % (first["innovation_id"], second["innovation_id"]))
        print("[dossier tests] first-two-dossiers physical-architecture "
              "difference: %s vs %s -> confirmed different (%d vs %d chars)"
              % (first["innovation_id"], second["innovation_id"],
                 len(sec_a), len(sec_b)))

    def test_no_obsolete_funnel_wording(self):
        obsolete = norm("Products - Signals - Magic - Criteria - Innovations")
        for iid, text in self.texts.items():
            t = norm(text).replace(">", "-").replace("->", "-")
            self.assertNotIn(obsolete, t,
                             "%s: obsolete funnel wording present" % iid)


if __name__ == "__main__":
    unittest.main()
