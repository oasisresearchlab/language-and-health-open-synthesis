# Product

## Register

product

## Users

Three roles, one source of truth (a paper's PDF):

- **Research assistants (triage).** Run the *completeness* pass — for each result the
  paper enumerates (abstract result-sentences, tables, figures), confirm what the AI
  already captured, promote what it missed, dismiss what isn't a result. Recognition,
  not recall. Target: one paper in well under 10 minutes.
- **Clinicians (verify).** Run the *accuracy* pass — check each extracted evidence node
  against the PDF on a per-dimension checklist (verbatim fidelity · grounding · claim
  link & polarity · quantitative fidelity · methods). Busy, expert, time-poor; they
  trust the judgments they record and expect the tool to respect their time.
- **Maintainer (review the reviews).** Works the queue — triage, spot reviewer
  disagreement, accept/reject/edit, and advance each node's `curationStatus`.

A fourth audience reads the **public discourse-graph site** (graph topology, nodes,
sources, narratives) — researchers and clinicians browsing the synthesis itself.

## Product Purpose

Make it fast and trustworthy for busy reviewers to verify, edit, and approve AI
extractions from the language-concordance / LEP healthcare corpus, with the source PDF
always present as grounding context and full provenance preserved. Every checklist
verdict is simultaneously a human label on an LLM output — the review app doubles as a
labeling engine for a reusable extraction benchmark. Success: reviewers move through
papers quickly, surface real errors and gaps, and the recorded judgments are clean
enough to ground both the discourse graph and the benchmark.

## Brand Personality

**Precise · exacting · quiet.** An instrument, not a dashboard. Function first; the
beauty is in the precision — considered components, legible state, nothing decorative
competing with the PDF and the evidence. Warmed (not softened) by the existing **Cream +
Forest** palette: paper-cream surfaces, deep-evergreen accent — scholarly and grounded,
the feel of a well-set research tool rather than enterprise medical software. The tool
should disappear into the task.

## Anti-references

- **Sterile EHR / hospital software** (Epic/Cerner) — cluttered, gray, joyless, dated.
- **Generic SaaS dashboard** — gradient cards, hero-metric templates, purple-on-white,
  identical card grids, the AI-startup look.
- **Consumer / playful** — rounded toy UI, big emoji, gamification, bright primaries.
- **Heavy data-viz / BI tool** — charts and widgets crowding out the actual reviewing
  task. The work here is reading-and-judging, not dashboarding.

## Design Principles

1. **The tool disappears into the task.** Recognition over recall; the common case
   (AI guessed right) is one click. Effort scales with disagreement, not with every row.
2. **The source is the authority.** The PDF and the extracted evidence are always
   present and always win; the UI exists to verify against them, never to decorate.
3. **State is legible at a glance.** Verdicts, progress meters, and what-needs-attention
   read instantly — and never by color alone (icon + label carry the same signal).
4. **Propose, don't commit.** The human is the committer. AI output is always shown as
   reviewable and provisional; the interface never implies an extraction is settled.
5. **Earned familiarity.** Standard affordances, executed precisely. Novelty only where
   it genuinely speeds the work — never invented for flavor.

## Accessibility & Inclusion

- **WCAG AA contrast** for all text and UI, in both light and dark themes; placeholder
  and muted text held to the same bar (no light-gray-for-elegance).
- **State is never color-only** — every verdict / status pairs color with an icon and a
  text label (also serves color-blind reviewers).
- **Keyboard-first review** — reviewers can move through checklists without a mouse;
  visible focus rings, logical tab order, sensible shortcuts for verdicts.
- **Reduced motion respected** — motion conveys state, never gates it; honor
  `prefers-reduced-motion`.
