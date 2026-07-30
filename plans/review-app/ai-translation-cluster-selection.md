# AI-assisted translation cluster — how the papers were selected

*Generated 2026-07-28. Companion to the two new questions
`[[QUE - What are the benefits, risks, and limitations of AI-assisted translation for surgical procedures?]]`
and `[[QUE - What best practices exist for AI-assisted translation in surgery?]]`.*

## Goal

Assemble the corpus's evidence on **AI-assisted / machine translation** (machine/neural translation
of written materials, translation apps & devices, multilingual chatbots, LLM tools) as it bears on
surgical/perioperative care — with **non-surgical AI-translation papers included as a baseline** (per
the maintainer's scope call). Feed the two new questions above (both children of the surgical/
perioperative-care question; benefits/risks → informs → best-practices).

## Selection method

1. **Lexical discovery over the corpus.** Scanned all 820 sources in `Discourse Graph/Sources/`
   (title + abstract) against an AI/MT-translation lexicon: `machine translation`, `neural machine`,
   `google translate`, `automatic translation`, `translation app/tool/software/device/engine/
   platform`, `chatbot`, `natural language processing`, `large language model` / `LLM` / `ChatGPT` /
   `GPT-`, `generative AI`, `speech translation`, `smartphone …translat…`, `DeepL`.
2. **Split by extraction status.** 3 AI-translation papers already have EVDs/CLMs and are **not**
   re-extracted — their claims are linked to the new questions directly:
   - `@Hibbs_2026_Translation_Approaches` — twice-randomized SACT-consent MT study (the meaning-changing-
     error / professional-vs-MT claims). *Risk + limitation.*
   - `@Joshua_2023_Multilingual_Chatbot` (= `@Rainey_2023`) — multilingual SMS chatbot, arthroplasty.
     *Benefit (with confounding caveats already authored).*
   - `@Davis_2019_Translating_Discharge` — discharge-instruction translation strategies/barriers.
3. **False-positive / off-topic exclusion** (lexical match, but not patient-facing AI translation):
   - `@Kuribayashi_2025_Delayed_Chat` — Japanese *doctors'* own ChatGPT use gated by *their* English;
     not patient translation.
   - `@Feichtl_2011_Community_pharmacists` — pharmacists' use of language-access services (no MT).
   - `@Shamsi_2020_Implications_Language`, `@Kathy_2024_Review_Disparities` — broad LEP reviews, not
     AI-translation-specific (kept out of this cluster to keep it focused; revisit if needed).
4. **PDF verification.** All survivors have a PDF **except** `@Roopwant_2025_Enhancing_Dental` (dental
   interpretation-tech; **no PDF** — moved to the fetch queue, not extracted this pass).

## Extraction cluster (14 papers — one extraction agent per paper, to the review rubric)

Dedup note: `_1` re-import duplicates collapsed (`Kapoor_2022_Use_Neural_1`, `Turner_2015_*`,
`Rishivardhan_..._1`, `Theresa_..._1`) — keep the non-`_1` citekey whose PDF exists.

### Primaries → EVD + CLM (13)

| Paper | Topic / expected angle | Context |
|---|---|---|
| `@Chen_2017_Machine_Human` | Quality of a translation **mobile app** for diabetes education (machine vs human) | baseline (non-surg) |
| `@Das_2019_Dangers_Machine` | "Dangers of machine translation" — need for professional anticipatory-guidance translation | baseline (peds) |
| `@Kapoor_2022_Use_Neural` | **Neural MT software** for LEP patients (assessment / discharge) | verify surg relevance |
| `@Khanna_2011_Performance_online` | Performance of an **online translation tool** on patient-education material | baseline |
| `@Turner_2014_comparison_human` | Human vs **machine translation** of health-promotion materials | baseline (public health) |
| `@Turner_2015_Machine_Translation` | **MT** of public-health materials English→Chinese (feasibility) | baseline |
| `@Turner_2015_Modeling_workflow` | **Workflow design** for MT applications in public-health practice | baseline → **best practices** |
| `@Hwang_2022_Testing_use` | **Translation apps** for everyday healthcare communication (Australia) | baseline |
| `@Panayiotou_2020_perceptions_translation` | Perceptions of **translation apps** among staff + older patients | baseline |
| `@Narang_2019_Use_Mobile` | **Mobile app** to increase interpreter access for cancer patients | near-surg (oncology) |
| `@Soller_2012_Performance_new` | Performance of a **speech-translation device** for medication recommendations | baseline |
| `@Colina_2022_Research_Documents` | **Translation approaches** for LEP research documents | methods → best practices |
| `@Rishivardhan_2024_Voice-Enabled_Response` | **VERAA** — LLMs to map voice responses | verify relevance |

