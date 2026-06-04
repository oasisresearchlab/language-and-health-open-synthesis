# utils/

Scripts for the language-concordance synthesis pipeline.

- **Current pipeline** (13 scripts) — see [`../Pipeline.md`](../Pipeline.md) for the overview +
  process diagram, and `../Pipeline/<script>.md` for each script's design note (decisions /
  limitations / future). Usage + spec live in each script's module docstring.
- **`deprecated/`** — the original CSV→notes + abstract-mining + claim-matching + full-text-fetch
  utilities, kept for provenance. None are used in the current flow; see `deprecated/README.md`.
- **`templates/`** — Obsidian node templates (`T - *.md`) used by the Discourse Graphs plugin.
