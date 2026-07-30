---
NodeFormality: draft
NodeType: Evidence
nodeTypeId: node_huDx8FGfNSGQyongW5rk-
curationStatus: Initial AI draft
nodeInstanceId: 019fb3bb-6257-7ab8-8b9f-0d62244d5806
extraction_model: claude-opus-4-8
Source: "[[@Rishivardhan_2024_Voice-Enabled_Response]]"
EvidenceType:
tags:
  - languageConcordanceFactor/concordanceIntervention/machineTranslation
  - healthOutcome/translationAccuracy
  - healthOutcome/feasibility
  - deliveryContext/outpatient
  - deliveryContext/mHealth
  - epistemic/measurement
languageConcordanceFactor:
  - Machine translation
  - LLM voice agent
healthOutcome:
  - Translation accuracy
  - Feasibility
deliveryContext:
  - Outpatient
  - mHealth
---
## Description


![[Rishivardhan_2024_Voice-Enabled_Response-fig3.png]]
![[Rishivardhan_2024_Voice-Enabled_Response-table3.png]]
Using the on-device "Hybrid English" pipeline (Whisper's smaller base model running on the MCoPet Raspberry Pi, with Llama-2 mapping on the cloud), VERAA mapped scripted English voice responses to structured SDoH answers with a median per-question accuracy of 85% (interquartile range 80%–95%) across the 28 questions (Fig. 3; Table 3). This was lower than the 100% achieved by the Cloud English pipeline; because both used the same Llama-2 backend, the authors attribute the gap to the less accurate on-device Whisper base transcription model.

> "The median and interquartile accuracy for the MCoPet Hybrid English approach was 85% [80%-95%]. Similarly, the accuracy for the Cloud English and Cloud Spanish approaches was 100% [90%-100%] and 90% [80%-100%], respectively." (Krishnamoorthy, 2024, p. 261)

> "We observed that the transcription by Whisper's base model was inaccurate in certain instances, sometimes omitting spoken words at the end of sentences, which led to reduced accuracy for the Hybrid English compared to Cloud English approach." (Krishnamoorthy, 2024, p. 263)

## Methods Context

### What?

The observable: per-question mapping accuracy (ACC) for English responses under the on-device transcription configuration, scored against the human consensus ground truth.

> "The accuracy (ACC) for a question represents the accuracy of matching 20 English responses and 10 Spanish responses to the set of response choices for each question." (Krishnamoorthy, 2024, p. 261)

### How?

In the hybrid configuration, English audio was transcribed on the MCoPet device by Whisper's base model (74 million parameters); the resulting text files were then passed to Llama-2 70B on AWS for mapping. See [[ART - VERAA (Voice-Enabled Response Analysis Agent)]].

> "In the first experiment, a hybrid pipeline was set up where the English audio was transcribed to text using Whisper's base model (74 Million parameters) on the MCoPet device, and text files were then passed to Llama-2 70B hosted on AWS." (Krishnamoorthy, 2024, p. 261)

### Who?

The English dataset comprised 20 scripted English audio responses per question across the same 28 SDoH questions (from four All of Us surveys); no real patients were involved.

> "A panel of two English speakers and one Spanish speaker then read the generated scripts for a total of 20 English audio responses and 10 Spanish audio responses per question." (Krishnamoorthy, 2024, p. 259)

## Other Notes

This configuration demonstrates the accuracy cost of localizing transcription to a low-resource edge device: the on-device Whisper base model, constrained by the Raspberry Pi's resources, underperforms the cloud Whisper large model even though the LLM mapping step is identical.
