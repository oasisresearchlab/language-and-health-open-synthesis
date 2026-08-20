> **Superseded — this stub is kept for provenance.** The work now lives in:
> - **[Spec B — interventions review](../docs/superpowers/specs/2026-08-18-interventions-review-design.md)** — the main question, plus prep step 1 (corpus coverage by intervention type × evidence type), which is **done**: 224-paper spine, 188 remaining to review.
> - **[Spec A1 — corpus construction](../docs/superpowers/specs/2026-08-19-corpus-construction-design.md)** — prep step 2 (systematic search protocol, external databases, repeatable ingest pipeline).
> - Prep step 3 (has anyone done a similar review?) is **not yet covered by any spec** — see the sweep below.

---

stub for planning a living synthesis around the question "What language access interventions have been implemented and what is the data on these interventions?" 

This would include the AI articles we looked at previously, though encompass additional interventions, and build on our previous work.

I think this could be modeled quite nicely after https://www.conservationevidence.com/ tbh.

I'd like to do the following in prep:
1. Get a sense of the coverage of the corpus relative to this question, broken down roughly by types of interventions, and perhaps crossed against types of evidence available. This will help with scoping effort needed.
2. I'd also like to do an initial scoping search of external DBs to get a sense of what might be out there relative to the corpus. I have a sense that we might want to develop a systematic search protocol for this against various databases, then set up some sort of repeatable pipeline to continue to ingest new articles both by search and recommendation.
3. I'd also like to do an initial scoping search of external databases or reviews to see if there have been similar reviews or living syntheses.

## update [[2026-08-19]]: 

i have found a substantial number of systematic reviews of interventions, and am motivated to a) cross-check their included studies against our existing corpus, and b) leverage what they have (e.g., the Kwan 2023 review below extracted evidence statements, but they're buried in Table 3!) and "normalize"/map it to our schema to align with the others, instead of re-extracting them, then c) use this mapping to triage what new extractions are needed to update the synthesis.

here are the ones i've found (with other-claude pubmed help):
- Kwan 2023 https://pmc.ncbi.nlm.nih.gov/articles/PMC10048935/ (focused on professional interpretation, has extracted findings in Table 3)
- van Lent 2025: https://www.sciencedirect.com/science/article/pii/S073839912500134X?via%3Dihub (v recent, basically our question, already graded RoB and GRADE and has extracted findings in Table 3) - search strategy is also shared, so we can use this to update the review: [[search strategy from van Lent 2025]]
- Artificial intelligence language technologies in multilingual healthcare: Grand challenges ahead: https://arxiv.org/pdf/2605.01441 (2026 review, focused on the NLP side, on arxiv, narrative review)

from a substantive perspective, here are notes on the frontier from the 2025 review:
- integrate quant with qual evidence (the quant evd from RCTs is scarce anyway):
	- > While this review was conducted systematically, it is important to realize that there is only limited quantitative evidence available (yet). In combination with the studies’ design, which was most often not an RCT, this led to low certainty/GRADE scores. It should be noted that we narrowed down our search to publications containing a quantitative approach because only quantitative studies could enable us to make accurate, certain statements about their effectiveness. However, only a small number of articles per comparison could be included (of which only two RCTs), and even when multiple articles were available, they generally focused on different outcomes based on observational analyses or surveys. While this may have limited the generalizability of our review, we were still able to provide new insights on different strategies (and their effectiveness), and to highlight gaps in the knowledge. However, we acknowledge that valuable insights from qualitative studies (e.g., comparing experiences of patients, providers, or informal caregivers with different strategies) could have added value. Such insights were included in previous literature reviews [7], [8], [9], [10], [13], which have mainly emphasised the benefits of professional interpreters over no or other forms of interpreters.
- "other strategies" (e.g., again, including LLM chatbots)
	- > no studies (yet) reported on some of the other existing strategies such as cultural mediators who are sometimes asked to translate [62] or handheld speech-to-speech translation devices [63], and only one study focused on AI chatbots (i.e., ChatGPT) as a digital translation tool. 
- combinations of strategies
	- > Also, no studies investigated whether combining different strategies (e.g., using digital translation tools to translate specific words that an informal interpreter may not know) could yield (more) positive results. 