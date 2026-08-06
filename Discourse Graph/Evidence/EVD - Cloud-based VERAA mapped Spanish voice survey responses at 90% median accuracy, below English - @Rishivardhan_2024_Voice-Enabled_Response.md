---
NodeFormality: draft
NodeType: Evidence
nodeTypeId: node_huDx8FGfNSGQyongW5rk-
curationStatus: Initial AI draft
nodeInstanceId: 019fb3bb-6227-7f6b-ba09-f06b309d9219
extraction_model: claude-opus-4-8
Source: "[[@Rishivardhan_2024_Voice-Enabled_Response]]"
EvidenceType:
tags:
  - languageConcordanceFactor/concordanceIntervention/machineTranslation
  - healthOutcome/translationAccuracy
  - healthOutcome/dataEquity
  - deliveryContext/outpatient
  - deliveryContext/mHealth
  - epistemic/measurement
languageConcordanceFactor:
  - Machine translation
  - LLM voice agent
healthOutcome:
  - Translation accuracy
  - Data equity
deliveryContext:
  - Outpatient
  - mHealth
---
## Description


![[Rishivardhan_2024_Voice-Enabled_Response-fig3.png]]
![[Rishivardhan_2024_Voice-Enabled_Response-table3.png]]
Using the cloud-based pipeline, VERAA mapped scripted Spanish voice responses (translated to English by Whisper's large model, then mapped by Llama-2 70B) to the correct structured SDoH answer choices with a median per-question accuracy of 90% (interquartile range 80%–100%) across the 28 questions (Fig. 3; Table 3). Spanish accuracy was lower than the 100% observed for the same cloud pipeline on English responses, which the authors attribute to Spanish-to-English transcription/translation errors.

> "The median and interquartile accuracy for the MCoPet Hybrid English approach was 85% [80%-95%]. Similarly, the accuracy for the Cloud English and Cloud Spanish approaches was 100% [90%-100%] and 90% [80%-100%], respectively." (Krishnamoorthy, 2024, p. 261)

> "These factors contributed to reducing the accuracy of the Cloud Spanish approach as opposed to the Cloud English approach." (Krishnamoorthy, 2024, p. 263)

## Methods Context

### What?

The observable: per-question mapping accuracy (ACC) for Spanish responses — the proportion of spoken Spanish answers correctly matched to the discrete survey answer choices, scored against the human consensus ground truth.

> "The accuracy (ACC) for a question represents the accuracy of matching 20 English responses and 10 Spanish responses to the set of response choices for each question." (Krishnamoorthy, 2024, p. 261)

### How?

Scripted Spanish audio responses were transcribed and translated to English by Whisper's large model on AWS, then mapped to structured answers by Llama-2 70B; accuracy was scored against the reviewer consensus ground truth. See [[ART - VERAA (Voice-Enabled Response Analysis Agent)]].

> "In the second and third experiments, the English and Spanish audio files were passed to the AWS instance where Whisper's large model (1.550 Billion parameters) was used to produce audio transcription that Llama-2 70B used for inference." (Krishnamoorthy, 2024, p. 261)

### Who?

The Spanish dataset comprised 10 scripted Spanish audio responses per question across the same 28 SDoH questions (from four All of Us surveys), read by one Spanish speaker; no real patients were involved.

> "A panel of two English speakers and one Spanish speaker then read the generated scripts for a total of 20 English audio responses and 10 Spanish audio responses per question." (Krishnamoorthy, 2024, p. 259)

## Other Notes

This is the only non-English configuration evaluated. The Spanish accuracy loss relative to English is qualified by a caveat on translation errors (e.g., "Rarely"/"Fair" mistranslated), and the evaluation used scripted rather than spontaneous patient speech.
