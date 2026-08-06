---
shortLabel: "LEP → worse perioperative pain mgmt"
NodeFormality: draft
TruthValue: 0.55
NodeType: Claim
nodeTypeId: node_nMxzA_OByPwgPcmb6AN82
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
extraction_prompt_version: v2
nodeInstanceId: 019f8c54-7f87-70cb-b372-c38fe2c91bb3
certainty:
tags:
  - languageConcordanceFactor/discordance
  - healthOutcome/painManagement
  - epistemic/effect-size
languageConcordanceFactor:
  - Limited English Proficiency (LEP)
healthOutcome:
  - Pain management
deliveryContext:
  - Perioperative
  - Surgery
  - Inpatient
---
## Supporting Evidence

> [!info] EVDs that support this claim (→ EVD—supports→CLM edges by sync_relations.py). Synthesized generalization from a PRISMA systematic review (Joo/Hyundeok 2023, 2 pain-management studies). Primary-study evidence lives in the cited studies (Schwartz 2021; Kovoor 2023), out of scope here. **No in-corpus EVD is wired yet — flagged for the human to wire the corpus's primary-study EVDs.**

## Contradicting Evidence

> [!info] EVDs that oppose this claim (→ EVD—opposes→CLM). None wired yet.

## Narrative synthesis

The review flags perioperative pain management as an underexplored outcome with limited but directionally consistent data: 1 study found patients with LEP were less likely to receive a discharge opioid prescription (and, when prescribed, a lower oral morphine equivalent), and a second found LEP general-surgical patients had significantly lower median pain scores recorded during admission. The review cautions that only a small number of studies examined pain management. Certainty/GRADE appraisal is left for expert review.

> "A single study in our review evaluated the association between LEP and receipt of a discharge opioid prescription after surgical care, finding that patients with LEP were less likely to receive a discharge opioid prescription, and even if they did, the oral morphine equivalent amount was lower for patients with LEP than English proficiency. One other study found general surgical patients with LEP had significantly lower median pain scores recorded during their admission than patients with English proficiency." (Joo, 2023, p. 8)

**Reviewer note (probable-merge):** relates to existing corpus CLMs "Hospitalized patients with limited English proficiency receive less numeric pain assessment and fewer opioids than English-speaking patients" and "Children of LEP parents receive less adequate postoperative pain assessment and opioid analgesia than children of EP parents." Human to adjudicate merge vs distinct.
