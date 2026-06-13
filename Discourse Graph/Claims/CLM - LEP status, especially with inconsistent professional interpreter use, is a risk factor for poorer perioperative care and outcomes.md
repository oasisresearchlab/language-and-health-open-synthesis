---
shortLabel: "LEP → poorer perioperative care"
NodeFormality: draft
TruthValue: 0.6
NodeType: Claim
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
extraction_prompt_version: v1
extracted_at: 2026-06-13T16:21:41+00:00
nodeInstanceId: 019ec1ca-399e-7403-b029-5625f28ad0bd
certainty:
tags:
  - languageConcordanceFactor/discordance
  - healthOutcome/qualityOfCare
  - epistemic/effect-size
languageConcordanceFactor:
  - Limited English Proficiency (LEP)
  - Interpretation services
healthOutcome:
  - Quality of care
  - Pain management
  - Discharge comprehension
deliveryContext:
  - Surgery
  - Inpatient
---
## Supporting Evidence

> [!info] EVDs that support this claim (→ EVD—supports→CLM edges by sync_relations.py). This is a narrative-review thesis (Luan-Erfe 2023, PRISMA systematic review of 10 studies); the primary-study evidence lives in the cited primaries (Jimenez 2014; Dai 2021; Jaramillo; Lee; Malevanchik 2021; Plancarte; De Crescenzo; Greene 2019; etc.), which are not separately extracted in this corpus. No in-corpus EVD is wired here yet.

## Contradicting Evidence

> [!info] EVDs that oppose this claim (→ EVD—opposes→CLM) — perioperative outcome studies in this corpus that found no LEP/concordance disadvantage. These are single-study findings the review's own theses flag as weakened by infrequent events and underpowering.

- [[EVD - Language-concordant documentation was not significantly associated with LOS, ED revisits, readmission, or surgical follow-up after cholecystectomy - @J_2025_Pilot_study]]
- [[EVD - No significant association between interpreter need and 30- or 90-day complication rates after TSA - @Kyle_2023_Association_Between]]

## Related Claims

> [!info] CLMs this review thesis generalizes / informs (→ CLM—informs→CLM by sync_relations.py).

- [[CLM - Hospitalized patients with limited English proficiency receive less numeric pain assessment and fewer opioids than English-speaking patients]]
- [[CLM - Interpreter services are systematically under-provided relative to need for LEP patients]]
- [[CLM - Language concordance improves the quality of clinical communication relative to discordance]]

## Narrative synthesis

Luan-Erfe et al.'s PRISMA review of 10 high-quality (Newcastle–Ottawa) studies grades the body of evidence on whether LEP increases the risk of poor perioperative care and outcomes. The synthesized thesis is graded directionally: **strong** evidence that professional medical interpreter (PMI) use or a language-concordant provider improves understanding of procedural consent; the evidence **highly suggests** LEP patients have poorer postoperative pain control and poorer understanding of discharge instructions; and **some** evidence that LEP — especially when PMI services are used inconsistently — raises length of stay, complications, and worse clinical outcomes. The review repeatedly attributes residual risk to *inconsistent* PMI use rather than LEP status alone, and flags that only 4 of 10 studies validated whether patients actually used a PMI, so attribution between LEP status and unmet interpreter need is unresolved — a key reason the certainty/GRADE field is left for expert appraisal.

> "There is strong evidence that professional medical interpreter (PMI) use or having a language-concordant provider for LEP patients improves understanding of the procedural consent. The evidence also highly suggests that LEP patients are at risk of poorer postoperative pain control and poorer understanding of discharge instructions compared with English-speaking patients… There is some evidence to suggest that LEP patients, especially when PMI services are not used consistently, are at risk for increased length of stay, more complications, and worse clinical outcomes." (Luan-Erfe, 2023, p. 1096)

> "This systematic review found that LEP status and inconsistent PMI use are associated with poorer quality of care and outcomes." (Luan-Erfe, 2023, p. 1103)

The two in-corpus contradicting EVDs (concordant-documentation null after cholecystectomy; null interpreter-need–complication association after TSA) are exactly the kind of single-study null the review cautions is "limited by the relative infrequency of complications," so they are wired as contradicting to surface the tension for expert adjudication rather than as decisive refutation.
</content>
