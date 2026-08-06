---
NodeFormality: draft
curationStatus: Initial AI draft
nodeTypeId: node_Q4sxSAHaUscV3smL5OBnB
nodeInstanceId: 019fb3bb-6376-758f-8b2a-7af8a6d162a8
extraction_model: claude-opus-4-8
NodeType: Caveat
type: author-stated
severity: moderate
tags:
  - languageConcordanceFactor/concordanceIntervention/machineTranslation
---
## Source

[[@Rishivardhan_2024_Voice-Enabled_Response]]

## Limitation

The lower accuracy of the Cloud Spanish configuration relative to Cloud English was driven not by the LLM mapping step but by errors in the upstream Spanish-to-English speech transcription/translation performed by Whisper's large model. The authors observed that Spanish answer words were sometimes mistranslated — for example, "Rarely" and "Fair" (for questions O2 and O3) were rendered as "Almost never" and "Just" — which then propagated into incorrect LLM mappings. This means the machine-translation stage is a distinct source of error for non-English responses, and the reported Spanish accuracy reflects combined ASR+translation+mapping error rather than mapping alone.

## Supporting Quote

> "Similarly, we noticed that Whisper's large model on the cloud sometimes failed to accurately translate words from Spanish to English. For instance, the words "Rarely" and "Fair" that were answered in Spanish for questions O2 and O3 were incorrectly transcribed and translated to "Almost never" and "Just" leading to mispredictions by the LLM." (Krishnamoorthy, 2024, p. 263)

## Qualifies

- [[EVD - Cloud-based VERAA mapped Spanish voice survey responses at 90% median accuracy, below English - @Rishivardhan_2024_Voice-Enabled_Response]]
