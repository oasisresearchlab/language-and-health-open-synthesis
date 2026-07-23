#!/usr/bin/env python3
"""
extract_pdf_figures_tables.py — Route B: heuristic figures/tables from non-PMC PDFs via PyMuPDF.

WHAT
    Recovers figures and tables from downloaded publisher PDFs that have no PMCID — i.e. the papers
    Route A (fetch_figures_tables.py, JATS XML) cannot serve. Lower, variable quality; output is
    meant for human review, not blind trust.

HOW
    1. From data/pdfs/_fetch_report.csv, take citekeys whose PDF was downloaded/cached AND have an
       empty pmcid (non-PMC).
    2. Tables: per page, page.find_tables() -> table.to_pandas(); keep only detections with
       >= MIN_TABLE_ROWS x MIN_TABLE_COLS of real (non-empty) content; write each as CSV.
    3. Figures: per page, get_images(full=True), dedupe xrefs across the document, keep only images
       whose on-page placement exceeds MIN_IMG_DIM in both dims and MIN_IMG_AREA (filters logos,
       banners, rules, glyphs); normalize CMYK/alpha to RGB and save as PNG.
    4. Caption: nearest text block starting "Fig"/"Figure", preferring one just below the image.

INPUT   data/pdfs/_fetch_report.csv (target selection); data/pdfs/@<citekey>.pdf (PyMuPDF/fitz).
OUTPUT  data/figures_pdf/<citekey>/ : table_N.csv, fig_N.png, manifest.json
        (source="pdf", with page + bbox for each object).

INVARIANTS / NOTES
    - Output root data/figures_pdf/ is kept separate from Route A's data/figures/ to mark provenance.
    - Vector figures (charts drawn as paths, not raster) are NOT captured by get_images() — deferred.
    - Borderless / merged-cell tables are often missed or mis-segmented.
    - Resume-safe: skips papers whose output dir already exists unless --force; on a per-paper
      extract error it writes a stub manifest so reruns skip rather than retry forever.

USAGE
    python3 utils/extract_pdf_figures_tables.py --dry-run   # list target papers, no writes
    python3 utils/extract_pdf_figures_tables.py --limit 15  # pilot
    python3 utils/extract_pdf_figures_tables.py             # all non-PMC PDFs
    python3 utils/extract_pdf_figures_tables.py --force     # re-extract

Design decisions, limitations, and the "smarter later" roadmap: Pipeline/extract_pdf_figures_tables.md
"""

import argparse
import csv
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import fitz  # PyMuPDF

# --------------------------------------------------------------------------- #
# Tunables
# --------------------------------------------------------------------------- #
# Minimum on-page rendered size (in PDF points, ~1/72 inch) for an embedded image
# to be kept as a "figure". Logos, header banners, icons, equation glyphs and
# rule lines are typically small in at least one dimension; real figures span a
# meaningful fraction of the page. We additionally require a minimum area so a
# thin full-width banner (wide but short) is rejected. Tuned on the pilot.
MIN_IMG_DIM = 120.0   # both width and height must exceed this (points)
MIN_IMG_AREA = 40000.0  # and rendered area must exceed this (points^2, ~200x200)

# A detected table must have at least this many rows and columns of real content
# to be worth saving (drops single-cell / degenerate detections).
MIN_TABLE_ROWS = 2
MIN_TABLE_COLS = 2


# --------------------------------------------------------------------------- #
# Helpers (mirror fetch_figures_tables.py conventions)
# --------------------------------------------------------------------------- #
def extract_frontmatter(file_path: Path) -> Optional[Dict]:
    import re

    import yaml

    content = file_path.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if m:
        try:
            return yaml.safe_load(m.group(1))
        except yaml.YAMLError:
            return None
    return None


def clean_citekey(citekey: str) -> str:
    return citekey.replace('"', "").strip()


def load_targets(pdf_dir: Path, figures_a_dir: Path) -> List[str]:
    """Citekeys with a PDF on disk that lack Route-A (PMC JATS) structured figures.

    Scans the actual PDF directory (the source of truth) rather than _fetch_report.csv, so
    inbox-ingested PDFs — which match_inbox_pdfs.py copies into data/pdfs/ but never writes to the
    fetch report — are included. Papers that already have a higher-fidelity Route-A dir are skipped.
    """
    targets = []
    for p in sorted(pdf_dir.glob("@*.pdf")):
        ck = p.stem
        if (figures_a_dir / ck).is_dir():   # Route A already produced structured assets
            continue
        targets.append(ck)
    return targets