### Reviews → CLM backbone only, no EVD (1)

| Paper | Type | Note |
|---|---|---|
| `@Theresa_2024_Point-of-care_communication` | Scoping review — point-of-care communication tech for limited-language-proficiency patients | present-tense CLM backbone; supporting EVDs are the corpus primaries |

### Fetch queue (excluded this pass)

- `@Roopwant_2025_Enhancing_Dental` — no PDF; fetch, then extract.

## Existing CLMs linked to the two questions (already in the graph)

Benefits: multilingual-chatbot cluster (Joshua). Risks: unsupervised-MT meaning-changing errors
(Hibbs). Limitations: professional-vs-MT comprehension, under-provision/coverage of translated
materials, booklet insufficiency. Best-practice basis: e-consent translated templates, PROM
validation, staff-education-plus-assistive-tech, professional-vs-MT. Baseline: Spanish HIV mHealth
app. (See each question's `## Claims addressing this question`.)

## Extraction results (2026-07-30)

Ran one extraction agent per paper (workflow `wf_7cde51e0-cdd`). **14/14 completed →
64 EVD · 43 CLM · 31 CVT · 9 ART** (draft). Pipeline run: `ground_figures` (54 EVDs got
figure/table embeds) → `sync_relations` → `build_dgraph` → `verbatim_audit` (only *minor*
0.96–0.98 near-matches: table rows / OCR spacing — no hard failures) → `attachment_audit`.

**Wiring:** all AI/MT/app/device cluster CLMs linked into the two questions.
`Q1` (benefits/risks/limitations) → **51 CLMs, 17 distinct papers** (up from 5).
`Q2` (best practices) → **21 CLMs** (best-practice subset + originals).

**Flags carried to review (authored into the EVDs):**
- `@Narang_2019_Use_Mobile` — **wrong / supplemental-only PDF**, no article body → **0 nodes;
  moved to the fetch queue** (re-fetch the primary, then extract).
- `@Khanna_2011` — abstract↔Table 1 transpose adequacy/meaning point estimates (both n.s.); noted.
- `@Turner_2015_Machine_Translation` — abstract 41 CPM vs body/Table 37.8 CPM; grounded in the table.
- `@Hwang_2022` — Table 1 percentages vs Results-text n=24 denominator mismatch; noted.
- `@Rishivardhan_2024` — methods/tool paper, evaluated on *scripted* not real patient responses;
  source note said "no findings" but full text has empirical results. Verify relevance in review.
- `@Colina_2022` — functionalist-vs-literal *human* translation (not AI/MT); kept as best-practice basis.

**Cleanup done:**
- **Duplicate ART nodes consolidated (2026-07-30).** The 4 Google-Translate variants were merged into
  a single canonical `ART - Google Translate`; 12 EVD `How` links repointed, 3 duplicate ART files
  deleted (ART 23→20). Both modalities (text/statistical-MT vs conversation/voice-neural-MT) are
  documented on the canonical node and recorded per-EVD in each finding's `How?`.

## Governance

AI extracts EVD/CLM/CVT/ART and proposes the nesting; the human commits (accept/reject) and authors
the normative best-practice synthesis + any `certainty` appraisal. New facet value
`languageConcordanceFactor/concordanceIntervention/machineTranslation` added to `Variables.md`.
