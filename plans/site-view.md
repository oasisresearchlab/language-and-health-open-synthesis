# Plan: static site view of the discourse graph

## Goal

A browsable web view of the discourse graph, patterned after [rdf.scios.tech](https://rdf.scios.tech/)
and built by **adapting its renderer** ([github.com/jring-o/rdf](https://github.com/jring-o/rdf)) — a
Next.js app that renders a content-addressed discourse graph with per-node pages, a force-directed
graph view, search, and (later) GitHub-backed discussions + a `/contribute` PR flow.

## Decision — one-way generated view

The **Obsidian vault + `relations.json` stay the source of truth.** The RDF-schema `graph/` directory
is a **generated view** (regenerate any time; never hand-edited). The richer editing surface
(contributions flowing back to the vault) is deferred — see "Future".

## Architecture

```
Discourse Graph/**/*.md + relations.json   (canonical)
        │  utils/export_rdf.py   (the transform)
        ▼
graph/<type>/<ID>.md            (their content-addressed schema, EXTENDED)   ← gitignored
        │  site/scripts/build-graph-data.mjs
        ▼
site/lib/graph-data.generated.json
        │  Next.js app (site/, vendored from jring-o/rdf + adapted)
        ▼
localhost:3000   — node pages, /graph, /nodes, color-coded by type
```

## Schema mapping (hybrid — EP/ART as first-class extended types, Caveat folded)

| Ours | → RDF schema |
|---|---|
| QUE / CLM / EVD / SRC | question (Q) / claim (C) / evidence (E) / source (S) |
| EP | **evidencepattern (P)** — extended type |
| ART | **artifact (A)** — extended type |
| CVT | folded into the qualified Evidence node's body as a `## Caveats` section (no node) |
| `informs` (CLM→QUE) | `addresses` |
| `supports`/`opposes` (EVD→CLM/EP, CLM→CLM) | same |
| EVD `Source:` field | `derivedFrom` (E→S) |
| body `[[ART …]]` mention | `usesArtifact` (E/C→A) — extended edge |
| `qualifies` (CVT→EVD) | folded (no edge) |

IDs are zero-padded per type (`E-0017`, `P-0001`), assigned by stable sort on `nodeInstanceId`.
Only **referenced** sources are exported (those cited by an EVD's `Source:`).

## Renderer adaptation (in vendored `site/`)

Extended for the 2 new node types + `usesArtifact` edge: `lib/types.ts`, `lib/graph.ts`,
`lib/remark-graph-citations.ts` (`[QCEMS]`→`[QCEMSPA]`), `scripts/build-graph-data.mjs` (regexes +
TYPE_DIRS + EDGE_TYPES), colors (`graph-view.tsx`, `graph-filters.tsx`, `node-badge.tsx`,
`globals.css` — EP `#3b82a6`, Artifact `#ce5555`), and the contribute/api `Record<NodeType>` maps for
exhaustiveness. `tsc --noEmit` clean.

## Figures

`export_rdf.py` converts `![[fig.png]]` → `![](/attachments/…)` and copies crops
(`attachments/` + `data/attachments/`) into `site/public/attachments/`. **13 evidence nodes render
their grounding figure/table inline.**

## Run / regenerate

```bash
python3 utils/export_rdf.py                       # vault → graph/ (+ copy figures to site/public)
cd site && node scripts/build-graph-data.mjs      # graph/ → graph-data.generated.json
npx next dev -p 3000                               # serve (pnpm not on PATH; npx avoids it)
# open http://localhost:3000
```

## Status — what works / what doesn't

- ✅ Read-only view: landing stats, `/graph` viz, `/nodes`, per-node pages with typed edges + figures.
  97 nodes (6Q · 29C · 43E · 16S · 1P · 2A), caveats folded into 34 evidence bodies.
- ❌ Contribute / discussions / AI narratives: present in the UI but need GitHub OAuth + OpenRouter
  env — not wired (matches the read-only decision).
- ❌ Deploy: not set up. Since `graph/` is gitignored, a deploy must run `export_rdf.py` +
  `build-graph-data` in CI before `next build`.

## Future

- **Round-trip editing surface** — wire the contribute flow so PR'd node edits sync back to the vault.
- **Stable IDs** — current IDs shift when the node set changes (sort-by-instanceId); needed before
  GitHub-discussion-by-ID is meaningful.
- Deploy (Vercel / static export); quote-region crops; richer source-node bodies; refine the loose
  `usesArtifact` edge.

## Provenance

`site/` is vendored from [jring-o/rdf](https://github.com/jring-o/rdf) (their original schema kept at
`site/SCHEMA-original.md`) and adapted for our domain + extra node types.
