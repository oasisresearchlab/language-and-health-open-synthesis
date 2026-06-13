---
shortLabel: "Translation under-provided"
NodeFormality: draft
TruthValue: 0.75
NodeType: Claim
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
nodeInstanceId: 019ebef0-889d-7ce8-a5a4-50c63356cbd1
tags:
  - languageConcordanceFactor/concordanceIntervention/translatedDocuments
  - healthOutcome/translationCoverage
  - epistemic/measurement
languageConcordanceFactor:
  - Translated documents
  - Interpretation services
  - Machine translation
healthOutcome:
  - Translation coverage
deliveryContext:
  - Inpatient
  - Surgery
---
## Supporting Evidence

> [!info] EVDs that support this claim (→ EVD—supports→CLM edges by sync_relations.py). Measures and described mechanisms showing translated written materials lag behind need and are bounded to common languages and simple documents.

- [[EVD - Three-quarters of surveyed children's hospitals (74%) reported translating discharge instructions - @Davis_2019_Translating_Discharge]]
- [[EVD - Only 31% of LEP cholecystectomy patients received language-concordant documentation - @J_2025_Pilot_study]]
- [[EVD - Standardized translated document libraries and EHR templates are the main strategy but are limited to common languages and cannot be personalized - @Davis_2019_Translating_Discharge]]
- [[EVD - Hospitals rely on interpreters to act as translators despite differing training, limited to short or simple documents - @Davis_2019_Translating_Discharge]]
- [[EVD - Every institutional policy mentioning machine translation forbade using it alone, calling it inaccurate and unsafe - @Davis_2019_Translating_Discharge]]

## Contradicting Evidence

> [!info] EVDs that oppose this claim (→ EVD—opposes→CLM).

(none identified in the current corpus)

## Other Notes

Translated written materials reach fewer patients than the documents that mark legal milestones: in a survey of children's hospitals, all translate patient-rights handouts and 97% translate consent forms, but only 74% translate discharge instructions (Davis), and in a surgical cohort just 31% of LEP patients received any language-concordant paperwork (Rosenthal). Where translation does happen, three structural constraints bound its reach: standardized pretranslated libraries and EHR templates — the dominant strategy — cover only common languages (mainly Spanish) and cannot be personalized; hospitals lean on interpreters (trained for verbal work) to translate, restricting that to short or simple documents; and machine translation is near-uniformly prohibited as standalone, removing a scalable shortcut (all from Davis). Together these document both the size of the coverage gap and the mechanisms that hold it in place. These are descriptive survey, policy-content, and chart-review measures, not evaluated patient outcomes.

> "Although these approaches may improve access to standardized instructions for a few languages, they do not allow for personalization and may not benefit individuals who speak less-common non-English languages. Notably, LEP individuals in the US speak over 200 different languages." (Davis, 2019, p. 7)