# --------------------------------------------------------------------------- #
# Figure caption association
# --------------------------------------------------------------------------- #
def find_caption(page: "fitz.Page", img_bbox: Optional[fitz.Rect]) -> Optional[str]:
    """Nearest text block starting with Fig/Figure on the page (case-insensitive).

    Prefer a Figure block immediately below the image (captions usually sit there);
    otherwise the closest one by vertical distance. Best-effort; None is fine.
    """
    candidates: List[Tuple[float, str]] = []
    for blk in page.get_text("blocks"):
        # blk = (x0, y0, x1, y1, text, block_no, block_type)
        x0, y0, x1, y1, text = blk[0], blk[1], blk[2], blk[3], blk[4]
        stripped = text.strip()
        low = stripped.lower()
        if not (low.startswith("fig") or low.startswith("figure")):
            continue
        caption = " ".join(stripped.split())
        if img_bbox is None:
            candidates.append((0.0, caption))
            continue
        # distance: reward captions just below the image, penalize ones above
        if y0 >= img_bbox.y1 - 5:  # below (or at) image bottom
            dist = y0 - img_bbox.y1
        else:
            dist = (img_bbox.y0 - y1) + 1000.0  # above image: large penalty
        candidates.append((max(dist, 0.0), caption))
    if not candidates:
        return None
    candidates.sort(key=lambda c: c[0])
    return candidates[0][1]


def img_bbox_on_page(page: "fitz.Page", xref: int) -> Optional[fitz.Rect]:
    try:
        rects = page.get_image_rects(xref)
    except Exception:
        return None
    if not rects:
        return None
    # If placed multiple times, use the largest placement.
    return max(rects, key=lambda r: abs(r.width * r.height))


# --------------------------------------------------------------------------- #
# Saving images
# --------------------------------------------------------------------------- #
def save_image(doc: "fitz.Document", xref: int, dest_base: Path) -> Optional[str]:
    """Save image xref to dest_base.<ext>; convert CMYK/alpha to RGB. Return filename."""
    try:
        pix = fitz.Pixmap(doc, xref)
    except Exception:
        return None
    try:
        # Normalize to RGB (drop alpha / convert CMYK / GRAY+alpha etc.)
        if pix.alpha or (pix.colorspace is not None and pix.colorspace.n not in (1, 3)):
            pix = fitz.Pixmap(fitz.csRGB, pix)
        elif pix.colorspace is None:
            # Mask / stencil with no colorspace: render onto RGB.
            pix = fitz.Pixmap(fitz.csRGB, pix)
        out = dest_base.with_suffix(".png")
        pix.save(out)
        if out.stat().st_size == 0:  # save can leave a 0-byte stub on failure
            out.unlink(missing_ok=True)
            return None
        return out.name
    except Exception:
        # clean up any partial/empty file so reruns and disk stay tidy
        try:
            dest_base.with_suffix(".png").unlink(missing_ok=True)
        except Exception:
            pass
        return None
    finally:
        pix = None


