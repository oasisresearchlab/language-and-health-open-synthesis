# Open questions and gates

*Last updated 2026-08-19. Grouped by which spec they block. Kept in the repo because these
constraints gate real work and previously lived only in session-scoped state.*

Specs: [B — interventions](../docs/superpowers/specs/2026-08-18-interventions-review-design.md) ·
[A1 — corpus construction](../docs/superpowers/specs/2026-08-19-corpus-construction-design.md) ·
[A2 — characterization](../docs/superpowers/specs/2026-08-19-corpus-characterization-design.md) ·
[prior-reviews sweep](./prior-reviews-sweep.md)

---

## Blocks everything — scope of B is under revision

**B is being reframed from "conduct a review" to "synthesize across existing systematic
reviews."** See the 2026-08-19 update in [`translation-interventions-review.md`](./translation-interventions-review.md).
Until this settles, B's extraction runway (188 papers, $1,500–1,900) is **not a firm number** —
much of it may already be extracted inside existing reviews' evidence tables.

- [ ] **Cross-check included studies of Kwan 2023 and van Lent 2025 against our 819-source corpus.**
      How much overlap? How much is new? This sizes everything downstream.
- [ ] **Decide whether B becomes an overview-of-reviews / review-harvesting design** rather than a
      primary review. If so, B's §3.8 effort figures need recomputing from scratch.
- [ ] **Design the schema-mapping component**: normalize extracted findings from review evidence
      tables (Kwan 2023 Table 3; van Lent 2025 Table 3, which also carries RoB and GRADE) into our
      EVD/CLM schema, rather than re-extracting the underlying papers.
- [ ] **Triage what genuinely needs fresh extraction** once the mapping exists.

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
