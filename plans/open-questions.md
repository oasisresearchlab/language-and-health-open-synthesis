# Open questions and gates

*Last updated 2026-08-19. Grouped by which spec they block. Kept in the repo because these
constraints gate real work and previously lived only in session-scoped state.*

Specs: [B — interventions](../docs/superpowers/specs/2026-08-18-interventions-review-design.md) ·
[A1 — corpus construction](../docs/superpowers/specs/2026-08-19-corpus-construction-design.md) ·
[A2 — characterization](../docs/superpowers/specs/2026-08-19-corpus-characterization-design.md) ·
[prior-reviews sweep](./prior-reviews-sweep.md) · [realist synthesis note](./realist-synthesis-and-discourse-graphs.md)

---

## B2 — review harvest *(spec written: `2026-08-20-review-harvest-design.md`)*

Decisions settled 2026-08-19/20: thin-harvest then prioritized backfill, with depth and review
provenance marked; start with three intervention-indexed reviews and track saturation; imported
synthesis statements become provenance-marked CLMs, aggregated against ours in an explicit later
phase (merge, or use as priors for aggregating EVDs into new claims).

- [ ] **Match Gutman 2025 against the corpus** — the third data point that turns B2's effort
      estimates into numbers, exactly as the coding pass did for B.
- [ ] **Decide the EVD merge-adjudication trigger** (same study + same outcome?).
- [ ] **Add a `curationStatus` state for imported claims** — off the AI-draft → expert-review ladder.
- [ ] **Set the saturation threshold** once three reviews are measured.
- [ ] **Design the framework-review harvest** (programme theory) — sketched only, and gated on the
      realist-layer tensions.
- [ ] **Acquire PDFs + create SRC nodes** for the 36 studies missing from Kwan/van Lent.

## Blocks A1 — corpus construction

- [ ] **Explain the 2025+ acquisition gap.** 55 corpus papers are dated 2025 or later; only 4 are
      in the intervention spine and **zero** are family B (translation technology). Real
      publication pattern, search artefact, or screening artefact? *If it is a search artefact, the
      689 legacy PMIDs under-cover exactly the area of most interest, and the relative-recall check
      in A1 §2.1 would pass while certifying a query with the same blind spot.* See A1 §2.5.
- [ ] **Reconsider the search design given van Lent 2025 publishes its strategy.** Updating a
      peer-reviewed, documented search may be stronger and cheaper than composing one from concept
      blocks — and it partly sidesteps the blind-spot risk above. See
      [`search strategy from van Lent 2025.md`](./search%20strategy%20from%20van%20Lent%202025.md).
- [ ] **Run a candidate PubMed query and record yield.** Converts every cost figure in A1 §4 from a
      per-1,000-record ratio into a concrete number usable in a funding ask. Cheapest high-value
      item on this list.
- [ ] **Benchmark M4 Pro wall-clock** for a 70B-class oracle at 5 calls/article vs a smaller
      reasoning model. A1 §3.5.
- [ ] **Verify** `nomic-ai/modernbert-embed-base` and oracle model availability + licensing. A1 §3.5.

## Blocks A2 — characterization

- [ ] **Pull Table 1 of Dodd et al. 2018 (COMET) and map our 76 `healthOutcome` values against it.**
      The full taxonomy could not be verified from open sources — Springer, PubMed and Elsevier
      routes were all gated. A high unmappable rate argues for Donabedian as the primary frame
      rather than secondary. A2 §2.4.
- [ ] **Read PMID 31291823 in full** — the 2019 Evidence Map *with a Research Agenda*, structurally
      what A2 proposes to produce. Its agenda may already name the gaps A2 intends to find. A2 §2A.

## Blocks trusting any of the coded numbers

- [ ] **Human-validate a sample of the coding pass.** Until this exists, the 224-paper spine and
      every figure derived from it are a model's opinion, not a measured quantity. B §3.6, §6.

## Prior-art follow-ups

- [ ] **Read van Lent 2025 (PROSPERO 469785) in full** — closest existing work to B.
- [ ] **Search PROSPERO, Epistemonikos and Campbell directly.** The sweep so far was web search
      only and will have missed registered-but-unpublished protocols.

---

## Recently closed

- Scope boundary ratified (2026-08-19): clinical services delivered to LEP populations are excluded
  from B's spine; denominator is **224**, not 244. Flag retained so the 20 stay recoverable.
- Intervention granularity answered (B §3.7): report at family level; stratify by modality only
  where the cell supports it. Label-level indexing is not viable — 119 of 140 clusters are singletons.
- Initial prior-reviews sweep done ([prior-reviews-sweep.md](./prior-reviews-sweep.md)): the space
  is heavily reviewed, but nothing is living and nothing is intervention-indexed.
