---
shortLabel: "LEP ↔ readmissions: mostly null"
NodeFormality: draft
TruthValue: 0.55
NodeType: Claim
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
extraction_prompt_version: v2
nodeInstanceId: 019f8c54-7f83-7a2c-9324-707387bfb7f1
certainty:
tags:
  - languageConcordanceFactor/discordance
  - healthOutcome/readmissions
  - epistemic/effect-size
languageConcordanceFactor:
  - Limited English Proficiency (LEP)
healthOutcome:
  - Readmission
  - ED utilization
deliveryContext:
  - Perioperative
  - Surgery
  - Inpatient
---
## Supporting Evidence

> [!info] EVDs that support this claim (→ EVD—supports→CLM edges by sync_relations.py). Synthesized generalization from a PRISMA systematic review (Joo/Hyundeok 2023, 9 readmission studies). Primary-study evidence lives in the cited studies (Wilbur 2016; Inagaki 2017; Feeney 2019/2020; Wong 2021; Manuel 2022 ×2; Stolarski 2022, etc.), out of scope here. **No in-corpus EVD is wired yet — flagged for the human to wire the corpus's primary-study EVDs.**

## Contradicting Evidence

> [!info] EVDs that oppose this claim (→ EVD—opposes→CLM) — single studies finding more 30-day readmissions (gynecologic oncology) or higher ED visits (proctocolectomy) among LEP patients. None wired yet.

## Narrative synthesis

Of the review's 9 unplanned-readmission studies, most found no association between LEP and readmissions; a single gynecologic-oncology study found significantly more 30-day readmissions in patients with LEP. For the related outcome of post-discharge ED visits (4 studies), results were mixed: 2 found no association, 1 found significantly higher ED visits (proctocolectomy), and 1 found *fewer* ED visits among LEP patients (gastric surgery). The review groups readmissions among the clinical outcomes less frequently associated with LEP. Certainty/GRADE appraisal is left for expert review.

> "Most studies found no association between LEP and readmissions. A single study identified significantly more 30-day readmissions in patients with LEP than English proficiency who underwent gynecologic oncology surgery. Of the 4 studies that addressed ED visits, 2 studies found no association between LEP and ED visits after infrainguinal bypass or oncologic surgery, 1 study reported a significantly higher rate of ED visits among patients with LEP after proctocolectomy, and 1 study demonstrated fewer ED visits among patients with LEP after gastric surgery." (Joo, 2023, p. 8)

**Reviewer note (probable-merge / tension):** relates to the existing corpus CLMs "Language discordance (LEP status) is not associated with higher acute-care utilization (ED visits or hospital admission)" (converging null) and "Language discordance is associated with higher hospital readmission after spine and orthopedic surgery" (subspecialty-specific positive association — tension). Human to adjudicate merge vs opposing wiring.
