---
type: pipeline-spec
script: utils/build_site.py
updated: 2026-06-05
---
# build_site.py — design note

Usage + spec live in the module docstring (`utils/build_site.py`). This note holds the **why**, the
**limitations**, and the **roadmap**. Part of [[Pipeline]].

**In one line:** a zero-dependency, zero-build static-HTML view of the discourse graph — the **v0**
prototype, now superseded by the vendored RDF renderer (see [[export_rdf]] / `plans/site-view.md`).

## Design decisions

- **Zero-dependency, openable directly.** Pure Python + `markdown`; emits flat `site/*.html` you open
  with `file://`, no server/build. Built as the fastest possible "see the graph" prototype.
- **`nodeInstanceId` as the page filename** — stable, no escaping of long node titles.
- **Reads `relations.json` for edges**, renders Obsidian wikilinks → internal links and `![[img]]`
  embeds → `<img>`, with a per-type color legend + a client-side type/text filter.

## Known limitations

- **Superseded.** The RDF-schema view ([[export_rdf]] + vendored `site/`) is the path forward — it has
  the graph viz, search, and the contribute/discussion surface. `build_site.py` is kept as a
  no-toolchain fallback / offline snapshot, not the primary view.
- No graph visualization, no real search, no per-node discussions.
- Output dir collides with the vendored app's `site/` — kept out of the way; not run by default.

## Future — "smarter later"

- Likely retire once the RDF renderer is the canonical view; or repoint its output (e.g. `site-static/`)
  if a dependency-free snapshot stays useful.