# --------------------------------------------------------------------------- #
# Per-paper extraction
# --------------------------------------------------------------------------- #
def extract_paper(pdf_path: Path, paper_dir: Path) -> Dict:
    manifest = {"source": "pdf", "citekey": paper_dir.name, "tables": [], "figures": []}
    doc = fitz.open(pdf_path)

    # ----- TABLES ----- #
    table_n = 0
    for pno in range(doc.page_count):
        page = doc.load_page(pno)
        try:
            tabs = page.find_tables()
        except Exception:
            continue
        for tab in tabs:
            try:
                df = tab.to_pandas()
            except Exception:
                continue
            if df is None or df.empty:
                continue
            if df.shape[0] < MIN_TABLE_ROWS or df.shape[1] < MIN_TABLE_COLS:
                continue
            # drop fully-empty detections
            non_empty = df.astype(str).apply(lambda s: s.str.strip()).replace("", None)
            if non_empty.notna().sum().sum() < (MIN_TABLE_ROWS * MIN_TABLE_COLS):
                continue
            table_n += 1
            fname = f"table_{table_n}.csv"
            try:
                df.to_csv(paper_dir / fname, index=False)
            except Exception:
                table_n -= 1
                continue
            bbox = list(tab.bbox) if getattr(tab, "bbox", None) else None
            manifest["tables"].append(
                {
                    "label": f"Table {table_n}",
                    "file": fname,
                    "page": pno + 1,
                    "bbox": bbox,
                    "rows": int(df.shape[0]),
                    "cols": int(df.shape[1]),
                }
            )

    # ----- FIGURES ----- #
    # Build xref -> first page where it appears (dedupe across the document).
    seen_xrefs = set()
    fig_n = 0
    for pno in range(doc.page_count):
        page = doc.load_page(pno)
        for info in page.get_images(full=True):
            xref = info[0]
            if xref in seen_xrefs:
                continue
            seen_xrefs.add(xref)
            bbox = img_bbox_on_page(page, xref)
            if bbox is None:
                continue
            w, h = abs(bbox.width), abs(bbox.height)
            if w < MIN_IMG_DIM or h < MIN_IMG_DIM or (w * h) < MIN_IMG_AREA:
                continue
            fig_n += 1
            saved = save_image(doc, xref, paper_dir / f"fig_{fig_n}")
            if saved is None:
                fig_n -= 1
                continue
            caption = find_caption(page, bbox)
            manifest["figures"].append(
                {
                    "label": f"Figure {fig_n}",
                    "caption": caption,
                    "file": saved,
                    "page": pno + 1,
                    "bbox": [bbox.x0, bbox.y0, bbox.x1, bbox.y1],
                }
            )

    doc.close()
    return manifest


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser(description="Extract figures/tables from non-PMC PDFs (Route B).")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", type=str, default=None,
                    help="Comma-separated citekeys (with or without leading @) to restrict to.")
    args = ap.parse_args()

    root_dir = Path(__file__).parent.parent
    pdf_dir = root_dir / "data" / "pdfs"
    out_root = root_dir / "data" / "figures_pdf"

    targets = load_targets(pdf_dir, root_dir / "data" / "figures")
    if args.only:
        want = {c.strip().lstrip("@") for c in args.only.split(",") if c.strip()}
        targets = [t for t in targets if t.lstrip("@") in want]
    if args.limit:
        targets = targets[: args.limit]
    print(f"Target non-PMC PDFs: {len(targets)}")
    print(f"MIN_IMG_DIM={MIN_IMG_DIM}  MIN_IMG_AREA={MIN_IMG_AREA}  "
          f"MIN_TABLE={MIN_TABLE_ROWS}x{MIN_TABLE_COLS}")

    if args.dry_run:
        for ck in targets:
            exists = (pdf_dir / f"{ck}.pdf").exists()
            print(f"  {ck}  {'pdf-ok' if exists else 'PDF-MISSING'}")
        return

    out_root.mkdir(parents=True, exist_ok=True)
    stats = {
        "papers": 0, "skipped": 0, "tables": 0, "figs": 0,
        "captions": 0, "zero_figs": 0, "zero_tables": 0,
        "zero_both": 0, "missing_pdf": 0, "errors": 0,
    }

    for i, citekey in enumerate(targets, 1):
        pdf_path = pdf_dir / f"{citekey}.pdf"
        paper_dir = out_root / citekey

        if paper_dir.exists() and not args.force:
            stats["skipped"] += 1
            print(f"[{i}/{len(targets)}] {citekey}: cached, skip")
            continue

        if not pdf_path.exists():
            stats["missing_pdf"] += 1
            print(f"[{i}/{len(targets)}] {citekey}: ! PDF missing")
            continue

        print(f"[{i}/{len(targets)}] {citekey}")
        paper_dir.mkdir(parents=True, exist_ok=True)
        try:
            manifest = extract_paper(pdf_path, paper_dir)
        except Exception as e:
            stats["errors"] += 1
            print(f"  ! extract error: {e}")
            # leave the (possibly partial) dir; write a stub manifest so reruns skip
            (paper_dir / "manifest.json").write_text(
                json.dumps({"source": "pdf", "citekey": citekey,
                            "tables": [], "figures": [], "error": str(e)}, indent=2),
                encoding="utf-8",
            )
            continue

        (paper_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

        nt, nf = len(manifest["tables"]), len(manifest["figures"])
        ncap = sum(1 for f in manifest["figures"] if f["caption"])
        stats["papers"] += 1
        stats["tables"] += nt
        stats["figs"] += nf
        stats["captions"] += ncap
        if nf == 0:
            stats["zero_figs"] += 1
        if nt == 0:
            stats["zero_tables"] += 1
        if nf == 0 and nt == 0:
            stats["zero_both"] += 1
        print(f"  tables={nt} figures={nf} captions={ncap}")

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for k, v in stats.items():
        print(f"  {k}: {v}")
    print(f"\nOutput: {out_root}")


if __name__ == "__main__":
    main()
