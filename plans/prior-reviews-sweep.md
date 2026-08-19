# Prior reviews sweep — has anyone done this already?

*2026-08-19 · initial sweep, not exhaustive. Answers the prep step common to both original stubs.*

**Headline: the questions have been reviewed repeatedly, but nobody is running a *living*
synthesis, and nothing is indexed by intervention.** The differentiator is the form, not the
question.

## What exists

### Closest to Spec B (interventions)

- **Effectiveness of interpreters and other strategies for mitigating language barriers: a
  systematic review** (2025) — PROSPERO **469785**.
  [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S073839912500134X).
  **The largest overlap with B.** Recent, intervention-framed, registered. **Must be read in full
  before A1/A2 scope is fixed.**
- **Hospital and Health System–Level Interventions to Improve Care for Limited English
  Proficiency Patients: a systematic review** — *Jt Comm J Qual Patient Saf*.
  [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S1553725018305488).
  Intervention-indexed but scoped to system level only.

### Closest to Spec A2 (coverage / evidence map)

- **Patient-Provider Language Concordance and Health Outcomes: A Systematic Review, Evidence Map,
  and Research Agenda** (2019) — [PMID 31291823](https://pubmed.ncbi.nlm.nih.gov/31291823/).
  **The largest overlap with A2** — it is literally an evidence map with a research agenda.
  **Must be read in full.**
- Scoping Review: Definitions and Outcomes of Patient-Provider Language Concordance in Health (2020).
- Physician–Patient Language Discordance and Poor Health Outcomes: a systematic scoping review —
  [Frontiers in Public Health, 2021](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2021.629041/full).

### Broad and long-standing

- Karliner et al., **Do professional interpreters improve clinical care for patients with LEP?**
  [PMID 17362215](https://pubmed.ncbi.nlm.nih.gov/17362215/) — the field's classic.
- Diamond et al., **Impact of Patient–Physician Non-English Language Concordance on Quality of
  Care and Outcomes**, *JGIM* — [PMID 31147980](https://pubmed.ncbi.nlm.nih.gov/31147980/).

### Segment-specific (many)

Hospitalised children of migrant/refugee families (PROSPERO CRD42017058161); palliative care /
end of life; psychiatric care; stroke; occupational therapy; nurses' experiences with
interpreters (qualitative); professional interpreting in secondary care (2025); LEP and
healthcare access in the US (2024).

## What does not exist

- **No living review or living evidence database** in this domain. Every review found is a static,
  point-in-time snapshot.
- **No intervention-indexed database** in the Conservation Evidence sense — an entry per
  intervention with the evidence and its strength attached.
- **Little coverage of AI-assisted translation.** The major reviews cluster in 2019–2021,
  predating LLM-based translation. That is a genuine and defensible gap.

## What this means for the specs

The pitch is **not** "nobody has looked at this." It is:

1. **Living rather than static** — the reviews above are already ageing, and the AI-translation
   literature is moving fastest of all.
2. **Intervention-indexed rather than question-indexed** — every existing review answers one
   question; none is browsable by intervention.
3. **Node-level rather than paper-level** — verbatim-grounded evidence nodes with per-claim
   appraisal, not a narrative summary.
4. **Covers AI-assisted translation**, which predates almost none of the existing corpus.

## Required before A1/A2 scope is fixed

- [ ] Obtain and read **PROSPERO 469785** (2025 interpreter-effectiveness review) in full.
- [ ] Obtain and read the **2019 Evidence Map + Research Agenda** in full — its research agenda
      may already name the gaps A2 intends to find, which would be either a strong citation or a
      scoping problem.
- [ ] Search **PROSPERO, Epistemonikos and Campbell directly** — this sweep was web search only
      and will have missed registered-but-unpublished protocols.

## Limitations of this sweep

Web search only. PROSPERO, Epistemonikos, the Campbell Library and the Living Evidence Network
were **not** searched directly. Grey literature and non-English reviews were not covered. Treat
this as a first pass establishing that the space is crowded, not as a systematic search.

---

# Follow-up: how well is AI-assisted translation actually covered?

*2026-08-19 · second pass, testing the differentiator claim above.*

The claim "little coverage of AI-assisted translation" was the thinnest-evidenced part of the
sweep and the one carrying the most weight. Tested two ways.

## Inside our own corpus

Of the 43 family-B (translation of text/speech) papers, exactly **one** is a review — and it is
*Implications of Language Barriers for Healthcare: A Systematic Review* (Oman Medical Journal,
2020), a general language-barriers review, not a translation-technology one. So there is no prior
review of AI-assisted translation *inside* our corpus.

**But the corpus has a hole in exactly this area.** Family B by year runs 2010→2024 and then
stops:

| | |
|---|---|
| Corpus papers dated 2025 or later | **55** |
| …of those, in the intervention spine | **4** |
| …of those, in family B (translation tech) | **0** |

The corpus is not stale overall — it carries 37 papers from 2025 and 18 from 2026. But its recent
acquisitions are almost entirely non-intervention work, and **none** is translation technology.
Our AI-translation evidence base ends at 2024.

## Outside it

No systematic review addresses **AI/machine translation for patient language access**
specifically. The 2024–2026 review literature sits one abstraction level up, on LLMs in clinical
medicine broadly:

- *A systematic review of LLM evaluations in clinical medicine* — BMC Med Inform Decis Mak, 2025
- *LLM-assisted systematic review of large language models in clinical medicine* — Nature
  Medicine, 2026
- *Large language models in real-world clinical workflows* — Frontiers in Digital Health, 2025
- *Large language models for clinical artificial intelligence in healthcare* — Discover AI, 2026

Translation-specific work surfaces as **method** papers (e.g. MedCOD, English-to-Spanish medical
translation, arXiv 2509.00934), not reviews.

## Independent corroboration of our scarcity finding

The Nature Medicine review counted **4,609** peer-reviewed LLM-in-medicine studies between
January 2022 and September 2025 — about 3.2 per day — of which only **1,048** used real-world
patient data and only **19** were prospective randomized trials. The Frontiers review found
**4** studies meeting its real-world-workflow criteria.

Spec B found the same shape from a different corpus by a different method: family B is 9 named
papers, **0 RCTs**, 7 primary studies. Evidence scarcity here is a property of the field, not an
artefact of our screening.

## What this changes

1. **The differentiator holds, and is narrower than stated.** Not "AI translation is unreviewed" —
   it is that reviews exist for *LLMs in medicine* while none exists for *translation as a
   language-access intervention*.
2. **A1's most urgent value is currency, not provenance.** The publishability argument for a
   documented search still stands, but the pressing gap is that the fastest-moving area of the
   review has no corpus coverage after 2024.
3. **The 2025+ acquisition gap needs explaining before A1 is designed.** 55 recent papers entered
   the corpus and none is translation technology. Is that a real publication pattern, a search
   artefact, or a screening artefact? A1's query design depends on which.
