---
NodeFormality: draft
NodeType: Artifact
nodeTypeId: node_OULGh2SuqxP1oES9p2k_9
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
nodeInstanceId: 019fb3b4-0df2-71eb-a411-c89e6b3c6b3e
aliases:
  - Google Translate
tags:
  - languageConcordanceFactor/concordanceIntervention/machineTranslation
languageConcordanceFactor:
  - Machine translation
  - Google Translate
---
## Purpose

A free, general-purpose machine translation app increasingly used as an ad-hoc communication tool in healthcare settings to bridge language barriers with LEP patients, including via voice-to-voice translation.

> "One such translation app is Google Translate, which enables translation between over 100 languages and is being increasingly investigated as a translation tool in healthcare settings." (Hwang, 2022, p. 579)

## Mechanism

Free-text (free-translation) machine translation over 100+ languages, including a voice-to-voice feature, allowing bidirectional translation of arbitrary phrases (unlike fixed-phrase phrasebook apps). Because translation is unconstrained and context-free, accuracy varies by language, accent, and audio conditions, and it is generally suited only to short or simple phrases.

> "Different to Google Translate's feature of "free-­text" phrases, other language translation tools prefer "fixed-­phrase translation"" (Hwang, 2022, p. 579)

## Example(s) of usage

Trialed on aged-care hospital wards (6 of 21 analyzed observations); its voice-to-voice feature could translate patient responses but was often slow, e.g. "Needed to ask, 'Have you had a shower yesterday' 7 tries before translation." (Observer, site 1, Google Translate).

## Other Notes

Included in the trial specifically because ward staff were already using it and similar apps on an ad-hoc, unofficial basis. Prior studies cited indicate it is only suitable for short or simple healthcare phrases, with accuracy varying across languages.

**Single canonical artifact for Google Translate across the corpus** (merged 2026-07-30 from four duplicate ART nodes created by parallel extraction agents). One real-world product, used in two distinct modalities — the specific modality is recorded in each EVD's **How?**:

- **Text / document translation** (statistical MT at the time of the older studies): translating written patient-education material (`@Khanna_2011_Performance_online`) and public-health documents in an MT-plus-postediting workflow (`@Turner_2014_comparison_human`, `@Turner_2015_Machine_Translation`); text quality of safety statements across 20 languages (`@Das_2019_Dangers_Machine`).
- **Conversation / voice mode** (neural MT): real-time spoken bedside symptom assessment in the PACU (`@Kapoor_2022_Use_Neural`); ad-hoc voice-to-voice ward use (`@Hwang_2022_Testing_use`, `@Panayiotou_2020_perceptions_translation`).
