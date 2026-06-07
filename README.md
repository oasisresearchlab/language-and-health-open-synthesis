# language-and-health-open-synthesis

An open, AI-assisted, expert-curated **evidence synthesis** of how language
concordance — matching patients with providers or interpreters who share their
language — affects healthcare outcomes.

Rather than compressing the literature into a single narrative review, the
synthesis is published as a **discourse graph**: every Question, Claim, piece of
Evidence, Caveat, and Source is its own addressable node, linked by typed edges,
so you can trace what holds, for whom, and under what conditions.

## Lodestar question

> How does language support (language "concordance") affect healthcare outcomes?

Sub-questions cover the effects of concordance on quality and cost, the effects
of **discordance**, the distribution of discordance need, and how to optimize
delivery of concordance services. (See `Discourse Graph/Questions/`.)

## Node types

| Type | Folder |
|---|---|
| Question (QUE) | `Discourse Graph/Questions/` |
| Claim (CLM) | `Discourse Graph/Claims/` |
| Evidence (EVD) | `Discourse Graph/Evidence/` |
| Source (SRC) | `Discourse Graph/Sources/` |
| EvidencePattern (EP) | `Discourse Graph/EvidencePatterns/` |
| Artifact (ART) | `Discourse Graph/Artifacts/` |
| Caveat (CVT) | `Discourse Graph/Caveats/` |

Edges (`EVD —supports/opposes→ CLM`, `CVT —qualifies→ EVD`, `CLM —informs→ QUE`,
…) are authored as wikilinks in node bodies and materialized into
`relations.json`. See `CLAUDE.md` for the full schema and pipeline.

## Human–AI curation

Extraction is **AI-assisted**; commitment is **human**. An AI pipeline drafts
nodes from the source papers (every quote grounded verbatim); domain experts then
review and verify. Each synthesis node carries a `curationStatus`:

`Initial AI draft` → `In expert review` → `Expert-verified`

AI always starts a node at `Initial AI draft`; only a human advances it. The
status is surfaced on the site as a topology filter and a per-node badge.

## The site

`site/` is a Next.js renderer of the graph (topology view, per-node pages,
composed narratives, and a contribute flow). It reads from `graph/`, a one-way
RDF-schema export produced by `utils/export_rdf.py` from the canonical
`Discourse Graph/` vault + `relations.json`.

```bash
python3 utils/export_rdf.py        # Discourse Graph/ → graph/
cd site && pnpm install && pnpm dev # serve at http://localhost:3000
```

## Repository layout

- `Discourse Graph/` — canonical node files (the source of truth)
- `relations.json` — materialized edges
- `graph/` — generated RDF-schema export the site consumes (regenerate freely)
- `site/` — Next.js renderer
- `utils/` — extraction, grounding, audit, and export pipeline (see `Pipeline.md`)
- `CLAUDE.md`, `Skill*.md` — operating rules, schema, templates, and methodology

Content: CC BY 4.0 · Code: MIT · OASIS Research Lab
