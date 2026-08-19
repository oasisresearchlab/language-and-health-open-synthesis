#!/usr/bin/env python3
"""
ground_figures.py — embed the grounding figure/table FIRST in each EVD's Description.

WHAT
    For every EVD whose Description references "(Fig N)" / "(Table N)" and has a source PDF, crop
    the actual figure/table out of the PDF and embed it at the TOP of the Description, so the
    finding is grounded in the visual evidence.

HOW
    1. LOCATE by caption search — find the real CAPTION block (one that STARTS with "Figure N" /
       "Table N"), not an in-text mention like "Table 3 shows…". A verb-exclusion heuristic
       penalises a following mention-verb or "(" and rewards a title-case caption. Two passes:
       block scoring, then a search_for() fallback (adapted from
       living-synthesis-remix/misc/scripts/figure_pipeline.py).
    2. CROP — FIGURE: the nearest embedded image + caption (vector figures → half-page fallback).
       TABLE: prefer the precise Route-B bbox (data/figures_pdf/<citekey>/manifest.json) on the
       caption's page; else crop a generous region around the caption.
    3. EMBED — save to attachments/<citekey>-fig<N>.png / -table<N>.png and inject it at the top of
       the EVD ## Description. The EVD nodeType has keyImage:true, so the first image becomes the
       keyImage.

INPUT   Discourse Graph/Evidence/EVD - *.md; data/pdfs/<citekey>.pdf;
        optional data/figures_pdf/<citekey>/manifest.json (Route-B table bboxes).
OUTPUT  attachments/<citekey>-fig|table<N>.png + edited EVD bodies. Dry-run by default.

INVARIANTS / NOTES
    - Idempotent: skips an already-present embed unless --force.
    - Full-text-only papers (no PDF in data/pdfs/) cannot be grounded and are reported as no-pdf.
    - Route-B manifests are often empty, so location relies on PDF caption search.

USAGE
    python3 utils/ground_figures.py                  # dry-run: report ref→asset matches
    python3 utils/ground_figures.py --apply          # crop + embed
    python3 utils/ground_figures.py --apply --force  # re-crop existing
    python3 utils/ground_figures.py --apply @Lindholm_2012_Professional_language

Design decisions, limitations, and the "smarter later" roadmap: Pipeline/ground_figures.md
"""

import argparse
import json
import re
import shutil
from pathlib import Path

import fitz

ROOT = Path(__file__).parent.parent
PDF_DIR = ROOT / "data" / "pdfs"
FIGB_DIR = ROOT / "data" / "figures_pdf"
ATTACH = ROOT / "attachments"
EVD_DIR = ROOT / "Discourse Graph" / "Evidence"

DPI = 160
PAD = 10.0
TABLE_CAP_PAD = 16.0

REF_RE = re.compile(r"\b(Fig(?:ure)?|Table)s?\.?\s*(\d+)", re.IGNORECASE)


def extract_refs(description: str):
    """Return ordered unique [(kind, num)] where kind in {'fig','table'}."""
    out, seen = [], set()
    for m in REF_RE.finditer(description):
        kind = "table" if m.group(1).lower().startswith("table") else "fig"
        key = (kind, m.group(2))
        if key not in seen:
            seen.add(key)
            out.append(key)
    return out


def description_text(body: str) -> str:
    m = re.search(r"##\s*Description\s*\n(.*?)(?:\n##\s|\Z)", body, re.DOTALL)
    return m.group(1) if m else ""


def citekey_of(stem: str):
    m = re.search(r"@([\w\-]+)$", stem)
    return m.group(0) if m else None  # includes leading @


# lowercase words that, right after "Table N"/"Fig N", signal an in-text MENTION, not a caption
MENTION_VERBS = {
    "shows", "show", "showed", "reports", "report", "reported", "presents", "present",
    "presented", "examines", "examine", "displays", "display", "lists", "list", "summarizes",
    "describes", "illustrates", "depicts", "provides", "gives", "contains", "indicates", "details",
    "and", "of", "in", "for", "the",
}


