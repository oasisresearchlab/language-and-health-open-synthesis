# Methods — evidence extraction & cluster sampling

*Draft for manuscript. Framing: a methods contribution (AI-assisted, human-verified evidence
synthesis via a grounded discourse graph) demonstrated on language concordance in surgery.
Audience: clinical / health-services. Numbers current as of 2026-07-27; extraction is ongoing
(a **living** synthesis), so counts are reported as a snapshot.*

> **Worked subsample with full extraction provenance** (model, prompts, skills, scripts, and a
> compute-cost estimate): the AI-assisted-translation cluster — see
> `ai-translation-subsample-extraction.md` and `../../plans/review-app/ai-translation-cluster-selection.md`.

> **A note on honesty of scope (delete before submission).** Two things a clinical reviewer will
> check, stated plainly so we don't overclaim: (1) the surgical cluster was selected by a
> **lexical scan within an already-assembled corpus**, not a fresh multi-database systematic
> search — describe it as pragmatic within-corpus sampling, not a PRISMA search. (2) First-pass
> extraction is done by a **large language model**; every node is **verbatim-grounded** and passes
> a **human verification** pass before it counts as verified. Lead with those safeguards.

---

## A. Abstract-ready versions

**Ultra-compact (~45 words) — for a structured abstract's *Methods* line:**

> We extracted evidence from a PubMed-derived corpus into a *discourse graph* — a structured map of
> research questions, claims, evidence, and caveats as typed, linked nodes. Each evidence node is
> grounded in a verbatim source span and a figure/table, then verified by human reviewers against a
> fixed rubric before acceptance.

**Fuller (~110 words) — for an unstructured abstract or a methods-forward abstract:**

> We built a grounded, AI-assisted evidence-synthesis pipeline and demonstrate it on language
> concordance in surgery. From a PubMed-derived corpus of 820 sources, a perioperative lexical scan
> identified 63 candidate records; after de-duplication and off-topic exclusion, 29 surgical papers
> were sampled (joining 5 already extracted). A large language model extracted atomic *evidence*
> nodes — each tied to a verbatim quote and, where present, a specific figure or table — plus the
> *claims* they support or oppose and their *caveats*, into a discourse graph. Every node was
> authored to, and independently reviewed against, a fixed quality rubric; body-of-evidence
> certainty (GRADE-style) is assigned by clinical experts, not the model.

---

## B. Full methods section

### B.1 Design overview

We assembled evidence using a **discourse graph**: a structured evidence map in which the objects of
synthesis are represented as typed, linked nodes rather than free-text summaries. Four node types do
the work (a fifth is optional):

- **Question (QUE)** — a research question the corpus addresses.
- **Claim (CLM)** — a generalisation that answers a question and **transcends any single study**;
  multiple studies can support or oppose it.
- **Evidence (EVD)** — one atomic finding **from a single study**, tied to a verbatim source span.
- **Caveat (CVT)** — a limitation that qualifies a specific piece of evidence.
- *(optional)* **Artifact (ART)** — a concrete system or intervention a study evaluated (e.g., a
  video-interpreting tablet, a bilingual-provider clinic, a multilingual SMS chatbot).

Nodes are joined by directed, typed edges: evidence **supports** or **opposes** a claim; a caveat
**qualifies** an evidence node; claims and evidence **inform** a question; a sub-question **informs**
its parent, forming a question hierarchy under a single lodestar question (*how does language
concordance affect healthcare outcomes?*). Representing findings this way lets a single reviewer
inspect one finding at a time, makes genuine disagreements explicit (a contested claim carries both
its supporting and its opposing evidence), and supports synthesis **across quantitative and
qualitative** studies on the same claim.

The pipeline is **AI-assisted but human-verified**, and governed by a *propose–don't-commit* rule: a
large language model extracts evidence, claims, and caveats and *proposes* their links; a human
*commits* (accepts, edits, or rejects each item) and owns every certainty judgment. Two safeguards
make model-drafted extraction auditable for a clinical readership — (i) **verbatim grounding**, so
every substantive statement is checkable against an exact quote and locator, and (ii) an explicit
**verification pass** against the same rubric the extraction was authored to (§B.6).

### B.2 Corpus and source materials

