---
shortLabel: "LEP → skilled-facility discharge"
NodeFormality: draft
TruthValue: 0.6
NodeType: Claim
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
extraction_prompt_version: v2
nodeInstanceId: 019f8c54-7f78-7684-9fba-20e35c23f911
certainty:
tags:
  - languageConcordanceFactor/discordance
  - healthOutcome/dischargeDisposition
  - epistemic/effect-size
languageConcordanceFactor:
  - Limited English Proficiency (LEP)
healthOutcome:
  - Discharge disposition
deliveryContext:
  - Perioperative
  - Surgery
  - Inpatient
---
## Supporting Evidence

> [!info] EVDs that support this claim (→ EVD—supports→CLM edges by sync_relations.py). Synthesized generalization from a PRISMA systematic review (Joo/Hyundeok 2023, 4 discharge-disposition studies). Primary-study evidence lives in the cited studies (Bernstein 2020; Witt 2021; Manuel 2022 ×2), out of scope here. **No in-corpus EVD is wired yet — flagged for the human to wire the corpus's primary-study EVDs.**

## Contradicting Evidence

> [!info] EVDs that oppose this claim (→ EVD—opposes→CLM). None wired yet.

## Narrative synthesis

In 3 of the review's 4 discharge-disposition studies, patients with LEP were more likely to be discharged to a skilled facility rather than home after surgery (total joint arthroplasty, craniotomy). One study localized the effect to interpreter-requiring LEP patients (no association among LEP patients who did not need an interpreter), and one neuro-oncologic-surgery study found the opposite for Spanish-speaking LEP (lower odds of skilled-facility discharge), underscoring language-subgroup heterogeneity. Certainty/GRADE appraisal is left for expert review.

> "Patients with LEP were more likely to be discharged to skilled facilities vs home after total joint arthroplasty and craniotomy. In another study, patients with LEP who needed an interpreter had a significantly higher chance of discharge to skilled facilities after total joint arthroplasty than those with English proficiency, whereas patients with LEP who did not require an interpreter had no such association." (Joo, 2023, p. 7)

> "In a study of neuro-oncologic surgery patients, Spanish-speaking LEP was associated with lower odds of discharge to skilled facilities, although no association was observed between non–Spanish-speaking LEP and discharge disposition." (Joo, 2023, p. 8)

**Reviewer note (probable-merge):** overlaps with the existing corpus CLM "Interpreter need (language discordance) is associated with discharge to a rehabilitation facility rather than home" (Kunze/Kyle 2023 single-study). Human should decide whether to merge or keep the review-level generalization distinct.
