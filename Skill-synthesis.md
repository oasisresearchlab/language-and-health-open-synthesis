---
name: skill-synthesis
description: Reference — cross-paper synthesis layer (EvidencePatterns, evidence-summary index, Bases). Adapted from jay-living-synthesis-jc-port/Skill-synthesis.md.
parent_skill: extract-discourse-nodes
---

# Skill — Cross-paper synthesis

> **⚠️ SUPERSEDED (2026-06): the `## EvidencePattern (EP)` section below is retired.** Do not author EP
> nodes. The body-of-evidence judgment EP was meant to capture now lives **on the CLM** as a `certainty`
> field + `## Evidence appraisal` section (GRADE-style), and is an **expert/clinician task — AI does NOT
> draft it**. Reify a node only for split sub-bodies of one claim. `propose_eps.py` is paused. The rest
> of this doc (evidence-summary index, Bases) still applies, reading over **CLMs** instead of EPs.
> Detail: memory `synthesis-grade-appraisal-on-clm-not-ep`.

The per-paper graph (QUE/CLM/EVD/CVT) is paper-internal. The synthesis layer is **cross-paper**:
regularities that no single paper makes alone but emerge when ≥2 independent EVDs converge.

> **Governance (load-bearing).** AI **extracts** EVD/CLM/CVT and **proposes** EPs, provisional→real
> upgrades, cluster/subtask merges, and evidence-summary cell values. The **human commits**
> (accept/reject per item). Never auto-write final EPs/merges or auto-fill summary cells.

## EvidencePattern (EP)

Type id `node_r2JRW9jgphgmMpz5mN7eG`. Tags: domain facets + one `epistemic/*` + `ep/scope/cross-paper`
+ `ep/strength/<N>-papers` (count of distinct source papers among supporting EVDs).

Four sections (no others):

```
## Pattern statement          — one paragraph, plain language
## What is being claimed       — 1–2 paragraphs, clinical/policy implications
## Supporting Evidence         — [[EVD - … - @paperA]], [[EVD - … - @paperB]] (≥2 papers; paper-attributed)
## Connected discourse-graph nodes
   - Within-paper claims this generalizes: [[CLM - …]]
   - Adjacent pattern: [[EP - …]] — relationship
   - Instantiating systems (optional): [[ART - …]]
```

**Threshold ≥2 independent papers.** Supporting-Evidence wikilinks are materialized into first-class
`EVD —supports→ EP` edges (use Contradicting for `opposes`) by `sync_relations.py`, so the plugin
graph and `attachment_audit.py` see the bundle.

### Proposing EPs
`propose_eps.py` clusters EVDs across papers (shared factor×outcome, embedding similarity) and emits a
**markdown checklist** of candidate EPs + provisional→real upgrades + merge maps. It does **not**
write final EP files. Human ticks what to commit.

## Evidence-summary index (re-domained Review-Arena)

A per-question summary table — one row per factor→outcome subtask (wikilinked to its QUE/EP, with a
`· N EVDs` caption refreshed by `count_evds_per_subtask.py`):

| Subtask (factor → outcome) | Direction | Effect size | Evidence strength | N papers | Caveats |

- **Subtask** relation-first, e.g. "Interpreting services → shorter length of stay".
- **Direction** supports / mixed / opposes. **Effect size** headline magnitude (+ `<abbr>` tooltip:
  measure + sample). **Evidence strength** Strong / Moderate / Limited (≈ `ep/strength`).
- Cells are **human-synthesized**; AI may propose per-row values for accept/reject, never commit.

## Bases (live filterable index)

Extend `Evidence.base` / `Papers.base` with formula columns (`node_type` from folder, `short_title`
stripping the `EVD - ` prefix, readable joins of `languageConcordanceFactor`/`healthOutcome`/
`deliveryContext`) and faceted views (by node type; by each facet value; by `ep/strength`; drafts
needing verification; best-defended EVD cards). Always set `description:` (quote it if it contains a
colon inside backticks). This is the navigable face of the hybrid index (plugin edges = truth,
`build_dgraph.py` = nested view, Bases = filterable table).

## Out of scope (future)

Public render (MkDocs Material), Obsidian visual snippets, and sortable web tables (jay-port Steps
12–13) are deferred — noted, not built now.
