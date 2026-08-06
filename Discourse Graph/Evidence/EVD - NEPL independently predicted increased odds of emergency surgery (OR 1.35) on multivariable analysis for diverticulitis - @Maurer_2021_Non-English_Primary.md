---
NodeFormality: draft
NodeType: Evidence
nodeTypeId: node_huDx8FGfNSGQyongW5rk-
curationStatus: Initial AI draft
nodeInstanceId: 019f8c54-51c1-7995-8b99-f552e370ef16
Source: "[[@Maurer_2021_Non-English_Primary]]"
EvidenceType:
tags:
  - languageConcordanceFactor/discordance
  - healthOutcome/emergencySurgery
  - deliveryContext/colorectalSurgery
  - deliveryContext/inpatient
  - epistemic/effect-size
languageConcordanceFactor:
  - Non-English primary language
  - Limited English proficiency
healthOutcome:
  - Emergency vs elective surgery
  - Access to elective surgery
deliveryContext:
  - Diverticulitis surgery
  - Colorectal surgery
  - Inpatient
---
## Description

![[Maurer_2021_Non-English_Primary-table3.png]]

On multivariable logistic regression controlling for age, sex, data year, payer, income quartile, and Charlson Comorbidity Index, non-English primary language (NEPL) was an independent predictor of increased odds of emergency versus elective surgery for diverticulitis, with an odds ratio of 1.35 (95% CI 1.13–1.62) relative to English primary language (EPL) — about a one-third higher odds (Table 3). The models were not adjusted for race/ethnicity because of collinearity with primary language.

The paper is internally inconsistent on the P value for this estimate: the abstract and Table 3 report P = 0.001, whereas the Results text reports P < 0.001.

> "In multivariable analyses controlling for age, sex, data year, payer, income quartile, and CCI, NEPL was associated with increased odds of emergency surgery for diverticulitis (OR 1.35; 95% Confidence Interval [CI] 1.13-1.62; P <0.001; Table 3) compared to patients with EPL." (Maurer, 2021, p. 645)

> "On multivariable analysis, compared to patients with EPL, NEPL was associated with increased odds of emergency surgery for diverticulitis (OR 1.35; 95% Confidence Interval 1.13-1.62; P = 0.001)" (Maurer, 2021, p. 644)

## Methods Context

### What?

The observable: surgical admission type (emergency = urgent/emergent versus elective) as the binary dependent variable in the logistic regression.

> "Logistic regression analysis was performed with the dependent variable of emergency versus elective surgical admission." (Maurer, 2021, p. 645)

### How?

Multivariable logistic regression with NEPL status as the independent variable of interest and EPL as the reference group; covariates entered the multivariable model if univariate P < 0.20, and models were adjusted for age, sex, insurance, income quartile, data year, and CCI but not race/ethnicity (collinear with language).

> "The independent variable of interest was NEPL status, and the reference group for this analysis were patients with EPL. All models were controlled for age, sex, insurance status, median household income quartile, data year, and Charlson Comorbidity Index (CCI)18 in multivariable regression models." (Maurer, 2021, p. 645)

### Who?

Adult (≥18) partial-colon-resection-for-diverticulitis patients with primary-language data in the 2009-2014 New Jersey State Inpatient Database; the analytic cohort was 9,453 patients, of whom 592 (6.3%) had NEPL.

> "A total of 9,453 patients underwent surgery for diverticulitis, of which 592 (6.3%) had NEPL." (Maurer, 2021, p. 643)

## Other Notes

This is the paper's headline finding. The 95% CI (1.13–1.62) excludes 1, indicating a statistically significant association. Table 3 lists other independent predictors of emergency surgery including Medicaid (OR 1.93), self-pay (OR 3.83), oldest age band (85–90: OR 4.23), higher CCI, and lowest income quartile (OR 1.46).
