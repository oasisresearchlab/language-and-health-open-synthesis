---
type: pipeline-spec
script: utils/fetch_figures_tables.py
updated: 2026-06-04
---
# fetch_figures_tables.py — design note

Usage + spec live in the module docstring (`utils/fetch_figures_tables.py`). This note holds the
**why**, the **limitations**, and the **roadmap**. Part of [[Pipeline]].

**In one line:** Route A — for the PMC OA subset, pull figures and tables from the publisher's own
JATS XML + image ZIP, so the objects are structured ground truth rather than reconstructed from a PDF.

## Design decisions

- **Route A vs. Route B split.** Where a paper is in the PMC OA subset there is authoritative
  structured markup (JATS `<table-wrap>` / `<fig>`), so we extract from that and treat the result as
  ground truth. Papers with no PMCID have no XML and fall to the heuristic PDF route
  ([[extract_pdf_figures_tables]]). The two never overlap — eligibility here is strictly "PMID
  resolved a PMCID in `_idmap.json`".
- **Europe PMC as the source.** Both the full-text XML (`/fullTextXML`) and the figure-image ZIP
  (`/supplementaryFiles`) come from Europe PMC's EBI REST endpoints — consistent with the project's
  decision to route PMC access through Europe PMC rather than NCBI (see [[oa-pdf-retrieval-europepmc]]).
- **Tables as HTML always, CSV best-effort.** The JATS `<table>` is serialized to standalone HTML
  (namespace decls stripped) and always written; a `pandas.read_html` pass adds a CSV *only when the
  markup is tabular-parseable*. Complex/nested tables still get their HTML — we never lose the object
  to a failed CSV parse.
- **Fetch the image ZIP only if needed.** The supplementary ZIP is requested only when at least one
  figure actually has graphic refs, avoiding a wasted download for text-only or table-only papers.
- **Filename-stem matching for figure images.** Graphic `xlink:href`s are matched to ZIP entries by
  basename stem, then the best file is chosen by `IMG_PREF` format order (jpg/png before tif/gif).
  Robust to path differences between the XML refs and the ZIP layout.
- **Provenance via output root.** Writes to `data/figures/<citekey>/` (Route A), deliberately
  separate from Route B's `data/figures_pdf/` so a downstream consumer can tell structured extraction
  from heuristic extraction at a glance.
- **Resume-safe:** a paper whose output dir exists is skipped unless `--force`; `--dry-run` lists
  eligible papers without writing.

## Known limitations

- **PMC OA subset only.** Non-PMC papers have no JATS XML and are entirely out of scope here — they
  depend on Route B, which is lower and more variable quality.
- **Depends on `_idmap.json` being populated.** Eligibility is read from the cached PMID→PMCID map,
  so a paper that `fetch_pdfs.py` never resolved a PMCID for is invisible to this script even if it is
  in fact OA.
- **Figure without a matchable graphic is empty.** If no ZIP entry matches a figure's graphic stem,
  the figure is kept in the manifest with `image=None` (caption preserved) but no image file lands.
- **Single XML/ZIP shape assumed.** Parsing keys off JATS tag names (namespace-stripped); atypical or
  malformed full-text XML is reported as an error and skipped rather than partially recovered.

## Future — "smarter later"

- **Caption/label normalization across A and B** so figure references resolve uniformly regardless of
  which route produced the object (helps `ground_figures.py`).
- **Recover inline-base64 or alternate-format graphics** when the supplementary ZIP is missing an
  expected image, instead of emitting `image=None`.
- **Richer table capture** (multi-part `<table-wrap>`, footnotes, units) so CSV fidelity matches the
  HTML, narrowing the cases where only HTML survives.
- **Cross-check against Route B** for papers that have both a PMCID and a PDF, to validate the
  heuristic extractor and quantify Route B's miss rate.
