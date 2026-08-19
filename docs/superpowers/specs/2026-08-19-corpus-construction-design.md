# A1 — Corpus construction: search, screening, ingest

*2026-08-19 · branch `interventions-review-spec` · supersedes the prep steps in
`plans/translation-interventions-review.md` and `plans/language-access-research-by-setting.md`.*

**Status: partial.** Sections 1–3 are designed. Section 4 costs are parametric and firm up once
the query runs. Two feasibility TODOs are marked inline and must close before implementation.

## 1. Problem

The corpus has no documented provenance. The PubMed query that produced the original 785-row
spreadsheet is recorded nowhere; the spreadsheet carries ~94 duplicate rows (785 rows → 689
distinct PMIDs); 105 of the 819 source notes have no PubMed ID; 6 citekeys are duplicated; 89
sources have no abstract.

That is survivable for a review making claims about *interventions* (spec B), which is why B
proceeds on the current corpus. It is fatal for a review making claims about *the field* — the
denominator is the claim. A1 supplies the documented denominator.

## 2. Search

### 2.1 The legacy corpus becomes the validation set

689 distinct PubMed IDs were assembled by hand, independently of any query we will now write.
That makes them a **known-relevant reference set** for measuring relative recall: build a
candidate query, run it, measure what fraction of the 689 it retrieves.

This yields three things: a tuning signal (which concept block is too narrow is visible from
*which* known papers were missed); a reportable methods figure; and a finding — whatever the
systematic search retrieves that the hand-built corpus missed quantifies the bias in
convenience-assembled corpora, which is a contribution in its own right.

The 105 notes without PMIDs cannot participate (nothing to match on). The validation set is
**689, not 819** — a limitation to state, not to fix.

### 2.2 PubMed first; a second database is a measured decision

PubMed is free, non-negotiable, and indexes the informatics venues where this literature
actually lands. Embase and CINAHL need institutional access and per-database query rewrites.
Build and validate against PubMed, then decide whether marginal yield justifies a second
database — measured, not assumed. CINAHL is the likely candidate given the corpus's
nursing/health-services weighting.

### 2.3 Bounded non-biomed probe (sub-study)

Human-centred and NLP work on AI translation publishes in ACM DL, arXiv and the ACL Anthology,
which PubMed does not index. Evidence from the current corpus is suggestive but **cannot settle
this** — the corpus is PubMed-derived, so its zero ACM/arXiv papers is what you would observe
whether or not relevant work exists there. What the corpus *does* show is that all 43
translation-technology papers sit in biomed venues, and the informatics-leaning venues present
(JMIR, BMC Medical Informatics, NPJ Digital Medicine) are PubMed-indexed.

Expected division of labour: non-biomed venues enrich the **spine** (what interventions exist);
PubMed carries the **evidence** (whether they work). Since spec B §3.7 established the spine is
viable only at family level, a new prototype from CHI joins family B alongside 43 others and does
not move a family-level finding.

Therefore: a **bounded probe, not a second systematic search**. Query ACM DL, arXiv and the ACL
Anthology for clinical/medical interpreting and translation work; screen for anything with a
patient-outcome or real-clinical-setting evaluation; record how much is already PubMed-indexed.
Reported as its own sub-study. A near-zero result is a publishable finding about where this
literature lives.

## 3. Screening

