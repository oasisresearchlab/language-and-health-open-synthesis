---
shortLabel: "Pro interpreter > ad hoc; mode 2nd"
NodeFormality: draft
TruthValue: 0.6
NodeType: Claim
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
extraction_prompt_version: v1
extracted_at: 2026-06-13T16:21:41+00:00
nodeInstanceId: 019ec1ca-39a0-7615-a34a-686fb8101631
certainty:
tags:
  - languageConcordanceFactor/concordanceIntervention/interpretingServices
  - healthOutcome/qualityOfCare
  - epistemic/effect-size
languageConcordanceFactor:
  - Interpretation services
  - Limited English Proficiency (LEP)
healthOutcome:
  - Quality of care
  - Patient satisfaction
deliveryContext:
  - Pediatrics
  - Inpatient
  - Emergency Department
---
## Supporting Evidence

> [!info] EVDs that support this claim (→ EVD—supports→CLM edges by sync_relations.py). This is a JBI systematic-review thesis (Boylen 2020, 6 articles from 3 RCTs + 1 observational study); the primary-study evidence lives in the cited primaries (the included Spanish-language pediatric-ED trials), which are not separately extracted in this corpus. No in-corpus EVD is wired here yet.

## Contradicting Evidence

> [!info] EVDs that oppose this claim (→ EVD—opposes→CLM). None identified in the current corpus.

## Related Claims

> [!info] CLMs this review thesis generalizes / informs (→ CLM—informs→CLM by sync_relations.py).

- [[CLM - In-person interpreting supports higher communication quality than telephone or video interpreting]]
- [[CLM - Language-concordant care improves patient satisfaction compared with interpreter-mediated or discordant care]]

## Other Notes

Boylen et al.'s JBI systematic review synthesizes 6 articles (3 RCTs and 1 observational study, all US, Spanish-speaking, mostly ED) on the impact of professional interpreters on outcomes for hospitalized LEP migrant/refugee children. Two synthesized generalizations: (1) using *any* mode of professional interpreter is superior to ad hoc or no interpreter — families reported greater satisfaction with professional than ad hoc interpreting; and (2) although in-person and video interpreting outperformed telephone on some outcomes (e.g., in-person yielded shorter ED throughput; video gave better comprehension than phone), the **mode of delivery appears to matter less than the fact that a professional interpreter is used at all**, so mode should be chosen on accessibility, availability, language, clinical context, and patient preference. The review grades its own evidence as limited (small number of studies, GRADE certainty often low/very-low, generalizability constrained to US Spanish-speaking ED settings) — the certainty/GRADE field is left for expert appraisal.

> "There is evidence that use of ad hoc interpreters or no interpreter is inferior to use of professional interpreters of any mode. Although video and in-person interpreters are more favorable for some outcomes, mode of delivery may not be as important as the fact that a professional interpreter is being used. The mode of professional interpreter delivery should be based on accessibility, availability, language requirements and patient preference." (Boylen, 2020, p. 1360)

> "Based on the findings from the review, mode of delivery may not be as important as use of a professional interpreter in itself." (Boylen, 2020, pp. 1376–1377)

This review's mode-of-delivery nuance qualifies the in-person-superiority claim: in-person/video beat telephone on specific tasks, but the review's headline synthesis is that *any* professional mode beats ad hoc/none — a relationship the human should weigh against the corpus's qualitative in-person-preference evidence.
</content>
