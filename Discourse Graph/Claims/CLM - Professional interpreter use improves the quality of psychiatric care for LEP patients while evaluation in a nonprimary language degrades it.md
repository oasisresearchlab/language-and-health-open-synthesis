---
shortLabel: "Interp. ↑ psychiatric care quality"
NodeFormality: draft
TruthValue: 0.55
NodeType: Claim
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
extraction_prompt_version: v1
extracted_at: 2026-06-13T16:21:41+00:00
nodeInstanceId: 019ec1ca-399b-77fe-9b0c-d44c3d5f6925
certainty:
tags:
  - languageConcordanceFactor/concordanceIntervention/interpretingServices
  - healthOutcome/qualityOfCare
  - epistemic/mechanism
languageConcordanceFactor:
  - Interpretation services
  - Limited English Proficiency (LEP)
healthOutcome:
  - Quality of care
  - Diagnostic accuracy
deliveryContext:
  - Psychiatry
  - Inpatient
  - Outpatient
---
## Supporting Evidence

> [!info] EVDs that support this claim (→ EVD—supports→CLM edges by sync_relations.py). This is a narrative-review thesis (Bauer 2010, systematic review of 26 studies); the primary-study evidence for the generalization lives in the studies the review synthesizes (Marcos 1979; Price & Cuellar; Farooq 1997; Eytan 2002; Bischoff 2003; Drennan & Swartz 2002; etc.), which are not separately extracted in this corpus. No in-corpus EVD is wired here yet.

## Contradicting Evidence

> [!info] EVDs that oppose this claim (→ EVD—opposes→CLM). None identified in the current corpus.

## Related Claims

> [!info] CLMs this review thesis generalizes / informs (→ CLM—informs→CLM by sync_relations.py).

- [[CLM - Language concordance improves the quality of clinical communication relative to discordance]]
- [[CLM - Patients with limited english proficiency receive less accurate diagnoses]]
- [[CLM - Medical interpreters function as active co-constructors of meaning rather than neutral conduits]]

## Other Notes

Bauer & Alegría's systematic review synthesizes 26 studies and 14 empirical studies on how patients' limited English proficiency and interpreter use affect the quality of *psychiatric* care specifically — a domain where assessment hinges on self-reported symptoms rather than observable signs, so language barriers are theorized to bite harder than in general medicine. The review's synthesized generalization runs in two directions: (1) evaluating a patient in a nonprimary language (no interpreter) can produce incomplete or distorted mental-status assessment and diagnostic disagreement; and (2) use of *professional* (vs untrained/ad hoc) interpreters improves disclosure of sensitive material, referral to specialty care, and patient satisfaction. The review is explicit that the evidence base is thin and that no included study examined contemporary US psychiatric practice, so this is a directional, mechanism-level thesis rather than a quantified effect — the certainty/GRADE appraisal is left for expert review.

> "Evaluation in a patient's nonprimary language can lead to incomplete or distorted mental status assessment. Although both untrained and trained interpreters may make errors, untrained interpreters' errors may have greater clinical impact, compromising diagnostic accuracy and clinicians' detection of disordered thought or delusional content. Use of professional interpreters may improve disclosure in patient-provider communications, referral to specialty care, and patient satisfaction." (Bauer, 2010, p. 765)

> "Complementing the robust literature on medical interpreting, a small body of literature suggests that use of professional interpreters during psychiatric encounters facilitates disclosure of sensitive material and leads to greater patient satisfaction and self-understanding, thereby reinforcing the cornerstones of high-quality psychiatric care." (Bauer, 2010, p. 772)

The review also stresses the limits of its own evidence, which the human should weigh in appraisal:

> "There is insufficient evidence to determine whether quality of care is compromised and under what circumstances high-quality psychiatric care can prevail in the presence of language barriers." (Bauer, 2010, p. 772)
</content>
</invoke>
