---
shortLabel: "LEP ↔ complications: mostly null"
NodeFormality: draft
TruthValue: 0.55
NodeType: Claim
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
extraction_prompt_version: v2
nodeInstanceId: 019f8c54-7f7f-77e5-9aca-3244f508f034
certainty:
tags:
  - languageConcordanceFactor/discordance
  - healthOutcome/postoperativeComplications
  - epistemic/effect-size
languageConcordanceFactor:
  - Limited English Proficiency (LEP)
healthOutcome:
  - Postoperative complications
deliveryContext:
  - Perioperative
  - Surgery
  - Inpatient
---
## Supporting Evidence

> [!info] EVDs that support this claim (→ EVD—supports→CLM edges by sync_relations.py). Synthesized generalization from a PRISMA systematic review (Joo/Hyundeok 2023, 5 complications studies). Primary-study evidence lives in the cited studies (Inagaki 2017; Feeney 2019/2020; Witt 2021; Stolarski 2022, etc.), out of scope here. **No in-corpus EVD is wired yet — flagged for the human to wire the corpus's primary-study EVDs.**

## Contradicting Evidence

> [!info] EVDs that oppose this claim (→ EVD—opposes→CLM) — the single study finding higher complications after neuro-oncologic surgery in non–Spanish-speaking LEP. None wired yet.

## Narrative synthesis

Of the review's 5 postoperative-complications studies, only 1 found a significant association — higher odds of complications after neuro-oncologic surgery specifically in patients with non–Spanish-speaking LEP. The review places complications among the clinical outcomes less frequently associated with LEP. Certainty/GRADE appraisal is left for expert review.

> "Five studies assessed postoperative complications, including wound infection, adverse graft event, major adverse cardiac events, major morbidities based on the National Surgical Quality Improvement Program risk calculator criteria, and general short-term postoperative complications. Only 1 included study observed a significant association between LEP and complications. This study found higher odds of developing complications after neuro-oncologic surgery in patients with non–Spanish-speaking LEP compared with English-proficient patients." (Joo, 2023, p. 8)

**Reviewer note (probable-merge):** overlaps with the existing corpus CLM "Interpreter need (language discordance) is not significantly associated with postoperative complication rates" (Kunze/Kyle 2023 single-study, TSA). Human should decide whether to merge or keep the review-level generalization distinct.
