---
shortLabel: "Google Translate (text MT)"
NodeFormality: draft
NodeType: Artifact
nodeTypeId: node_OULGh2SuqxP1oES9p2k_9
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
extraction_prompt_version: v2
nodeInstanceId: 019fb3b4-ddb8-7b30-8b66-b289197bb761
tags:
  - languageConcordanceFactor/concordanceIntervention/machineTranslation
  - deliveryContext/publicHealth
languageConcordanceFactor:
  - Machine translation
deliveryContext:
  - Public health
---
## Purpose

To automatically translate written text from one language into another without a human translator. In this study it is used to translate English public-health promotion documents (fact sheets, agency letters, informational webpages, brochures) into Traditional Chinese, as the machine-translation (MT) stage of a machine-translation-plus-postediting (MT+PE) workflow intended to lower the time and cost of producing non-English health materials.

> "The English versions of the documents were then translated into Traditional Chinese using Google Translate." (Turner, 2015, p. 4)

## Mechanism

At the time of the study, Google Translate used a statistical machine translation (SMT) framework: it estimates the most likely translation of a source sentence from statistical models trained on large amounts of parallel text for the language pair. Its raw output is then intended to be corrected by a bilingual human posteditor. The engine is freely available and widely used, which is why the authors selected it for a low-cost public-health workflow.

> "State-of-the-art MT tools use a statistical machine translation (SMT) framework. This approach uses large amounts of parallel text for the desired language pair to train SMT models." (Turner, 2015, p. 2)

## Example(s) of usage

In this feasibility study, 25 of 60 English public-health documents were machine-translated into Traditional Chinese with Google Translate; the raw MT was then analyzed for error types and corrected by native-Chinese-speaking posteditors before blinded quality raters compared the postedited output against professional human translations.

> "For the postediting studies, we selected 25 of the 60 health documents that had been machine translated from English to Chinese using Google Translate." (Turner, 2015, p. 4)

## Other Notes

This is the concrete MT engine whose "How?" the outcome EVDs from this paper reference. It is the text-document translation service, distinct from Google Translate's spoken "conversation mode" (see [[ART - Google Translate conversation mode]]). The authors flag the use of a single engine as a limitation but argue that most SMT systems share underlying statistical models, so error types would likely be similar across engines. The plugin's relation grammar does not yet define EVD/CLM→ART edges, so links to this artifact are wikilinks for now.
