---
type: pipeline-spec
script: utils/extract_pdf_figures_tables.py
updated: 2026-06-04
---
# extract_pdf_figures_tables.py — design note

Usage + spec live in the module docstring (`utils/extract_pdf_figures_tables.py`). This note holds the
**why**, the **limitations**, and the **roadmap**. Part of [[Pipeline]].

**In one line:** Route B — for non-PMC PDFs with no JATS XML, recover figures and tables heuristically
from the PDF with PyMuPDF, accepting lower, human-reviewable quality as the cost of coverage.

## Design decisions

- **Route B exists because Route A can't cover non-PMC papers.** Papers with a downloaded/cached PDF
  but an empty `pmcid` (selected from `_fetch_report.csv`) have no structured markup
  ([[fetch_figures_tables]]), so we reconstruct objects from the PDF itself. This route is explicitly
  the *lower-quality, needs-review* path — Route A is ground truth, Route B is a best effort.
- **No new dependency.** Uses PyMuPDF (`fitz`), already installed for the project, rather than adding
  poppler / tabula / camelot / GROBID. Those remain available fallbacks if Route B proves
  insufficient, but the default keeps the toolchain lean.
- **Size/area gating for figures, tuned on the pilot.** Embedded images are kept only if their on-page
  placement exceeds `MIN_IMG_DIM` (120 pt) in *both* dimensions and `MIN_IMG_AREA` (40000 pt²). Real
  figures span a meaningful fraction of the page; logos, header banners, icons, equation glyphs and
  rule lines are small in at least one dimension or thin-and-wide — the area test rejects the wide-but-
  short banner case the dimension test alone would pass.
- **Minimum-shape gating for tables.** A detection must clear `MIN_TABLE_ROWS x MIN_TABLE_COLS` (2×2)
  of genuinely non-empty content, dropping single-cell and degenerate `find_tables()` hits.
- **Dedupe images by xref across the document.** An image placed on many pages (running figure,
  watermark) is emitted once, keyed by its first appearance.
- **Best-effort captions, never load-bearing.** The nearest text block starting "Fig"/"Figure" is
  attached, preferring one just below the image (where captions usually sit) and heavily penalizing
  blocks above. `None` is an acceptable result.
- **Normalize to RGB PNG.** CMYK / alpha / mask pixmaps are converted before saving, and 0-byte stubs
  from failed saves are cleaned up so reruns and disk stay tidy.
- **Provenance + resume safety.** Output goes to `data/figures_pdf/` (separate from Route A) with
  `manifest.json` marked `source="pdf"` and per-object `page`/`bbox`. A per-paper extraction error
  writes a *stub* manifest so the paper is skipped on rerun rather than retried endlessly.

## Known limitations

- **Vector figures are invisible.** Charts drawn as vector paths (not raster images) are not returned
  by `get_images()` and are simply missed — a known gap deferred to a later version.
- **Borderless / merged-cell tables.** `find_tables()` frequently misses or mis-segments tables
  without ruling lines or with spanning cells; the 2×2 floor also discards small genuine tables.
- **Output is not trustworthy without review.** Quality is lower and more variable than Route A;
  manifests are meant to be human-checked, and the script logs zero-figure / zero-table / zero-both
  counts precisely to surface where extraction came up empty.
- **Heuristic caption matching errs.** A page with several "Figure N" blocks or an unusual layout can
  attach the wrong caption (or none).
- **Selection trusts `_fetch_report.csv`.** Only papers that route recorded as downloaded/cached and
  non-PMC are targeted; a PDF present on disk but not in the report is not processed.

## Future — "smarter later"

- **Capture vector figures** by rendering page regions (e.g. clip + rasterize the figure bbox) so
  path-drawn charts stop being dropped.
- **Stronger table detection** via a fallback engine (camelot/tabula for ruled tables, or an ML table
  detector) when `find_tables()` returns nothing on a page that visibly has a table.
- **Caption-anchored extraction:** find "Figure N"/"Table N" text first and pull the adjacent
  image/region, instead of image-first then nearest-caption — more robust on dense layouts.
- **Quality scoring + auto-flag** per object (size, aspect, OCR text density) to rank what a human
  should review first, and to compare against Route A where both exist.
