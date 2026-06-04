---
type: pipeline-spec
script: utils/refetch_by_title.py
updated: 2026-06-04
---
# refetch_by_title.py — design note

Usage + spec live in the module docstring (`utils/refetch_by_title.py`). This note holds the **why**,
the **limitations**, and the **roadmap**. Part of [[Pipeline]].

**In one line:** re-resolve the correct DOI/PMID/PMCID from the *trusted* title via OpenAlex, flag
wrong source PMIDs, and recover OA full text — without rewriting any source note.

## Design decisions

- **Title is the anchor, not the PMID.** The source notes' `pubmed_id` mapping resolved to
  related/citing articles for a meaningful fraction of papers, so the derived DOI/PDF/full text point
  at the wrong work. The one field we trust is the curated **title** — so remediation re-resolves
  every identifier *from the title* (OpenAlex search, best `SequenceMatcher` ratio over
  NFKD-normalised strings, gated by `--min-title-sim`).
- **PMCID comes from NCBI, not OpenAlex.** OpenAlex's `pmcid` is unreliable (often missing/malformed,
  trailing-slash quirks), so when absent the script resolves PMID→PMCID via the **NCBI ID Converter**
  before attempting a full-text fetch.
- **Two failure modes are reported separately.** (a) The source note carries a *wrong PMID* —
  surfaced only when OpenAlex returns a genuinely *DIFFERENT* PMID (a missing OpenAlex PMID is not
  called a disagreement). (b) The PMID is *correct* but the previously fetched content is the wrong
  paper — caught upstream by the validators that feed this script's target list.
- **Propose-don't-commit for identifiers.** Identifier corrections are written to a TSV report only;
  **source notes are never rewritten** — a human applies the fix. Only the *derived, gitignored* full
  text (`data/fulltext/<citekey>.txt`) is regenerated, and only with `--refetch-fulltext` plus a
  strong title match and a PMCID.
- **Targets the flagged set by default.** Reads the validator verdicts (`fulltext_validation.tsv`
  BAD/SUSPECT, `pdf_validation.tsv` BAD) so a default run only touches papers already known to be
  suspect; `--all` / `--citekeys` widen the scope.
- **Polite, serial API use.** A single shared mailto/User-Agent and `time.sleep` pacing between
  OpenAlex / ID-Converter / Europe PMC calls.

## Known limitations

- **Non-OA papers are unrecoverable.** A title can resolve perfectly yet have no open-access full
  text — Europe PMC returns no body, so the paper is resolved-but-non-OA and must be quarantined
  rather than grounded.
- **Title-similarity can mis-rank near-duplicates.** Errata, preprints, and same-title conference vs.
  journal versions can edge out the true record; `--min-title-sim` trades misses for false matches
  but doesn't disambiguate them.
- **Best-of-5 only.** OpenAlex is queried `per_page=5`; a correct record ranked 6th+ is never seen.
- **Crude XML→text.** Full text is reconstructed by stripping tags from the `<body>` (regex), so
  tables/figures/structure are lost — fine for identity validation, lossy as a reading copy.
- **Reports, doesn't reconcile.** It never writes the corrected identifiers back, so the source notes
  stay wrong until a human edits them; nothing here closes that loop.

## Future — "smarter later"

- **Apply-mode for identifiers:** an opt-in, audited pass that rewrites `pubmed_id`/`doi` in the
  source note frontmatter (still human-gated) to actually close the remediation loop.
- **Multi-signal matching:** combine title similarity with author surnames + year + venue so
  near-duplicate titles disambiguate to the right record.
- **Cross-check resolvers:** confirm the OpenAlex match against Crossref/PubMed before trusting the
  identifier, instead of taking a single source's best hit.
- **Non-OA fallback retrieval:** route resolved-but-non-OA papers to the PDF acquisition path
  (Unpaywall/S2) rather than dead-ending at quarantine.
- **Structure-preserving full text:** parse JATS into sections instead of flattening, so recovered
  text is usable for extraction, not just identity checks.
