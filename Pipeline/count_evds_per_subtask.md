---
type: pipeline-spec
script: utils/count_evds_per_subtask.py
updated: 2026-06-04
---
# count_evds_per_subtask.py — design note

Usage + spec live in the module docstring (`utils/count_evds_per_subtask.py`). This note holds the
**why**, the **limitations**, and the **roadmap**. Part of [[Pipeline]].

**In one line:** count distinct EVDs/papers per (factor → outcome) into the Evidence Summary table and
refresh each EP's `ep/strength/<N>-papers` tag — counts only; interpretation stays human.

## Design decisions

- **Counts auto, judgment TODO (propose-don't-commit).** The script fills #EVDs and #papers per
  subtask but writes Direction / Effect size / Strength as `_TODO_`. Those are synthesis calls a human
  must make; the table is a scaffold, not a conclusion. Mirrors the pipeline's synthesis governance.
- **Subtask = primary (factor × outcome) facet.** Group by each EVD's `first()`
  languageConcordanceFactor and healthOutcome — the same curated, discriminating facet the rest of the
  synthesis uses, so the summary rows line up with the EP proposals.
- **Distinct-paper count from the filename `@citekey`**, not the `Source` field — robust to missing
  frontmatter, consistent with `propose_eps`/`attachment_audit`.
- **EP strength derived from `relations.json`.** Each EP's `ep/strength/<N>-papers` tag is recomputed
  from the distinct papers of its supporting EVDs, so the tag can't drift from the actual edges.
- **Only rewrite an existing strength tag.** If an EP has no `ep/strength/<N>-papers` tag, the script
  leaves it for the author to add rather than inventing one — minimal, predictable mutation.
- **`--dry-run`** reports the same numbers without writing the summary or touching any EP note, for a
  safe preview.

## Known limitations

- **Direction/effect/strength are never computed** — by design they stay TODO. The table cannot tell
  you *what* the evidence says, only how much of it there is.
- **Primary-facet only.** `first()` of each facet list means a multi-factor or multi-outcome EVD lands
  in just one subtask row, so cross-facet evidence is undercounted.
- **Requires both facet fields.** EVDs missing `languageConcordanceFactor` *or* `healthOutcome` are
  dropped from the table entirely.
- **Same-cohort papers count as distinct.** Paper counts (and therefore EP strength tags) are by
  citekey, so re-analyses of one dataset inflate both the row count and a pattern's apparent strength.
- **No facet-synonym merging.** Near-synonym facets ("Language concordance" vs "LEP") produce separate
  rows for overlapping evidence.
- **Tag rewrite is blind to the rest of the note.** It regexes `ep/strength/\d+-papers`; an unusual tag
  format or a strength claim written in prose won't be updated.

## Future — "smarter later"

- **LLM-drafted interpretation:** propose Direction / Effect size / Strength cells (clearly marked as
  drafts for human commit) instead of leaving every cell `_TODO_`.
- **Independence-aware counting:** detect shared cohorts so #papers and EP strength reflect independent
  replications, not re-analyses of one dataset.
- **Facet-synonym merging:** collapse near-synonym factors/outcomes so one regularity is one row.
- **Multi-facet attribution:** count an EVD under every (factor × outcome) it carries, not just the
  primary pair, to stop undercounting cross-facet evidence.
- **Seed missing strength tags:** for EPs with no tag, scaffold `ep/strength/<N>-papers` for the author
  rather than skipping, closing the loop with `propose_eps.py`.
