---
type: pipeline-spec
script: utils/export_rdf.py
updated: 2026-06-05
---
# export_rdf.py — design note

Usage + spec live in the module docstring (`utils/export_rdf.py`). This note holds the **why**, the
**limitations**, and the **roadmap**. Part of [[Pipeline]]; full plan in `plans/site-view.md`.

**In one line:** transform the canonical graph into the jring-o/rdf content-addressed schema so the
vendored Next.js renderer (`site/`) can render it — a one-way generated view.

## Design decisions

- **One-way, generated.** The vault + `relations.json` stay canonical; `graph/` is regenerated and
  gitignored. No round-trip (yet) — keeps the transform simple and the source of truth singular.
- **Hybrid type mapping** (user call): EvidencePattern → `evidencepattern` (P) and Artifact →
  `artifact` (A) are first-class **extended** types (their schema added Method the same way), but
  **Caveats are folded** into the qualified Evidence body as a `## Caveats` section. Rationale: EP/ART
  are central and distinct; caveats are cheaper to inline than to teach the renderer a new type+edge.
- **Edges from `relations.json`, not body lists.** `informs`(CLM→QUE)→`addresses`; `supports`/
  `opposes` direct; `qualifies` folded. `derivedFrom` comes from the EVD `Source:` field; `usesArtifact`
  is parsed from `[[ART …]]` body mentions (we have no ART edge in the plugin grammar).
- **Body is flattened to prose.** Drop the wikilink-list sections (Supporting Evidence, etc. — now
  carried by frontmatter edges), strip callouts, rewrite `[[wikilinks]]` → their `X-NNNN` IDs so the
  renderer's citation plugin linkifies them. Sources use their abstract as the body.
- **Figures travel with the export.** Image embeds → `![](/attachments/…)` and the crops are copied
  into `site/public/`, so figure grounding survives into the view.
- **Only referenced sources exported** (cited by an EVD `Source:`), not all 785 — keeps the view lean.

## Known limitations

- **IDs aren't stable across node-set changes.** They're assigned by sorting on `nodeInstanceId`, so
  adding/removing a node reshuffles the sequential `E-NNNN`. Fine for a regenerated view, but it must
  be fixed (persisted ID map) before GitHub-discussion-by-ID is meaningful.
- **Caveat fidelity lost** — caveats are inlined text, not addressable nodes; the `qualifies` edges
  disappear from the view.
- **`usesArtifact` is loose** — derived from a body `[[ART]]` mention scanned over the *whole* body
  (including dropped sections), so e.g. the EP picks up an artifact it only mentions as "related".
- **Figures only for PDF-backed papers** (no crop exists otherwise); full-text-only EVDs show no image.
- **Body flattening is heuristic** — section-name matching + regex; an unusual heading slips through.

## Future — "smarter later"

- **Stable IDs** via a persisted `nodeInstanceId → X-NNNN` map.
- **Round-trip editing**: contributions to `graph/` PR'd on GitHub sync back to the vault.
- Promote Caveat to a first-class extended type (+ `qualifies` edge) in the renderer for full fidelity.
- Wire quote-region crops + serve them too; richer source-node bodies; deploy (CI runs the export).
