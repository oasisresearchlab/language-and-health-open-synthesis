# Getting papers: OA PDF retrieval + DOI enrichment

## Goal

All sources live in `Discourse Graph/Sources/@*.md` (indexed by `Papers.base`). For each source we want to:

1. retrieve an open-access (or otherwise free) PDF,
2. download it and name it after the citekey, and
3. record the DOI in the note when it's discovered during search.

There are **785 source notes**; **782 have `pubmed_id`**, none currently have a `doi` or a PDF.
This extends the existing `utils/fetch_fulltext.py` pattern (NCBI E-utilities, frontmatter parsing,
citekey-based filenames, rate limiting, skip-if-cached).

## Decisions

- **PDF storage:** `data/pdfs/` (gitignored, like the rest of `data/`).
- **PDF filename:** exact citekey incl. `@` → `@Author_Year_Title.pdf` (matches the note filename).
- **OA source order (first valid PDF wins):** PMC OA subset → Unpaywall → Semantic Scholar → OpenAlex.
- **DOI writeback:** insert a `doi:` line into frontmatter for every note where a DOI is resolved,
  regardless of whether a PDF was found.
- **Run scope:** dry run → pilot (~20) → full run over all 785.
- **Secrets:** `SEMANTIC_SCHOLAR_API_KEY` read from a gitignored `.env`.

## Pipeline (`utils/fetch_pdfs.py`)

### Step 1 — Resolve identifiers (PMID → PMCID + DOI)
- **Primary:** NCBI ID Converter API
  (`.../pmc/utils/idconv/v1.0/?ids=...&format=json&tool=lep-synthesis&email=joelchan@umd.edu`),
  batched up to 200 PMIDs/call → `pmcid` + `doi` per PMID.
- **Fallback for missing DOIs:** OpenAlex (`https://api.openalex.org/works/pmid:<id>`, polite pool
  via `mailto`). OpenAlex also exposes `best_oa_location.pdf_url` / `open_access.oa_url`, captured
  here as an extra PDF candidate for Step 3.
- Cache merged mapping (pmcid, doi, openalex_pdf_url) to `data/pdfs/_idmap.json` so reruns skip re-querying.
- The 3 notes without `pubmed_id` are skipped (reported as "no id").

### Step 2 — Write DOI back to frontmatter
- Insert `doi: <value>` immediately after the `pubmed_id:` line via **targeted text insertion**
  (not a full YAML re-dump), preserving existing block scalars (`abstract`, `keywords`, ...).
- Idempotent: skip if a `doi:` line already exists.

### Step 3 — Fetch PDF (first valid wins, validate each)
1. **PMC OA subset** — if PMCID present, query the OA web service
   (`.../pmc/utils/oa/oa.fcgi?id=PMCID`); download the `format="pdf"` link if present.
2. **Unpaywall** — `https://api.unpaywall.org/v2/{doi}?email=joelchan@umd.edu` →
   `best_oa_location.url_for_pdf`.
3. **Semantic Scholar** — Graph API by `PMID:<id>` (fallback `DOI:<doi>`),
   `fields=openAccessPdf,externalIds`; `openAccessPdf.url`. Sends `x-api-key` header from `.env`;
   retry/backoff on 429.
4. **OpenAlex PDF** — the `pdf_url`/`oa_url` captured in Step 1.

- **Validation:** HTTP 200 + content starts with `%PDF` magic bytes + size above a small threshold
  (rejects HTML landing/error pages). Fall through on failure.
- **Save** to `data/pdfs/@<citekey>.pdf`. Skip if it already exists (resume-safe).

### Step 4 — Reporting
- `data/pdfs/_fetch_report.csv`: `citekey, pubmed_id, pmcid, doi, pdf_source, status, path`.
- Printed summary: DOIs resolved, PDFs by source, cached/skipped, failures.

### Secrets (.env)
- `SEMANTIC_SCHOLAR_API_KEY=...` in a project-root `.env` (already covered by `.gitignore`).
- Read via a tiny manual parser (no new dependency). If absent, fall back to keyless S2.

