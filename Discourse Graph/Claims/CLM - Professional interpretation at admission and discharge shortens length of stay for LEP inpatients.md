---
shortLabel: "Interpretation ↓ length of stay"
NodeFormality: draft
TruthValue: 0.5
NodeType: Claim
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
extraction_prompt_version: v1
extracted_at: 2026-06-04T00:02:09-04:00
nodeInstanceId: 019e8fd6-59e4-76b1-8f29-3680d9f43922
tags:
  - languageConcordanceFactor/concordanceIntervention/interpretingServices
  - healthOutcome/lengthOfStay
  - epistemic/effect-size
languageConcordanceFactor:
  - Interpretation services
healthOutcome:
  - Hospital stay length
deliveryContext:
  - Inpatient
---
## Supporting Evidence

> [!info] EVDs that support this claim (→ EVD—supports→CLM edges by sync_relations.py).

- [[EVD - LEP inpatients without a professional interpreter on both admission and discharge had a 0.75-1.47 day longer length of stay - @Lindholm_2012_Professional_language]]
- [[EVD - Adjusted mean length of stay was 5.06 days with no interpreter vs 2.57 days with interpreters on both admission and discharge - @Lindholm_2012_Professional_language]]
- [[EVD - LEP patients described interpreter unavailability causing delays that lengthen outpatient and emergency visits - @Brooks_2016_Patient_Perspectives]]

## Contradicting Evidence

> [!info] EVDs that oppose this claim (→ EVD—opposes→CLM). Interventions that increased professional interpreter provision/access showed no significant length-of-stay effect after adjustment.

- [[EVD - Bedside interpreter telephone access had no significant effect on length of stay - @Karliner_2017_Convenient_Access]]
- [[EVD - No significant difference in length of stay between LEP patients who did and did not receive an interpreter after casemix adjustment - @Morris_2021_Factors_associated]]
- [[EVD - The interpreter-use QI bundle did not significantly change balancing measures of ED length of stay (186 min) or VRI encounter time (16.5 min) - @Martinez_2021_Improving_Equity]]
- [[EVD - Documented interpreter use was not significantly associated with LOS, ED revisits, readmission, or surgical follow-up after cholecystectomy - @J_2025_Pilot_study]]
- [[EVD - Language-concordant documentation was not significantly associated with LOS, ED revisits, readmission, or surgical follow-up after cholecystectomy - @J_2025_Pilot_study]]
- [[EVD - Process measures, length of stay, and escalation of care showed no special cause variation after the intervention - @Lauren_2024_Quality_Improvement]]

## Other Notes

Within a single LEP inpatient population, receiving a professional interpreter at admission (and especially at both admission and discharge) is associated with a significantly shorter hospital stay after adjusting for age, gender, illness severity, language, and diagnosis. Interpretation at admission appears to carry the greatest effect, consistent with the patient history accounting for most of the information needed to formulate a correct diagnosis.

**Cross-evidence triangulation (quant + qual):** the quantitative inpatient effect (Lindholm) is reinforced by qualitative patient-reported mechanism evidence — LEP patients in focus groups attributed lengthened outpatient and emergency visits directly to interpreter unavailability (Brooks). The two ground the same relationship at different settings (inpatient LOS vs visit duration) and evidence types, which is the kind of quant↔qual synthesis this graph is meant to support. (Daly's psychiatric-inpatient cohort is held separately: it compared LEP-vs-English-proficient rather than interpreter-vs-none, so it speaks to a discordance→LOS claim, not this interpretation-helps claim.)

> "Our research shows that LEP patients who did not receive professional interpretation on date of admission and discharge experienced a more lengthy hospitalization with an average of 1.5 days longer than LEP patients who received these services. Specifically, a patient's access to professional interpretation at admission seems to have had the greatest effect on LOS." (Lindholm, 2012, p. 1298)
