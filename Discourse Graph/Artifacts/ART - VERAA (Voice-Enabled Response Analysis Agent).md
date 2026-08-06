---
NodeFormality: draft
curationStatus: Initial AI draft
nodeTypeId: node_OULGh2SuqxP1oES9p2k_9
nodeInstanceId: 019fb3bb-63aa-7a3e-bf54-4307c0a6819a
extraction_model: claude-opus-4-8
NodeType: Artifact
aliases:
  - VERAA
  - MCoPet Conversational Agent
tags:
  - languageConcordanceFactor/concordanceIntervention/machineTranslation
languageConcordanceFactor:
  - Machine translation
  - LLM voice agent
---
## Purpose

> [!info] Why might someone use this thing?

The Voice-Enabled Response Analysis Agent (VERAA) is a multilingual, voice-based conversational agent, embedded in the bedside "My Companion Pet" (MCoPet) edge-computing device, designed to collect Social Determinants of Health (SDoH) survey data from patients — including patients with limited English proficiency (LEP) — by letting them answer survey questions aloud in their native language and converting those free-text spoken answers into structured, EHR-ready survey values without a human interviewer.

> "In this study, we have designed a multilingual conversational agent capable of conducting SDoH surveys for use in healthcare environments. The agent asks questions in the patient's native language, translates responses into English, and subsequently maps these responses via a large language model (LLM) to structured options in a SDoH survey." (Krishnamoorthy, 2024, p. 258)

## Mechanism

> [!info] How does this thing fulfill its purpose?

VERAA chains three components: (1) the device poses a survey question and records the respondent's spoken answer; (2) the audio is transcribed — and, for non-English speech, translated into English — by the Whisper automatic speech recognition model; (3) the transcribed English text is passed to a Llama-2 large language model with instructions to map the unconstrained free-text response to one of the discrete structured survey answer choices. The pipeline can run either on-device (Whisper base model on a Raspberry Pi) or in the cloud (Whisper large model on an AWS GPU instance running a 3-bit quantized Llama-2 70B).

> "The respondent's audio is then converted into text using voice-to-text transcription via the Whisper automatic speech recognition deep learning model. The transcribed text is then passed to Llama-2 with instructions to map the text to the most appropriate survey response." (Krishnamoorthy, 2024, p. 260)

> "The most distinguishing feature of MCoPet has been the incorporation of a large language model (LLM) (i.e., Llama-2 (13) ) in conjunction with a multilingual, voice-to-text transcription system (via the Whisper (14) automatic speech recognition deep learning model)." (Krishnamoorthy, 2024, p. 259)

## Example(s) of usage

> [!info] Describe at least one concrete example of this artifact in use.

In evaluation, VERAA was posed 28 SDoH questions drawn from four All of Us surveys; for each question, scripted English and Spanish spoken responses were played to the agent, which transcribed/translated them via Whisper and mapped them via Llama-2 to structured answer choices (e.g., mapping a spoken answer about home ownership to the "Own / Rent / Other arrangement" options in Table 2).

> "The survey begins with a question from the device which the respondent then answers. The respondent's audio is then converted into text using voice-to-text transcription via the Whisper automatic speech recognition deep learning model." (Krishnamoorthy, 2024, p. 260)

## Other Notes

VERAA is the LLM-mapping agent within the broader MCoPet device (a Raspberry Pi with speaker/microphone that also integrates HL7 FHIR EHR access, Fitbit wearable data, and local predictive algorithms). The method is described as extendable to 99 languages, though only English and Spanish were evaluated.
