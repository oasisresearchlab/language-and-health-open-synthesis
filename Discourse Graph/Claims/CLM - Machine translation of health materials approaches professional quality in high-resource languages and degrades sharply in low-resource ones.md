---
shortLabel: "MT quality tracks language resource"
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
extraction_prompt_version: v2
NodeFormality: draft
NodeType: Claim
TruthValue: 0.5
certainty:
nodeInstanceId: 019fd3c5-e9af-70da-850f-309143ed8156
tags:
  - languageConcordanceFactor/concordanceIntervention/machineTranslation
  - healthOutcome/translationAccuracy
  - epistemic/effect-size
languageConcordanceFactor:
  - Machine translation
  - Professional translation
healthOutcome:
  - Translation accuracy
deliveryContext:
  - Patient education
---

## Supporting Evidence

- [[EVD - Google Translate met the professional translation standard for only Spanish among 20 non-English languages - @Das_2019_Dangers_Machine]]
- [[EVD - Nearly half of non-Spanish machine-translated safety statements were deficient or minimally useful - @Das_2019_Dangers_Machine]]
- [[EVD - Machine translation was least accurate for South and Southeast Asian languages (Bengali Hindi Punjabi Vietnamese) - @Das_2019_Dangers_Machine]]
- [[EVD - Machine translation of a SACT booklet introduced 11 critical errors vs 1 and failed CIoL assessment (51 vs 73 of 100) - @Hibbs_2026_Translation_Approaches]]
- [[EVD - iTranslate matched human Spanish translators on the two simpler sentences but scored lower on the most difficult sentence - @Chen_2017_Machine_Human]]
- [[EVD - iTranslate and human Chinese translations differed only slightly with all sentences reaching excellent-to-perfect fluency - @Chen_2017_Machine_Human]]
- [[EVD - Google Translate and professional translation did not differ in adequacy (information preservation) of a Spanish warfarin brochure - @Khanna_2011_Performance_online]]
- [[EVD - Google Translate and professional translation did not differ in meaning (connotation) preservation of a Spanish warfarin brochure - @Khanna_2011_Performance_online]]
- [[EVD - Google Translate and professional translation did not differ in frequency of serious clinically impactful errors (4% vs 2%) - @Khanna_2011_Performance_online]]

## Narrative synthesis

Across five studies using three different instruments (rubric scoring, blinded sentence-level rating, CIoL assessment), machine translation of written health materials approaches professional quality for high-resource target languages (Spanish, Chinese) but degrades sharply for low-resource ones. The low-resource failure is independently confirmed on the *same language*: Das found Google Translate least accurate for South and Southeast Asian languages including Bengali, and Hibbs found a machine-translated Bengali SACT booklet introduced 11 critical errors and failed formal CIoL assessment — the one place two groups converge on a single language. Chen's Chinese fluency result is the softest evidence here (two sentences only).

Merge candidates for a human pass (proposal only — do not touch): C-0197, C-0198, C-0133, C-0201. This is drafted apart from the companion mechanism claim (*Machine translation of health text degrades readability before it degrades meaning…*), with which it shares four EVDs; collapsing the two into one conditional-quality claim is a reasonable maintainer call.
