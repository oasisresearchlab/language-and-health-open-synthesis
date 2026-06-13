---
NodeFormality: draft
NodeType: Evidence
nodeTypeId: node_huDx8FGfNSGQyongW5rk-
curationStatus: Initial AI draft
nodeInstanceId: 019ebed2-7f79-7586-942b-7d6631e93686
Source: "[[@Karliner_2017_Convenient_Access]]"
EvidenceType:
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
## Description


> ![[Karliner_2017_Convenient_Access-table3.png]]
> ![[Karliner_2017_Convenient_Access-table4.png]]
>
The bedside interpreter telephone intervention had no significant impact on length of stay (LOS) for LEP patients. Unadjusted median LOS was essentially unchanged across the three study periods and did not differ between LEP and EP groups (e.g., LEP intervention median 3.86 days vs EP 3.81; Table 3). In adjusted analyses the period-by-language interaction for LOS was not significant (P=0.818), and the LEP-vs-EP factor-change estimate during intervention was 1.01 (95% CI 0.92–1.10) (Table 4).

> "There was no signiﬁcant impact of the bedside intervention on LOS. The unadjusted median LOS did not differ between LEP and EP groups over the 3 study time periods (Table 3). In adjusted analyses, the effect of intervention intensity on LOS was not signiﬁcantly modiﬁed by patient language (P = 0.818 for test of interaction) (Table 4)." (Karliner, 2017, p. 203)

> "There was no signiﬁcant intervention impact on length of stay in either unadjusted or adjusted analyses." (Karliner, 2017, p. 199)

## Methods Context

### What?

> [!info] The observable: length of stay in days, derived from admission and discharge date/time in the administrative billing database; log-transformed for modeling.
>
> "We deﬁned LOS using the admission and discharge date and time from the administrative billing database. After log-transformation, the LOS outcome was approximately normally distributed ... and was modeled using linear regression." (Karliner, 2017, p. 201)

### How?

> [!info] Natural experiment / quasi-experimental pre–intervention–post design; linear regression on logged LOS with study period, language group, and period-by-language interaction plus covariates (age, sex, insurance, calendar month, principal diagnosis, SOI, ICU stay), fit with GEE; EP group as nonequivalent control.
>
> "Linear (for logged LOS) and logistic (for 30-day readmission) models regressed the outcome onto a categorical indicator of the study periods, patient language group, and the period-by-language interaction, as well as covariates ... All models were ﬁt using generalized estimating equations with exchangeable correlation structure to accommodate repeated hospital stays for individual patients." (Karliner, 2017, p. 201)

### Who?

> [!info] Discharges of patients aged 50 years or older from the 2-unit Medicine floor of an academic medical center, Jan 15 2007–Jan 15 2010; 8077 discharges (1963 LEP, 6114 EP) after exclusions of top-1% LOS, planned chemo/radiation, and missing/unknown language.
>
> "there were 8077 discharges included for patients age 50 years or above (range, 50–108), 1963 (24.3%) for LEP and 6114 for EP patients." (Karliner, 2017, p. 201)

## Other Notes

The authors interpret the LOS null as consistent with mixed prior findings, reasoning that better communication can both shorten LOS (faster diagnosis) and lengthen it (fuller history-taking, discharge preparation), with the net effect near zero.
