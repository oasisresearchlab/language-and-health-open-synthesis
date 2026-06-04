---
type: pipeline-spec
script: utils/cluster_queue.py
updated: 2026-06-04
---
# cluster_queue.py — design note

Usage + spec live in the module docstring (`utils/cluster_queue.py`). This note holds the **why**, the
**limitations**, and the **roadmap**. Part of [[Pipeline]].

**In one line:** seed the extraction queue with provisional `factor × outcome` buckets (curated
matrix first, embeddings second) — propose, never author EP/CLM nodes.

## Design decisions

- **Matrix-first, embeddings-second.** The seed buckets are `(factor × outcome)` cells built from
  curated vocab tags, which are discriminating and high-precision. Embeddings only add a *coherence
  score* and a noisy *suggested-papers* expansion on top — they never form the buckets.
- **Outcomes are read from `factors` too.** This corpus conflates factors AND outcomes in the source
  `factors` field, so outcome terms are classified from *both* `factors` and `outcomes_extracted`. A
  proper fix is a vocabulary classifier; the dual-read is the pragmatic stopgap.
- **Curated controlled vocab with alias + substring fallback.** `classify()` maps a labelled term to
  a canonical factor and/or outcome via an exact alias lookup, then a substring fallback — keeping the
  vocabulary small and auditable (seeded from `Variables.md`).
- **Propose-don't-commit (governance).** Output is a human-reviewable checklist
  (`Extraction Queue.md`) plus structured `data/queue.json`; **no EP/CLM node files are written**.
- **Empirical-only.** Papers without `has_empirical_findings` are dropped — the queue exists to drive
  evidence extraction.
- **MKL/OpenMP segfault guard.** `KMP_DUPLICATE_LIB_OK` / `OMP_NUM_THREADS` / `TOKENIZERS_PARALLELISM`
  are set at import time because torch + sklearn under the anaconda duplicate runtime segfaults.
- **Emergent KMeans is opt-in (`--emergent-k`, default 0).** It segfaulted, so the KMeans pass over
  unmapped papers is off unless explicitly requested.
- **Cheap, deterministic embeddings.** `all-MiniLM-L6-v2`, no API; `--no-embeddings` gives a fast
  matrix-only keyword pass.

## Known limitations

- **Embedding "suggested" list is noisy.** The whole corpus is uniformly LEP-topical, so centroid
  similarity flags many off-target papers as near — every suggestion needs human verification, and
  coherence barely separates good buckets from bad.
- **Vocabulary-bound.** Only factors/outcomes in the curated vocab form cells; a finding whose term
  isn't an alias is invisible to the matrix (and falls to the opt-in, segfault-prone emergent path).
- **Conflated source field is unresolved.** Reading outcomes out of `factors` is a workaround, not a
  classifier — mislabelled terms still mis-bucket.
- **Substring fallback can over-match.** A short alias appearing inside an unrelated term can mis-tag
  a paper.
- **Set-based cells ignore direction and strength.** A cell just says factor co-occurs with outcome;
  it doesn't distinguish supporting vs. contradicting evidence or effect size.

## Future — "smarter later"

- **Vocab classifier to split the conflated field:** learn (or LLM-judge) whether each `factors`
  entry is a factor or an outcome, removing the dual-read hack.
- **Topic-aware coherence:** a signal that controls for the corpus-wide LEP topicality so suggestions
  aren't dominated by shared subject matter.
- **Resolve the emergent-KMeans segfault** (or swap to a runtime-safe clusterer like HDBSCAN) so
  emergent buckets can run by default.
- **Direction-sensitive buckets:** split each `factor × outcome` cell into supporting vs.
  contradicting sub-queues.
- **Auto-expand the controlled vocabulary** from the corpus so new factors/outcomes enter the matrix
  instead of dead-ending in emergent clusters.
