# Language-access interventions review — design

*2026-08-18 · branch `interventions-review-spec` · supersedes the stub at `plans/translation-interventions-review.md`.*

**Status: partial.** The corpus baseline (§3) is settled and reproducible. The review's
output format and effectiveness-rating scheme are not — see §7. This document exists now so
the pre-coding baseline is on the record before an AI coding pass changes the numbers.

## 1. Problem

We want a living synthesis answering: **what language-access interventions have been
implemented, and what does the evidence say about them?** The model is
[Conservation Evidence](https://www.conservationevidence.com/) — indexed by *intervention*,
with the evidence for each one summarised and its strength stated plainly.

The corpus was never built to answer that question. It is indexed by *paper*, and its one
intervention-bearing field is a hand-entered spreadsheet column that holds four different
data types at once. Before scoping the review we needed to know what is actually in there.

## 2. Where this sits

Three specs, in dependency order. This is **B**.

| | Scope | Output |
|---|---|---|
| **A1** Corpus construction | Search protocol, systematic search, screening, dedupe, ingest | Documented re-runnable corpus + PRISMA-ScR flow — **spec written**: `2026-08-19-corpus-construction-design.md` |
| **A2** Corpus characterization | Schema fix, ontology mapping, coding at scale | Coverage map: setting × outcome × design — **spec written**: `2026-08-19-corpus-characterization-design.md` |
| **B** Interventions review *(this)* | Intervention spine, evidence per intervention, effectiveness | The Conservation Evidence-style product |
| **B2** Review harvest | Seed from prior evidence syntheses; harvest, ground, backfill | **spec written**: `2026-08-20-review-harvest-design.md` |

**B is not blocked on A1.** It runs against the current 819-source corpus; A1's output
swaps in as a larger, documented input when it lands. B is about interventions writ large,
with setting as an *optional pivot* rather than a primary axis — that ordering is what
distinguishes B from A2.

A1 exists because the corpus provenance is undocumented: the PubMed query that produced the
original 785-row spreadsheet is recorded nowhere in the repo, the spreadsheet carries ~94
duplicate rows (785 rows → 689 distinct PMIDs), and 105 of the 819 source notes have no
PubMed ID at all. That is survivable for B, which makes claims about *interventions*. It is
fatal for a review making claims about *the field*, which is why A1 precedes A2.

## 3. Baseline characterization (2026-08-18, pre-coding)

Regenerate with `python3 utils/profile_corpus_interventions.py`. These numbers are the
**before** half of a before/after — the coding pass in §6 is expected to move them, and by
how much is itself a finding about the legacy metadata.

### 3.1 What the legacy `intervention` field holds

Imported verbatim from a spreadsheet column named `Intervention?`, across 819 sources:

| Count | Content |
|---:|---|
| 345 | explicit no |
| 256 | field absent |
| **133** | **an actual named intervention** |
| 56 | a study-design label, misfiled (`systematic review`, `Commentaries`, `case report`) |
| 28 | a pasted abstract conclusion |
| 1 | bare `true` |

### 3.2 Available pool

| | |
|---:|---|
| 133 | named intervention in the legacy field |
| +170 | abstract reads intervention-like (recoverable, needs coding) |
| **303** | **plausible upper bound, of 819 (37%)** |
| 36 | already extracted into the graph (20 named + 16 recoverable) |
| 114 | of the 133 named have a retrievable PDF |

So roughly **267 in-scope papers are unmined**.

### 3.3 Intervention type × study design (the 133 named)

```
                                 RCT  QI/prepost  ProspCoh  Retro  XSect  Qual  Review  SysRev  Undet
Other / unclassified               2       4          2       3      3     3      5       4       5
Professional interpreting          3      11          .       .      1     .      1       1       9
Provider education / training      1       5          1       .      6     1      .       .       5
Digital health / mHealth           .       4          .       .      1     3      1       .       3
System / policy / workflow         1       4          .       .      3     .      1       .       2
Multimedia / video education       .       4          1       .      1     1      2       .       2
Machine / AI translation           .       2          1       .      2     .      .       2       2
Language-concordant staff          1       2          .       2      .     .      .       .       2
Translated written material        1       1          .       .      1     2      .       .       1
```

Sums to 132; the 133rd (`@Wasserman_2014_Identifying_and`) is Mixed methods, a column omitted
here for width.

Study design across **all 819** sources: Undetermined 251, Cross-sectional/survey 141,
Narrative review/commentary 114, Retrospective/database 99, Qualitative 77,
Quasi-experimental/pre-post/QI 67, Systematic review/meta-analysis 32, Prospective cohort 18,
RCT 15, Mixed methods 3, Case report 2.

### 3.4 What the baseline implies

**The legacy field is a lossy hint, not a census.** It names 9 machine/AI-translation
interventions; the AI-translation cluster alone extracted 21 papers. The intervention spine
must be derived fresh from abstracts, with the legacy column kept only as a validation signal.

**It also conflates language-access interventions with any clinical intervention.**
`primary percutaneous coronary intervention for STEMI` is in there, as are `Mailed survey`
and `Bayesian classifier`. Coding must screen for *language-access relevance*, not merely
for the presence of an intervention.

**The evidence base is design-weak, and Conservation Evidence tolerates that.** 37
QI/pre-post against 9 RCTs among named interventions. *(Superseded by §3.6: coding finds 44
QI/pre-post and 21 RCTs among the 244 in-scope papers — still QI-dominated, but the heuristic
more than halved the RCT count.)* A Cochrane-style effectiveness review
would founder; a model that reports what evidence exists *including* weak evidence, with
strength stated, fits the corpus. Effectiveness claims will nevertheless be modest, and the
spec should not promise otherwise.

**Interest is highest where primary evidence is thinnest.** *(Heuristic figures; see §3.6.)*
Machine/AI translation: 9 named
papers and **no RCTs** — 2 QI/pre-post, 2 cross-sectional, 2 systematic reviews, 1 prospective
cohort, 2 undetermined. Two of the nine are themselves reviews, so primary studies number seven.

### 3.5 How far to trust §3

A heuristic keyword pass — **not coding**, and materially less reliable than the extraction
pipeline's measured 83% substantive fidelity. Known error modes, from the script's own output:

- 230 of 819 design calls (28%) matched more than one pattern and were resolved by taxonomy
  ordering, not by adjudication.
- 162 sources have an abstract but no inferable design; a further 89 have no abstract at all.
- 32 of 133 interventions land in `Other / unclassified`.
- Every threshold is arbitrary and stated in the script — notably the 180-character cutoff
  separating "an intervention name" from "a pasted conclusion".

Treat §3 as the *shape* of what is available. It is not evidence about the field.

### 3.6 Post-coding results (2026-08-18, Haiku 4.5)

Regenerate with `python3 utils/code_interventions.py --scope pool|rest`. Free-text coding of
title+abstract for 724 of 819 sources (89 have no abstract and were not coded). Cost **$1.04**,
elapsed **116s**, zero errors.

**The heuristic pool in §3.2 was substantially wrong.**

| | |
|---:|---|
| True in-scope (language-access relevant **and** evaluates an intervention) | **244** |
| Heuristic pool said in-scope | 303 — of which only 160 were |
| True in-scope the heuristic **missed** | **84** |
| Heuristic recall / precision | **65% / 53%** |

The false-negative sweep therefore paid for itself: without it, a third of the in-scope corpus
would have been silently dropped.

**The legacy field is worse than §3.4 suggested.** Of its 131 distinct named interventions,
coding confirms 104 and rejects 27; and it misses **140** in-scope papers outright. It should be
retired as a selection input, not merely supplemented.

| | |
|---:|---|
| In-scope already extracted into the graph | 37 |
| **In-scope and unmined** | **207** |

**Design mix among the 244 in-scope** (model's own labels, normalized): QI/pre-post 44,
Qualitative 36, Other 32, Retrospective 29, Cross-sectional/survey 26, **RCT 21**,
Prospective/cohort 15, Systematic review 13, Narrative review 10, Mixed methods 6,
Program description 5, Case report 5, Unclear 2.

**Free-text coding worked for discovery and failed for aggregation.** It produced **234 distinct
category labels across 244 papers** — near one per paper (`interpreter-clinician huddle protocol`,
`AI-powered multilingual audio instructions`, `dedicated interpreter scheduling model`). That is
the richness we wanted and it is unusable as a spine. A clustering/normalization pass is now a
required step, not an optional one.

**Grounding fidelity: 87%.** Each call had to quote the abstract verbatim. 214 of 244 spans
verified; 3 more recover under whitespace normalization; **27 (11%) are genuine paraphrases**
despite an explicit instruction. This sits close to the 83% substantive fidelity measured in the
human accuracy review, and is the number to beat with a better prompt or a stronger model.

**Also surfaced: 819 source files carry only 813 distinct citekeys** — 6 duplicate citekeys,
independent of the ~94 duplicate rows already known in the origin spreadsheet.

**Not yet done:** the human-validated sample required by §6. Until it exists, the 244 figure is a
model's opinion, not a measured quantity — everything above inherits that caveat.

### 3.7 Proposed intervention spine (2026-08-18)

Built in three stages, each reproducible:
`code_interventions.py` (stage 1, free-text) → `refine_interventions.py` (stage 2, facets split
out) → `cluster_interventions.py` (stage 3, deterministic merge). Stage 2 cost $0.44 / 52s.

**Why stage 2 was needed.** Stage 1's labels were near-unique (234 distinct across 244 papers)
because each label packed modality, population and setting into one phrase. Stage 2 extracts
those as separate fields and asks for a deliberately general label. Labels converged
234 → 178, and modality became recoverable: `not_stated` fell from 70-of-98 interpreting
labels to 37 of 244 overall.

#### The spine: six mechanism families

Of 244 in-scope papers, **224 act on the language barrier** and 20 are clinical services merely
delivered to LEP patients (see the scope decision below).

| Family | n | Dominant modality | Dominant facing |
|---|---:|---|---|
| **A. Interpreting services** | 101 | in-person 42, mixed 23, phone 13 | clinician 89, patient 71, interpreter 25 |
| **B. Translation of text/speech** | 43 | digital 21, written 18 | patient 41 |
| **E. Workforce capability** | 25 | in-person 9, not-stated 11 | clinician 21 |
| **F. Service delivery redesign** | 18 | mixed 6, digital 4 | organization 18 |
| **C. Language-concordant care** | 14 | in-person 9 | patient 13, clinician 10 |
| **D. Patient-facing materials** | 9 | written 6 | patient 9 |
| G. Unassigned | 14 | — | — |

The three facets are doing real work rather than restating each other: interpreting is
**clinician**-facing more often than patient-facing (89 vs 71) and is the only family with a
meaningful interpreter-facing signal (25); translation technology is almost purely patient-facing
and digital/written; redesign is organization-facing. A facet that merely mirrored the family
would not produce that pattern.

#### Answering open question 2 (granularity)

Modality now resolves the "is interpreting one intervention or three?" question with numbers:
in-person 42, telephone 13, video-remote 6, mixed 23, not-stated 14. So **family level is
well-powered; family × modality is viable only for in-person interpreting**, marginal for
telephone, and too thin for video-remote. Report at family level, with modality as a
sub-stratification where the cell supports it.

#### Label-level indexing is not viable, and this is the main finding

After deterministic merging, 140 clusters remain and **119 are singletons**. Even with a
second pass explicitly instructed toward general labels, the corpus does not converge on a
reusable intervention vocabulary. Conservation Evidence can index by named intervention because
it has thousands of studies per domain; at 224 papers this corpus cannot. The label is useful as
descriptive detail *within* a family, not as the index.

Largest merged clusters: professional interpreting 38 (7 surface variants), interpreter training
9, clinician language training 8, telephone interpreting 7, translated patient materials 5,
video remote interpreting 4.

#### Multi-component interventions are the norm, not the exception

94 of 244 (38%) bundle distinct mechanisms, and the share rises sharply in the families where
you would expect it: service delivery redesign 77%, workforce capability 56%, language-concordant
care 50%, against translation technology 16% and patient materials 11%. Record all component
mechanisms and report a primary; do not force a single bucket.

#### Scope decision — RATIFIED 2026-08-18: exclude

20 papers are clinical or social services delivered to LEP populations rather than interventions
on the language barrier: `behavioral activation therapy`, `group prenatal visits`,
`collaborative care management`, `peer support group`, `patient navigation`,
`recruitment incentive`. The model flagged these via `acts_on_language_barrier`; a prior
regex estimate independently put the figure at 15, so the two roughly agree.

**Decision: excluded from the spine.** The `acts_on_language_barrier` flag is retained on every
record, so the set is recoverable and the exclusion is reportable in the PRISMA flow. **The
review's denominator is therefore 224, not 244.**

#### Caveats

- Family assignment is regex over the canonical label (`cluster_interventions.py`); 14 papers
  remain unassigned.
- Stage 2 grounding fell to **81%** verbatim (from 87% in stage 1) — the harder extraction is a
  harder span task. 45 of 244 spans are paraphrases.
- Everything here still inherits the §3.6 caveat: no human-validated sample yet exists.

### 3.8 Review effort — lower bound

With the spine ratified at 224 papers:

| | |
|---:|---|
| Already extracted into the graph | 36 |
| **Remaining to review** | **188** |
| …with a PDF already on hand | 168 |
| …needing PDF acquisition | 20 |

At the $8–10/paper extraction cost measured in the AI-translation cluster, the remaining
extraction runs **$1,500–1,900** in model spend. Human verification time, not tokens, is the
binding constraint — at the 73% correct-grounding rate measured in the accuracy review, roughly
one node in four needs correction.

Remaining by family: interpreting 87 of 101, translation 29 of 43, workforce 23 of 25, redesign
17 of 18, concordant care 12 of 14, unassigned 12 of 14, patient materials 8 of 9.

**This is a lower bound, and deliberately so.** It counts only papers already in the corpus that
survived a single AI screening pass. It will move upward for three reasons: A1's systematic search
will add papers this convenience corpus never had; the 89 sources with no abstract were never
coded at all; and no human validation has yet tested the 65%-recall failure mode that the
false-negative sweep exposed in the heuristic stage. Treat 188 as the floor of the review's scope,
not an estimate of it.

## 3A. Prior art

Full sweep: `plans/prior-reviews-sweep.md`. Summary of what bears on B:

**The closest existing work — must be read before scope is fixed.**
*Effectiveness of interpreters and other strategies for mitigating language barriers: a
systematic review* (2025), PROSPERO **469785**. Recent, intervention-framed, registered — the
nearest thing to B that exists. Also *Hospital and Health System–Level Interventions to Improve
Care for Limited English Proficiency Patients* (Jt Comm J Qual Patient Saf), which is
intervention-indexed but scoped to system level only.

**What does not exist.** No living review or living evidence database in this domain — every
review found is a static snapshot. Nothing is indexed *by intervention* in the Conservation
Evidence sense. B's differentiator is therefore **form, not question**: living rather than
static, intervention-indexed rather than question-indexed, node-level with verbatim grounding
rather than narrative.

**Family B's evidence scarcity is corroborated externally.** A 2026 *Nature Medicine* review
counted 4,609 LLM-in-medicine studies (Jan 2022–Sep 2025) of which only 1,048 used real-world
patient data and only **19** were prospective RCTs; a 2025 *Frontiers in Digital Health* review
found **4** studies meeting real-world-workflow criteria. §3.7 found family B to be 9 papers,
0 RCTs, 7 primary studies — same conclusion, different corpus and method. Scarcity here is a
property of the field, not an artefact of our screening. That is a stronger claim than a
limitation.

**A corpus gap sits exactly on B's most interesting family.** 55 corpus papers are dated 2025 or
later; only 4 are in the spine and **zero are family B**. B's translation-technology evidence
ends at 2024. See A1 §2.5.

## 4. Goals

1. A derived intervention spine covering the ~303-paper pool, replacing the legacy field.
2. For each intervention: the studies evaluating it, their designs, and their findings.
3. An effectiveness statement per intervention whose confidence is explicitly tied to the
   design mix behind it.
4. Re-runnable, so new papers from A1 flow in without redoing the work.

## 5. Non-goals / explicitly deferred

- **Field-level prevalence claims** ("the literature focuses on X"). That is A2, and it
  requires A1's documented denominator.
- **Setting as a primary axis.** Available as a pivot; not the spine.
- **GRADE certainty ratings.** Per the project's standing rule, body-of-evidence appraisal is
  an expert task and AI does not draft it.
- **Re-extracting the 36 already-extracted papers.**

## 6. Immediate next step — the coding pass

Code the 303-paper pool (and enough of the remaining 516 to estimate false negatives) for
`intervention_present`, `intervention_name`, `intervention_type`, `design`, and `setting`,
from title + abstract.

- **Local model for the bulk pass.** High-volume, low-judgment work; a 30B-class model on the
  M4 Pro handles it at ~15–20 tok/s at zero marginal cost. Frontier model adjudicates the
  uncertain band only.
- **Human-validated sample.** Draw a random sample, code it by hand, report agreement. This is
  the number that decides whether §3's successor can be trusted.
- **Success criterion.** Beating the §3 baseline is not the bar — the bar is a *measured*
  agreement rate on the validation sample and an explicit false-negative estimate for the
  516 papers not in the pool.

## 7. Open — to be settled before implementation

1. **Output shape.** A page per intervention (Conservation Evidence's actual form), or a
   single cross-tab with drill-down? Determines how much of the site needs building.
2. ~~**Intervention granularity.**~~ **Answered in §3.7:** report at family level; stratify by
   modality only where the cell supports it (in-person interpreting, n=42). Label-level
   indexing is not viable — 119 of 140 clusters are singletons.
3. **Whether ART nodes are the spine.** 20 exist and are intervention-shaped. Growing them to
   ~100 would make the graph the source of truth; the alternative is a separate index that
   references sources directly.
4. **Effectiveness vocabulary.** Conservation Evidence uses "beneficial / likely beneficial /
   unknown effectiveness / unlikely to be beneficial / harmful". Adopting it wholesale imports
   assumptions about evidence volume this corpus may not support.