The corpus is a set of **820 source records** (PubMed-derived; 782 of the original 785 carried a
PubMed identifier) on language concordance/discordance and health. For each source we retrieved an
**open-access full text** in preference order (PubMed Central OA subset → Unpaywall → Semantic
Scholar → OpenAlex), validating each file as a genuine PDF; **706 sources** have a retrievable
full-text/PDF. Coverage is therefore **open-access-biased** and partial, and this is made explicit
in the corpus record rather than hidden.

To support grounding in the actual data objects (not just prose), figures and tables were extracted
as standalone objects by two routes: **Route A**, structured extraction from PubMed Central JATS XML
(high-fidelity, born-digital tables and figure images); and **Route B**, heuristic extraction from
publisher PDFs with PyMuPDF for papers absent from the XML corpus (lower, variable fidelity, flagged
for human review). Both feed the figure/table grounding step (§B.4).

### B.3 Cluster sampling — the surgical set (PRISMA-style flow)

Because the corpus is large and the synthesis is **living** (built cluster by cluster rather than in
one pass), we sampled a coherent **topic cluster** to extract and demonstrate the method — here,
*surgery as a context for language concordance*. Sampling was a **within-corpus lexical selection**,
not a fresh database search:

1. **Lexical identification.** All 785 source records (title + filename) were screened against a
   perioperative lexicon (surgical/anaesthesia/procedure/consent term stems — e.g. `surg*`,
   `periop*`, `pre/postoperat*`, `anesthes*`, `arthroplasty`, `laparoscop*`, `transplant*`,
   `consent`; the **complete include- and exclude-term set** is documented in
   [`perioperative-lexicon.md`](./perioperative-lexicon.md)) → **63 candidate records**.
2. **Set-aside of the already-extracted.** 5 surgical papers already had evidence extracted (the
   seed cluster) and were retained separately.
3. **De-duplication.** Re-import duplicates and same-paper/different-citekey pairs were collapsed,
   keeping the record whose full text was on hand → ~30 unique candidates.
4. **Off-topic exclusion.** Lexical false positives were removed on full-text check — e.g.
   cancer-*screening* (a prevention, not surgical, context), surgical-*skill*/simulator studies with
   no language-concordance angle, and topically adjacent but non-surgical papers.
5. **Thematic grouping** of survivors into four sub-themes: (A) perioperative outcomes &
   disparities; (B) anaesthesia, analgesia & pain; (C) surgical consent & interpreter process; (D)
   communication interventions & access.
6. **Selection.** All four sub-themes were taken for this pass → **29 papers**, joining the 5 seed
   papers (**34 surgical papers** total).
7. **Full-text verification.** A retrievable full text was confirmed for all 29; one apparent match
   proved to be a commentary letter rather than the primary study and was flagged.

*(This funnel — 785 screened → 63 identified → 29 selected (+5 prior) — is reported as a
PRISMA-style flow diagram; note in the legend that identification was lexical-within-corpus, not a
multi-database search.)*

### B.4 Evidence extraction

For each sampled paper, a human performed a brief **orientation skim** (design, sample, headline
results — context, not mastery), after which a language model extracted the node set to the quality
rubric (§B.6). Extraction discipline:

- **Atomicity.** One finding per evidence node (a table of five results becomes five evidence
  nodes); one generalisation per claim; one limitation per caveat.
- **Verbatim grounding.** Every substantive statement carries an **exact quoted span plus a locator**
  (page; figure/table number). Quote fidelity is checked automatically against the source PDF
  (Unicode-normalised alphanumeric match) so that no statement rests on a paraphrase or a coincidental
  keyword hit.
- **Object grounding.** Where a finding *lives in* a figure or table, that object is embedded and, where
  possible, the exact region is cropped; a finding that is genuinely text-only is recorded as such.
- **Methods context (What / How / Who).** Each evidence node records three method facets, **each
  independently grounded**: **What** — the observable measured (e.g., 30-day readmission rate,
  interpreter set-up time), not its value; **How** — the design/procedure that produced it, linked to
  an *Artifact* node when a specific system was evaluated; **Who** — the equivalence class the finding
  generalises to (setting, sample, population, with the N→exclusions→N_final flow where available).
