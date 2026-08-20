# Benchmark review set + the terminology retrieval hazard

*2026-08-19. From an external evidence-map briefing on syntheses in this space, checked against
our corpus. Supersedes parts of [prior-reviews-sweep.md](./prior-reviews-sweep.md), which was
web-search only and missed most of this.*

## 1. The terminology finding — answers the 2025+ acquisition gap

The field shifted vocabulary around **2020–2021**, from *"limited English proficiency" (LEP)*
toward *"non-English language preference" (NELP)* and *"languages other than English" (LOE)*
(Ortega, Shin & Martínez 2021, J Immigr Minor Health). Searching only one family misses the other.

Tested against our 819 sources (title + abstract + keywords):

| Partition | n |
|---|---:|
| LEP terminology only | 722 |
| Both terminologies | 41 |
| **NELP/LOE only** | **0** |
| Neither | 56 |

**Exactly zero.** With 255 papers dated 2021 or later, a genuine field-wide shift should produce
*some* papers using only the new vocabulary. Zero is the signature of an **LEP-anchored
retrieval**.

### What this resolves

- **The 2025+ acquisition gap** (55 recent papers, only 4 in the spine, zero translation
  technology) is a **search artefact**, not a publication pattern. Open question closed.
- **A1 §2.5's risk is confirmed, and now characterized.** The 689 legacy PMIDs are a biased
  relative-recall reference set, and the bias has a name: papers adopting post-2021 terminology are
  systematically absent. A recall check against them would pass while certifying a query carrying
  the same blind spot.
- **It explains the review-overlap asymmetry.** van Lent (2025) overlaps our corpus *less* (27%)
  than Kwan (2023) (39%) — consistent with newer studies being likelier to use the newer terms.

### Required change to A1

The query must search **both** term families, plus `communication barriers`, `translating`,
`language concordance`, and MeSH `Communication Barriers`. This is not a refinement; without it
the search reproduces the corpus's existing blind spot.

## 2. Benchmark review set

Far larger than the earlier sweep found. Four are named as the pillars to anchor against:

| Review | Year / search end | Included | GRADE? | Why it matters here |
|---|---|---:|---|---|
| **van Lent et al.**, Patient Educ Couns 136:108767 (PROSPERO 469785) | 2025 / Jul 2024 | 26 | **Yes** | First to compare strategies and apply GRADE. Closest to B. |
| **Gutman et al.**, JAMA Netw Open 8(7):e2521492 | 2025 / Sep 2024 | 40 articles / **39 interventions** | No | **Intervention-indexed** — arguably closer to B's spine than van Lent. Found heterogeneity too high to identify a best strategy. |
| **Diamond et al.**, J Gen Intern Med 34(8):1591 | 2019 / Oct 2017 | 33 (29 cross-sectional, 4 RCTs) | No | Concordance outcomes; the design-mix benchmark. |
| **Hsueh et al.**, Med Care Res Rev 78(1):3 (PMID 31291823) | 2021 | 38 | No (evidence map) | The evidence map + research agenda flagged as closest to **A2**. |

Others worth benchmarking: Karliner 2007 (28 studies, foundational); Flores 2005;
Cano-Ibáñez 2021 (15 studies, 84,750 patients); Heath 2023 (29 reports); Kwan 2023 (integrative);
Quigley 2024 (17 of 217 screened, all cross-sectional); Boylen 2020 (JBI, paediatric);
Silva 2016 (palliative); Vange 2023 (European); Brandl 2020 (cost-effectiveness).

**Technology strand, 2024–2026** — almost none of this is in our corpus: Genovese 2024
(Ann Transl Med, AI in clinical translation); Martos 2025 (JAMA Netw Open, Azure NMT vs
professional translation, "consistently inferior in Chinese, Vietnamese, and Somali");
Kong 2026 (BMJ Qual Saf, GPT-4 vs Google Translate on discharge instructions);
Brewster 2025 (npj Digit Med, human-in-the-loop matches or beats professional translation);
Rodriguez 2026 (Acad Emerg Med).

## 3. The white space is bigger than we thought

**There is no Cochrane review or protocol on interpreters, language concordance, or language
access — and none is coming.** Reasons given: Cochrane's RCT-centric inclusion versus a
cross-sectional literature; scope-ownership ambiguity across four groups; the defunding of
Cochrane EPOC (stopped accepting titles January 2022; UK NIHR infrastructure funding ceased
31 March 2023, remit folded into a new thematic group); and the terminology/indexing problem
above.

That is a stronger white-space argument than "no living synthesis exists," and it points at a
specific framing: **an implementation-science/equity review accepting non-RCT designs — the space
EPOC vacated.**

## 4. Independent confirmation of our own findings

- **No combined-strategy evaluations exist** (van Lent). Our spine found 90 multi-component
  interventions and a provision+adoption pattern — evidence on a gap the field names as empty.
- **The evidence base is design-weak.** Diamond 2019: 29 of 33 cross-sectional, 4 RCTs.
  Quigley 2024: all 17 cross-sectional. Matches our 21-RCT-of-224 finding.
- **Only two syntheses in the space apply formal certainty assessment** — van Lent and an adjacent
  Cochrane review. GRADE is rare here, which raises the value of doing it properly.

## 5. Consequences

- [ ] **A1**: dual-terminology search is mandatory (§1). Supplement the reference set with the 36
      studies missing from Kwan/van Lent ([overlap analysis](./review-overlap-analysis.md)) and
      with post-2021 NELP/LOE papers.
- [ ] **B2**: benchmark set grows well beyond Kwan + van Lent. **Gutman 2025 should be read
      first** — 39 interventions, intervention-indexed, closest to B's spine.
- [ ] **A2**: Hsueh 2021 is the evidence map to read before fixing scope.
- [ ] **Technology strand**: treat as a separate sub-review with its own inclusion criteria,
      separating translation-accuracy studies from clinical-outcome studies.
- [ ] **Check PROSPERO directly** (redesigned Feb 2025) filtered to ongoing, before committing.
