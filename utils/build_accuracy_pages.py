#!/usr/bin/env python3
"""build_accuracy_pages.py — map each EVD's cited (journal) page to a *physical* PDF page.

WHY
    EVD quotes cite the journal page ("p. 7387"), but the PDF viewer's #page= fragment
    addresses physical 1-indexed pages. Many PDFs carry page labels (e.g. firstpagenum
    7385) so journal 7387 = physical 3. Without this mapping the "jump to page" button
    lands nowhere. Two strategies, in order:
      1. page labels  → physical = journal - firstpagenum + 1   (cheap, exact)
      2. quote search → find the page whose text contains the quote   (fallback)

OUTPUT
    data/review/accuracy_pages.json = { "<EVD id>": <physical page>, ... }   (gitignored)

USAGE
    python3 utils/build_accuracy_pages.py            # all EVDs whose source PDF exists
    python3 utils/build_accuracy_pages.py @Allan_2022_impact_English  # limit to citekeys
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
EVD = ROOT / "graph" / "evidence"
SRC = ROOT / "graph" / "sources"
PDFS = ROOT / "data" / "pdfs"
OUT = ROOT / "site" / "review-data" / "accuracy_pages.json"


def frontmatter(path: Path) -> dict:
    import yaml

    m = re.match(r"^---\s*\n(.*?)\n---", path.read_text(encoding="utf-8"), re.DOTALL)
    return (yaml.safe_load(m.group(1)) or {}) if m else {}


def source_citekeys() -> dict:
    """S-id -> citekey."""
    out = {}
    for f in SRC.glob("S-*.md"):
        fm = frontmatter(f)
        if fm.get("citekey"):
            out[fm["id"]] = fm["citekey"]
    return out


def first_quote(body: str) -> str:
    m = re.search(r"## Description\s*\n(.*?)(?:\n## |\Z)", body, re.DOTALL)
    region = m.group(1) if m else body
    cur = []
    for line in region.splitlines():
        if line.strip().startswith(">"):
            cur.append(re.sub(r"^\s*>\s?", "", line))
        elif cur:
            break
    return re.sub(r"\s+", " ", " ".join(cur)).strip().strip('"')


def journal_page(quote: str) -> int | None:
    m = re.search(r"p\.?\s*(\d+)", quote)
    return int(m.group(1)) if m else None


def physical_from_labels(doc, jpage: int) -> int | None:
    try:
        labels = doc.get_page_labels()
    except Exception:
        labels = None
    if not labels:
        return None
    first = labels[0].get("firstpagenum")
    if first is None:
        return None
    phys = jpage - first + 1
    return phys if 1 <= phys <= doc.page_count else None


def physical_from_search(doc, quote: str) -> int | None:
    # search a few short word-windows; the page with the most hits wins
    words = re.findall(r"[A-Za-z0-9%.<>=]+", quote)
    phrases = [" ".join(words[i : i + 4]) for i in range(0, min(len(words), 24), 4)]
    phrases = [p for p in phrases if len(p) > 8]
    if not phrases:
        return None
    tally = {}
    for pi in range(doc.page_count):
        page = doc[pi]
        hits = sum(1 for ph in phrases if page.search_for(ph))
        if hits:
            tally[pi + 1] = hits
    if not tally:
        return None
    return max(tally, key=tally.get)


def main():
    import fitz

    only = set(sys.argv[1:])
    s2ck = source_citekeys()
    pages: dict[str, int] = {}
    pdf_cache: dict[str, object] = {}

    for f in sorted(EVD.glob("E-*.md")):
        fm = frontmatter(f)
        eid = fm.get("id")
        derived = (fm.get("edges") or {}).get("derivedFrom") or []
        ck = next((s2ck.get(s) for s in derived if s2ck.get(s)), None)
        if not ck or (only and ck not in only):
            continue
        pdf = PDFS / f"{ck}.pdf"
        if not pdf.exists():
            continue
        quote = first_quote(f.read_text(encoding="utf-8"))
        jpage = journal_page(quote)

        if ck not in pdf_cache:
            pdf_cache[ck] = fitz.open(pdf)
        doc = pdf_cache[ck]

        phys = None
        if jpage is not None:
            phys = physical_from_labels(doc, jpage)
        if phys is None and quote:
            phys = physical_from_search(doc, quote)
        if phys is not None:
            pages[eid] = phys

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(pages, indent=1))
    print(f"Wrote {len(pages)} EVD→page mappings → {OUT}")


if __name__ == "__main__":
    main()
