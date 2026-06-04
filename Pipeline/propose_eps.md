---
type: pipeline-spec
script: utils/propose_eps.py
updated: 2026-06-04
---
# propose_eps.py — design note

Usage + spec live in the module docstring (`utils/propose_eps.py`). This note holds the **why**, the
**limitations**, and the **roadmap**. Part of [[Pipeline]].

**In one line:** facet-cluster EVDs into ≥2-paper buckets and emit an EvidencePattern proposal
checklist — never auto-author EPs.

## Design decisions

- **Facet-first, embeddings-second.** The `(languageConcordanceFactor × healthOutcome)` tags are
  curated and discriminating, so grouping by them gives high-precision buckets. Embeddings only add a
  coherence *score* on top — they do not form the groups. Rationale: tags = precision, embeddings =
  (would-be) recall, and recall isn't the bottleneck here.
- **Propose, don't commit (governance).** Whether EVDs truly converge, how to phrase the pattern, and
  whether the papers are independent are human judgment calls. The script stops at a checklist; it
  never writes EP nodes or edges. Mirrors `Skill-synthesis.md` governance.
- **Coherence = centroid cosine, `all-MiniLM-L6-v2`.** Cheap, no API, deterministic. Embeds
  `name + Description` (quotes and image embeds stripped) so the signal is the finding, not boilerplate.
- **Distinct-paper count from the filename `@citekey`**, not the `Source` field — robust to missing
  frontmatter.
- **"Already in an EP" via `relations.json`** (EVD—supports→EP edges), so re-runs don't re-propose
  bundles already committed.

## Known limitations

- **The whole approach hinges on the upstream facet tagging** (`languageConcordanceFactor` /
  `healthOutcome`), which is currently ad-hoc — facet-first means garbage-in → weak buckets.
  Tracked: [issue #1](https://github.com/oasisresearchlab/language-and-health-open-synthesis/issues/1).
- **Coherence is a weak signal here.** The whole corpus is LEP-topical, so MiniLM rates most EVDs as
  similar (~0.74–0.85 within a facet); coherence barely separates good buckets from bad. The facet
  grouping does the real work — don't over-trust the number.
- **Primary-facet only.** Uses `first()` of each list field, so an EVD tagged with multiple
  factors/outcomes is grouped by just the first → can miss cross-facet patterns.
- **Requires both facet fields.** EVDs missing `languageConcordanceFactor` *or* `healthOutcome` are
  dropped from grouping.
- **Same-cohort papers count as distinct.** The ≥2-papers test is by citekey, so re-analyses of one
  dataset (e.g. Zhang ⊂ Moreno's cohort) would both count — overstating independence.
- **No facet-synonym merging** ("Language concordance" vs "Limited English Proficiency (LEP)" cover
  overlapping evidence) → related buckets appear separately.
- **Direction-blind.** Supporting and contradicting EVDs for the same factor→outcome land in one
  bucket; the proposal doesn't split them.

## Future — "smarter later"

- **LLM-judged pattern equivalence:** ask a model "do these EVDs state the same empirical regularity?"
  instead of bag-of-centroids — handles paraphrase and effect direction properly.
  ([issue #2](https://github.com/oasisresearchlab/language-and-health-open-synthesis/issues/2))
- **Entailment / cross-encoder grouping** (an NLI or reranker model) for statement-level convergence
  rather than topical similarity.
  ([issue #2](https://github.com/oasisresearchlab/language-and-health-open-synthesis/issues/2))
- **Independence-aware paper counting:** detect shared cohorts (author + sample + site) so an EP's
  strength reflects independent replications, not re-analyses.
  ([issue #3](https://github.com/oasisresearchlab/language-and-health-open-synthesis/issues/3))
- **Density clustering** (e.g. HDBSCAN) over embeddings, within or across facets, to surface emergent
  patterns the tag vocabulary doesn't yet name.
- **Direction-sensitive proposals:** split each facet bucket into supporting vs. contradicting
  sub-patterns.
- **Auto-scaffold accepted EPs:** generate the EP node (4-section template + linked EVDs + computed
  `ep/strength`) for human editing, closing the loop with `count_evds_per_subtask.py`.