Adapted from Jaffer et al. (2025), *AI-assisted Living Evidence Databases for Conservation
Science*, [doi:10.33774/coe-2025-rmsqf](https://doi.org/10.33774/coe-2025-rmsqf) — the
Conservation Evidence group's own pipeline, which is apt given spec B models the review on
Conservation Evidence.

### 3.1 Why not a plain over-inclusive screen

The earlier proposal was to screen everything over-inclusively and let full-text review narrow
it. That has no principled stopping point and yields no recall guarantee. The governing
asymmetry still holds — a false positive is caught at full text and counted in the PRISMA flow,
a false negative is invisible and permanent — but CAL plus a stopping rule addresses it with a
statistic rather than a posture.

The heuristic pool in spec B §3.6 is the cautionary case: **65% recall**, discovered only because
a sweep was run over the rejects. In A1 the rejects are the other ~10,000 records. There is no
sweep.

### 3.2 The method

**Continuous Active Learning with an LLM as oracle.**

1. **Feature vectors** (one-time, whole corpus): sparse 2¹⁸ feature-hashed uni/bi-grams
   concatenated with a 256-dim Matryoshka embedding from `nomic-ai/modernbert-embed-base`.
2. **Batch 1**: random sample of 50 → inclusion test.
3. **Batches 2..n**: an LLM generates **30 synthetic articles satisfying the inclusion criteria**;
   these synthetic positives plus confirmed negatives from the prior batch train a **logistic
   regression** ranker, which scores the unscreened corpus; the top 50 go to the inclusion test.
   *(The synthetic examples solve classifier cold-start — there are too few real positives early
   on. They are not a boundary-testing device.)*
4. **Inclusion test, two phases**: the LLM judges title+abstract **five times with a majority
   vote** (self-consistency); survivors go to full-text verification structured as a boolean
   extraction node.
5. **Stopping rule**: model relevant-document discovery as an inhomogeneous Poisson process with
   a hyperbolic rate function λ(x) = a/(1+bcx)^(1/b), fit via `scipy.optimize.curve_fit` against
   relevance-by-rank smoothed over a 100-rank sliding window. Integrate to estimate total
   relevant documents. **Stop when the lower bound of the 95% CI on recall exceeds the 95%
   target.**

Reported performance: **97% recall (150/155)** against the manually curated Conservation Evidence
database — an *external* reference standard — while reducing the corpus needing screening by 97%,
and surfacing relevant studies the original manual review had missed.

### 3.3 The precision problem is the real cost, and it lands on human time

Their reported precision is **~10% initially, ~28% adjusted** for a ~20% pseudo-false-positive
rate (many apparent false positives were genuinely relevant papers absent from the original
synopsis). Their stated limitation is that low precision *"would require significant human
verification efforts."*

This lands squarely on our binding constraint. Spec B measured 73% correct grounding on
AI-drafted evidence — roughly one node in four needs human correction. Adopting this method buys
a defensible recall guarantee and pays for it in the currency we have least of.

**Design consequence.** Jaffer et al. use ranking to reduce *LLM* screening volume, because their
oracle was expensive. Ours is not — spec B screened 968 records for $1.48. So we keep the ranker
and the stopping rule for their statistical properties, and spend the freed effort on the human
verification their limitations section identifies as the bottleneck. Ranking allocates the
**human** budget, not the LLM budget.

### 3.4 Three independent checks

Each catches a failure the others cannot see:

| Check | Catches | Cost |
|---|---|---|
| Relative recall vs the 689 (§2.1) | Search too narrow | free |
| CAL stopping rule (§3.2) | Screening stopped too early | model time |
| Human dual-screening on a sample | Criteria misapplied; produces the agreement statistic PRISMA-ScR requires | **human hours — the expensive one** |

The first two are frequently conflated. Jaffer et al.'s 97% validates *screening* against a
reference standard; it says nothing about whether the *search* was broad enough. Keep both.

### 3.5 TODO — feasibility, must close before implementation

- [ ] **TODO: hardware.** Jaffer et al. ran DeepSeek-R1-Llama-3.3-70B on a single **NVIDIA
      H100**. We have a 64GB M4 Pro (~273 GB/s memory bandwidth). 70B at 4-bit occupies ~40 GB
      and runs ~6–7 tok/s; the design makes **five oracle calls per screened article**. Their
      corpus was 151,727 records; ours is plausibly 5–20k, an order of magnitude smaller, and CAL
      means only a batched fraction reaches the oracle. Compute the actual wall-clock before
      committing. A smaller reasoning model may be the better trade — **benchmark before
      promising local execution.**
- [ ] **TODO: query yield.** Every effort figure in §4 is parametric because PubMed yield is
      unknown until a query runs. Run a candidate query and record the count before costing.
- [ ] **TODO: verify** whether `nomic-ai/modernbert-embed-base` and a suitable oracle model are
      obtainable and licensed for this use.

## 4. Options — what each tier buys

Costs are expressed **per 1,000 records screened** so they scale once §3.5's query-yield TODO
closes. Model costs use measured rates from spec B ($1.48 for 968 records, Haiku 4.5); human
rates assume ~1–2 min per title/abstract judgement.

| | Tier 1 — Minimum | Tier 2 — Publishable *(recommended)* | Tier 3 — Full |
|---|---|---|---|
| Search | PubMed | PubMed + relative-recall validation vs 689 | + second database (CINAHL/Embase) + non-biomed probe |
| Screening | Single-pass LLM, over-inclusive | CAL + Poisson stopping rule (Jaffer et al.) | Tier 2 + dual human screening at scale |
| Recall claim | none — "we used an LLM" | **95% CI lower bound ≥ 95%**, plus relative recall vs 689 | Tier 2 + inter-rater agreement across the full screen |
| Model cost | ~$1–2 / 1k records | ~$5–10 / 1k records (5× self-consistency) | ~$5–10 / 1k records |
| Human cost | validation sample only | validation sample + precision triage | full dual screening |
| Human hours / 1k screened | ~2–4 | ~10–20 *(driven by ~28% precision)* | ~35–70 |
| Publishable as a scoping review? | **No** | **Yes** | Yes, with the strongest claim |
| Living updates | manual re-run | re-runnable pipeline | automated ingest + recommendation route |

**Recommendation: Tier 2.** Tier 1 cannot support the field-level claims that motivated A1 at
all — it reproduces the current provenance problem with extra steps. Tier 3's marginal gain is an
agreement statistic across the full screen rather than a sample, which reviewers do not normally
require for a scoping review, at roughly 3× the human cost.

The dominant line in every tier is **human hours, not model spend** — consistent with the
project-wide pattern where tokens are trivial and verification is not.

## 5. Non-goals

- Full-text extraction of included records — that is spec B's extraction runway (188 papers).
- Facet/ontology design for setting × outcome — that is A2.
- Retrospective reconstruction of the original spreadsheet query. Superseded: A1 replaces it.

## 6. Open

1. Second database: decided by measured marginal yield after PubMed validation (§2.2).
2. Human validation sample size: cannot be fixed until yield and base rate are known (§3.5).
3. Whether the oracle runs locally or on API — pending the hardware TODO. Local is preferred for
   **fidelity to the published method and replicability without an API budget**, not for cost;
   measured savings are ~$100–300 across the project.
