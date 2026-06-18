# Review app — human review & approval of AI extractions

Companion to `plans/reviewing-ai-extractions.md` (the original brain-dump, kept intact). This is the
structured plan. Goal: make it easy for **busy doctors and research assistants** to review, edit, and
approve AI extractions from a paper, with the PDF served as grounding context and provenance preserved.

## Decisions locked

- **Reviewers — two tiers:** *RAs triage* (completeness + mechanical passes), *clinicians verify*
  (claim polarity, quantitative fidelity, methods). Checklist items split by role.
- **Backend — Supabase:** magic-link email auth (no GitHub, no passwords), Postgres for review
  records, storage for PDFs. The static Vercel site can't capture writes; this is the one box that
  gives auth + DB + file storage together.
- **First slice to build — the completeness pass** (riskiest idea; cheapest to falsify). v1 anchors =
  **abstract result-sentences + tables/figures**.

## Build status (2026-06-16)

Both passes are built and running on `review-app-prototype`. Routes:
`/review` (hub) · `/review/[citekey]` (completeness) · `/review/accuracy` +
`/review/accuracy/[citekey]` (accuracy) · `/review/guide` (reviewer onboarding).

**Completeness pass (done).** Anchors precomputed by `utils/build_review_anchors.py`
→ `data/review/` (gitignored). Objects enumerated from **PDF caption text** (not the
image manifest, which misses text-rendered tables); abstracts restricted to
**Results + Conclusions** for structured abstracts. Table/figure cards: multi-map to
≥1 EVD (checkboxes + inline EVD preview), add brand-new EVDs, flag a gap, or mark
"nothing to capture". Abstract cards keep covered / promote / not-a-result.

