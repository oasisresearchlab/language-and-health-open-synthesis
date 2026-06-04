---
type: pipeline-spec
script: utils/build_dgraph.py
updated: 2026-06-04
---
# build_dgraph.py — design note

Usage + spec live in the module docstring (`utils/build_dgraph.py`). This note holds the **why**, the
**limitations**, and the **roadmap**. Part of [[Pipeline]].

**In one line:** render `relations.json` + node frontmatter into one nested QUE→CLM→EVD→⚠️CVT index
(`DGRAPH.md`) plus an EvidencePatterns section — read-only, fully regenerable.

## Design decisions

- **`relations.json` is the source of truth.** Edges live in the plugin's instance-edge store, so the
  index reads them there rather than re-parsing wikilinks. `sync_relations.py` already materialised
  body links into that store; this script only renders it.
- **Resolve nodes by `nodeInstanceId`, not filename.** Frontmatter maps each instanceId to its name
  and type, and every edge endpoint is looked up that way — so renames don't break the join.
- **Hardcode the plugin's node-type and relation ids.** The `TYPE`/`REL` tables pin the Discourse
  Graph plugin's opaque ids to short tags (QUE/CLM/EVD/CVT/EP/...). It keeps the renderer dependency-
  free, at the cost of being coupled to one plugin install.
- **Fixed nesting QUE → CLM (informs) → EVD (supports/opposes) → CVT (qualifies).** This mirrors the
  discourse-graph grammar; `opposes` EVDs are shown inline under their CLM with an `✗ (opposes)` mark
  so contradicting evidence stays visible.
- **EvidencePatterns get their own section** with a distinct-paper count per EP, so cross-paper
  strength is legible at a glance alongside the QUE-rooted tree.
- **Read-only, regenerable artifact.** `DGRAPH.md` is derived; it is safe to delete and rebuild, and
  the script never writes node files or edges.

## Known limitations

- **Plugin-schema-coupled.** If the Discourse Graph plugin reassigns node-type or relation ids, the
  lookup tables silently mistype nodes/edges (`?`) and the index degrades.
- **Only QUE-rooted content is nested.** Nodes not reachable from a QUE via the fixed chain (e.g. a
  CLM with no QUE, an orphan EVD) don't appear in the tree — by design this is a *view*, not an audit;
  `attachment_audit.py` is what flags orphans.
- **Primary-facet-blind / no de-dup.** An EVD linked under multiple CLMs is listed under each; there is
  no cross-reference back-link.
- **Paper count leans on the filename.** EP paper counts use `citekey` frontmatter, falling back to the
  `@citekey` filename suffix — a mis-named file would be miscounted.
- **No effect direction or strength shown** beyond the EP paper count; the index is structural, not
  interpretive.

## Future — "smarter later"

- **Schema ids from config, not constants:** read the plugin's node-type/relation ids from its
  settings file so the renderer survives a plugin reinstall.
- **Orphan annotations inline:** mark nodes that fail an `attachment_audit` invariant (e.g. ungrounded
  CLM) right in the index instead of only in the separate audit report.
- **Per-EVD caveat/figure badges:** surface whether an EVD carries a grounded figure/table or open
  caveat, so the tree doubles as a coverage map.
- **Bidirectional links / shared-EVD callouts:** show when one EVD supports several CLMs so reuse is
  visible.
- **Alternate roots:** offer EP-rooted or factor×outcome-rooted views of the same graph for synthesis,
  not just the QUE-rooted tree.
