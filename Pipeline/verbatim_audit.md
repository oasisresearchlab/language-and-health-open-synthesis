---
type: pipeline-spec
script: utils/verbatim_audit.py
updated: 2026-06-04
---
# verbatim_audit.py — design note

Usage + spec live in the module docstring (`utils/verbatim_audit.py`). This note holds the **why**, the
**limitations**, and the **roadmap**. Part of [[Pipeline]].

**In one line:** score every `> "..."` quote against its source paper by word-level coverage and bin
it OK/minor/moderate/FAIL — so paraphrased or fabricated quotes surface before promotion.

## Design decisions

- **NFKD + alphanumeric-only normalization.** Strip everything but letters/digits and lowercase, so
  punctuation, smart quotes, hyphenation, and whitespace differences never count against a quote — only
  the actual words have to match. This is what lets noisy PDF text still match clean quotes.
- **Coverage tiers, not pass/fail.** A graded ladder (OK ≥0.98 · minor 0.90 · moderate 0.50 · FAIL)
  separates "one dropped word / PDF artifact" from "paraphrase" from "likely fabricated", so reviewers
  triage by severity rather than chase every sub-1.0 score.
- **PDF first, full text as fallback.** Read `data/pdfs/<citekey>.pdf` (PyMuPDF) preferentially — PDFs
  are ~97% clean — and only fall back to `data/fulltext/<citekey>.txt` (which is ~43% wrong-paper) when
  no PDF exists. Empty/stub full-text files (<200 chars) are skipped.
- **author+year → citekey from ALL source notes**, not just PDF-backed ones. A quote's inline
  "(Author, year)" can resolve to its citekey even when no full text is on disk (→ NO-PDF, not a false
  fabrication flag). Citekey falls back to the node's `Source`/filename when there's no inline cite.
- **Read-only + cached.** Reports to `data/verbatim_audit.tsv`; never edits a quote. Source text is
  normalized once per citekey and cached across quotes.

## Known limitations

- **Known false positive — en-dashes.** pdftotext / PyMuPDF render en-dashes (and similar glyphs)
  oddly, so a genuinely verbatim quote spanning one can drop into the `minor` tier. Treat `minor` as
  "probably fine, eyeball it", not a real miss.
- **Order-sensitive matching.** Coverage uses `SequenceMatcher` over the concatenated string, so a
  faithfully-quoted sentence with reordered clauses scores lower than its words warrant.
- **No page verification.** The page from "(…, p. N)" is recorded but not checked against where the
  match lands — a right-quote/wrong-page citation passes.
- **Source resolution can misroute.** When no inline cite is present it trusts the node's `Source` /
  filename; a mislabeled node audits against the wrong paper.
- **NO-PDF is silent on truth.** A quote whose source has no on-disk text is reported as NO-PDF, not
  verified — coverage there is unknown, not clean.

## Future — "smarter later"

- **Fuzzy / token-set matching** (e.g. windowed alignment) so clause reordering and minor edits don't
  depress coverage on genuinely-faithful quotes.
- **Page-anchored search:** restrict the match to the cited page range and flag right-quote/wrong-page.
- **Glyph pre-normalization:** map en-/em-dashes, ligatures, and OCR confusions before scoring to kill
  the known false positives instead of explaining them away.
- **Auto-suggest the verbatim fix:** for `moderate` quotes, surface the closest source span so the
  human can tighten the quote toward verbatim in one step.
- **Coverage of the full-text trust state:** join with the validate_fulltext trust manifest so a
  fallback match against ~43%-wrong full text is flagged as low-trust.
