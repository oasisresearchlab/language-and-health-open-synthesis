---
NodeFormality: draft
NodeType: Evidence
nodeTypeId: node_huDx8FGfNSGQyongW5rk-
curationStatus: Initial AI draft
nodeInstanceId: 019f8c54-fff6-7310-a4c9-6c7d4062f33a
Source: "[[@Kapoor_2023_Impact_Need]]"
EvidenceType:
tags:
  - languageConcordanceFactor/discordance
  - healthOutcome/painIntensity
  - deliveryContext/surgery
  - epistemic/effect-size
languageConcordanceFactor:
  - Need for language assistance
  - Limited English proficiency
healthOutcome:
  - Pain intensity
deliveryContext:
  - Surgical oncology
  - Abdominal surgery
  - PACU
---
## Description

On multivariable logistic regression adjusting for age, BMI, gender, race, ASA status, platelet count, preoperative opioid use, regional anesthesia, and anxiety/depression, the need for language assistance services (LAS) was NOT an independent predictor of having an average PACU pain score of 3 or higher (p = 0.06). The point estimate indicated that patients *not* needing LAS had 40% higher odds of average PACU pain ≥3 than patients needing LAS (OR = 1.40, 95% CI 0.99–1.99) — directionally consistent with LAS-needing patients reporting less pain, but the confidence interval crossed 1 and the association was not significant.

> "After adjusting for age, BMI, gender, race, ASA physical status, platelet count, preoperative use of opioids, regional anesthesia and status of anxiety or depression in the model, the odds of having average PACU pain of 3 or higher is 40% higher for patients not needing LAS versus patients needing LAS (odds ratio (OR) = 1.40, 95%: 0.99, 1.99). The association between needed LAS and average PACU pain of 3 or higher was not significant (p = 0.06)." (Kapoor, 2023, p. 5)

**Source inconsistency (flagged):** the Discussion reverses this direction, stating the 40% increase applied to LAS-needing patients — "we observed a 40% increase in pain (≥ 3) in patients with LAS needs compared to English-speaking patients" (Kapoor, 2023, p. 5) — which contradicts the Results sentence that assigns the 40%-higher odds to patients *not* needing LAS.

## Methods Context

### What?

The observable: the binary status of average PACU pain of 3 or higher (dichotomized 0–10 verbal numeric rating scale at cutoff 3), modeled as the dependent variable.

> "A multivariable logistic regression model was fitted to estimate the effects of important covariates on the highest or average PACU pain score using 3 (mild) or 7 (severe) as the cutoff points." (Kapoor, 2023, p. 2)

### How?

Multivariable logistic regression adjusting for demographic, comorbidity, and treatment covariates, fitted on the matched cohort.

> "A multivariable logistic regression model was fitted to estimate the effects of important covariates on the status of average PACU pain of 3 or higher." (Kapoor, 2023, p. 5)

### Who?

Patients undergoing open abdominal oncologic surgery at a single academic cancer center; the multivariable model was run on the matched analysis cohort (n = 590). Multivariable analysis for pain ≥7 was not performed due to too few events.

> "Due to the limited number of patients with average PACU pain of 7 or higher, multivariable analysis was not performed." (Kapoor, 2023, p. 5)

## Other Notes

Because this adjusted categorical analysis was non-significant (CI 0.99–1.99, p = 0.06), it tempers the significant univariate median pain differences: after covariate adjustment the association between LAS need and PACU pain ≥3 did not reach significance.
