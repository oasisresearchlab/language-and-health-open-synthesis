---
NodeFormality: draft
NodeType: Evidence
nodeTypeId: node_huDx8FGfNSGQyongW5rk-
curationStatus: Initial AI draft
nodeInstanceId: 019ebed0-d2ee-7354-89a4-883736281c45
Source: "[[@Greenky_2019_Reversed_Trend]]"
EvidenceType:
tags:
  - languageConcordanceFactor/concordanceIntervention/interpretingServices
  - healthOutcome/lengthOfStay
  - epistemic/effect-size
languageConcordanceFactor:
  - Interpretation services
  - Limited English Proficiency (LEP)
healthOutcome:
  - Hospital stay length
deliveryContext:
  - Emergency Department
---
## Description

In this large pediatric ED cohort, the model-adjusted difference in ED length of stay (LOS) between patients who requested an interpreter (treated as LEP) and those who did not was only 0.77% — about 1.2 minutes (2.59 vs 2.61 adjusted hours) — a small effect (ES < 0.2) that the authors deemed not clinically significant (Table 2). Notably the direction was reversed from prior literature: LEP/interpreter-requested patients spent slightly *less* time in the ED than English-speaking patients.

> "For ED LOS, a model-adjusted difference of 0.77% (1.2 minutes, 2.59 hours versus 2.61) was found between interpreter groups." (Greenky, 2019, p. 4)

> "Interestingly, our data suggested that non-LEP patients spent slightly more time in the ED than LEP patients. This difference was not clinically significant due to the low ES value and amounted to only a 1.2-minute difference." (Greenky, 2019, p. 6)

## Methods Context

### What?

> [!info] The observable: ED length of stay in hours, recorded per encounter from the EPIC electronic medical record and compared between interpreter-requested and no-interpreter-requested groups.
>
> "Study outcomes were change in triage acuity, ED length of stay (LOS), readmission to the ED within seven days, and hospital disposition." (Greenky, 2019, p. 2)

### How?

> [!info] Retrospective cohort study; ED LOS log-transformed and modeled with linear regression, adjusted for age at baseline, insurance status, means of arrival, and maximum acuity, then reverse-exponentiated. Cohen's d effect sizes were prioritized over p-values given the very large sample.
>
> "crude and adjusted associations between interpreter categories and the study outcomes were modeled using linear regression for ED LOS (after normality transformation)... Linear- and logistic-adjusted associations controlled for age at baseline, insurance status, means of arrival, and maximum acuity as confounders." (Greenky, 2019, p. 2)

### Who?

> [!info] All patients aged 0–18 presenting to three Children's Healthcare of Atlanta (CHOA) pediatric EDs in 2016 (152,945 patients / 232,787 encounters); excluded patients dead on arrival/died in ED and those with no language or interpreter status charted. Patients categorized LEP if an interpreter was requested during the encounter.
>
> "This was a retrospective cohort study that looked at all patients aged 0-18 years that arrived in the three CHOA EDs (Hughes Spalding Hospital, Egleston Hospital, and Scottish Rite Hospital) between January 1, 2016, and December 31, 2016." (Greenky, 2019, p. 2)

## Other Notes

The authors frame the overall null/reversed pattern as a "reversed trend" relative to earlier pediatric-ED studies and attribute it (speculatively) to the 2010 Joint Commission communication guidelines and CHOA's expanded interpreter program. The adjusted LOS comparison reached statistical significance (p=0.046, Table 2) but the effect size is trivially small, illustrating the authors' rationale for prioritizing ES over p-values in a 232,787-encounter sample.