def find_caption(doc, kind, num):
    """Find the actual CAPTION block (starts with the label) — not an in-text mention.

    Scores blocks beginning with "Table N"/"Figure N": penalises a following mention-verb or "("
    (e.g. "Table 3 shows…"), rewards a title-case caption. Falls back to search_for if none found.
    """
    want_table = kind == "table"
    label_re = re.compile(rf"^(table|fig(?:ure)?)\.?\s*0*{num}\b(.*)", re.IGNORECASE | re.DOTALL)
    cands = []
    for pi in range(len(doc)):
        for b in doc[pi].get_text("blocks"):
            txt = (b[4] or "").strip()
            m = label_re.match(txt)
            if not m:
                continue
            if txt[:5].lower().startswith("table") != want_table:
                continue
            rest = m.group(2).strip()
            nxt = rest.split()[0].lower().strip(".:,;") if rest else ""
            score = 0
            if nxt in MENTION_VERBS or rest.startswith("("):
                score -= 10
            if rest[:1].isupper():
                score += 2
            if len(txt) < 220:
                score += 1
            cands.append((score, pi, fitz.Rect(b[:4])))
    if cands:
        cands.sort(key=lambda c: (c[0], c[1]), reverse=True)  # best score, then later page
        return cands[0][1], cands[0][2]
    # fallback: first search_for hit
    for pi in range(len(doc)):
        for pat in (f"{'Table' if want_table else 'Figure'} {num}", f"Fig. {num}"):
            r = doc[pi].search_for(pat)
            if r:
                return pi, r[0]
    return None


def nearest_image_bbox(page, cap_rect):
    cap_cy = (cap_rect.y0 + cap_rect.y1) / 2
    best, best_d = None, float("inf")
    for info in page.get_images(full=True):
        try:
            bbox = page.get_image_bbox(info[0])
        except Exception:
            continue
        if bbox.width < 50 or bbox.height < 50:
            continue
        d = abs((bbox.y0 + bbox.y1) / 2 - cap_cy)
        if d < best_d:
            best_d, best = d, bbox
    return best


def manifest_table_bbox(citekey, page_idx, cap_rect):
    """Precise Route-B table bbox on the caption's page (1-based pages in manifest)."""
    mf = FIGB_DIR / citekey / "manifest.json"
    if not mf.exists():
        return None
    try:
        tables = json.loads(mf.read_text()).get("tables", [])
    except Exception:
        return None
    best, best_d = None, float("inf")
    for t in tables:
        if t.get("page") != page_idx + 1 or not t.get("bbox"):
            continue
        x0, y0, x1, y1 = t["bbox"]
        d = abs((y0 + y1) / 2 - (cap_rect.y0 + cap_rect.y1) / 2)
        if d < best_d:
            best_d, best = d, fitz.Rect(x0, y0, x1, y1)
    return best


def render(page, clip, out_path):
    clip = clip & page.rect
    pix = page.get_pixmap(matrix=fitz.Matrix(DPI / 72, DPI / 72), clip=clip)
    pix.save(str(out_path))


def capture(doc, citekey, kind, num, out_path):
    """Locate + crop the figure/table. Returns 'ok'/'miss'."""
    res = find_caption(doc, kind, num)
    if not res:
        return "miss"
    pi, cap = res
    page = doc[pi]
    if kind == "fig":
        img = nearest_image_bbox(page, cap)
        if img:
            clip = fitz.Rect(min(img.x0, cap.x0) - PAD, min(img.y0, cap.y0) - PAD,
                             max(img.x1, cap.x1) + PAD, max(img.y1, cap.y1) + PAD)
        else:  # vector figure → half-page containing the caption
            mid = page.rect.height / 2
            clip = (fitz.Rect(0, 0, page.rect.width, max(cap.y1 + 30, mid)) if cap.y0 < mid
                    else fitz.Rect(0, min(cap.y0 - 300, mid * 0.9), page.rect.width, page.rect.height))
    else:  # table — caption is typically above the table; crop a generous region downward
        tb = manifest_table_bbox(citekey, pi, cap)
        if tb:
            clip = fitz.Rect(min(tb.x0, cap.x0) - PAD, min(tb.y0, cap.y0) - TABLE_CAP_PAD,
                             max(tb.x1, cap.x1) + PAD, max(tb.y1, cap.y1) + PAD)
        else:
            clip = fitz.Rect(page.rect.x0, cap.y0 - TABLE_CAP_PAD,
                             page.rect.x1, min(cap.y0 + 430, page.rect.y1))
    render(page, clip, out_path)
    return f"ok p{pi + 1}"


