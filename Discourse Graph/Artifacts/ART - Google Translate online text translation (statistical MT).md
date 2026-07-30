---
shortLabel: "Google Translate text translation"
NodeFormality: draft
NodeType: Artifact
nodeTypeId: node_OULGh2SuqxP1oES9p2k_9
curationStatus: Initial AI draft
extraction_model: claude-opus-4-8
nodeInstanceId: 019fb3b3-de11-79ae-9202-1c2ba734b5b5
tags:
  - languageConcordanceFactor/concordanceIntervention/machineTranslation
  - languageConcordanceFactor/concordanceIntervention/translatedDocuments
  - deliveryContext/patientEducation
languageConcordanceFactor:
  - Machine translation
deliveryContext:
  - Patient education
---
## Purpose

To let clinicians translate written patient-educational material into a patient's language without a professional human translator, by pasting text or a document into a free, ubiquitous web-based machine-translation engine. In this study Google Translate's website is used to render an English warfarin-education brochure into Spanish so its accuracy can be compared to a professional translation.

> "We selected Google Translate™ (GT) since it is one of the more commonly used online translation tools and because Google™ is the most widely used search engine in the United States." (Khanna, 2011, p. 520)

> "Online translation tools such as GoogleTranslate™ (available at http://translate.google.com/#) and Babelfish™ (available at http://babelfish.yahoo.com), a subset of machine translation technology, may help supplement professional in-person interpretation and formal written translations in that they are ubiquitous, inexpensive, and increasingly well-known and easy to use." (Khanna, 2011, p. 519)

## Mechanism

At the time of this study Google Translate used a statistical machine-translation engine: it recognized each sentence, compared its words and phrases against a large corpus of professionally translated bilingual documents, and assembled the target-language output from the most statistically equivalent word/phrase matches. Because it works sentence-by-sentence off a statistical corpus (not hand-written grammar rules), it is free, instant, and covers many languages, but its grammatical fluency and error profile depend on how well the domain matches its training corpus.

> "GT uses statistical translation methodology to convert text, documents, and websites between languages. Statistical translation involves the following three steps. First, the translation program recognizes a sentence to translate. Second, it compares the words and phrases within that sentence to the billions of words in its library (drawn from bilingual professionally translated documents, such as United Nations proceedings). Third, it uses this comparison to generate a translation combining the words and phrases deemed most equivalent between the source sentence and the target language." (Khanna, 2011, p. 520)

## Example(s) of usage

The AHRQ English warfarin-use instruction manual (written at a 6th-grade reading level) was translated into Spanish in a single pass through the Google Translate website, and the resulting Spanish output was captured as text for sentence-by-sentence evaluation against an independently produced professional Spanish translation.

> "We downloaded the English document on October 19, 2009 and used the GT website to translate it en bloc." (Khanna, 2011, p. 520)

## Other Notes

This is the concrete system whose "How?" the Khanna 2011 outcome EVDs reference. It is distinct from [[ART - Google Translate conversation mode]] (a later spoken/speech-to-speech neural-MT mode); here GT is used for written document/text translation via its website, using the earlier statistical (pre-neural) engine. The plugin's relation grammar does not yet define EVD/CLM→ART edges, so links to this artifact are wikilinks for now.
