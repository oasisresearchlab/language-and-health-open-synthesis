---
NodeFormality: draft
NodeType: Evidence
nodeTypeId: node_huDx8FGfNSGQyongW5rk-
curationStatus: Initial AI draft
nodeInstanceId: 019f8c54-cd6c-73d0-99ff-29ce6a153bba
Source: "[[@Claire_2022_Increasing_Frequency]]"
EvidenceType:
tags:
  - languageConcordanceFactor/concordanceIntervention/interpretingServices
  - healthOutcome/lengthOfStay
  - deliveryContext/inpatient
  - deliveryContext/surgery
  - epistemic/effect-size
languageConcordanceFactor:
  - Interpreting services
healthOutcome:
  - Length of stay
deliveryContext:
  - Perioperative
  - Inpatient
  - General surgery
---
## Description

![[Claire_2022_Increasing_Frequency-table3.png]]

In the adjusted multiple linear regression, patients in the second interpreting-frequency quartile (quartile 2, 0.34–0.99 interpreting events/day) showed only a non-significant trend toward shorter peri-operative length of stay versus the lowest-frequency reference quartile 1: -1.4 days (95% CI -4.5 to 1.7, P = 0.37) (Table 3A). This is a null result — the confidence interval crosses zero — and it is the reason the paper describes the benefit as concentrated in the "highest two quartiles" rather than any increase over baseline. It is consistent with a dose/threshold effect (no detectable benefit at low interpreting frequency), but as a direct test of "more frequent interpreting → shorter LOS" at this exposure level it does not support the association.

> "LOS trended shorter for the second quartile by 1.4 d (CI -4.5 to 1.7, P = 0.37)" (de Crescenzo, 2022, p. 183)

> "Quartile 2 -1.4 (-4.5 to 1.7) 0.37" (de Crescenzo, 2022, p. 182, Table 3A)

## Methods Context

### What?

The observable: peri-operative length of stay in days, modeled as the regression outcome with interpreting-frequency quartile as the exposure of interest.

> "The primary outcome was length of stay in days and the independent variable of interest was frequency of interpreting, measured in interpreting events per day." (de Crescenzo, 2022, p. 179)

### How?

Multiple linear regression on LOS in days, adjusted for sex, age, CCI, race, insurance, language, "Needs Interpreter" label, multiple operations, first-level CPT buckets, RVU quartiles, and admission/discharge location; quartile 1 was the reference.

> "Multiple linear regression was performed on the outcome, length of stay in days. The regression was adjusted for the sex, age, CCI, race, insurance, language spoken, multiple operations, "Needs Interpreter" label, first level CPT buckets, RVU quartiles, and whether the patient was admitted and discharged from home or a facility." (de Crescenzo, 2022, p. 180)

### Who?

Peri-operative admissions in 2018 at a Boston academic medical center; 41 of 574 admissions (7.1%) were excluded from the adjusted analysis for missing data.

> "In the adjusted analysis, 41 of 574 (7.1%) of admissions were excluded for missing data; 30 (5.2%) due to missing race and 11 (1.9%) due to missing CPT code." (de Crescenzo, 2022, p. 180)

## Other Notes

Quartile 2 = "One event every 3 d to less than one event every day (0.34-0.99 interpreting events per day)." The authors note roughly half of study patients had interpreting frequency below one event daily, and argue this dilution may explain prior binary-exposure studies finding no LOS effect.
