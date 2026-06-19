---
name: skill-synthesis
description: Reference — cross-paper synthesis layer (over CLMs), body-of-evidence appraisal, evidence-summary index, Bases.
parent_skill: extract-discourse-nodes
---

# Skill — Cross-paper synthesis

The per-paper graph (QUE/CLM/EVD/CVT) is paper-internal. The synthesis layer is **cross-paper**:
regularities that no single paper makes alone but emerge when ≥2 independent EVDs converge.

> **EP retired (2026-06).** The cross-paper "EvidencePattern" node type is gone. Its job — treating a
> body of evidence as a unit and grading it — now lives **on the CLM**: a claim aggregates EVDs from
> ≥2 papers, and its body-of-evidence judgment is a `certainty` field + `## Evidence appraisal` section
> (GRADE-style), **authored by an expert, not the AI**. `propose_eps.py` is retired. Canonical record:
> `plans/methodology-decisions.md`.

> **Governance (load-bearing).** AI **extracts** EVD/CLM/CVT and **proposes** cluster/subtask merges and
> evidence-summary cell values. The **human commits** (accept/reject per item) and owns every
> `certainty`/appraisal. Never auto-fill summary cells or draft certainty.

## Cross-paper convergence lives on the CLM

A CLM transcends papers. Its `## Supporting Evidence` / `## Contradicting Evidence` list EVDs from
multiple sources — materialized into first-class `EVD —supports/opposes→ CLM` edges by
`sync_relations.py`, so the plugin graph and `attachment_audit.py` see the bundle. A contested claim
shows **both** sides.

- **Mechanical breadth** (distinct supporting / opposing papers) is emitted as `supportPapers` /
  `opposePapers` per CLM by `export_rdf.py`. It's a strength *proxy* for filtering/sorting — **not** a
  certainty judgment.
- **Body-of-evidence appraisal** (expert task): on the CLM, a `certainty` (e.g. GRADE
  high/moderate/low/very-low) + a `## Evidence appraisal` section. The AI leaves `certainty` blank.
  Reify a separate node only when one claim's evidence must be graded as distinct sub-bodies.

## Evidence-summary index (re-domained Review-Arena)

A per-question summary table — one row per factor→outcome subtask (wikilinked to its QUE/CLM, with a
`· N EVDs` caption):

| Subtask (factor → outcome) | Direction | Effect size | Evidence strength | N papers | Caveats |

- **Subtask** relation-first, e.g. "Interpreting services → shorter length of stay".
- **Direction** supports / mixed / opposes. **Effect size** headline magnitude (+ `<abbr>` tooltip:
  measure + sample). **Evidence strength** the expert `certainty` on the CLM.
- Cells are **human-synthesized**; AI may propose per-row values for accept/reject, never commit.

## Bases (live filterable index)

Extend `Evidence.base` / `Papers.base` with formula columns (`node_type` from folder, `short_title`
stripping the `EVD - ` prefix, readable joins of `languageConcordanceFactor`/`healthOutcome`/
`deliveryContext`) and faceted views (by node type; by each facet value; by `supportPapers` /
`certainty`; drafts needing verification — `curationStatus = Initial AI draft`; best-defended EVD
cards). Always set `description:` (quote it if it contains a colon inside backticks). This is the
navigable face of the hybrid index (plugin edges = truth, `build_dgraph.py` = nested view, Bases =
filterable table).

## Relation to the review app

Cross-paper synthesis sits *downstream* of per-node review. Reviewers verify individual EVD/CLM nodes
against the rubric in the review app (`/review/accuracy`, `/review`); once a claim's evidence is
verified, the **expert** writes its `certainty` + `## Evidence appraisal`. The evidence-summary index
and Bases then read over those reviewed, appraised CLMs. See `Skill.md` → "Review-app integration".

## Out of scope (future)

Public render (MkDocs Material), Obsidian visual snippets, and sortable web tables (jay-port Steps
12–13) are deferred — noted, not built now.
