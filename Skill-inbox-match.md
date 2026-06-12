---
name: skill-inbox-match
description: Reference — match the hand-collected data/pdfs/inbox/ PDFs to source notes and ingest them. The FIRST point of PDF retrieval, before any online fetch.
parent_skill: extract-discourse-nodes
---

# Skill — Inbox PDF match

`utils/match_inbox_pdfs.py` is the **first point of PDF retrieval**: it fills missing PDFs from the
hand-collected batch in `data/pdfs/inbox/` before any online fetch (`fetch_pdfs.py`, see
`plans/getting-papers.md`). It matches each inbox PDF to a source note, copies confirmed matches to
`data/pdfs/@<citekey>.pdf` (the same naming + location convention as `fetch_pdfs.py`), authors draft
SRC stubs for genuinely new papers, and reconciles a `has_pdf:` flag across every note so
`Papers.base` (the `Missing PDF` view) shows the remaining gap.

> **Report-only by default.** With no `--apply` the tool writes **nothing** except the report CSV.
> Every copy, move, frontmatter edit, and stub write happens only under `--apply`. (Propose, don't
> commit — same governance posture as the synthesis layer.)

## Per-file pipeline

1. **Parse filename** `Author_Year_TitleSlug_PMID<id>.pdf` → (author, year, title_slug, pmid).
   Non-PDF extensions (`.lnk`, `.htm`) → `not-a-pdf`. Malformed PMID tokens (`_PMIDmissing<n>`, a
   corrupted non-digit id) → pmid dropped, falls through to content matching.
2. **Read PDF content** with PyMuPDF (`fitz`): embedded DOI (metadata + XMP + first ~3 pages of
   text), title (metadata or largest-font block on page 1), first-author surname, year. A PDF that
   won't open → `unreadable-pdf` (never crashes the run).
3. **Match + verify (strict gate).**
   - Tier 1 — filename PMID → note via the `pubmed_id` index.
   - Tier 2 — content search across all notes: DOI exact (reverse lookup, augmented from
     `_idmap.json`) first, then fuzzy title (`rapidfuzz.token_set_ratio`, else `difflib`) gated by
     author surname + year agreement.
4. **Report (always)** → `data/pdfs/inbox/_match_report.csv`, sorted most-actionable-first, plus a
   per-bucket console summary.

## Decision buckets

| Decision | When | `--apply` action |
|---|---|---|
| `CONFIRMED` | candidate note + (PDF DOI == note DOI) or (title_sim ≥ thresh ∧ author ∧ year) | copy → `@<citekey>.pdf`, set `has_pdf: true`, move file → `_ingested/` |
| `RESOLVED-BY-CONTENT` | confident content match, no usable filename PMID, note lacks a PDF | same as CONFIRMED |
| `NEW-PAPER` | no note matches | author SRC stub + copy PDF, move file → `_ingested/` |
| `CONFLICT` | filename PMID matched a note but PDF content disagrees (DOI mismatch / low title sim) | move file → `_review/`, no other writes |
| `DUP` | matched note already has `@<citekey>.pdf` on disk | move file → `_review/` |
| `not-a-pdf` / `unreadable-pdf` | non-PDF extension / PyMuPDF could not open | leave in place, report only |

Confidence (`high`/`medium`/`low`) records match strength: DOI-exact and PMID+strong-content are
`high`; weaker title/author/year agreement is `medium`.

## New-paper stubs

For `NEW-PAPER`, `--apply` authors `Discourse Graph/Sources/@<citekey>.md` with metadata from the
**most authoritative source available**: PubMed esummary by the filename PMID first, then Crossref by
the PDF's embedded DOI (covers the PMID-less files), then a filename/PDF fallback flagged with a
`> [!warning]` for human verification. Stub frontmatter mirrors the SRC shape: `nodeTypeId:
node_Ne237S0BfRPDaeqB_gbuT`, a generated uuid7 `nodeInstanceId`, `citekey`, author/year/title/journal,
`pubmed_id`, `doi` (if known), `has_pdf: true`, and `curationStatus: Initial AI draft` (AI always
starts here; only the human advances it — see `Skill-references`). The PDF is copied so the stub
already has its PDF.

## has_pdf backfill

`--only-has-pdf` (standalone) reconciles `has_pdf` for **all** notes against disk: `true` iff
`data/pdfs/@<citekey>.pdf` exists, else `false`, written **explicitly** (both values) so the
`Missing PDF` `.base` view can filter the gap. Insertion is idempotent (after `pubmed_id:`; replaces
an existing line only if the value changed). It also runs automatically at the end of an `--apply`
ingest so newly-copied PDFs are reflected.

## Commands

```
python3 utils/match_inbox_pdfs.py                       # dry-run: report only, no writes
# review data/pdfs/inbox/_match_report.csv (sort by decision, then confidence)
python3 utils/match_inbox_pdfs.py --apply --limit 20    # pilot the writes on 20 files
python3 utils/match_inbox_pdfs.py --apply               # full ingest
python3 utils/match_inbox_pdfs.py --apply               # re-run is idempotent (skips, no dup lines)
python3 utils/match_inbox_pdfs.py --only-has-pdf        # report the has_pdf gap only
python3 utils/match_inbox_pdfs.py --only-has-pdf --apply # write has_pdf across all notes
```

Flags: `--apply` (perform writes; default is report-only), `--limit N` (pilot), `--only-has-pdf`
(just the backfill), `--min-title-sim FLOAT` (default 0.85), `--force` (overwrite existing dest PDFs).

## Notes

- No new dependencies: `requests` + `fitz` (PyMuPDF) are already installed; `rapidfuzz` is optional
  (import-guarded, falls back to `difflib`).
- Resume-safe: skip-if-exists for dest PDFs, idempotent `has_pdf` insertion, stub creation skips an
  existing note, and `_ingested/`/`_review/` moves skip if the target already exists.
- After ingest, run `fetch_pdfs.py` to chase only the still-`has_pdf: false` notes.
