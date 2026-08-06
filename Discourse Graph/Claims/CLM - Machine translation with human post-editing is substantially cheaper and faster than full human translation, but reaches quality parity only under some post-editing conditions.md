---
shortLabel: "MT+PE: economics yes, parity contested"
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
extraction_prompt_version: v2
NodeFormality: draft
NodeType: Claim
TruthValue: 0.5
certainty:
nodeInstanceId: 019fd3c5-e9af-766a-8f02-8800648891a3
tags:
  - languageConcordanceFactor/concordanceIntervention/machineTranslation
  - healthOutcome/providerTimeEffort
  - epistemic/effect-size
languageConcordanceFactor:
  - Machine translation
  - Human translation
healthOutcome:
  - Cost
  - Provider time and effort
  - Translation quality
deliveryContext:
  - Public health
---

## Supporting Evidence

- [[EVD - Machine-translation postediting was 2 to 10 times faster than human-translation postediting (11.76 vs 3.30 WPM) - @Turner_2014_comparison_human]]
- [[EVD - Human translation of public health documents cost $130 to $1220 per document while MT added no cost - @Turner_2014_comparison_human]]
- [[EVD - Human translation of public health documents took 17 hours to 6 days and up to 35 days end-to-end - @Turner_2014_comparison_human]]
- [[EVD - Posteditors corrected English-to-Chinese machine translations at about 37.8 characters per minute - @Turner_2015_Machine_Translation]]
- [[EVD - About half of interviewees saw machine translation as viable only if post-edited by a native speaker - @Turner_2015_Modeling_workflow]]
- [[EVD - Bilingual raters preferred postedited MT and HT equivalently (37 vs 36 votes) - @Turner_2014_comparison_human]]
- [[EVD - Instructions to make all necessary corrections moved MT-plus-postediting toward quality equivalence with human translation - @Turner_2015_Machine_Translation]]

## Contradicting Evidence

- [[EVD - Blinded quality raters preferred human translation over MT-plus-postediting for all 20 Chinese public-health documents - @Turner_2015_Machine_Translation]]
- [[EVD - An expert public-health translator did not close the MT-plus-postediting quality gap with human translation - @Turner_2015_Machine_Translation]]

## Narrative synthesis

Machine translation with human post-editing is consistently cheaper and faster than full human translation: post-editing ran 2–10× faster (11.76 vs 3.30 WPM), MT added no per-document cost against $130–$1,220 for human translation, and human turnaround reached up to 35 days end-to-end. Whether it reaches *quality* parity is contested and left first-class here rather than resolved: bilingual raters preferred post-edited MT and human translation equivalently and revised "make all necessary corrections" instructions moved MT toward equivalence, yet blinded raters preferred human translation for all 20 Chinese documents and an expert post-editor did not close the gap.

Crucially, support and opposition come from the *same research group* (Turner), so this is not a between-group disagreement. The candidate reconciling variables are target language (English-target materials in Turner 2014 vs Chinese in Turner 2015) and post-editing instructions — the revised-instructions EVD is the direct evidence for the latter, since changing instructions moved the result. Wiring the human-translation-turnaround EVD here also fixes a real gap: it previously had no claim link at all. Merge candidates (proposal only — do not touch): C-0214, C-0207, C-0217, C-0195, C-0196.
