---
shortLabel: "LEP status ↔ LOS: mixed/null"
NodeFormality: draft
TruthValue: 0.6
NodeType: Claim
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
nodeInstanceId: 019ebee5-6ec6-7f31-84aa-09b4ceaeb1f6
tags:
  - languageConcordanceFactor/discordance
  - healthOutcome/lengthOfStay
  - epistemic/effect-size
languageConcordanceFactor:
  - Limited English Proficiency (LEP)
healthOutcome:
  - Hospital stay length
deliveryContext:
  - Inpatient
  - Emergency Department
---
## Supporting Evidence

> [!info] EVDs that support this claim (→ EVD—supports→CLM edges by sync_relations.py). These are adjusted analyses finding no significant LEP-vs-EP length-of-stay difference.

- [[EVD - No significant difference in length of stay after bariatric surgery between LEP and EP patients (adjusted IRR 0.94) - @Allan_2022_impact_English]]
- [[EVD - Median psychiatric inpatient length of stay was higher for LEP patients (12 vs 8 days) but not statistically significant - @Daly_2019_effect_limited]]
- [[EVD - No difference in ED length of stay between LEP and English-speaking patients - @Wallbrecht_2014_difference_emergency]]
- [[EVD - Adjusted ED length of stay was negligibly different (0.77%, ~1.2 min) between interpreter-requested and English-speaking pediatric patients - @Greenky_2019_Reversed_Trend]]

## Contradicting Evidence

> [!info] EVDs that oppose this claim (→ EVD—opposes→CLM) — studies finding language discordance / interpreter-need associated with *longer* stays.

- [[EVD - Interpreter use was the strongest predictor of LOS after TSA, adding 0.88 days per patient - @Kyle_2023_Association_Between]]
- [[EVD - Among LEP ED patients interpreter use was associated with significantly longer length of stay - @Wallbrecht_2014_difference_emergency]]

## Opposing Claims

> [!info] CLMs this claim opposes (→ CLM—opposes→CLM by sync_relations.py).

- [[CLM - Professional interpretation at admission and discharge shortens length of stay for LEP inpatients]]

## Narrative synthesis

This is the **exposure-contrast** claim (LEP/discordant patients vs English-proficient patients), distinct from the intervention-contrast claim that *providing* interpreters shortens stay. Across adjusted analyses the exposure signal is weak and mixed: most studies (bariatric, ED, psychiatric, pediatric ED) find no significant LEP-vs-EP difference, while two find longer stays where interpreter need marks clinical complexity (orthopedic TSA; within-LEP interpreter use). Because the no-difference finding sits in tension with the claim that interpretation meaningfully shortens LOS, this claim is wired as opposing that one — the topology surfaces the disagreement for expert adjudication rather than hiding it.
