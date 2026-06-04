---
type: pipeline-spec
script: utils/sync_relations.py
updated: 2026-06-04
---
# sync_relations.py — design note

Usage + spec live in the module docstring (`utils/sync_relations.py`). This note holds the **why**,
the **limitations**, and the **roadmap**. Part of [[Pipeline]].

**In one line:** materialise body wikilinks into the plugin's `relations.json` with the correct
schema direction — additive, idempotent, one authoring location per edge.

## Design decisions

- **Node bodies author edges; this script is the bridge.** Editing JSON by hand is error-prone, so
  edges are declared as wikilinks under conventional headings in node bodies, and this script
  materialises them into `relations.json` (the Discourse Graphs plugin's instance-edge store). The
  human-readable Markdown is the source of truth.
- **Correct schema direction per rule.** Each `(node-type, heading)` maps to a `SECTION_RULE` fixing
  the relation type AND the **direction** — `"in"` means the *linked* node is the edge source and
  this node the destination (e.g. EVD —supports→ CLM, even though the link lives in the CLM body);
  `"out"` is the reverse (CVT —qualifies→ EVD). This keeps the plugin's edge orientation correct
  regardless of which body authored it.
- **One authoring location per edge.** Each edge is declared in exactly one body (see Skill-references
  "Edge authoring"), so there's a single place to read/change it and no double-counting.
- **Type-guard against legacy links.** A linked node whose type ≠ the rule's expected type is skipped
  and reported as *mismatched* — this is how legacy `[[@Source]]` links under an Evidence section
  (which point at a paper, not an EVD) are ignored rather than materialised as bad edges.
- **Additive + idempotent, no prune.** An edge is added only if no edge with the same
  `(source, destination, type)` already exists; existing edges are never removed. Re-runs are safe and
  converge. (Consequence: deletions in bodies are *not* propagated.)
- **Dry-run by default.** Reports the edges (and unresolved/mismatched links) that *would* be added;
  `--apply` is required to write `relations.json`.
- **UUIDv7 edge ids + `lastModified`** so generated edges sort by creation time and the store stays
  compatible with the plugin.

## Known limitations

- **No prune / no sync-down.** Removing a wikilink from a body does not delete the edge; the store
  drifts from the bodies on deletions and must be cleaned by hand.
- **Heading- and convention-bound.** Only the exact `(node-type, heading)` pairs in `SECTION_RULES`
  are recognised; a typo'd or renamed heading silently authors nothing.
- **Plain `[[...]]` wikilinks only.** Aliased/blockref/heading links are parsed to their base target;
  links the regex doesn't catch are missed.
- **Requires frontmatter ids.** A node missing `nodeInstanceId`/`nodeTypeId` can't be an endpoint —
  its links land in the *unresolved* report.
- **Silent on duplicates within a body.** The same link repeated in one section just dedups to one
  edge; it won't warn about redundant authoring.

## Future — "smarter later"

- **Reconciling sync (opt-in prune):** detect edges whose authoring wikilink no longer exists and
  offer to remove them, so bodies fully own the edge set.
- **Validate against the audits:** wire the mismatched/unresolved reports into the attachment audit so
  bad/legacy links fail loudly instead of being silently skipped.
- **Migrate legacy `[[@Source]]` links** to proper EVD links automatically, retiring the type-guard
  workaround.
- **Richer link parsing:** handle aliases/headings/blockrefs so authoring isn't constrained to bare
  wikilinks.
- **Per-edge provenance:** record the authoring file on each materialised edge so the graph can point
  back to where a relation was declared.