**Accuracy pass (done — for tomorrow's pilot).** Reviews existing EVDs against the
PDF. Data reused from the exported `graph/` via `site/lib/review-accuracy.ts`
(`buildEvd` parses Description/quotes/grounding/Methods What·How·Who/caveats and
resolves the linked CLM + polarity from edges). UI: `accuracy-pane.tsx` — PDF left,
per-EVD checklist right. Checklist = **core-4 + methods** (verbatim · grounding ·
claim-link/polarity · quant · methods), each `✓ correct / ✎ edit / ✗ wrong / — n/a`
+ per-EVD note. Batch = `ACCURACY_BATCH` (Allan + Karliner pilot).

**Accounts (minimal, real).** Identity = **preset roster, pick-your-name** (no
passwords) — `reviewers` table; judgments attributed via `reviewer_id`/`reviewer_name`.
This *supersedes* the original "no auth, identity typed" prototype scope below, because
tomorrow's test needs per-person attribution and central collection.

**Backend.** Supabase (`supabase/schema.sql` + `supabase/README.md` setup). The
client (`site/lib/supabase.ts`, `accuracy-store.ts`) **degrades to localStorage** when
env vars are absent, so the UX is testable before Supabase is wired. Each judgment is
one upsert row keyed `(reviewer_id, node_id, dimension)`.

**Tests.** `site` Vitest (`pnpm test`): `accuracy-store` (localStorage roundtrip +
scoping + Supabase upsert payload/conflict-key), `review-accuracy` (`buildEvd` parsing
+ polarity), `accuracy-pane` (identity gate → verdict click persists, attributed).
Python `pytest utils/test_build_review_anchors.py` (abstract segmentation + caption
regex). All green (13 JS + 7 py).

**PDF pane (pdf.js, done).** Replaced the native `<embed>` with a react-pdf pane:
exact bbox highlight overlays for every quote + figure/table (precomputed by
`build_quote_regions.py`), an in-document find box (manual search for the
no-grounding-quote case), reliable scroll-to-page, and a self-hosted worker
(`scripts/copy-pdf-worker.mjs` → `public/`, no CDN). Whole-figure region (vs
caption line) tracked in issue #6.

**Regenerating review data (gitignored `data/review/*.json`).** A fresh checkout
must rebuild the precomputes before the review routes show anything:

```
python3 utils/build_review_anchors.py --cluster                       # completeness anchors
python3 utils/build_accuracy_pages.py  @Allan_2022_impact_English @Karliner_2017_Convenient_Access   # journal→physical page map
python3 utils/build_quote_regions.py   @Allan_2022_impact_English @Karliner_2017_Convenient_Access   # exact quote/figure rects
```

(Match the citekeys to `ACCURACY_BATCH` in `site/lib/review-accuracy.ts`. PDFs are
served from the gitignored `data/pdfs/`.)

**Not yet (next):** the maintainer "review the reviews" queue; whole-figure bbox
(#6); magic-link auth; the instrumentation/benchmark freeze join; drag-to-recrop.

## Architecture: capture light, credit heavy

Git is the wrong layer for *capture* and the right layer for *credit*. Decouple them:

- **Capture** in the web app — reviewer never sees git; identity via email magic-link.
- **Credit** in git — the maintainer batch-applies accepted edits and commits with `Co-authored-by:`
  trailers naming the reviewer. Full git-blame provenance without making reviewers touch git.

A **review record** is a Postgres row, not a git object:
`{reviewer_id, role, node_id, citekey, checklist_item, verdict, proposed_diff?, note?, ts}`.
Node-level / paper-level catch-all notes are rows with `checklist_item = "_node" | "_paper"`.

**`curationStatus` is the spine** tying the app to the existing `export_rdf.py` status badge:
`Initial AI draft → completeness-reviewed (RA) → in-expert-review (clinician) → Expert-verified`.
A node advances when its checklist clears; the site reflects review state automatically.

## PDF-as-context UI (accuracy pass)

Two panes. The key asset is **coordinates** — checked, and the situation is *partial but cheap to close*
(there is no `quote_pipeline.py`; quotes live as blockquotes, figures go through `ground_figures.py`):

| Asset | Page? | BBox? | Path to highlight |
|---|---|---|---|
| **Quote** (EVD blockquote) | ✅ in citation `(Author, Year, p. N)` | ❌ but recoverable | Quotes are verbatim → render the cited page and call `page.search_for(quote)` at view time (fuzzy fallback for ligatures/line-breaks). **Universal**, no schema change, no precompute. |
| **Figure/table — Route-B PDFs** | ✅ | ✅ exact | `data/figures_pdf/<citekey>/manifest.json` (only ~116 PDFs, often empty). |
| **Figure/table — Route-A PMC** | ❌ | ❌ | JATS-derived, no PDF coords. |
| **Embedded figure crop** | computed then **discarded** | computed then **discarded** | `ground_figures.py` already computes `{page, bbox}` to crop — **persist it to a sidecar manifest** (one small change) to get exact coords for *every* grounded EVD across all papers. |

Net: page is universal today; exact bbox is **one `search_for()` call (quotes)** + **one persist-the-coords
change to `ground_figures` (figures)** away. The re-annotation flow reuses `ground_figures`'s existing
crop-from-bbox logic as an explicit-region mode. Highlight-on-load is realistic for v1.

- **Left — PDF (pdf.js)** opened to the source page, quote region highlighted as an overlay rectangle.
- **Right — the extraction:** quote, the CLM it supports (+ polarity), embedded figure/table, methods
  context, tags, caveats.
- **Correct grounding = annotate in place.** Mark grounding wrong → drag a rectangle on the PDF canvas →
  capture normalized `{page, x, y, w, h}` as a *proposed region*. On accept, the maintainer re-runs the
  crop for that region (human gives coordinates, pipeline regenerates the asset). Three grounding
  verdicts: **✓ correct / ✗ should be none / ✎ here's the right region**.
- **Crop adjustment is a first-class reviewer action (not just a correctness verdict).** Auto-grounded
  figure/table screenshots are produced by `ground_figures.py` as **generous caption-region crops**
  (especially for the many publisher PDFs whose tables are borderless/text-rendered, where Route-B
  structured extraction returns nothing and we fall back to cropping around the "Table N" caption).
  These crops are frequently a bit too loose/tight or include neighboring text — so reviewers need a
  lightweight **re-crop / drag-to-adjust** on the embedded image (tighten bounds, nudge the region),
  feeding the same `{page, bbox}` → re-crop path. Treat adjusting the crop as the common case, not the
  exception. (Source of the looseness: `extract_pdf_figures_tables.py` Route-B table recovery is weak
  on these PDFs — see the grounding-coverage note in `plans/getting-papers.md`.)

## Per-node accuracy checklist (clinician tier, ordered cheap→deep)

1. **Verbatim fidelity** — quote is the *right* sentence (not a coincidental string match). `verbatim_audit` checks the string; human confirms semantics.
2. **Grounding** — correct figure/table or correctly none (the three verdicts above).
3. **Claim link & polarity** — does this EVD support / oppose / not bear on the CLM it's wired to? Catches edge errors `sync_relations` can't.
4. **Quant fidelity & epistemic tag** — direction / magnitude / significance / CI faithful; `epistemic/*` tag right (mechanism | effect-size | measurement).
5. **Facet tags** — `languageConcordanceFactor / healthOutcome / deliveryContext` correct.
6. **Methods context + reporting guideline** — surface the decisive items of the design-appropriate
   guideline as yes/no sub-checks: RCT→**CONSORT**, observational→**STROBE**, review→**PRISMA**,
   qualitative→**COREQ/SRQR**. Double duty: guides the reviewer *and* emits structured methods-quality
   metadata (rigor badge / `.base` filter). Needs an explicit study-design field to auto-load the guideline.

Each row: `✓ / ✎(diff) / ✗ / —(N/A)` + optional note. Plus node-level and paper-level catch-alls.
Effort scales with disagreement: all-✓ is a few clicks; only edits demand typing. Optionally require
**2 reviewers** for contested item types (polarity, quant), 1 for mechanical ones (verbatim, tags).

## Reviewing the reviews (maintainer interface)

PR-review feel, but **semantic diffs on nodes, not text diffs on markdown**:

- **Queue** filterable by paper, reviewer, checklist-item-type ("every grounding correction"), and
  **disagreement** (two reviewers split on the same item — the rows worth attention).
- Each item: accept / reject / edit-then-accept → applies to markdown, commits co-authored, bumps `curationStatus`.
- Paper rollup: `unreviewed / in-review / reviewed / conflicts`, mirroring `curationStatus`.

---

# Completeness pass — first build (deep spec)

## The bet

Convert "what's missing?" (unbounded recall, exhausting) into "is each of *these* covered?" (bounded
recognition, fast) by anchoring on lists the **paper itself enumerates**. Target: an RA finishes one
paper in well under 10 minutes and reliably surfaces real gaps. If that doesn't feel good, the whole
missing-extractions strategy is wrong — which is why it's built first. **This is an RA-tier task.**

## Anchors (v1 = abstract + tables/figures) — all three sources already exist

1. **Abstract result-sentences** — the `abstract` field is already in every source note's frontmatter.
   Segment into sentences; keep result-bearing ones (heuristic: contains a number, p-value, CI, or a
   direction word — "associated/significant/increased/reduced/no difference"). Zero new extraction.
2. **Tables & figures** — already built: Route A `data/figures/<citekey>/manifest.json`, Route B
   `data/figures_pdf/`. Each = one anchor with label + caption + cropped image + an **exact PDF region**.
   Coverage-of-objects is a strong proxy for coverage-of-results.
3. *(Deferred to clinician tier)* **reporting-guideline outcomes** — an RCT's pre-specified outcomes
   "should" each have an EVD. Out of RA v1 (needs design judgment); surfaced in the verify pass.

## Lean on `#evd-candidate`

Source notes already carry AI-proposed `#evd-candidate` bullets. The RA confirms auto-links and promotes
the uncovered — not authoring. Pre-link each anchor to its best-matching candidate (keyword/embedding
overlap) with a confidence; most rows arrive pre-answered. RA's real work = low-confidence + unlinked.

## RA workflow

Right pane = anchor checklist with a live meter ("7/9 abstract claims · 3/4 tables mapped"). Each card:

- **✓ Covered** — confirm the suggested candidate/EVD (or pick another). One click when AI guessed right.
- **+ Promote** — result not captured → create a candidate by selecting the sentence in the PDF (reuses
  the region-annotation control) or typing. Becomes a proposed EVD.
- **✗ Not a result** — dismiss (boilerplate, background, method-only).

Left pane = PDF. Nuance: a **table/figure** anchor highlights its exact region (we have coords); an
**abstract** anchor highlights the *linked candidate's body sentence*, not the abstract block — the
result it summarizes lives in the body, and that's what needs grounding.

## Data model (Supabase)

```
reviewers(id, email, role[ra|clinician])
anchors(id, citekey, kind[abstract|table|figure], text|label, caption, region{page,bbox}|null, ord)
candidates(id, citekey, quote, region, origin[ai|ra], status[candidate|promoted|dismissed], src_node_id?)
coverage(anchor_id, candidate_id, created_by, confidence, ts)   -- m:n; AI pre-seeds, RA confirms
anchor_verdict(anchor_id, reviewer_id, state[covered|not_covered|not_a_result], note?, ts)
```

Anchors + candidates are **precomputed offline** from frontmatter + figure manifests and seeded into
Supabase; the app reads/writes only verdicts, coverage, promotions. PDFs in Supabase storage; reads can
hydrate from exported graph JSON so the app stays thin.

## Handoff (respects "propose, don't commit")

A promoted candidate is a **proposal**, not a node. Per-paper output:
- confirmed coverage links (existing EVDs cover these anchors),
- **promoted candidates** (quote + region) → queued for clinician verification → maintainer commits as
  real EVD nodes via the node-authoring pipeline,
- dismissed anchors.

Paper gains a `completeness-reviewed` flag that **gates** the clinician accuracy pass.

## Risks (how the bet fails)

- **Abstract over-segments** → RA fatigue. Mitigate: filter to result-bearing, allow merge/collapse, cap visible rows.
- **Bad auto-links erode trust** → RAs stop trusting ✓. Mitigate: show confidence, pre-confirm only high-confidence links.
- **Table→result mapping ambiguous** for dense tables. Mitigate: bar is "≥1 EVD touches this table," not per-cell.

## Prototype scope (build this first)

One paper, real data, **no auth, identity typed** (we're testing UX, not provenance): pdf.js left,
anchor checklist right from the real abstract + figure manifest, AI pre-links from `#evd-candidate`,
the three actions writing to local JSON (Supabase swap-in later). Success = watch an RA do 3 papers,
time it, count real gaps found.

---

# Instrumentation & benchmark dataset

The review app is a **labeling engine**: every checklist verdict is a human judgment on an LLM output.
Instrument the review you're already doing rather than running a separate annotation project. Two goals:
**(1) understand current LLM perf** on the extraction task (error analysis, per-dimension); **(2) build a
reusable benchmark** to score any future model/prompt against human ground truth.

## The two passes give you precision *and* recall

- **Accuracy pass → precision.** Each per-node checklist verdict (verbatim, grounding, polarity, quant,
  tags, methods) is a correctness label on an existing extraction → precision per dimension.
- **Completeness pass → recall.** The anchor coverage data — covered-by-AI vs human-promoted vs dismissed
  — *is* a recall measurement: of the results the paper enumerates, what fraction did the model surface?

Together: per-dimension precision/recall/F for the extraction task.

## The one non-negotiable: freeze the pre-review AI output

Markdown nodes get edited during review; if you only have the corrected node you've **lost the thing you're
evaluating**. At extraction time, snapshot the raw model output to an immutable store, separate from the
editable node. Without this the dataset cannot attribute performance to a model/prompt.

## Capture per reviewed item (the labeling schema)

- **input** — what the model saw: PDF (+ which pages/region), paper metadata, and the **pinned
  `model` + `prompt_version`/`skill_version`** that produced it. No version pin → no attribution.
- **model_output** — the frozen extraction (quote, region, claim link + polarity, tags, methods context).
- **human_label** — per-dimension verdict (`✓/✎/✗/—`), the corrected value (the diff), free-text rationale,
  **reviewer id + tier (RA vs clinician)**, timestamp.
- **provenance/telemetry** — `time_spent_ms`, `confidence`, and (when ≥2 reviewers) agreement.

## Beyond binary labels — richer signals for error analysis

- **Edit distance** between AI output and final accepted value per field → a continuous "how wrong" signal.
- **Time-to-review per dimension** → which dimensions are hard/expensive.
- **Disagreement rate per dimension** → label noise / task ambiguity (also flags hard cases).
- **Promotion rate** in the completeness pass → the recall gap, per paper / per facet.

## From labels to a benchmark

- **Gold set** = papers that reached `Expert-verified` with ≥2-reviewer agreement. Final corrected nodes
  are the gold extractions; per-dimension verdicts are gold labels. Disagreements are excluded from gold
  but kept as a "hard cases" split.
- **Inter-annotator agreement** (Cohen's/Fleiss' kappa per dimension) measures label reliability and tells
  you which dimensions are objective (mechanical) vs judgment-laden (clinical) — mirrors the RA/clinician split.
- **Eval harness:** given frozen `(input, prompt_version, model) → output` + gold labels, score the
  original model, and re-run any new model/prompt on the same inputs scored against gold (exact/fuzzy per
  field; LLM-as-judge for open dimensions like methods completeness). Define input/output schema + a
  per-dimension scoring rubric so the benchmark is reproducible (and potentially publishable).

## Data model additions (Supabase)

```
ai_extractions(id, node_id, citekey, model, prompt_version, raw_output_json, extracted_at)  -- IMMUTABLE
benchmark_items(id, citekey, input_ref, gold_output_json, gold_labels_json, agreement, split[gold|hard], status)
-- review records (above) join to ai_extractions on node_id to form labeled examples
```

## Cheap instrumentation hooks to add now

- Stamp every AI-authored node's frontmatter with `extraction_model`, `extraction_prompt_version`,
  `extracted_at` (the nodes already carry `curationStatus` + `nodeInstanceId`; this extends that).
- On each extraction run, write the raw output to `benchmark/extractions/<run_id>/` (immutable).
- The review-record rows already carry reviewer + diff + dimension; add `time_spent_ms` + `confidence`.

## Privacy

Reviewer judgments are attributable. For any published benchmark, anonymize/aggregate reviewer ids.

## Open questions

- ~~Coordinate availability~~ — **resolved** (see PDF-as-context table): page is universal via the
  quote citation; quote bbox via runtime `search_for`; figure bbox via a small `ground_figures` change.
- Study-design field: add to source frontmatter so the methods/reporting-guideline checks auto-load?
- Abstract segmentation quality on real abstracts — does the result-sentence heuristic hold up?
- 1- vs 2-reviewer bar per checklist item type for `Expert-verified`.

## testing notes

### accuracy pass [[2026-06-17]]

![[CleanShot 2026-06-17 at 17.35.37.png]]
confirmed pdf displays

tested export, seems to have appropriate data in it: 
`'/Users/joelchan/Projects/language-and-health-open-synthesis/plans/review-app/accuracy-Allan_2022_impact_English-Joel Chan.json'`

to fix:
- what to do if an element is missing? send back for another ai extract pass? seems useful to have that as a flag actually, separate from correct, edit, or wrong
- claim link and polarity should be a per-edge check. 
- we should include in-line tooltips to remind of the criteria, and a top-line link to open up the review criteria again
- table and quote anchors did not jump to the approrpiate spot int he pdf
- we should show the whole contents of the evd node and anchor the judgments to each section

### resolved [[2026-06-17]] (accuracy pass v2)

- **Missing → re-extract flag.** Added a 5th verdict on every judgment: `✓ correct /
  ✎ edit / ✗ wrong / ⟳ missing / — n/a`. "Missing" (violet) means the element is
  absent and the node should be re-extracted; its note is the re-extraction prompt.
  Counts toward the "flagged" tally, distinct from edit/wrong.
- **Per-edge polarity.** The claim-link/polarity check is now one judgment *per linked
  claim* (`dimension = polarity:<claimId>`), each next to its claim row + polarity
  badge. EVDs with no claim get a single "should it be linked?" row.
- **Inline tooltips + criteria link.** Each judgment label carries an ⓘ tooltip with
  its criterion; a "Review criteria" link in the header opens `/review/guide`.
- **PDF jump fixed.** Root cause: quotes cite the *journal* page (p. 7387) but `#page=`
  needs the *physical* page. `utils/build_accuracy_pages.py` maps journal→physical via
  PDF page labels (firstpagenum), falling back to quote `search_for`; the loader
  overrides `evd.page` so the jump lands. (Native `<embed>` honors `#page=` in Chrome;
  Safari may not — the real fix is the parked pdf.js pane.)
- **Full node, section-anchored judgments.** The card now renders the whole EVD —
  Evidence & quote, Grounding, Claim links, Methods (What/How/Who), Synthesis note,
  Caveats — with each judgment placed beside the section it scores (verbatim + quant on
  the quote, grounding on the figure, polarity per claim, methods on What/How/Who).

still open: native PDF jump unreliable in Safari (→ pdf.js); region-overlay highlight +
drag-recrop; maintainer "review the reviews" queue.