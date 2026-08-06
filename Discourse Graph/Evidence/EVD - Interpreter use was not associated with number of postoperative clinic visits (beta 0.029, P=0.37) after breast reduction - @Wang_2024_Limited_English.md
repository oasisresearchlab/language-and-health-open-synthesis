---
NodeFormality: draft
NodeType: Evidence
nodeTypeId: node_huDx8FGfNSGQyongW5rk-
curationStatus: Initial AI draft
nodeInstanceId: 019f8c54-3a06-77d0-ae1c-bc1e234034aa
Source: "[[@Wang_2024_Limited_English]]"
EvidenceType:
tags:
  - languageConcordanceFactor/discordance
  - healthOutcome/serviceUtilization
  - deliveryContext/plasticSurgery
  - deliveryContext/outpatient
  - epistemic/effect-size
languageConcordanceFactor:
  - Limited English proficiency
healthOutcome:
  - Postoperative clinic visits
  - Follow-up utilization
deliveryContext:
  - Breast reduction mammoplasty
  - Plastic surgery
  - Outpatient
---
## Description

![[Wang_2024_Limited_English-table3.png]]

In a multivariable Poisson regression predicting the number of postoperative office visits within 3 months, interpreter use (the proxy for LEP status) was not a significant predictor: beta coefficient 0.029 (95% CI −0.033 to 0.090, P = 0.37; Table 3). The confidence interval spans zero, so this is a null result that opposes the claim that LEP raises postoperative clinic-visit utilization. In the same model, having any complication (beta 0.435, 95% CI 0.382–0.487, P < 0.001) and increasing age (beta 0.006 per year, 95% CI 0.004–0.008, P < 0.001) were significant drivers of visit count instead.

> "LEP status was not significantly associated with the number of postoperative clinic visits (Table 3)." (Fei, 2024, p. 691)

> "Interpreter use was not significantly associated with postoperative clinic visits." (Fei, 2024, p. 689)

## Methods Context

### What?

The observable: the count of postoperative office (clinic) visits within 3 months of surgery.

> "Perioperative details of interest included number of preoperative office visits, number of postoperative office visits, number of postoperative emergency department (ED) visits within 3 mo of the surgery." (Fei, 2024, p. 690)

### How?

Multivariable Poisson regression built with a backwards model-building approach, regressing interpreter use, any complication, and age on the number of postoperative office visits; coefficients interpreted as e^beta.

> "A backwards model building approach was utilized for a Poisson regression model used to determine the association between LEP status and postoperative clinic visits adjusting for potential confounders such as age and complications." (Fei, 2024, p. 691)

### Who?

All 1023 breast-reduction patients in the analytic cohort (single urban academic center, 2015–2019).

> "Table 3 details the result of a multivariable Poisson regression in which covariates are regressed on the outcome of number of postoperative office visits within 3 mo. N = 1023." (Fei, 2024, p. 691)

## Other Notes

Interpreter use served as the proxy for LEP status (see qualifying caveat). Table 3 constant term: 0.924 (95% CI 0.850–0.998).
