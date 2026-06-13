---
shortLabel: "LEP ↔ acute use: null/lower"
NodeFormality: draft
TruthValue: 0.55
NodeType: Claim
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
nodeInstanceId: 019ebef0-75a6-72b8-bd80-1444fefe4fb2
tags:
  - languageConcordanceFactor/discordance
  - healthOutcome/edUtilization
  - epistemic/effect-size
languageConcordanceFactor:
  - Limited English Proficiency (LEP)
healthOutcome:
  - Emergency department utilization
  - Hospital admission/transfer
deliveryContext:
  - Emergency Department
  - Inpatient
---
## Supporting Evidence

> [!info] EVDs that support this claim (→ EVD—supports→CLM edges by sync_relations.py). Adjusted analyses finding no higher — or even lower — acute-care utilization for LEP/discordant patients vs English-proficient.

- [[EVD - LEP patients visited the ED less than EP patients within one year of bariatric surgery (adjusted OR 0.65) - @Allan_2022_impact_English]]
- [[EVD - Adjusted odds of hospital admission or transfer were only 6% higher for interpreter-requested pediatric patients, a reversed trend from prior gaps - @Greenky_2019_Reversed_Trend]]

## Contradicting Evidence

> [!info] EVDs that oppose this claim (→ EVD—opposes→CLM) — would be studies finding LEP/discordance associated with *higher* acute-care utilization. None of the theme's adjusted EVDs land here; the recurrence/readmission counter-evidence is carried on the readmission-specific claims rather than this acute-utilization claim.

## Opposing Claims

> [!info] CLMs this claim opposes (→ CLM—opposes→CLM by sync_relations.py).

- [[CLM - Patients with limited english proficiency have higher likelihood of recurrences]]

## Other Notes

This is the **exposure-contrast** claim for acute-care utilization (LEP/discordant vs English-proficient patients), distinct from intervention-contrast claims about *providing* interpreters. In well-resourced settings the discordance→more-use signal is absent or even reversed: LEP bariatric patients used the ED *less* than EP patients within one year (adjusted OR 0.65), and in a large pediatric-ED cohort the LEP-vs-EP gap in hospital admission/transfer was statistically significant but trivially small (adjusted OR 1.06, judged not clinically meaningful) and 7-day ED readmission was non-significant — a reversal of historically larger gaps at the same institution. The finding sits in tension with the recurrence/readmission-raises-use claim, so it is wired as opposing that one to surface the disagreement for expert adjudication.

> "However, despite more frequent ED visits by EP patients, there was no significant difference in readmission within one year; adjusted OR = 0.94 (95% CI 0.56–1.55; p = 0.50)." (Stolarski, 2022, p. 7387)
