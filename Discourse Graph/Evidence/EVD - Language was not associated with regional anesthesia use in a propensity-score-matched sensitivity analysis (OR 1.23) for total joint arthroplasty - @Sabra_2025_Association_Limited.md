---
NodeFormality: draft
NodeType: Evidence
nodeTypeId: node_huDx8FGfNSGQyongW5rk-
curationStatus: Initial AI draft
nodeInstanceId: 019f8c4c-6ba1-71fb-83ca-4b7f754f10ca
Source: "[[@Sabra_2025_Association_Limited]]"
EvidenceType:
tags:
  - languageConcordanceFactor/discordance
  - healthOutcome/regionalAnesthesiaUtilization
  - deliveryContext/arthroplasty
  - deliveryContext/anesthesia
  - epistemic/effect-size
languageConcordanceFactor:
  - Language discordance
  - Limited English proficiency
healthOutcome:
  - Regional anesthesia utilization
deliveryContext:
  - Arthroplasty
  - Anesthesia
  - Perioperative
  - Single-institution
---
## Description

In a sensitivity analysis using 1:1 propensity-score matching (1,010 patients matched on age, sex, race, ethnicity, insurance, procedure type, ASA, BMI, surgical year, and surgery patient class), preferred language remained non-significantly associated with regional anesthesia use: OR 1.23 (95% CI, 0.51–2.97; P = .6537), with the CI crossing 1. Covariate balance was achieved on all matched variables (standardized differences). This corroborates the primary multivariable null.

> "In our sensitivity analysis using propensity score matching, we successfully matched 1010 patients according to baseline characteristics. Covariate balance was assessed using standardized differences and met for all variables. There was no significant difference in RA use among language (English/LEP) using a logistic regression model (OR, 1.23 [95% CI, 0.51–2.97, P = .6537])." (Sabra, 2025, p. 995)

## Methods Context

### What?

The observable: regional anesthesia utilization by preferred language (English/LEP), re-estimated in a propensity-matched cohort as a robustness check on the primary model.

> "We calculated propensity scores for RA use with covariates of age, sex, race, ethnicity, insurance, procedure type, ASA level, BMI, surgical year, and surgery patient class." (Sabra, 2025, p. 993)

### How?

Propensity-score matching at a 1:1 ratio using nearest-neighbor matching, with standardized differences to assess balance, followed by a logistic regression model on the matched sample.

> "Patients were matched using nearest-neighbor matching at a 1:1 ratio. Standardized differences were used to assess balance between groups. After matching, a logistic regression model was run to measure the association between LEP and RA use." (Sabra, 2025, p. 993, spanning pp. 993–995)

### Who?

1,010 propensity-matched THR/TKR patients drawn from the full HSS 2016–2023 cohort of 58,918.

> "In our sensitivity analysis using propensity score matching, we successfully matched 1010 patients according to baseline characteristics." (Sabra, 2025, p. 995)

## Other Notes

Directionally the matched OR (1.23) points opposite to the unmatched adjusted OR (0.93), but both are non-significant with wide CIs — consistent with no detectable language effect and limited precision (see power/ceiling caveats).
