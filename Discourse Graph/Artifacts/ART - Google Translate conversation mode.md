---
shortLabel: "Google Translate conversation mode"
NodeFormality: draft
NodeType: Artifact
nodeTypeId: node_OULGh2SuqxP1oES9p2k_9
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
extraction_prompt_version: v2
nodeInstanceId: 019fb3b2-d4e3-7a22-8b59-07cd7ac333cb
tags:
  - languageConcordanceFactor/concordanceIntervention/machineTranslation
  - deliveryContext/pacu
languageConcordanceFactor:
  - Machine translation
deliveryContext:
  - PACU
  - Perioperative
---
## Purpose

To let a clinician and a patient who do not share a language hold a spoken exchange without an on-hand human interpreter, by translating speech in real time on a consumer mobile device. In this study it is repurposed as a bedside instrument for a nurse (via a research coordinator) to ask a limited-English-proficiency (LEP) patient standardized postoperative pain and nausea questions and capture the answers.

> "Google Translate conversation mode is a multilingual neural machine translation service offering a free electronic interface available on mobile devices, instantly translating spoken words into 70 languages." (Kapoor, 2022, p. 1)

## Mechanism

A neural-machine-translation (NMT) engine runs Google Translate's "conversation" mode: it captures spoken input, transcribes and translates it, and plays the translation aloud/on-screen, alternating between the two languages so two speakers can converse turn by turn. It is free, runs on any mobile device, and covers 70 languages, so it needs no dedicated hardware or interpreter scheduling. In this study the conversation mode delivered preformatted Spanish questions to which patients replied "yes or no and gave numbers for pain and nausea ratings."

> "Preformatted questions were played for patients in the PACU through the application using an iPad tablet (Apple) held by the research coordinator (G.C., M.P.F.) at set intervals when nurses would typically evaluate symptoms." (Kapoor, 2022, p. 4)

> "Patients responded with yes or no and gave numbers for pain and nausea ratings." (Kapoor, 2022, p. 4)

## Example(s) of usage

Deployed at a single US cancer center (MD Anderson) for 30 Spanish-speaking surgical patients: patients were introduced to the application during the preoperative interview by Spanish-speaking research personnel, and in the postanesthesia care unit (PACU) an iPad running the conversation mode was used to ask five standardized pain and nausea questions at intervals when nurses would normally assess symptoms.

> "Patients were introduced to the application during the preoperative interview, with Spanish-speaking research personnel (G.C., M.P.F.) explaining study goals and how the study would be conducted in the PACU." (Kapoor, 2022, p. 4)

## Other Notes

This is the concrete system whose "How?" the outcome EVDs from this paper reference. A cited prior study (Patil et al) found the same application "suboptimal for comprehensive medical communication" but "a useful adjunct tool when human translation services were unavailable" — the tool is positioned as an adjunct for constrained symptom assessment, not a replacement for professional interpretation. The plugin's relation grammar does not yet define EVD/CLM→ART edges, so links to this artifact are wikilinks for now.
