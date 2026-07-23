---
NodeFormality: draft
NodeType: Evidence
nodeTypeId: node_huDx8FGfNSGQyongW5rk-
curationStatus: Initial AI draft
nodeInstanceId: 019f8c56-c727-7219-a694-ca4bdc29fd53
Source: "[[@Maria_2023_Consent_document]]"
EvidenceType:
tags:
  - languageConcordanceFactor/discordance
  - healthOutcome/clinicalTrialEnrollment
  - deliveryContext/oncology
  - deliveryContext/clinicalTrial
  - epistemic/effect-size
languageConcordanceFactor:
  - Primary language other than English
healthOutcome:
  - Clinical trial enrollment
deliveryContext:
  - Oncology
  - Clinical trial
---
## Description

![[Maria_2023_Consent_document-table1.png]]

On multivariable logistic regression adjusting for age, gender, race, ethnicity, histology and study type, having a primary language other than English independently predicted lower odds of signing consent for a non-industry-sponsored study (relative to an industry-sponsored study) compared with English-primary patients: OR 0.74 (95% CI 0.63–0.94, P = 0.005) (Table 1). The association survived adjustment for potential confounders.

> "patients with a primary language other than English (OR 0.74, 95% CI 0.63 to 0.94, P = 0.005) and limited English proficiency (OR 0.74, 95% CI 0.58 to 0.95, P = 0.021) had lower odds of signing consent documents for non-industry sponsored studies than patients with English as their primary language." (Maria, 2023, p. 858)

## Methods Context

### What?

The observable: the adjusted odds that a consent event for a patient with a primary language other than English occurred in a non-industry- (vs industry-) sponsored study.

> "Multivariable analysis for patients with a primary language other than English signing consent documents" (Maria, 2023, Table 1)

### How?

Multivariable GEE logistic regression clustered by patient, adjusting for prospectively identified covariates.

> "After adjusting for age at consent, gender, race, ethnicity, histology and study type (observational versus interventional), patients with a primary language other than English (OR 0.74, 95% CI 0.63 to 0.94, P = 0.005) ... had lower odds of signing consent documents for non-industry sponsored studies." (Maria, 2023, p. 858)

### Who?

All eligible consent events at one cancer centre, 2013–2018; English-primary patients are the reference category.

> "English primary — Reference" (Maria, 2023, Table 1)

## Other Notes

A sensitivity model nesting patients within study (Extended Data Table 8) gave a consistent estimate (OR 0.79, 95% CI 0.65–0.96, P = 0.019); adding Medi-Cal status (Extended Data Table 7) gave OR 0.78 (0.63–0.98, P = 0.033).
