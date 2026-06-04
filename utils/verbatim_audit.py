#!/usr/bin/env python3
"""
verbatim_audit.py — verify every > "..." quote in the discourse graph against its source text.

WHAT
    Catches paraphrased, fabricated, or wrong-source quotes by checking each blockquote against the
    paper it cites. Normalization is NFKD + alphanumeric-only, so punctuation/spacing/case differ
    freely and only the words have to match.

HOW
    1. Build an author+year → citekey map from ALL source notes (Discourse Graph/Sources/@*.md), not
       only PDF-backed ones, so a quote can resolve even when no full text is on disk.
    2. Scan every node body for > "..." quotes; resolve each quote's citekey from a trailing
       "(Author, year, …)" citation when present, else the node's Source / filename.
    3. Load that source's text — PDF first (data/pdfs/<citekey>.pdf via PyMuPDF), falling back to
       extracted full text (data/fulltext/<citekey>.txt) — and normalize + cache it.
    4. Score coverage = fraction of the normalized quote matched in order, and bin into tiers:
         OK >= 0.98 · minor 0.90-0.98 · moderate 0.50-0.90 · FAIL < 0.50
       (plus NO-PDF when no source text exists, NO-SRC when no citekey resolves).

INPUT   Discourse Graph/**/*.md (quotes + Source); data/pdfs/*.pdf; data/fulltext/*.txt.
OUTPUT  data/verbatim_audit.tsv + a console summary. Read-only over the graph.

INVARIANTS / NOTES
    - Read-only: reports only; quote fixes are a human edit.
    - Known false positive: pdftotext/PyMuPDF renders en-dashes (and similar glyphs) oddly, so genuine
      verbatim quotes can land in the `minor` tier.
    - --min lists only quotes below a coverage threshold (default 2.0 ⇒ everything but OK).

USAGE
    python3 utils/verbatim_audit.py
    python3 utils/verbatim_audit.py --min 0.9     # only list quotes below this coverage

Design decisions, limitations, and the "smarter later" roadmap: Pipeline/verbatim_audit.md
"""

import argparse
import os
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

import yaml

QUOTE_RE = re.compile(r'>\s*"([^"]{8,})"(?:\s*\(([^)]*)\))?')
CITE_AUTHOR_YEAR = re.compile(r"([A-Za-z][A-Za-z\-]+)\s*,\s*(\d{4})")
PAGE_RE = re.compile(r"p\.?\s*([0-9ivxl]+)", re.IGNORECASE)


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    return re.sub(r"[^a-z0-9]", "", s.lower())


def coverage(qn: str, srcn: str) -> float:
    if not qn:
        return 1.0
    if qn in srcn:
        return 1.0
    sm = SequenceMatcher(None, qn, srcn, autojunk=False)
    matched = sum(b.size for b in sm.get_matching_blocks())
    return matched / len(qn)


def frontmatter(path: Path) -> dict:
    c = path.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---", c, re.DOTALL)
    if not m:
        return {}
    try:
        return yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        return {}


def tier(c: float) -> str:
    return "OK" if c >= 0.98 else "minor" if c >= 0.90 else "moderate" if c >= 0.50 else "FAIL"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min", type=float, default=2.0, help="Only list quotes with coverage below this.")
    args = ap.parse_args()

    root = Path(__file__).parent.parent
    dg = root / "Discourse Graph"
    pdf_dir = root / "data" / "pdfs"

    # citekey -> normalized source text (lazy/cached); and author+year -> citekey
    src_cache: dict = {}
    ay_to_citekey: dict = {}
    for p in (dg / "Sources").glob("@*.md"):  # map from ALL source notes, not just those with a PDF
        m = re.match(r"@([A-Za-z\-]+)_(\d{4})_", p.stem)
        if m:
            ay_to_citekey.setdefault((m.group(1).lower(), m.group(2)), p.stem)

    fulltext_dir = root / "data" / "fulltext"

    def load_src(citekey: str):
        if citekey in src_cache:
            return src_cache[citekey]
        text = ""
        pdf = pdf_dir / f"{citekey}.pdf"
        if pdf.exists():
            try:
                import fitz
                doc = fitz.open(pdf)
                text = "".join(page.get_text() for page in doc)
                doc.close()
            except Exception as e:
                print(f"  ! could not read {pdf.name}: {e}")
        if not text:  # fall back to extracted full text (citekey without leading @)
            ft = fulltext_dir / f"{citekey.lstrip('@')}.txt"
            if ft.exists():
                t = ft.read_text(encoding="utf-8", errors="ignore")
                if len(t) > 200:  # skip empty/failed stubs
                    text = t
        src_cache[citekey] = norm(text) if text else None
        return src_cache[citekey]

    rows = []
    for f in dg.rglob("*.md"):
        fm = frontmatter(f)
        # node's own source (fallback)
        node_src = None
        sm = re.search(r"@[A-Za-z][\w\-]+", str(fm.get("Source", "")) or f.stem)
        if sm:
            node_src = sm.group(0)
        body = f.read_text(encoding="utf-8")
        for quote, cite in QUOTE_RE.findall(body):
            citekey, page = node_src, ""
            if cite:
                ay = CITE_AUTHOR_YEAR.search(cite)
                if ay:
                    citekey = ay_to_citekey.get((ay.group(1).lower(), ay.group(2)), citekey)
                pg = PAGE_RE.search(cite)
                page = pg.group(1) if pg else ""
            if not citekey:
                rows.append((f.stem, "?", page, 0.0, "NO-SRC", quote))
                continue
            srcn = load_src(citekey)
            if srcn is None:
                rows.append((f.stem, citekey, page, -1.0, "NO-PDF", quote))
                continue
            c = coverage(norm(quote), srcn)
            rows.append((f.stem, citekey, page, c, tier(c), quote))

    # report
    out = root / "data" / "verbatim_audit.tsv"
    with out.open("w", encoding="utf-8") as fh:
        fh.write("file\tcitekey\tpage\tcoverage\ttier\tquote\n")
        for r in rows:
            fh.write(f"{r[0]}\t{r[1]}\t{r[2]}\t{r[3]:.3f}\t{r[4]}\t{r[5][:120]}\n")

    from collections import Counter
    counts = Counter(r[4] for r in rows)
    print(f"Quotes audited: {len(rows)}")
    for t in ["OK", "minor", "moderate", "FAIL", "NO-PDF", "NO-SRC"]:
        if counts.get(t):
            print(f"  {t:9} {counts[t]}")
    flagged = [r for r in rows if r[3] < args.min and r[4] not in ("OK",)]
    if flagged:
        print(f"\nBelow {args.min if args.min<=1 else 'OK'} threshold:")
        for f, ck, pg, c, t, q in sorted(flagged, key=lambda r: r[3]):
            print(f"  [{t} {c:.2f}] {ck} p{pg}: \"{q[:80]}\"")
    print(f"\nReport: {out}")


if __name__ == "__main__":
    main()
