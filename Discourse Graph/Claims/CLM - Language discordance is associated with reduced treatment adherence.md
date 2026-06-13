---
shortLabel: "Discordance ↓ adherence"
NodeFormality: draft
TruthValue: 0.55
NodeType: Claim
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
nodeInstanceId: 019ebef0-c4e9-75d2-a73b-a33c2aa7ef76
tags:
  - languageConcordanceFactor/discordance
  - healthOutcome/adherence
  - epistemic/effect-size
languageConcordanceFactor:
  - Limited English Proficiency (LEP)
  - Language discordance
healthOutcome:
  - Treatment adherence
deliveryContext:
  - Outpatient
  - Primary care
---
## Supporting Evidence

> [!info] EVDs that support this claim (→ EVD—supports→CLM edges by sync_relations.py). These are exposure-contrast analyses (LEP / discordant vs English-proficient) finding lower adherence or lower uptake of adherence-supporting services among LEP patients.

- [[EVD - LEP children wore hearing aids far less per day than English-proficient peers (1.30 vs 5.19 hr) - @Nicole_2024_Pediatric_Hearing]]
- [[EVD - Nearly half of LEP children wore hearing aids 15 min or less per day versus 10 percent of English-proficient children - @Nicole_2024_Pediatric_Hearing]]
- [[EVD - LEP patients had much lower odds of using any remote medication refill system than English-proficient patients - @Moreno_2016_Disparities_Use]]

## Contradicting Evidence

> [!info] EVDs that oppose this claim (→ EVD—opposes→CLM) — exposure-contrast analyses finding no LEP-vs-EP adherence difference, or that the disparity is confined to one channel rather than adherence per se.

- [[EVD - Adults with LEP were more likely to be prescribed ART than EP adults (89.7% vs 83.5%) but ART adherence did not differ - @Padilla_2021_Limited_English]]
- [[EVD - The remote-refill disparity was driven by Internet refills while telephone refill use did not differ by LEP status - @Moreno_2016_Disparities_Use]]

## Opposing Claims

> [!info] CLMs this claim opposes (→ CLM—opposes→CLM by sync_relations.py).

- [[CLM - Limited english proficiency is not necessarily associated with worse treatment adherence]]

## Other Notes

This is the **exposure-contrast** claim (LEP / language-discordant patients vs English-proficient patients), distinct from the intervention-contrast claims that *providing* concordance (concordant providers, interpreters, culturally tailored education) improves adherence. The clearest signal comes from pediatric audiology, where data-logged hearing-aid wear time was dramatically lower for LEP families (1.30 vs 5.19 hr/day) and near-nonuse was concentrated in the LEP group — a gap not explained by hearing-loss severity. Lower LEP uptake of adherence-supporting remote-refill systems points the same direction. The signal is not uniform, however: in HIV care, LEP adults were actually more likely to be prescribed ART and showed no adherence difference (Padilla), and the remote-refill gap was confined to the English-only Internet channel rather than telephone refills. Because the directional (worse-adherence) finding sits in tension with the "LEP is not necessarily worse" claim, this claim is wired as opposing it so the topology surfaces the disagreement for expert adjudication.

> "Specifically, the daily mean hearing aid wear time for the children from English-proficient families was 5.19 hr (SD = 3.98) and the mean daily wear time for the children from families with limited English proficiency was 1.30 hr (SD = 1.93)." (Brigham, 2024, p. 324)
