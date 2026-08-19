# A2 — Corpus characterization: the coverage map

*2026-08-19 · branch `interventions-review-spec` · supersedes `plans/language-access-research-by-setting.md`.*

**Status: partial.** Sections 1–3 designed. One TODO gates implementation (§2.4). Costs are
inherited from spec B's measured pipeline and firm up when A1's corpus size is known.

## 1. Problem

The review question is: *what has the body of language-access work focused on — which settings
and which outcomes does it include and prioritize?*

The corpus carries two parallel classification layers, both of which grew organically and
neither of which can answer it as-is.

### 1.1 Node level — 635 EVD+CLM from 76 papers

| Facet | Coverage |
|---|---|
| `healthOutcome/*` | 623 / 635 (98%) |
| `languageConcordanceFactor/*` | 615 / 635 (97%) |
| `deliveryContext/*` | 349 / 635 (55%) |

`healthOutcome` has **76 distinct values** with a long singleton tail, and three distinct
failures:

- **Unmerged synonyms.** `translationAccuracy` (52) / `translationQuality` (1);
  `regionalAnesthesiaUtilization` (9) / `regionalAnesthesiaUse` (2); `communication` (8) /
  `communicationQuality` (51); `complications` (5) / `postoperativeComplications` (15);
  `satisfaction` (15) split against `patientSatisfaction` (5), `providerSatisfaction` (2),
  `nurseSatisfaction` (2).
- **Mixed levels of abstraction.** `patientReportedOutcomes` (26) is a *measurement category*,
  not an outcome, sitting alongside `lengthOfStay`. `qualityOfCare` (7) and `careProcess` (9) are
  umbrellas over other members of the same flat list.
- **Non-outcomes filed as outcomes.** `feasibility`, `usability`, `measurementValidity`,
  `symptomAssessmentFeasibility` are properties of the *study*, not of health.

`deliveryContext` — the settings axis, and the thinnest facet — collapses two orthogonal
dimensions (`inpatient`/`outpatient` vs `oncology`/`ophthalmology`) and two hierarchy levels
(`arthroplasty` ⊂ `surgery`). It cannot be cross-tabulated cleanly, which defeats the review's
central deliverable.

### 1.2 Source level — 819 records

| Field | Populated | State |
|---|---|---|
| `abstract` | 744 | usable |
| `specialty` | 710 | needs normalization: `Oncology`/`oncology`, `Emergency`/`emergency medicine`, `General Medicine` vs `General Medicine-Clinical` vs `General Medicine – Inpatient` |
| `outcomes` | 650 | **597 distinct verbatim values**; median 86 chars, **236 entries ≥120 chars** — prose, including pasted conclusions |
| `region` | 566 | usable |
| `language` | 525 | usable |
| `setting` | **0** | does not exist |
| `design` | **0** | does not exist |

The two fields the review question turns on — **setting and design — do not exist at source
level at all.** `deliveryContext` exists only on nodes, covering 55% of 635 nodes drawn from 76
papers. And the free-text `outcomes` field shows the same pollution as the `intervention` field
did in spec B: hand-entered, with findings prose pasted into a metadata slot.

## 2. Vocabularies

Different axes need different vocabularies. Forcing all of them into one NLM source would fit
poorly; MeSH is a *subject* vocabulary and says nothing about outcomes.

| Axis | Vocabulary | Rationale |
|---|---|---|
| Setting (care context) | **MeSH** | Subject vocabulary, NLM-maintained, already the indexing language of the corpus's own source database |
| Specialty | **MeSH** | Same; resolves the `Oncology`/`oncology` normalization directly |
| Outcome | **COMET taxonomy**, complemented by **Donabedian** | See §2.2–2.3 |
| Study design | derive fresh | No standard vocabulary needed; absent at source level |

### 2.2 COMET for outcomes