### Rate limiting
- NCBI ~3 req/s (`RATE_LIMIT_DELAY = 0.34`); OpenAlex/Unpaywall polite delay; S2 with key + 429 backoff.

### CLI flags
- `--limit N` (pilot), `--only-doi` (skip PDF download), `--force` (re-download), `--dry-run`
  (resolve + report, no writes).

## Verification

1. **Dry run:** `python3 utils/fetch_pdfs.py --dry-run` — resolution coverage across all 785, no writes.
2. **Pilot:** `python3 utils/fetch_pdfs.py --limit 20` — check `_idmap.json`, spot-check PDFs
   (`file data/pdfs/*.pdf`), confirm `doi:` lines inserted and frontmatter still parses, review report CSV.
3. **Full run:** `python3 utils/fetch_pdfs.py` (resume-safe).
4. **Idempotency:** re-run → no duplicate `doi:` lines, all PDFs reported cached.

## Notes

- Coverage will be partial — many papers have no legal OA PDF; the report makes the gap explicit.
- Dependencies (`requests`, `pyyaml`) already used by existing utils; no new installs needed.

---

# Figures & tables as standalone objects

Two routes, by source availability.

## Route A — OA subset via Europe PMC API  ✅ BUILT (`utils/fetch_figures_tables.py`)

For notes that resolved a PMCID (`data/pdfs/_idmap.json`), pull structured objects:
- **Tables:** Europe PMC `…/{PMCID}/fullTextXML` → each `<table-wrap>` saved as standalone
  `table_N.html` + `table_N.csv` (via `pandas.read_html`) with label + caption.
- **Figures:** captions/labels from the same XML; **actual image files** from
  `…/{PMCID}/supplementaryFiles` (a ZIP of `gr1.jpg`, …), matched to `<graphic xlink:href>`.
- Output: `data/figures/<citekey>/` (gitignored) + per-paper `manifest.json`.

**Coverage (measured):** 31 notes have a PMCID, but only **17 unique articles actually have
JATS XML** in Europe PMC (the rest are author-manuscript / PDF-only deposits with no structured
XML). Result of the run: **20 paper dirs, 49 tables, 35 figures, all 35 figure images matched.**
High fidelity (born-digital structured data). Resume-safe (`--force` to re-extract).

## Route B — non-PMC PDFs via PyMuPDF  📋 SCOPED (proposed `utils/extract_pdf_figures_tables.py`)

For the **116 downloaded PDFs without a PMCID** (publisher PDFs; no JATS XML exists), extract
heuristically from the PDF itself. **`fitz` (PyMuPDF 1.26.5) is already installed — no new deps.**
Proof-of-concept confirmed it detects tables (`page.find_tables()`) and embedded images
(`page.get_images()`) on our files.

Design:
- **Tables:** `page.find_tables()` → `table.to_pandas().to_csv()`; store page + bbox in manifest.
- **Figures:** `page.get_images(full=True)`, dedupe by xref, **filter by min size**
  (≥ ~200×200 px) to drop logos/icons/equation glyphs. Associate captions by locating nearby
  text blocks starting with `Fig`/`Figure`/`Table`.
- **Output:** `data/figures_pdf/<citekey>/` (kept separate from Route A to mark provenance),
  with `manifest.json` carrying `source: "pdf"`.
- Fallbacks available if needed: poppler `pdfimages`, `tabula`/`camelot` (Java present), GROBID.

**Caveats (inherent to PDF parsing):**
- **Vector figures** (charts drawn as vector paths, not raster) are NOT captured by
  `get_images()` — would require rendering page regions (deferred; flag as a v2 option).
- **Borderless tables** are often missed; complex/merged-cell tables mis-segmented.
- Expect false positives/negatives → output needs human review; the script logs per-paper counts.

**Quality vs. Route A:** lower and variable. Route A is structured ground truth; Route B is
best-effort recovery for papers that aren't in the OA XML corpus.
