---
NodeFormality: draft
NodeType: Evidence
nodeTypeId: node_huDx8FGfNSGQyongW5rk-
curationStatus: Initial AI draft
nodeInstanceId: 019f8c4c-6b9e-71df-8650-b239713221cf
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

After adjustment in a multilevel multivariable logistic regression (with a random intercept for anesthesiologist), preferred language was not significantly associated with regional anesthesia use: the odds ratio for LEP ("Other") versus English was 0.93 (95% CI, 0.52–1.67; P = .810), i.e. the confidence interval crosses 1 (Figure). In the same model, RA use was associated with age, sex, race, BMI, insurance, year of surgery, ASA class, and surgical disposition (see source inconsistency note), but not with language.

> "After adjustment, there was no significant difference in RA use among languages, OR 0.93 [95% confidence interval {CI}, 0.52–1.67, P = .810]." (Sabra, 2025, p. 995)

> "Language: Other vs English … 0.93 (0.52 to 1.67)" (Sabra, 2025, p. 995, Figure)

## Methods Context

### What?

The observable: regional anesthesia utilization, modeled as the binary dependent variable, with preferred language (English/LEP) as the exposure of interest.

> "A multilevel multivariable logistic regression was used to measure the association between preferred language (English/LEP) and RA utilization." (Sabra, 2025, p. 993)

### How?

Multilevel (mixed-effects) multivariable logistic regression with a random intercept for the treating anesthesiologist, adjusting for demographic, comorbidity, and operative covariates; odds ratios with 95% CIs reported (SAS 9.4 and R 4.3.1; P < .05 significant).

> "A random intercept was included to account for anesthesiologist correlation of anesthesia use." (Sabra, 2025, p. 993)

### Who?

The full cohort of 58,918 patients aged >18 undergoing primary elective unilateral THR/TKR at HSS (2016–2023); English speakers were 57,520 (97.6%).

> "We identified 58,918 patients undergoing a total joint arthroplasty from 2016 to 2023 with 58,211 (98.8%) underwent their procedure with RA (Table). English speakers accounted for 57,520 (97.6%)." (Sabra, 2025, p. 995)

## Other Notes

Source inconsistency: the Results text states the model showed "increased odds of RA use with … sex (female), race (Asian) … insurance (public)," but the Figure's own 95% CIs for Male-vs-Female (0.96, 0.81–1.12), Asian-vs-White (1.43, 0.72–2.81), and Medicaid/Medicare-vs-Commercial (0.81, 0.65–1.62) all cross 1 (not statistically significant). This over-reading concerns covariates, not the language exposure, which is unambiguously null.
