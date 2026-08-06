---
shortLabel: "ASR is the weak link"
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
extraction_prompt_version: v2
NodeFormality: draft
NodeType: Claim
TruthValue: 0.5
certainty:
nodeInstanceId: 019fd3c5-e9af-768a-964e-edd73706f4e8
tags:
  - languageConcordanceFactor/concordanceIntervention/machineTranslation
  - healthOutcome/translationAccuracy
  - epistemic/mechanism
languageConcordanceFactor:
  - Machine translation
  - Speech translation device
healthOutcome:
  - Translation accuracy
  - Communication quality
deliveryContext:
  - Aged care
  - Inpatient
---

## Supporting Evidence

- [[EVD - Real-time voice-to-voice translation sometimes failed to recognise words due to background noise or dialects - @Panayiotou_2020_perceptions_translation]]
- [[EVD - Patient dialects and accents degraded translation-app accuracy in aged-care wards - @Hwang_2022_Testing_use]]
- [[EVD - Google Translate was slow and difficult to use requiring repeated attempts to convey a message - @Hwang_2022_Testing_use]]
- [[EVD - S-MINDS had lower speech-recognition word error rates than three commercial systems across quiet noisy and disfluent conditions - @Soller_2012_Performance_new]]
- [[EVD - S-MINDS scored higher translation accuracy than commercial speech translation systems across sound environments - @Soller_2012_Performance_new]]
- [[EVD - Cloud-based VERAA mapped Spanish voice survey responses at 90% median accuracy, below English - @Rishivardhan_2024_Voice-Enabled_Response]]
- [[EVD - On-device VERAA mapped English voice responses at 85% median accuracy, below the cloud pipeline - @Rishivardhan_2024_Voice-Enabled_Response]]
- [[EVD - Fixed-phrase translation apps were preferred over real-time voice-to-voice apps by both older people and staff - @Panayiotou_2020_perceptions_translation]]
- [[EVD - Phrasebook apps' single translation direction prevented staff from understanding patient responses - @Hwang_2022_Testing_use]]
- [[EVD - Participants were cautious about translation accuracy and viewed apps as unsuitable for complex or important communication - @Panayiotou_2020_perceptions_translation]]

## Narrative synthesis

In voice-based translation tools the speech-recognition stage, not the translation stage, is the primary failure point: two qualitative studies independently name background noise, dialect, and accent as what breaks (Panayiotou, Hwang), and two evaluations quantify the same axis — S-MINDS had lower word error rates than commercial systems across quiet, noisy, and disfluent conditions, and VERAA's mapping accuracy fell for Spanish and for the on-device pipeline. The practical content is a design trade-off: users prefer fixed-phrase apps *because* they avoid the ASR stage, but fixed-phrase apps cannot carry the patient's reply back, leaving communication one-directional — reliability against bidirectionality.

Soller's favourable result is for the vendor's own system (S-MINDS) against commercial comparators, so treat that direction as suggestive rather than settled. Merge candidates (proposal only — do not touch): C-0212, C-0219, C-0211, C-0228.