- **Tense as a type cue.** Evidence is written in the **past tense** (what one study observed —
  situated and contextual); claims in the **present tense** (timeless generalisations). A tense
  mismatch flags a node on the wrong side of the evidence/claim line.
- **Facets.** Every question/claim/evidence node carries domain facets — *language-concordance factor*,
  *health outcome*, *delivery context* — and exactly one *epistemic* tag (mechanism / effect-size /
  measurement), supporting filtered views across the graph.

For the surgical set this yielded, in draft, roughly **195 evidence nodes, 132 claims, 86 caveats,
and 11 artifacts** across the 29 papers (26 papers produced evidence; 3 commentary/review papers
produced claims only); **166 evidence nodes were grounded to a specific figure or table**. Across the
whole graph the snapshot stands at **324 evidence, 192 claim, 154 caveat, 8 question, and 14 artifact
nodes**.

### B.5 Cross-paper synthesis

Synthesis is **cross-paper and lives on the claim**. A claim aggregates evidence from ≥2 independent
studies via first-class *supports*/*opposes* edges; a contested claim displays **both** sides rather
than resolving the tension silently, and intervention claims (*providing concordance improves X*) are
kept distinct from exposure claims (*discordance is associated with X*), since they test different
things. A mechanical **breadth proxy** (count of distinct supporting vs. opposing papers) is computed
for ranking and filtering — it is explicitly **not** a certainty rating.

### B.6 Quality rubric, verification, and certainty appraisal

Extraction and review share **one rubric**, so each node is *authored to* exactly what it is later
*reviewed against*. Per evidence node the rubric checks: atomicity; verbatim grounding; **substantive
fidelity** (direction, magnitude, significance, and intervals for quantitative findings — a null
reported as a null, not spun — or an accurate characterisation for qualitative ones); correct object
grounding; each of What/How/Who grounded; a correct-polarity link to ≥1 claim; and past-tense phrasing.

Verification runs as a **two-pass human review** in a purpose-built application: an *accuracy* pass
walks each evidence node against the per-node rubric (verbatim · grounding · claim-link/polarity ·
substantive · methods), and a *completeness* pass checks that every result a paper enumerates
(abstract sentences, tables, figures) is captured or consciously excluded. Reviewers record one of
five verdicts per item (correct · edit · wrong · missing · n/a) against the source PDF with the exact
quote/figure region highlighted. Judgments are collected centrally and drive each node's review status
from *initial AI draft* toward *expert-verified*; the model never advances this status. *(To date, 209
reviewer judgments across 10 papers have been recorded by 3 reviewers — an in-progress figure for a
living synthesis.)*

**Certainty is an expert task.** Body-of-evidence certainty (GRADE-style: high / moderate / low / very
low) and its written appraisal are assigned by clinical experts on the claim; the model leaves them
blank. This keeps the interpretive judgement that a clinical readership most scrutinises in human
hands, with the model confined to grounded, checkable extraction.

### B.7 Reproducibility and availability

The corpus records, node files (plain Markdown with structured front-matter), edge set, extraction
and grounding scripts, verbatim/graph-invariant audits, and the review application are maintained in
an open repository. Full-text PDFs are **not** redistributed (copyright); every node's verbatim span
and locator lets a reader with journal access verify the finding at source. *(Reporting notes: study
selection follows a PRISMA-style flow (§B.3, legend caveat); source records carry study-design
reporting cues where applicable, e.g. STROBE/CONSORT; certainty follows GRADE (§B.6). These standards
are adapted as scaffolding, not claimed as full compliance.)*

---

## C. Limitations to state (clinical reviewers will look for these)

- **Sampling** was lexical within an existing corpus, so recall is bounded by the corpus and the
  lexicon; it is a pragmatic cluster sample, not an exhaustive systematic search.
- **Open-access bias** in full-text coverage (706/820) may skew which studies are extractable.
- **LLM first-pass extraction** can err; the verbatim-grounding requirement and human verification
  pass are the mitigations, and unverified nodes are labelled as such.
- The synthesis is **living and partial** — surgery is the demonstrated cluster, not the whole
  evidence base — so prevalence/quantitative claims should be read as of the stated snapshot.