Dodd et al. 2018, *J Clin Epidemiol*, [doi:10.1016/j.jclinepi.2017.12.020](https://doi.org/10.1016/j.jclinepi.2017.12.020)
(PMID 29288712). A **38-item** classification maintained by the Core Outcome Measures in
Effectiveness Trials initiative.

Two properties address our failures directly:

- **It classifies *what* is measured, not *how*.** That is exactly the `patientReportedOutcomes`
  problem — a *how* sitting in a list of *whats*.
- **Every classification carries two components**: the structural domain, and whether the outcome
  is measured as a **benefit or a harm**. Our vocabulary has no harm concept across any of its 76
  values, which is itself a likely finding.

Confirmed domains include **adverse events**, **physiological/clinical**, and **delivery of
care**; composites are classified into all relevant domains. "Delivery of care" is where
`interpreterUtilization`, `translationCoverage` and `interpreterAccess` belong — their being
mixed with `mortality` and `lengthOfStay` is the specific confusion to fix.

It is adopted for annotation in **both the COMET database and Cochrane Reviews**, so it is
recognized rather than idiosyncratic.

**Precedent for our output.** Applying the taxonomy across 299 core outcome sets, Dodd et al.
report that **92% included a physiological outcome, 59% any measure of impact, and only 35%
referenced adverse events.** That "the field measures X and neglects Y" shape is precisely A2's
question, with a published template for reporting it.

### 2.3 Donabedian alongside it

COMET is built for effectiveness trials and core outcome sets. Our corpus is not: the
intervention spine alone is 36 qualitative and 26 cross-sectional studies against 21 RCTs.
A trials-oriented taxonomy applied to qualitative work is a methods weakness a reviewer can
press on.

Donabedian's **structure / process / outcome** split is design-agnostic and handles process
measures natively, which is where a large share of this corpus's "outcomes" actually sit
(`interpreterUtilization`, `careProcess`, `translationCoverage`). Use it as a second, coarse
facet rather than a competing taxonomy.

### 2.4 TODO — gates implementation

- [ ] **TODO: pull Table 1 of Dodd et al. and check fit against our 76 values before
      committing.** The full list of core areas and all 38 domains could not be verified from
      open sources — Springer, PubMed and Elsevier routes were all gated. Recollection is that
      there are five core areas (death, physiological/clinical, life impact, resource use,
      adverse events), but that is **unverified and must not be relied on**. Map our 76 values
      onto the real table and record what fails to map; a high unmappable rate would argue for
      Donabedian as primary rather than secondary.

## 3. Method — reuse spec B's pipeline

A2 is spec B's problem one axis over, and B's three-stage pipeline is already validated and
cheap: 968 records for $1.48, plus a 244-record refinement for $0.44.

1. **Derive** (`code_interventions.py` pattern) — free-text extraction from title+abstract, with
   a verbatim span required for every call.
2. **Refine** (`refine_interventions.py` pattern) — split the facets apart so labels converge.
   This is the step that made modality recoverable in B: stage-1 labels packed modality,
   population and setting into one phrase and stayed near-unique; splitting them out dropped
   `not_stated` modality from 70-of-98 to 37-of-244.
3. **Merge** (`cluster_interventions.py` pattern) — deterministic, auditable, no model call.

**The lesson B paid for, applied here.** B's stage-1 free-text labels did not converge
(234 distinct across 244 papers) *because each label carried several facets at once*. A2 must
therefore extract setting, specialty, outcome, outcome-type and design **as separate fields from
the start**, not as one descriptive phrase to be untangled later.

**Two layers, not one.** The 819 sources are the breadth layer (the review's denominator); the
635 nodes from 76 papers are the depth layer. Report both, and report the difference — whether
extraction has been representative of the corpus is itself a finding, and one the project needs
to know regardless.

## 4. Relationship to A1 and B

- **A2 depends on A1.** Field-level claims ("the literature focuses on X") require a documented
  denominator. Running A2 against the current convenience corpus reproduces the provenance
  problem the decomposition exists to solve. A2's *method* can be built and tested now; its
  *claims* wait for A1's corpus.
- **A2 does not block B.** B is indexed by intervention and proceeds on the current corpus, with
  inputs swapped when A1 lands.
- **Setting is A2's spine and B's optional pivot.** That ordering is the distinction between them.

## 5. Non-goals

- Re-extracting evidence nodes. A2 classifies; it does not extract.
- Building the intervention spine — done, spec B §3.7.
- Ontology *authoring*. Adopt MeSH and COMET; do not invent a vocabulary.

## 6. Open

1. Whether Donabedian is secondary or primary — decided by the §2.4 mapping exercise.
2. Whether coverage is counted in papers, evidence nodes, or both. Papers are the scoping-review
   convention; nodes are what the graph uniquely enables. Probably both, reported separately.
3. Whether the 89 sources with no abstract get hand-coded or reported as uncoded.
