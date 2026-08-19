#!/usr/bin/env python3
"""build_quote_regions.py — locate each EVD quote's EXACT region (page + rects) in the PDF.

WHY
    Highlighting a quote via the pdf.js text layer is fragile (matches break across
    span boundaries). Instead we precompute the exact bounding boxes with PyMuPDF
    (the same approach as quote_pipeline.py in the Jay vault) and let the review pane
    draw overlay rectangles at known coordinates. Exact, whole-quote, no span hacks.

OUTPUT (data/review/quote_regions.json — gitignored)
    { "<EVD id>": { "finding": [region|null, ...],
                    "what": [...], "how": [...], "who": [...] } }
    region = { "page": <physical 1-based>, "rects": [ {x,y,w,h} normalized 0..1 ] }
    Index within each role matches the quote order the review loader parses.

USAGE
    python3 utils/build_quote_regions.py            # all EVDs whose source PDF exists
    python3 utils/build_quote_regions.py @Allan_2022_impact_English   # limit to citekeys
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
OUT = ROOT / "site" / "review-data" / "quote_regions.json"

METHODS_HEADS = [("what", "What"), ("how", "How"), ("who", "Who")]


def frontmatter(path: Path) -> dict:
    import yaml

    m = re.match(r"^---\s*\n(.*?)\n---", path.read_text(encoding="utf-8"), re.DOTALL)
    return (yaml.safe_load(m.group(1)) or {}) if m else {}


def source_citekeys() -> dict:
    out = {}
    for f in SRC.glob("S-*.md"):
        fm = frontmatter(f)
        if fm.get("citekey"):
            out[fm["id"]] = fm["citekey"]
    return out


def section(body: str, head: str) -> str:
    m = re.search(rf"##\s+{head}\s*\n(.*?)(?:\n##\s|\Z)", body, re.DOTALL)
    return m.group(1) if m else ""


def sub_block(methods: str, label: str) -> str:
    m = re.search(rf"###\s+{label}\??\s*\n(.*?)(?=\n###\s|\Z)", methods, re.DOTALL)
    return m.group(1) if m else ""


def blockquotes(region: str) -> list[str]:
    out, cur = [], []
    for line in region.splitlines():
        if line.strip().startswith(">"):
            cur.append(re.sub(r"^\s*>\s?", "", line))
        elif cur:
            out.append(re.sub(r"\s+", " ", " ".join(cur)).strip())
            cur = []
    if cur:
        out.append(re.sub(r"\s+", " ", " ".join(cur)).strip())
    return [q for q in out if q]


def clean_quote(q: str) -> str:
    q = q.strip().strip('"“”')
    q = re.sub(r"\s*\([^)]*\b(?:19|20)\d{2}\b[^)]*\)\s*$", "", q)  # trailing citation
    return re.sub(r"\s+", " ", q).strip()


def journal_page(quote: str) -> int | None:
    m = re.search(r"p\.?\s*(\d+)", quote)
    return int(m.group(1)) if m else None


def physical_page(doc, jpage: int | None) -> int | None:
    if jpage is None:
        return None
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


def norm(rect, page) -> dict:
    w, h = page.rect.width, page.rect.height
    return {
        "x": round(rect.x0 / w, 4),
        "y": round(rect.y0 / h, 4),
        "w": round((rect.x1 - rect.x0) / w, 4),
        "h": round((rect.y1 - rect.y0) / h, 4),
    }


def image_label(body: str) -> str | None:
    """The grounding figure/table label from the embedded crop, e.g. 'Table 2'."""
    m = re.search(r"!\[\]?\([^)]*-(table|fig)(\d+)\.png\)", body, re.I)
    if not m:
        return None
    kind = "Table" if m.group(1).lower() == "table" else "Fig"
    return f"{kind} {m.group(2)}"


def locate_object(doc, label: str) -> dict | None:
    """Find a figure/table by its caption line; highlight the caption block's bbox."""
    m = re.match(r"(table|fig)\w*\s*(\d+)", label, re.I)
    if not m:
        return None
    import fitz

    want_fig = m.group(1).lower().startswith("fig")
    num = m.group(2)
    pat = re.compile(rf"^\s*(table|fig(?:ure)?)\.?\s*{num}\b", re.I)
    for pi in range(doc.page_count):
        page = doc[pi]
        for b in page.get_text("blocks"):
            text = (b[4] or "").strip()
            mm = pat.match(text)
            if not mm:
                continue
            is_fig = mm.group(1).lower().startswith("fig")
            if is_fig != want_fig:
                continue
            r = fitz.Rect(b[0], b[1], b[2], b[3])
            return {"page": pi + 1, "rects": [norm(r, page)]}
    # Fallback: the caption label isn't at a block start (it's embedded mid-block,
    # e.g. "…in Figure 3. Figure 3: Boxplot…"). Search for the caption label text
    # directly, preferring a separator (":"/".") so we hit the caption, not a bare
    # in-text mention or a longer number ("Table 1" ⊂ "Table 10").
    kind_words = ["Figure", "Fig.", "Fig"] if want_fig else ["Table"]
    for suffix in (":", "."):
        for kw in kind_words:
            for pi in range(doc.page_count):
                page = doc[pi]
                rects = page.search_for(f"{kw} {num}{suffix}")
                if rects:
                    return {"page": pi + 1, "rects": [norm(rects[0], page)]}
    return None


def locate(doc, quote: str) -> dict | None:
    """Find the quote's rects. Try the full quote, then sentence segments, then a
    leading window; on the cited page first, then any page."""
    q = clean_quote(quote)
    if len(q) < 8:
        return None
    target = physical_page(doc, journal_page(quote))

    candidates = [q]
    candidates += [s.strip() for s in re.split(r"[.;:]\s+", q) if len(s.strip()) > 25]
    words = q.split()
    if len(words) > 6:
        candidates.append(" ".join(words[:8]))

    order = ([target] if target else []) + [
        p for p in range(1, doc.page_count + 1) if p != target
    ]
    for cand in candidates:
        for p in order:
            page = doc[p - 1]
            rects = page.search_for(cand)
            if rects:
                return {"page": p, "rects": [norm(r, page) for r in rects]}
    return None


def main():
    import fitz

    only = set(sys.argv[1:])
    s2ck = source_citekeys()
    out: dict[str, dict] = {}
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
        if ck not in pdf_cache:
            pdf_cache[ck] = fitz.open(pdf)
        doc = pdf_cache[ck]

        body = f.read_text(encoding="utf-8")
        roles: dict[str, list] = {}
        roles["finding"] = [locate(doc, q) for q in blockquotes(section(body, "Description"))]
        methods = section(body, "Methods Context")
        for key, label in METHODS_HEADS:
            roles[key] = [locate(doc, q) for q in blockquotes(sub_block(methods, label))]
        lbl = image_label(section(body, "Description"))
        roles["figure"] = [locate_object(doc, lbl)] if lbl else []
        out[eid] = roles

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=1))
    located = sum(
        1 for ev in out.values() for lst in ev.values() for r in lst if r
    )
    total = sum(1 for ev in out.values() for lst in ev.values() for _ in lst)
    print(f"Wrote {len(out)} EVDs, {located}/{total} quotes located → {OUT}")


if __name__ == "__main__":
    main()
