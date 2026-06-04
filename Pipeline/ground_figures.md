---
type: pipeline-spec
script: utils/ground_figures.py
updated: 2026-06-04
---
# ground_figures.py — design note

Usage + spec live in the module docstring (`utils/ground_figures.py`). This note holds the **why**,
the **limitations**, and the **roadmap**. Part of [[Pipeline]].

**In one line:** crop the actual figure/table a finding cites out of the source PDF and embed it
FIRST in the EVD's Description, so the EVD's keyImage is the visual evidence.

## Design decisions

- **Find the CAPTION, not a mention.** "Table 3 shows…" in body text is *not* the table. The locator
  scores blocks that START with `Table N` / `Figure N`, using a **verb-exclusion heuristic** —
  penalising a following mention-verb (`shows`, `reports`, `presents`, …) or a leading `(`, and
  rewarding a title-case caption — so the crop anchors on the real caption block. A `search_for()`
  pass is a last-resort fallback.
- **Embed the figure/table FIRST.** The EVD nodeType has `keyImage:true`, so the *first* image in the
  Description becomes the node's keyImage; the crop is injected at the top of `## Description` to claim
  that slot.
- **PDF caption search is the primary path.** Route-B figure/table manifests
  (`data/figures_pdf/<citekey>/manifest.json`) were often empty, so grounding relies on searching the
  PDF directly. The manifest is used only as a *precise table bbox* when present on the caption page.
- **Kind-specific cropping.** FIGURE: crop the nearest embedded image + caption; vector figures (no
  raster image) fall back to the half-page containing the caption. TABLE: prefer the precise Route-B
  bbox, else crop a generous region around/below the caption (tables sit under their caption).
- **Idempotent + dry-run by default.** Skips an already-present `![[...]]` embed (and a cached PNG)
  unless `--force`; `--apply` is required to write crops or edit bodies. The dedup key ignores any
  `-pNN` page suffix so re-runs don't double-embed.
- **Per-PDF document cache** so a citekey's PDF is opened once across all its EVDs.

## Known limitations

- **Full-text-only papers can't be grounded.** No PDF in `data/pdfs/` → no crop (reported as
  `no-pdf`); these EVDs stay text-only.
- **Caption heuristic is fragile.** Multi-column layouts, captions split across blocks, "Fig. 3a/b"
  sub-panels, or supplementary-only figures defeat the block scorer and fall to the coarse
  `search_for()` fallback.
- **Crops are bounding-box approximations.** The nearest-image and region-around-caption heuristics
  can clip a multi-panel figure or grab an adjacent table; vector figures degrade to a whole half-page.
- **Route-B bbox depends on a populated manifest** — when the manifest is empty (the common case) the
  precise table bbox is unavailable and the generous-region crop is used.
- **Reference regex is literal.** Only `(Fig N)` / `(Table N)`-style numeric references are detected;
  named or lettered references are missed.

## Future — "smarter later"

- **Layout-aware extraction** (column/region detection or a doc-layout model) to crop exact figure and
  table regions instead of bbox heuristics.
- **Populate Route-B manifests reliably** so precise bboxes — not caption-region guesses — drive every
  table crop.
- **Vision-model verification:** confirm the cropped image actually is "Figure N" before embedding,
  catching mis-anchored captions.
- **Supplementary + OA-XML grounding** for figures absent from the main PDF, and a path for full-text-
  only papers.
- **Sub-panel support** for "Fig 3a/b" so a finding embeds just the panel it cites.
