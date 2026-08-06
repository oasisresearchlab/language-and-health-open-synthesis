---
shortLabel: "LLMs fail relational-numeric response mapping"
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
NodeFormality: draft
NodeType: Claim
TruthValue: 0.5
certainty:
nodeInstanceId: 019fb3bb-62e5-732c-ba92-921dcbbdbf37
tags:
  - languageConcordanceFactor/concordanceIntervention/machineTranslation
  - healthOutcome/translationAccuracy
  - healthOutcome/measurementValidity
  - epistemic/measurement
languageConcordanceFactor:
  - Machine translation
  - LLM voice agent
healthOutcome:
  - Translation accuracy
  - Measurement validity
deliveryContext:
  - Outpatient
  - mHealth
---

When mapping free-text survey responses to structured answer choices, a large language model reliably fails on items that require a relational numerical comparison (matching a stated value to the correct numeric range/bin), because the model does not perform relational operations on numerical values — making numeric-range questions a systematic weak point of LLM-based response mapping.

## Supporting Evidence

- [[EVD - VERAA's LLM mapped numerical income-range responses least accurately (B1 income 70-75%) - @Rishivardhan_2024_Voice-Enabled_Response]]

## Contradicting Evidence
