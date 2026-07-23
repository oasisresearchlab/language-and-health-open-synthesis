---
shortLabel: "LEP → longer surgical LOS"
NodeFormality: draft
TruthValue: 0.5
NodeType: Claim
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
extraction_prompt_version: v2
nodeInstanceId: 019f8c54-7f74-7ccb-8dc3-c862add3ab54
certainty:
tags:
  - languageConcordanceFactor/discordance
  - healthOutcome/lengthOfStay
  - epistemic/effect-size
languageConcordanceFactor:
  - Limited English Proficiency (LEP)
healthOutcome:
  - Hospital stay length
deliveryContext:
  - Perioperative
  - Surgery
  - Inpatient
---
## Supporting Evidence

> [!info] EVDs that support this claim (→ EVD—supports→CLM edges by sync_relations.py). Synthesized generalization from a PRISMA systematic review (Joo/Hyundeok 2023, 14 LOS studies). Primary-study evidence lives in the cited studies (John-Baptiste 2004; MacDonald 2010; Tang 2016; Inagaki 2017; Bernstein 2020; Feeney 2019/2020; Manuel 2022; Kovoor 2023, etc.), out of scope here. **No in-corpus EVD is wired yet — flagged for the human to wire the corpus's primary-study EVDs.**

## Contradicting Evidence

> [!info] EVDs that oppose this claim (→ EVD—opposes→CLM) — the 8 of 14 studies finding no LEP–LOS association, plus a study finding shorter LOS for Spanish-speaking LEP. None wired yet.

## Narrative synthesis

The review lists surgical admission LOS among the perioperative process-of-care outcomes most consistently associated with LEP, but the underlying evidence is genuinely mixed: 5 studies found significantly prolonged total LOS in patients with LEP (CABG, craniotomy, intestinal/rectal, hip arthroplasty), 8 studies found no association, and 1 study found *shorter* total LOS for Spanish-speaking LEP after appendectomy/adhesiolysis (though longer LOS in a high-risk subcohort). The abstract frames this as "longer surgical admission length of stay in 6 of 14 studies." High heterogeneity in how LOS was defined and dichotomized limits synthesis. Certainty/GRADE appraisal is left for expert review.

> "Five studies found significantly prolonged total LOS in patients with LEP admitted for surgical procedures, including for coronary artery bypass graft, craniotomy, intestinal and rectal surgery, hip arthroplasty, and knee arthroplasty. Of these 5 studies, 1 study demonstrated mixed results depending on surgical cohorts... Eight studies found no association between LEP and total or postoperative LOS. A single study found that patients with Spanish-speaking LEP had shorter total LOS for appendectomy..." (Joo, 2023, p. 7)

> "Surgical patients with limited English proficiency were more likely to experience... longer surgical admission length of stay in 6 of 14 studies..." (Joo, 2023, p. 1)

**Reviewer note (probable-merge / tension):** overlaps with the existing corpus CLM "Language discordance (LEP status) is not consistently associated with longer hospital length of stay" — that CLM frames the exposure signal as weak/null across the broader corpus; this one captures *this review's* framing of LOS as a comparatively consistent process-of-care disparity. Human should decide whether to merge or wire as opposing/qualifying.
