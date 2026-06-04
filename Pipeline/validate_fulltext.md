---
type: pipeline-spec
script: utils/validate_fulltext.py
updated: 2026-06-04
---
# validate_fulltext.py — design note

Usage + spec live in the module docstring (`utils/validate_fulltext.py`). This note holds the **why**,
the **limitations**, and the **roadmap**. Part of [[Pipeline]].

**In one line:** the identity gate — embed each fetched body against the trusted abstract and flag the
files that are the *wrong paper*, because the PMID→PMC fetch silently substituted ~43% of full texts.

## Design decisions

- **It exists because the corpus is unreliable.** The earlier PMID→PMC `fetch_fulltext.py` run
  resolved many notes to related/citing articles, so `data/fulltext/` contains wrong-paper and
  review-substitution content for a large fraction of papers. Measured 2026-06-03: ~43% of 430
  full-text files are BAD/SUSPECT; PDFs are far cleaner (136/140 OK). Hence the load-bearing pipeline
  rule — *ground only in validated sources* — and this gate enforces it. See
  [[fulltext-corpus-unreliable]].
- **Abstract-vs-body embedding, not string matching.** The source note's abstract is trusted (curated
  CSV); the PMC body is body-only (no abstract) so it can't be diffed against the abstract directly. A
  crude author-surname / title-word heuristic only flagged ~1% (missing the review-cites-paper and
  shared-topic cases). So we use a semantic signal: embed the abstract, embed the body in chunks
  (`all-MiniLM-L6-v2`), and take the **max** chunk cosine (`maxSim`). A correct body elaborates the
  same study and matches some chunk highly; a wrong paper or a citing review does not.
- **maxSim threshold ~0.74, calibrated on known good/bad.** Calibration (2026-06-03): GOOD scored
  0.78–0.84, BAD/review 0.55–0.69, so the default band is `--ok 0.74` / `--bad 0.66`, splitting into
  OK / SUSPECT / BAD. The threshold is the whole game and is *corpus-calibrated, not universal* —
  it's an argument so it can be re-tuned.
- **One script, two corpora (`--pdf`).** The same abstract-vs-body logic validates either the `.txt`
  full text (default) or the downloaded PDFs (text via PyMuPDF), writing `fulltext_validation.tsv` or
  `pdf_validation.tsv` respectively. PDFs need the gate too — clean is not 100% clean.
- **Worst-first trust manifest, read-only.** Output is a TSV sorted worst-first (`citekey, maxSim,
  top3, verdict`) so a human reviews the most-likely-wrong first; the script never edits or deletes a
  source. Remediation is a separate tool (`refetch_by_title.py`).
- **Defensive skips.** Files under 200 chars, files with no matching source note, and abstracts under
  80 chars are skipped or marked `NO-ABSTRACT` rather than scored on too little signal.

## Known limitations

- **It scores identity, not quality.** A right-paper file with OCR garble or truncation can still be
  poor for extraction; conversely the score only asks "is this the same study?"
- **False positives even above the OK line.** maxSim near the threshold is not a guarantee — a file
  can clear ~0.78 and still be the wrong paper (e.g. the Wallbrecht case). The band reduces, but does
  not eliminate, wrong-paper leakage; SUSPECT/BAD always need a human or a refetch.
- **Single embedding model, topical corpus.** The whole corpus is LEP-topical, which compresses the
  similarity range and is exactly why the threshold had to be calibrated rather than assumed; a
  different model or a less homogeneous corpus would need re-calibration.
- **Abstract-dependent.** Notes whose frontmatter abstract is missing/short can't be validated
  (`NO-ABSTRACT`), so their identity stays unverified.
- **Chunking is positional, capped.** Body is collapsed and capped (~60k chars) into fixed-size
  windows; an identifying passage past the cap, or split across a chunk boundary, can lower maxSim.

## Future — "smarter later"

- **Stronger / asymmetric matcher:** a cross-encoder or NLI model scoring "does this body report the
  study this abstract describes?" to separate same-study from same-topic better than bag-of-chunks
  cosine — directly targeting the residual false positives.
- **Multi-signal verdicts:** combine the embedding score with author-surname / sample-size / venue
  agreement so a single near-threshold number isn't the sole arbiter.
- **Per-paper calibrated thresholds** (or a learned classifier on the labeled good/bad set) instead of
  one global cutoff, so highly self-similar abstracts don't drag borderline-correct papers into
  SUSPECT.
- **Close the loop with remediation:** auto-hand BAD/SUSPECT to `refetch_by_title.py` and re-validate,
  reporting only the residue a human must adjudicate.
