---
NodeFormality: draft
NodeType: Evidence
nodeTypeId: node_huDx8FGfNSGQyongW5rk-
curationStatus: Initial AI draft
nodeInstanceId: 019f8c55-2a1e-7d4b-9c40-491f9ab9f3b1
Source: "[[@Nguyen_2023_Language_Barriers]]"
EvidenceType:
tags:
  - languageConcordanceFactor/discordance
  - healthOutcome/accessToCare
  - healthOutcome/painManagement
  - deliveryContext/surgery
  - epistemic/effect-size
languageConcordanceFactor:
  - Limited English proficiency
healthOutcome:
  - Postoperative medication access
  - Opioid prescription refill
deliveryContext:
  - Total knee arthroplasty
  - Orthopedics
  - Post-discharge
---
## Description

![[Nguyen_2023_Language_Barriers-table3.png]]

On multivariable logistic regression adjusting for age, gender, BMI, ASA rating, median household income, insurance type, length of hospitalization, prior opioid use, 1-h postoperative pain, and discharge disposition, LEP status was independently associated with lower odds of requesting an opioid prescription refill within 0–30 days of discharge (OR 0.61, 95% CI 0.41–0.92, p = 0.019) (Table 3). The association held even after removing the influence of confounders including pain level and prior opioid use. (Race/ethnicity was excluded from the model due to collinearity with LEP status.)

> "In multivariate logistic regression models, being classified as LEP was significantly associated with lower odds of requesting an opioid prescription refill 0–30 days after discharge (OR: 0.61, CI: 0.41–0.92, p = 0.019)." (Nguyen et al., 2022, p. 3)

## Methods Context

### What?

The observable: opioid pain-medication refill requests recorded in the EHR within 0–30 days of discharge, modeled as the binary dependent variable.

> "Primary outcome variables included opioid pain medication refill requests between 0 and 30 days, 0–60 days, and 0–90 days from discharge after TKA." (Nguyen et al., 2022, p. 2)

### How?

Multivariable logistic regression with a priori covariates chosen from prior TKA literature; race/ethnicity was excluded for collinearity with LEP.

> "Multivariable logistic regression modeling was performed to calculate the odds ratio of opioid refill requests 0–30 days after discharge. Covariates, chosen a priori based on prior TKA literature and availability in the dataset, included age, gender, BMI, ASA rating, median income based on residential zip code, insurance type, length of hospitalization, history of preoperative opioid use, 1-h postoperative pain scores, and discharge disposition." (Nguyen et al., 2022, p. 2)

### Who?

2148 adults (≥18 years) who underwent TKA at a single academic medical center between 2015 and 2019; 9.8% (211) were classified as LEP, defined by non-English primary language plus a request for interpreter services.

> "The primary predictor variable in this analysis was English proficiency status, where LEP was defined as self-reporting a non-English primary language and requesting interpreter services at the time of admission." (Nguyen et al., 2022, p. 2)

## Other Notes

Other independent predictors in the same model: Medicare insurance (OR 0.62) and longer hospitalization (OR 0.91) lowered refill odds, while prior opioid use (OR 1.40) and home discharge (OR 3.20) raised them (Table 3).
