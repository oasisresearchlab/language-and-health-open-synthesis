# Surgery-cluster expansion — how the 29 papers were selected

*Generated 2026-07-22. Companion to commits `fa4812d` (draft nodes) + `1ba7d1c` (review queue).*

## Selection method

Goal: expand the existing 4-paper surgical LEP cluster into a comprehensive
"surgery as a context/modality of language concordance" cluster, then queue it for review.

1. **Lexical discovery over the corpus.** Scanned all **785 Sources** in
   `Discourse Graph/Sources/`, matching each source's title + filename against a
   surgical/perioperative lexicon (`surg*`, `periop*`, `pre/postoperat*`, `anesthes*`,
   `bariatric`, `arthroplasty`, `spine/spinal`, `transplant`, `colorectal`, `laparoscop`,
   `consent`, `operating room`, …). → **63 raw hits.**
2. **Split by extraction status.** 5 surgical papers already had EVDs (the existing cluster:
   Allan, J_2025, Kyle, Patel, Tejas) and were set aside; the rest were candidates.
3. **Dedup.** Removed `_1` re-import duplicates and same-paper/different-citekey pairs
   (`Claire_2022` = `Crescenzo_2022`; `Joshua_2023` = `Rainey_2023`), keeping the citekey whose
   `data/pdfs/@<ck>.pdf` exists. → ~30 unique papers.
4. **False-positive filter** (dropped as off-topic despite a lexical match):
   cancer *screening* papers (colorectal/cervical/breast — a prevention context, not surgery:
   Diaz, Jennifer, Rebecca, Reuland, Sentell, Tong, Xie); ED diagnostic error (Svetlana);
   surgical-*skill*/simulator neuroimaging with no LEP angle (Yaoyu, Mazzon); mental-health
   service use (Aliya); interpreter-in-medical-education (Himmelstein); general communication
   tech (Khoong, Chen); and the diabetic-retinopathy `Zafar_2023_Limited_English` (distinct from
   the cataract-surgery `Zafar_2023_Comparison_cataract`).
5. **Thematic grouping** of the survivors into 4 sub-themes (A–D below).
6. **Human selection.** All four sub-themes were chosen for this pass.
7. **PDF verification.** Confirmed a PDF for all **29** final papers. During extraction, one PDF
   proved to be the wrong document (Angeles — a *commentary letter*, not the primary study).

Result: **29 papers → 424 draft nodes (195 EVD · 132 CLM · 86 CVT · 11 ART).** One extraction
agent per paper, authored to the review rubric; all quotes verbatim-verified; 166 EVDs grounded
with figure/table keyImages. 26 papers yielded EVDs; 3 (Angeles, Hangge, Hyundeok) yielded only
CLMs (commentary / systematic review).

## Summary table

`EVD`/`CVT` = draft nodes authored for that paper. Papers with **0 EVD** produced CLMs only.

### A · Perioperative outcomes & disparities (7 papers, 46 EVD)

| Paper | Design / headline | EVD·CVT | Notes |
|---|---|---|---|
| **Zafar_2023_Comparison_cataract** | Retrospective cohort; cataract surgery EP vs LEP | 13·4 | Advanced/complex disease in LEP, but complication **nulls** + greater VA gain. Distinct from the retinopathy `Zafar…_Limited_English`. |
| **Kevin_2023_Limited_English** | Cohort; knee-arthroplasty complications | 9·4 | LEP→↑VTE/DVT; **crude-vs-adjusted pneumonia split** (support/contradict). Author is actually *Nguyen*. |
| **Kevin_2023_Patients_Who** | Cohort; revision-surgery utilization | 5·4 | LEP→**fewer** revisions (aOR ~0.45). Distinct paper from the sibling above; author *Nguyen*. |
| **Claire_2022_Increasing_Frequency** | Cross-sectional dose-response; periop LOS | 6·3 | More interpreting→shorter LOS. Dupe of `Crescenzo_2022` (PDF under Claire). Inferred CVT: events-per-day has LOS in denominator. |
| **Maurer_2021_Non-English_Primary** | State inpatient DB; emergency diverticulitis surgery | 5·4 | NEPL→↑emergency surgery (OR 1.35), concentrated in **non-Spanish** speakers (Spanish null). New `emergencySurgery` facet. |
| **Manuel_2022_Association_English** | Research letter; TJA cost/LOS/disposition | 4·2 | Longer LOS/cost/skilled-discharge; **readmission null**. Source count 369 vs 378 flagged. |
| **Wang_2024_Limited_English** | Cohort; breast-reduction mammoplasty | 4·2 | Clean **null** throughout. Author is actually *Fei*; Table 1 count mismatch flagged. |

### B · Anesthesia, analgesia & pain (4 papers, 32 EVD)

