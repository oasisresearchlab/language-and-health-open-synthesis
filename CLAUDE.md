# CLAUDE.md — language-and-health-open-synthesis

> **Design context (for the `site/` web app).** Strategy lives in `PRODUCT.md` (register =
> product; users = clinicians + RAs + maintainer; "precise, instrument-like" Cream + Forest).
> Visual system lives in `DESIGN.md` (+ `.impeccable/design.json` sidecar). Read both before any
> frontend work via the `impeccable` skill. Restyle work tracked on the `review-app-restyle` branch.

Operating rules for extracting a grounded **discourse graph** from the LEP / language-concordance
corpus. Methodology ported & adapted from `living-synthesis-remix` (per-paper extraction) and
`jay-living-synthesis-jc-port/Skill-synthesis.md` (cross-paper synthesis). Plan of record:
`plans/extracting-discourse-nodes.md`.

## Lodestar question

`[[QUE - How does language support (language ‘concordance’) affect healthcare outcomes?]]`

Sub-questions (in `Discourse Graph/Questions/`): effects of concordance on quality/cost; effects of
**discordance**; distribution of discordance need; how to optimize delivery of concordance services.

## Node types (use the plugin's real ids)

| Type | id | folder |
|---|---|---|
| Question (QUE) | `node_LsIeSJxI7M9DoE3ISFEmw` | `Discourse Graph/Questions/` |
| Claim (CLM) | `node_nMxzA_OByPwgPcmb6AN82` | `Discourse Graph/Claims/` |
| Evidence (EVD) | `node_huDx8FGfNSGQyongW5rk-` (keyImage) | `Discourse Graph/Evidence/` |
| Source (SRC) | `node_Ne237S0BfRPDaeqB_gbuT` | `Discourse Graph/Sources/` |
| Pattern (PTN) | `node_vUzzS2ZuolcZzErZfyC72` | `Discourse Graph/Patterns/` |
| Artifact (ART) | `node_OULGh2SuqxP1oES9p2k_9` (keyImage) | `Discourse Graph/Artifacts/` |
| Caveat (CVT) | `node_Q4sxSAHaUscV3smL5OBnB` | `Discourse Graph/Caveats/` |

## Edge schema (relations.json is the source of truth)

- `EVD —supports/opposes→ CLM` (`relation_BO5Bt…` / `relation_Qtuz…`)
- `CVT —qualifies→ EVD` (`rel_o0a9NeAmWnhFBaVLNiJ1g`)
- `{SRC, CLM, EVD} —informs→ QUE`; `CLM —supports/opposes/informs→ CLM` (`relation_OxKXi9…` for informs)
- `QUE —informs→ QUE` — a **sub-question informs its parent** (question hierarchy). Authored on the
  child QUE under `## Broader question` (lists the parent `[[QUE]]`); the lodestar is the root.

`relations.json` is **canonical for edges** — co-equal with the vault markdown, not a build
artifact (`export_rdf.py`: "the vault + relations.json stay the source of truth; graph/ is
regenerated"). It has **two writers**, and both are legitimate:

1. **The Obsidian plugin's UI** writes edges straight into `relations.json` (`addRelation` →
   `saveRelations`). Edges made this way have **no wikilink representation** in any node body.
   (Edges used to live in frontmatter; `migrateFrontmatterRelationsToRelationsJson` was a
   one-time move into `relations.json`.)
2. **`utils/sync_relations.py`** parses wikilinks from body sections (see Skill-references "Edge
   authoring") and materializes any that are missing. It is **additive and idempotent** — it
   preserves existing edge records untouched and only appends. This is the AI/scripted authoring
   path.

So body wikilinks are *one* way to author an edge, not the definition of one; `export_rdf.py`
drops those body sections on export precisely because the edges are already in `relations.json`.
Anything that must hold for *every* edge (e.g. an appraisal annotation) therefore belongs on the
edge record, not in a body section. A generated nested index
(`build_dgraph.py`) and Bases provide review/navigation.

## Tags & fields

Every QUE/CLM/EVD carries domain-facet tags + **exactly one** `epistemic/*` tag
(`mechanism` | `effect-size` | `measurement`). Domain facets (also mirrored as YAML list fields on
EVD/CLM for `.base` filtering): `languageConcordanceFactor/*`, `healthOutcome/*`,
`deliveryContext/*`. Vocabulary seeds in `Variables.md`; extend as extraction surfaces new values.

## Governance — propose, don't commit

AI **extracts** EVD/CLM/CVT and **proposes** cluster/subtask merges and evidence-summary cell values.
The **human commits** (accept/reject per item). Never auto-fill the evidence-summary table. See Skill-synthesis.

> **EP retired (2026-06).** The EvidencePattern node type (row above) is no longer authored. A
> body-of-evidence judgment now lives **on the CLM** as a `certainty` field + `## Evidence appraisal`
> section (GRADE-style). **That appraisal is an expert/clinician task — AI does NOT draft it** (leave
> `certainty` blank). Reify a node only if one claim's evidence must be graded as separate sub-bodies.
> `propose_eps.py` is paused. The one prior EP was re-homed as a CLM. **Canonical record of this and
> all other methodology decisions: `plans/methodology-decisions.md`.**

## Pipeline order (after authoring node files)

```
python3 utils/quote_pipeline.py             # verbatim quote-region crops
python3 utils/ground_figures.py             # embed extracted figure/table FIRST per EVD
python3 utils/sync_relations.py             # wikilinks → relations.json edges
python3 utils/build_dgraph.py               # nested QUE→CLM→EVD(→CVT) index
python3 utils/verbatim_audit.py             # quote ↔ PDF fidelity
python3 utils/attachment_audit.py           # graph invariants
python3 utils/readability_pass.py           # mechanical formatting
```

## Conventions

- AI-authored nodes: set `nodeTypeId` + generate `nodeInstanceId` (UUIDv7:
  `python3 -c "import uuid; print(uuid.uuid7())"`) in frontmatter. `showIdsInFrontmatter:false` only
  hides them in the UI.
- Verbatim quotes for every substantive statement; atomicity (one finding/claim/limitation per node).
- NodeFormality starts `draft`; promote after audits pass.
- `curationStatus` (human-AI review axis, distinct from NodeFormality) on every synthesis node:
  `Initial AI draft` → `In expert review` → `Expert-verified`. AI always starts at `Initial AI draft`;
  only the human advances it. `export_rdf.py` maps it to the site's `status` (topology filter + node badge).
- Reference files, don't restate them: `Skill.md` (workflow), `Skill-references.md` (rules/naming/tags),
  `Skill-templates.md` (templates), `Skill-synthesis.md` (cross-paper).
