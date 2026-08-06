---
shortLabel: "Process moves, outcomes do not"
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
extraction_prompt_version: v2
NodeFormality: draft
NodeType: Claim
TruthValue: 0.5
certainty:
nodeInstanceId: 019fd3c5-e9af-7c47-9cd0-8358a1c19cab
tags:
  - languageConcordanceFactor/concordanceIntervention/interpretingServices
  - healthOutcome/interpreterUtilization
  - epistemic/effect-size
languageConcordanceFactor:
  - Interpreting services
  - Multilingual chatbot
healthOutcome:
  - Interpreter utilization
  - Readmissions
deliveryContext:
  - Perioperative
  - Oncology
---

## Supporting Evidence

- [[EVD - Mobile app increased mean weekly OPI interpreter calls from 4.3 to 12.8 during intervention - @Narang_2019_Use_Mobile]]
- [[EVD - Elevated OPI interpreter-call frequency was not sustained after the intervention period - @Narang_2019_Use_Mobile]]
- [[EVD - Audio interpreter call volume rose from 2 calls (20 min) at baseline to 20 calls (257 min) in the final project month - @Linda_2023_Improving_Communication]]
- [[EVD - Video interpreter sessions rose to 29-33 per month after the wheeled-tablet introduction, where none existed before - @Linda_2023_Improving_Communication]]
- [[EVD - LEP and English-primary patients engaged equally with the multilingual chatbot (12.3 vs 12.2 responses, P=.959) - @Joshua_2023_Multilingual_Chatbot]]
- [[EVD - LEP patients enrolled in the chatbot had fewer 90-day readmissions than non-enrolled LEP controls (0% vs 8.3%) - @Joshua_2023_Multilingual_Chatbot]]
- [[EVD - Chatbot-enrolled LEP patients had a non-significant reduction in 90-day ED visits vs controls (0.9% vs 8.0%, P=.085) - @Joshua_2023_Multilingual_Chatbot]]
- [[EVD - Reoperation rates did not differ between chatbot-enrolled and non-enrolled LEP patients (0% vs 1.5%, P=1.000) - @Joshua_2023_Multilingual_Chatbot]]
- [[EVD - Documented interpreter use was not significantly associated with LOS, ED revisits, readmission, or surgical follow-up after cholecystectomy - @J_2025_Pilot_study]]
- [[EVD - Language-concordant documentation was not significantly associated with LOS, ED revisits, readmission, or surgical follow-up after cholecystectomy - @J_2025_Pilot_study]]
- [[EVD - Interpreter use was documented for only 62% of LEP cholecystectomy patients despite the Section 1557 mandate - @J_2025_Pilot_study]]
- [[EVD - Only 31% of LEP cholecystectomy patients received language-concordant documentation - @J_2025_Pilot_study]]

## Narrative synthesis

Language-technology interventions reliably move process measures — a mobile app raised weekly interpreter calls (4.3→12.8), a wheeled-tablet initiative raised audio and video interpreter volume from near-zero, and a multilingual chatbot achieved equal engagement — but patient-outcome benefits are not demonstrated and the process gains are not shown to persist. Narang is the only study that looked *after* the intervention stopped, and the elevated call frequency was not sustained. The chatbot's readmission signal (0% vs 8.3%) is confounded (historical control) and its ED/reoperation results were null; J 2025's outcome nulls sit in a setting where the intervention was barely delivered (interpreter use documented for 62%, concordant documentation for 31%), making them weak evidence of no effect rather than evidence of no effect.

Polarity flag for the maintainer: the fewer-readmissions EVD is wired here as *support* for the overall pattern, but if the claim title is read as "no outcome benefit," that EVD becomes *contradicting* evidence — this is a decision to make, not a silent call. Merge candidates (proposal only — do not touch): C-0235, C-0061, C-0062, C-0063, C-0064, C-0028, C-0048.
