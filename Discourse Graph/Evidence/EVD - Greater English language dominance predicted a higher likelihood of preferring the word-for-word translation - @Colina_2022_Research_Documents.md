---
NodeFormality: draft
NodeType: Evidence
nodeTypeId: node_huDx8FGfNSGQyongW5rk-
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
nodeInstanceId: 019fb3ba-34af-7e3b-bb5f-f44b361bb042
Source: "[[@Colina_2022_Research_Documents]]"
EvidenceType:
tags:
  - languageConcordanceFactor/concordanceIntervention/translatedDocuments
  - healthOutcome/patientPreference
  - deliveryContext/humanSubjectsResearch
  - epistemic/effect-size
languageConcordanceFactor:
  - Translated documents
  - Functionalist translation
  - Literal translation
healthOutcome:
  - Patient preference
deliveryContext:
  - Human subjects research
  - Survey instrument
---
## Description


![[Colina_2022_Research_Documents-table1.png]]
A logistic regression relating language dominance (Bilingual Language Profile score) to translation choice showed that more Spanish-dominant participants were more likely to choose the functionalist translation B, while more English-dominant participants were more likely to choose the word-for-word translation A. For every 10-point shift toward English dominance, a participant was almost twice as likely (odds ratio 1.76) to choose the word-by-word translation, though this trend fell just short of significance (p = 0.058). Balanced bilinguals (BLP score 0) had a slight, non-significant lean toward the functionalist translation (p = 0.067) (Table 1).

> "Our results showed that participants with higher Spanish dominance were more likely to choose a functionalist translation (translation B) over the word-for-word translation (translation A)." (Colina, 2022, p. 33)

> "a participant is almost twice (1.76 times, p = 0.058) as likely to choose a word-by-word translation over a functional translation." (Colina, 2022, p. 34)

> "It is notable that participants considered as balanced bilinguals (with a BLP score of 0) had a slight but not statistically significant preference for the functionalist translation (p = 0.067)." (Colina, 2022, p. 34)

## Methods Context

### What?

The observable: the modeled probability that a participant chose translation B (functionalist) over A (word-for-word), as a function of the participant's language-dominance score.

> "A logistic regression analysis was conducted to explore the likelihood of choosing translation B (with its functionalist approach) over A (with its word-for-word approach) based on language dominance (see table 1)." (Colina, 2022, p. 33)

### How?

Language dominance was scored with the Bilingual Language Profile (BLP); a logistic regression (R glm package) modeled binary translation preference (A coded 1, B coded 0) on the BLP score.

> "The BLP assigns points to questions related to language background and language use to obtain a total score on a numerical continuum of language dominance, ranging from -218 to +218." (Colina, 2022, p. 32)

> "the logistical regression was run using the glm package." (Colina, 2022, p. 33)

### Who?

The 20 bilingual adults, whose BLP scores ranged from -106 (most Spanish-dominant) to +138 (most English-dominant); 11 were Spanish-dominant, 1 balanced, and 8 English-dominant.

> "For 11 participants, their dominant language was Spanish. One participant was fairly evenly bilingual (a fairly "balanced bilingual"), and 8 were English dominant." (Colina, 2022, p. 32)

## Other Notes

Table 1 (the logistic regression) is in the online Supporting Information, not the article body. The direction is the interpretively important part: the readers closest to a true limited-English-proficiency profile (Spanish-dominant) leaned toward the functionalist translation. The effect is a non-significant trend (p = 0.058) in a 20-person sample.
