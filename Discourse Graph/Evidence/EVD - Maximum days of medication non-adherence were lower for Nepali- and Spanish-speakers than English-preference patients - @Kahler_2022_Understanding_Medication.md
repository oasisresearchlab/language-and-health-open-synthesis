---
shortLabel: "Fewer missed days, non-English"
NodeFormality: draft
NodeType: Evidence
nodeTypeId: node_huDx8FGfNSGQyongW5rk-
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
extraction_prompt_version: v1
extracted_at: 2026-06-04T00:02:09-04:00
nodeInstanceId: 019e8f0e-2314-7395-a2e9-3f488b234f3e
Source: "[[@Kahler_2022_Understanding_Medication]]"
EvidenceType:
tags:
  - languageConcordanceFactor/discordance
  - healthOutcome/adherence
  - epistemic/effect-size
languageConcordanceFactor:
  - Limited English Proficiency (LEP)
healthOutcome:
  - Treatment adherence
deliveryContext:
  - Primary care
---
## Description

Maximum Days of Non-Adherence (the longest gap a patient went without their medication on hand) was significantly *lower* for Nepali- and Spanish-speakers than English-preference patients for NPH insulin, and for Nepali speakers also for metformin and ACE inhibitors — i.e., the English-preference group had the longest non-adherence gaps (Table 2).

![[Kahler_2022_Understanding_Medication-table2-p34.png]]

> "Maximum Days of Non-Adherence was significantly less for Nepali- and Spanish-speakers compared to English-preference speakers for NPH insulin. This was true for metformin and ACE-inhibitors for Nepalis compared to English preference speakers, but not for Spanish-speakers." (Kahler, 2022, p. 33)

## Methods Context

### What?

The observable: Maximum Days Non-Adherent = (total days prescribed medication) − (days supply of medication), per medication, from pharmacy refill gaps.

> "Maximum Days Nonadherence = # of total days prescribed medication − # of days supply of medication" (Kahler, 2022, p. 32)

### How?

Computed from pharmacy refill-gap data and compared across the three language groups via ANOVA / regression with adjustment for confounders (age, sex).

> "Maximum Number of Days Non-Adherent was calculated for each medication based on gaps in medication refill data collected from pharmacy medication profiles." (Kahler, 2022, p. 32)

### Who?

The same 59 type 2 diabetes primary-care patients; medication-specific subsamples (e.g., NPH insulin n=25, metformin n=32, ACE inhibitors n=21).

> "Models included data for all participants taking each type of medication." (Kahler, 2022, p. 32)

## Other Notes

Maximum Days Non-Compliant showed significant heteroskedasticity (Breusch-Pagan/Cook-Weisberg), so the authors flagged this outcome as possibly not valid for comparing language groups (see caveat).
