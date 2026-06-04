---
type: pipeline-spec
script: utils/fetch_pdfs.py
updated: 2026-06-04
---
# fetch_pdfs.py — design note

Usage + spec live in the module docstring (`utils/fetch_pdfs.py`). This note holds the **why**, the
**limitations**, and the **roadmap**. Part of [[Pipeline]].

**In one line:** resolve a DOI for every source note and pull its OA PDF, routing around NCBI's
bot-blocked endpoints via Europe PMC and falling through a source ladder until one valid PDF lands.

## Design decisions

- **Europe PMC render for PMC PDFs, never NCBI directly.** NCBI's own OA paths fail for programmatic
  download — `ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/…` and `oa_package/…tar.gz` 404, and
  `pmc.ncbi.nlm.nih.gov/articles/.../pdf/` returns a 200 HTML anti-bot interstitial, not a PDF. So
  `pmc_oa_pdf_url()` always routes via `europepmc.org/articles/{PMCID}?pdf=render`, and any candidate
  URL whose host contains `ncbi.nlm.nih.gov` (Unpaywall/S2/OpenAlex often hand these back) is skipped.
  See [[oa-pdf-retrieval-europepmc]].
- **Source-order fallback, first valid wins:** PMC OA subset → Unpaywall → Semantic Scholar →
  OpenAlex. PMC is the cleanest OA route; the rest backfill papers PMC doesn't cover. Each candidate
  is resolved lazily (we don't hit Unpaywall/S2 unless earlier sources missed).
- **Validate by magic bytes + size, not by trust.** A download counts only if it starts with `%PDF`
  and clears a small byte floor, so non-OA articles (which return HTML or stubs) simply fall through
  to the next source. This is deliberately a *format* check — confirming the PDF is the *right paper*
  is a separate gate (`validate_fulltext.py --pdf`).
- **Two-stage ID resolution: NCBI ID Converter (batched) → OpenAlex.** ID Converter is the primary
  PMID→{PMCID, DOI} map and is batched (200/call) for throughput; OpenAlex (by PMID) backfills any
  missing DOI and contributes an OA-PDF candidate. Both are cached in `_idmap.json`, and misses are
  recorded so reruns don't requery dead PMIDs.
- **Idempotent, surgical DOI insertion.** The `doi:` line is spliced in right after `pubmed_id:`
  without re-dumping the YAML (preserves formatting/comments) and is a no-op if a DOI is already
  present.
- **S2 key from `.env`, keyless fallback.** A tiny manual `.env` parser (no new dependency) loads
  `SEMANTIC_SCHOLAR_API_KEY`; without it S2 still runs keyless, with 429 backoff.
- **Resume-safe by construction.** Cached idmap, skip-if-exists PDFs (unless `--force`), idempotent
  DOI writes, plus `--dry-run` / `--only-doi` modes, so a long run can be stopped and restarted.

## Known limitations

- **Format-valid ≠ right paper.** A 200 + `%PDF` only proves it's *a* PDF. Wrong-paper PDFs pass this
  stage and must be caught downstream by `validate_fulltext.py --pdf` (PDFs were ~97% clean in the
  pilot, but not 100%).
- **PMID-anchored.** Notes with no `pubmed_id` (and no pre-existing DOI) resolve nothing and are
  counted as `no_id`. Title-based recovery is `refetch_by_title.py`, not this script.
- **OA-only.** Paywalled papers with no OA location yield no PDF; the ladder exhausts and the note is
  reported `failed`. No publisher-login or interlibrary path.
- **Trusts upstream PMID→PMCID/DOI mappings.** If a note's `pubmed_id` itself points at the wrong
  record, this script faithfully fetches the wrong paper's PDF — the identity error originates
  upstream (see [[fulltext-corpus-unreliable]]).

## Future — "smarter later"

- **Fold the identity check inline:** after download, embed the new PDF against the trusted abstract
  (the `validate_fulltext.py` signal) and reject a wrong-paper PDF before it ever lands in `data/pdfs/`.
- **Title-first resolution as a built-in fallback** when a PMID is missing or suspect, folding in
  `refetch_by_title.py`'s OpenAlex-by-title path rather than leaving those notes unresolved.
- **More OA sources / mirrors** (CORE, institutional repositories, publisher OA APIs) on the tail of
  the ladder for papers none of the current four cover.
- **Parallel/async fetching** with shared rate-limit budgets, since the run is dominated by polite
  per-request sleeps.