def inject(body: str, embeds):
    """Insert ![[...]] lines at the TOP of ## Description (idempotent)."""
    new = []
    for e in embeds:
        if f"![[{e}]]" not in body:
            new.append(e)
    if not new:
        return body, []
    block = "\n".join(f"![[{e}]]" for e in new)
    m = re.search(r"(##\s*Description\s*\n)", body)
    if not m:
        return body, []
    # skip an immediate callout line so the image sits just under the heading
    insert_at = m.end()
    body = body[:insert_at] + "\n" + block + "\n" + body[insert_at:]
    return body, new


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("citekeys", nargs="*", help="Limit to these @citekeys.")
    ap.add_argument("--apply", action="store_true", help="Write crops + embeds (default: dry-run).")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    only = {c if c.startswith("@") else f"@{c}" for c in args.citekeys}

    if args.apply:
        ATTACH.mkdir(exist_ok=True)
    stats = {"evd_with_refs": 0, "no_pdf": 0, "embedded": 0, "ok": 0, "miss": 0}
    doc_cache = {}

    for f in sorted(EVD_DIR.glob("EVD - *.md")):
        ck = citekey_of(f.stem)
        if not ck or (only and ck not in only):
            continue
        body = f.read_text(encoding="utf-8")
        refs = extract_refs(description_text(body))
        if not refs:
            continue
        stats["evd_with_refs"] += 1
        pdf = PDF_DIR / f"{ck}.pdf"
        if not pdf.exists():
            stats["no_pdf"] += 1
            print(f"  no-pdf   {ck}  refs={refs}  — {f.stem[:50]}")
            continue
        if ck not in doc_cache:
            doc_cache[ck] = fitz.open(pdf)
        doc = doc_cache[ck]

        embeds = []
        for kind, num in refs:
            label = "table" if kind == "table" else "fig"
            key = f"{ck.lstrip('@')}-{label}{num}"   # dedup prefix (ignores -pNN suffix)
            if re.search(rf"!\[\[{re.escape(key)}[^\]]*\]\]", body) and not args.force:
                print(f"  present  {ck}  {kind} {num}  (already embedded)")
                continue
            name = f"{key}.png"
            out = ATTACH / name
            if out.exists() and not args.force:
                status = "cached"
            elif args.apply:
                status = capture(doc, ck, kind, num, out)
            else:
                # dry-run: just probe whether we can locate it
                status = "ok?" if find_caption(doc, kind, num) else "miss"
            if status.startswith(("ok", "cached")):
                embeds.append(name)
                stats["ok"] += 1
            else:
                stats["miss"] += 1
            print(f"  {status:8} {ck}  {kind} {num}  -> {name}")

        if args.apply and embeds:
            new_body, added = inject(body, embeds)
            if added:
                f.write_text(new_body, encoding="utf-8")
                stats["embedded"] += 1

    for d in doc_cache.values():
        d.close()
    print("\n" + "=" * 50)
    print(f"EVDs referencing a fig/table: {stats['evd_with_refs']}")
    print(f"  located (ok/cached): {stats['ok']}   missed: {stats['miss']}   no-PDF EVDs: {stats['no_pdf']}")
    if args.apply:
        print(f"  EVDs updated with embeds: {stats['embedded']}")
    else:
        print("\n(dry-run; re-run with --apply to crop + embed)")


if __name__ == "__main__":
    main()