| Paper | Design / headline | EVD·CVT | Notes |
|---|---|---|---|
| **Kapoor_2023_Impact_Need** | Propensity-matched; surg-onc RA/pain/opioids | 9·4 | LEP→**lower** reported pain/opioid (counterintuitive). ⚠️ **Source text-vs-table direction flips** on pain + OR — flagged verbatim for review. |
| **Nguyen_2023_Language_Barriers** | Cohort; postop opioid refills after TKA | 9·2 | LEP requests **fewer** refills despite equal pain. The "other" Nguyen paper is `Kevin_2023_Limited_English`. |
| **Plancarte_2021_Association_Between** | Peds cohort; analgesia timing | 8·3 | LEP kids wait longer for *any* analgesia; opioid amount/timing **nulls** — contradict the existing Jimenez pediatric-pain claim. |
| **Sabra_2025_Association_Limited** | Single-institution; RA utilization for TJA | 6·3 | Full **null**; ceiling effect (98.8% RA). Covariate over-reading in source flagged. |

### C · Surgical consent & interpreter process (9 papers, 69 EVD)

| Paper | Design / headline | EVD·CVT | Notes |
|---|---|---|---|
| **Maria_2023_Consent_document** | *Nature*; trial-consent translation cost | 13·4 | Cost ($1,498/doc)→under-enrollment in non-industry trials. Matched-vs-unmatched translation support/oppose. |
| **Xue_2019_Interpreter_proxy** | Randomized crossover pilot; PROM proxy reliability | 10·5 | Measurement-reliability study (`epistemic/measurement`); 2 ARTs. Abstract-vs-text agreement range flagged. |
| **Krankl_2011_Patient_predictors** | Survey; colposcopy consent comprehension | 8·5 | Language drops out after adjusting for **education**; interpretive-service-type **null**. |
| **Jenny_2024_Use_Professional** | Research letter; interpreter documentation | 8·3 | ⚠️ **OR transposition text-vs-table** flagged. Author is *Cevallos*. |
| **Burkle_2017_Assessment_efficiency** | Descriptive; interpreter-service efficiency | 7·4 | Cost/access metrics; new `serviceAccess`/`cost` facets. Denominator 354 vs 362 flagged. |
| **Karen_2024_Impact_Using** | Pre/post QI; eConsent | 7·3 | + ART (Epic eConsent). Absolute-vs-relative framing flagged. Author is *Trang*. |
| **Hibbs_2026_Translation_Approaches** | Twice-randomized; SACT consent | 6·4 | Machine-translation error finding; + ART (bilingual interlinear form). |
| **Maul_2012_Using_risk** | HFMEA expert panel; interpreter-use drivers | 4·2 | 9 failure modes folded into 1 enumeration EVD (rest noted). |
| **Lee_2017_Increased_Access** | Pre/post; bedside interpreter phone → consent | 6·2 | + ART. Residual disparity persists; process-measure **null**. |

### D · Communication interventions & access (6 papers, 48 EVD)

| Paper | Design / headline | EVD·CVT | Notes |
|---|---|---|---|
| **Jaramillo_2016_Hispanic_Clinic** | 3-group comparison; bilingual peds-surgery clinic | 12·4 | Concordance→↑question-asking. **Trust/discrimination track background, not concordance** (opposing-polarity flag). + ART. |
| **Allar_2022_Lost_translation** | Qualitative (24 providers); PROM-collection barriers | 11·3 | EVDs grounded in **participant quotes**. |
| **Idossa_2019_Access_Linguistically** | National staff survey; BMT info access | 10·3 | Distribution-of-need data (feeds the "who needs concordance" sub-question). |
| **Kiblinger_2022_Facilitating_Communication** | Pre/post QI; peds-surgery comms board | 7·4 | + ART. **Satisfaction-vs-utilization tension** (high satisfaction, 36% uptake). |
| **Joshua_2023_Multilingual_Chatbot** | Cohort; multilingual SMS chatbot | 4·2 | + ART. Readmission benefit vs historical control (confounded); ED/reoperation **nulls**. Dupe of `Rainey_2023` (PDF under Joshua); author *Rainey*. |
| **Linda_2023_Improving_Communication** | QI + case studies; MSKCC LEP initiative | 4·3 | + ART. Qual EVDs from patient voice. SRC `has_empirical_findings:false` mismatch flagged. |

### CLM-only papers (0 EVD — commentary / review)

| Paper | Type | Output | Notes |
|---|---|---|---|
| **Hyundeok_2023_Association_Language** | Systematic review (29 studies) | 11 CLM | Present-tense review backbone; supporting EVDs (corpus primaries) to be wired by hand. |
| **Hangge_2022_Lost_translation** | Invited commentary | 5 CLM | Cites Broekhuis 2022 (a fetch candidate). |
| **Angeles_2026_Elective_Total** | **Wrong PDF** — a Letter commenting on Angeles | 2 CLM | Real primary (DOI 10.1016/j.arth.2025.07.065) not in vault; fetch + re-extract. |

## Cross-paper signals worth the reviewer's attention

- **Genuine disagreements to reconcile:** Manuel/Kevin LOS & readmission findings vs the existing
  "LEP not associated with LOS" and Tejas readmission claims; Plancarte opioid nulls vs the
  Jimenez pediatric-pain claim.
- **Highest-value review targets:** the internal-inconsistency papers (Kapoor, Jenny) and the many
  nulls/reversals in themes A/B, which are easy to mis-polarize.
- **Fetch queue:** real Angeles primary + Broekhuis 2022.
- **~30 new facet values** proposed across agents for `Variables.md`.
