# AI-assisted-translation subsample — extraction provenance

*A reproducibility appendix for the AI-assisted-translation cluster (companion to
`methods-extraction-and-sampling.md` and `plans/review-app/ai-translation-cluster-selection.md`).
Documents exactly which model, prompts, skills, and scripts produced the subsample, and a rough
compute cost. Extraction run 2026-07-30.*

## What the subsample is

The two questions
`[[QUE - What are the benefits, risks, and limitations of AI-assisted translation for surgical procedures?]]`
and `[[QUE - What best practices exist for AI-assisted translation in surgery?]]` are supported by a
purpose-sampled cluster of machine/AI-translation papers (translation apps & devices, machine/neural
translation of written materials, multilingual chatbots, LLM tools), with non-surgical papers
included as a baseline. Sampling method: `plans/review-app/ai-translation-cluster-selection.md`.

**Result (snapshot 2026-07-30):** the question pair now rests on **21 distinct papers → 84 evidence
nodes → 55 claims → 45 caveats** (Q1 alone: 52 claims / 18 papers, up from 5 before extraction).

## Model

- **Extraction model: Claude Opus 4.8** (`claude-opus-4-8`, 1M-context). Every authored node records
  `extraction_model: claude-opus-4-8` in front-matter; `extraction_prompt_version: v2`.
- One extraction agent per paper. Agents were dispatched as sub-agents that inherited the session
  model (Opus 4.8); no per-agent model override was set.
- **Governance:** AI *extracts* and *proposes*; the human *commits*. Agents authored every node at
  `curationStatus: Initial AI draft` and left each claim's `certainty` / `## Evidence appraisal`
  blank (a GRADE-style expert task). No node was promoted or verified by the model.

## Orchestration

- The 14-paper cluster ran as a single **fan-out workflow** — one sub-agent per paper, all in
  parallel, each writing its paper's node files (distinct filenames, no write conflicts), returning a
  structured summary (counts, new-claim titles, role, flags).
- Orchestration script (persisted for reproducibility):
  `discourse-extraction/agent-runs/ai-translation-cluster-extract.workflow.js`
  (workflow run id `wf_7cde51e0-cdd`). The per-paper extraction brief is the `buildPrompt(...)`
  function inside that script.
- One paper (`@Narang_2019_Use_Mobile`) had a wrong/supplemental-only PDF in the first pass; after a
  correct PDF was supplied by hand it was extracted by a single follow-up agent using the same brief.

## Prompts, skills, and scripts used

**Method / rubric the agents were pointed at (each agent read these before authoring):**

- `CLAUDE.md` — node ids, edge schema, tags, governance
- `Skill.md`, `Skill-references.md`, `Skill-templates.md` — the extraction workflow, naming/tag
  conventions, and node templates
- `discourse-extraction/node-spec.md` — the portable per-node quality & completeness rubric (the bar
  each node is authored to and reviewed against)
- `utils/templates/T - Evidence.md` · `T - Claim.md` · `T - Caveat.md` · `T - Artifact.md` — canonical
  front-matter + section templates
- `Variables.md` — facet vocabulary (extended here with
  `languageConcordanceFactor/concordanceIntervention/machineTranslation`)

**Extraction prompt:** embedded in the workflow script above (`buildPrompt`); the single-paper Narang
re-run used the same brief adapted to one citekey. Both instruct: read the method files + the PDF,
author atomic EVD/CLM/CVT/ART with verbatim quotes and inverted What/How/Who, attach to existing CLMs
rather than duplicate, generate a UUIDv7 `nodeInstanceId` per node, and run no pipeline scripts.

**Pipeline scripts run once, after all papers, by the maintainer (not the agents):**

```
python3 utils/ground_figures.py    --apply   # embed extracted figures/tables into EVDs (54 embedded)
python3 utils/sync_relations.py    --apply   # wikilinks -> relations.json edges
python3 utils/build_dgraph.py                # nested QUE->CLM->EVD(->CVT) index
python3 utils/verbatim_audit.py              # quote <-> PDF fidelity (only minor 0.96-0.98 near-matches)
python3 utils/attachment_audit.py            # graph invariants
```

(`quote_pipeline.py` / `readability_pass.py` named in older CLAUDE.md notes are not present in this
repo; the scripts above are the current pipeline.)

## Verification status

All nodes are `Initial AI draft`. Mechanical audits ran clean (verbatim fidelity shows only minor
table-row / OCR-spacing near-matches, no hard failures). Human accuracy verification via the review
app (`/review/accuracy`) is the next step and is **not** reflected in these counts — the paper/EVD/CLM
totals are the *proposed* haul, which reviewers may prune. Agent-flagged issues (source
inconsistencies in Khanna / Turner_2015 / Hwang; the Rishivardhan scripted-evaluation caveat) are
authored into the EVDs for reviewers.

## Compute cost (rough estimate)

Reported sub-agent token usage (harness tally, input+output across all agent turns):

| Run | Agents | Sub-agent tokens | Tool calls | Wall time |
|---|---|---|---|---|
| Cluster workflow | 14 | 1,289,814 | 573 | ~17.7 min |
| Narang re-run | 1 | 100,186 | 38 | ~8.2 min |
| **Total** | **15** | **~1.39M** | **611** | — |

At Opus 4.8 pricing (**$5 / 1M input, $25 / 1M output**), and treating the ~1.39M as total tokens
with an input-heavy extraction profile (agents read many method files + a PDF each and author a
moderate volume of node text), the extraction cost is on the order of **~$10–15** (an all-input floor
is ~$7; an all-output ceiling ~$35). This excludes controller/coordination tokens and any
prompt-cache discounts, and does **not** include the human review pass. Treat it as an
order-of-magnitude figure: **≈ $1 per paper**, hard data being the token counts above.
