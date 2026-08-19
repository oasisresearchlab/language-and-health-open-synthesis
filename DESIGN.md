---
name: Language & Health Open Synthesis
description: A precise, instrument-like review surface for verifying AI-extracted discourse-graph evidence against source PDFs — Cream + Forest.
colors:
  forest: "#14532d"
  forest-lifted: "#4ade80"
  paper: "#faf7f0"
  ink: "#1a1410"
  card: "#ffffff"
  secondary-surface: "#f0ebde"
  muted-surface: "#f3eee2"
  accent-wash: "#e6efe0"
  muted-ink: "#6b6660"
  border: "#e7e2d6"
  destructive: "#b91c1c"
  verdict-correct: "#10b981"
  verdict-edit: "#f59e0b"
  verdict-wrong: "#f43f5e"
  verdict-missing: "#8b5cf6"
  node-question: "#2563eb"
  node-claim: "#b45309"
  node-evidence: "#15803d"
  node-method: "#7c3aed"
  node-source: "#57534e"
  node-artifact: "#ce5555"
typography:
  heading:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.06em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "0.3rem"
  md: "0.4rem"
  lg: "0.5rem"
  full: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  node-badge:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.node-evidence}"
    rounded: "{rounded.full}"
    typography: "{typography.label}"
    padding: "0.125rem 0.5rem"
  verdict-correct:
    backgroundColor: "{colors.verdict-correct}"
    textColor: "{colors.verdict-correct}"
    rounded: "{rounded.md}"
  verdict-wrong:
    backgroundColor: "{colors.verdict-wrong}"
    textColor: "{colors.verdict-wrong}"
    rounded: "{rounded.md}"
---

# Design System: Language & Health Open Synthesis

## 1. Overview

**Creative North Star: "The Reading-Room Instrument"**

This is a research instrument, not a dashboard. The work it serves — a clinician or
research assistant verifying an AI-extracted claim against the exact sentence in a PDF —
is slow, exacting, and high-stakes. The interface earns trust by getting out of the way:
paper-cream surfaces that read like a well-set journal, a single deep-evergreen accent
that means *action* and nothing else, and dense-but-quiet checklists where the source
document and the evidence always outrank the chrome around them. The beauty is in the
precision, never in decoration.

It is built on a **Cream + Forest** identity: warm paper-cream (`#faf7f0`) grounds the
canvas, deep library-shelf evergreen (`#14532d`) carries every primary action and focus
state, and a near-black warm ink (`#1a1410`) does the reading. Color is rationed — the
forest is rare on purpose, so when it appears the eye goes straight to the next action.
*(Note: the cream is sanctioned for softening toward a truer off-white / a hair more
chroma toward the forest hue; see Do's and Don'ts.)*

This system explicitly rejects four neighbors it could be mistaken for: the **sterile
gray EHR** (Epic/Cerner clutter and joylessness), the **generic SaaS dashboard**
(gradient cards, hero-metric templates, purple-on-white), **consumer/playful** UI
(rounded toy shapes, emoji, gamification), and the **heavy data-viz / BI tool** (widgets
crowding out the actual reading-and-judging task).

**Key Characteristics:**
- Warm, paper-grounded surfaces; flat by default, depth from tone and 1px borders.
- One rationed evergreen accent for action, selection, and focus — never decoration.
- A five-state semantic verdict vocabulary (correct / edit / wrong / missing / n-a) that
  pairs color with an icon and a label — state is never carried by color alone.
- Serif headings (Source Serif 4) over a workhorse sans (Inter); mono (JetBrains Mono)
  for citekeys, IDs, and counts.
- Density without clutter: checklists run dense; prose stays at 65ch.

## 2. Colors

A warm, low-chroma neutral field with one saturated evergreen voice and a disciplined
set of semantic signal colors.

### Primary
- **Library Forest** (`#14532d`): The single brand voice. Primary buttons, links, focus
  rings, current selection, the active-state accent. In dark mode it lifts to
  **Lifted Forest** (`#4ade80`, green-400) so it survives on near-black. Rare by design.

### Secondary
- **Accent Wash** (`#e6efe0`): A pale green tint for selected/hover backgrounds, badge
  fills, and quiet highlight zones tied to the primary without shouting.
- **Secondary Surface** (`#f0ebde`): A warmer cream panel for secondary buttons and
  grouped controls — one tonal step off the canvas.

### Tertiary — Semantic verdict signals
The heart of the review surface. Each verdict is color **plus** icon **plus** label.
- **Verdict Correct** (emerald, `#10b981`): ✓ the extraction is right.
- **Verdict Edit** (amber, `#f59e0b`): ✎ right idea, needs a correction (carries a diff).
- **Verdict Wrong** (rose, `#f43f5e`): ✗ the extraction is wrong.
- **Verdict Missing** (violet, `#8b5cf6`): ⟳ the element is absent → flag for re-extraction.
- **Verdict N/A** (muted ink): — does not apply.

### Node-type signals (graph surfaces)
Question blue (`#2563eb`), Claim amber (`#b45309`), Evidence green (`#15803d`), Method
violet (`#7c3aed`), Source stone (`#57534e`), Artifact clay (`#ce5555`). Always rendered
as a labeled badge, never as a bare swatch.

### Neutral
- **Reading Ink** (`#1a1410`): Body and headings. Warm near-black, not pure black.
- **Muted Ink** (`#6b6660`): Secondary text, metadata, captions — held to AA, never lighter.
- **Paper** (`#faf7f0`): The canvas. **Card** (`#ffffff`): lifted content surfaces.
- **Muted Surface** (`#f3eee2`): inset panels, code, table headers.
- **Border** (`#e7e2d6`): hairline dividers and container strokes; depth lives here.
- **Destructive** (`#b91c1c`): irreversible actions only — distinct from Verdict Wrong.

### Named Rules
**The One Voice Rule.** Forest is the only saturated brand color. It appears on ≤10% of
any screen — primary action, current selection, focus. If two greens compete for "the
action," one is wrong.

**The Verdict-Is-Not-Decoration Rule.** Emerald / amber / rose / violet appear *only* on
review verdicts and their tallies. They are forbidden as decorative accents anywhere else;
their scarcity is what makes a checklist scannable.

## 3. Typography

**Display Font:** Source Serif 4 (with Georgia, Times New Roman fallback)
**Body Font:** Inter (with ui-sans-serif, system-ui fallback)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, Menlo fallback)

**Character:** A contrast-axis pairing — a literary transitional serif for headings sits
over a neutral grotesque-humanist sans for all UI and reading. The serif signals
*scholarship*; the sans signals *tool*. Mono is reserved for machine facts: citekeys,
node IDs, counts. Old-style figures (`onum`) are on by default in body serif.

### Hierarchy
- **Display / H1** (Source Serif 4, 600, ~1.875rem / 30px, lh 1.15, -0.015em): page titles.
  Fixed rem, never fluid clamp — this is product UI viewed at consistent DPI.
- **Headline / H2** (Source Serif 4, 600, ~1.25rem / 20px): section titles within a review.
- **Title / H3** (Source Serif 4, 600, ~1.125rem / 18px): card and subsection headings.
- **Body** (Inter, 400, 1rem / 16px, lh ~1.65): UI text and prose; prose capped at 65ch.
- **Label** (Inter, 600, ~0.6875rem / 11px, +0.06em, uppercase): badges, meta chips.
- **Mono** (JetBrains Mono, 400, ~0.75rem / 12px): citekeys, IDs, counts, anchor tallies.

### Named Rules
**The Fixed-Scale Rule.** Headings use a fixed rem scale (~1.2 ratio), never `clamp()`.
A title that shrinks inside a two-pane review layout looks broken, not responsive.

**The Mono-Means-Machine Rule.** Monospace is for machine-generated facts only (citekeys,
UUIDs, counts). Never use it for an eyebrow or to "look technical."

## 4. Elevation

Flat by default. Depth is built from **tone and 1px borders**, not shadows — paper-cream
canvas, white cards one step above it, muted panels one step below, every container drawn
with a hairline `#e7e2d6` border. There is no shadow token scale; the system reads like
printed paper, not stacked glass. Shadows, if ever introduced, are reserved strictly for
genuinely-floating layers (popover, command menu, toast) — never on resting cards.

### Named Rules
**The Flat-Paper Rule.** Resting surfaces cast no shadow. If a card needs a drop shadow to
separate from the page, the tonal step or the border is wrong — fix that instead.

## 5. Components

### Buttons
- **Shape:** Gently rounded (`rounded-lg`, 8px). Compact default height of 2rem (32px);
  `xs`/`sm` variants for dense toolbars.
- **Primary:** Solid Library Forest fill, paper text. The one high-emphasis action per view.
- **Outline:** White fill, hairline border, `hover:bg-muted`. The default for navigation
  and secondary actions.
- **Secondary / Ghost:** Cream-tinted fill / transparent-until-hover. For grouped or
  low-emphasis controls.
- **Destructive:** *Tinted, not solid* — `destructive/10` fill with destructive text.
  Reserved for irreversible actions; visually distinct from the rose Verdict-Wrong state.
- **Hover / Focus:** `transition-all`; `:active` nudges `translate-y-px` for tactility.
  Focus is a 3px `ring-ring/50` halo on the forest ring — always visible, keyboard-first.

### Chips / Badges
- **Node badge:** Full-pill (`rounded-full`), uppercase Label type, `+0.06em` tracking.
  Tinted fill (`/10`), tinted border (`/30`), full-strength node-type text. Carries a
  `title` definition tooltip.
- **Verdict chip:** A segmented control of five states; the selected state fills with its
  semantic color, the rest stay ghosted. Icon + short label always present.

### Cards / Containers
- **Corner Style:** `rounded-lg` (8px). Never nested cards.
- **Background:** White card on cream canvas; muted surface for inset/code regions.
- **Shadow Strategy:** None (see Elevation). Separation is border + tone.
- **Border:** 1px `#e7e2d6`. Lists use `divide-y` hairlines rather than gaps of cards.
- **Internal Padding:** ~1rem (`md`); list rows ~0.75rem vertical.

### Inputs / Fields
- **Style:** Hairline `#e7e2d6` stroke, white fill, `rounded-lg`.
- **Focus:** 3px forest ring + border shift to the ring color. No glow.
- **Disabled:** `opacity-50`, pointer-events off.

### Navigation
- **Style:** Top site header (serif wordmark + sans links) over the cream canvas; quiet
  links that go forest on hover/active. Review surfaces add a two-pane working layout
  (PDF left, checklist right) — the signature layout, not a nav per se.

### Signature Component — The Two-Pane Review Pane
PDF (pdf.js) on the left with exact bbox highlight overlays for the cited quote/figure;
the extraction checklist on the right. Each EVD section (quote, grounding, claim links,
methods) carries its verdict control inline, beside the thing it scores. A live coverage
meter ("7/9 abstract claims · 3/4 tables") sits at the top of the checklist. This pane is
the product; everything else is in service of it.

## 6. Do's and Don'ts

### Do:
- **Do** ration the forest. Primary action, current selection, and focus only — ≤10% of
  any screen (The One Voice Rule).
- **Do** pair every verdict and status with an icon **and** a text label, never color
  alone — required for AA and color-blind reviewers.
- **Do** promote the five verdict colors (emerald/amber/rose/violet/muted) to **named
  semantic tokens** in `globals.css`; today they are one-off Tailwind classes
  (`emerald-500`, `rose-500`) scattered across the review panes. Tokenize them so the
  vocabulary is consistent and themeable in dark mode.
- **Do** keep headings on a fixed rem scale; serif for headings, Inter for everything
  interactive, mono only for machine facts.
- **Do** convey depth with tone + 1px borders; keep resting surfaces flat.
- **Do** hold muted text (`#6b6660`) to AA against cream — never lighten it "for elegance."
- **Do** soften the cream toward a truer off-white or a hair more chroma toward the forest
  hue if it reads as generic warm-neutral — the maintainer has sanctioned this. Carry the
  warmth in the evergreen accent and the serif, not in a default cream tint.

### Don't:
- **Don't** ship the **generic SaaS dashboard**: no gradient cards, no hero-metric
  templates (big number + small label + gradient accent), no purple-on-white, no identical
  card grids.
- **Don't** drift toward the **sterile gray EHR** — no dense joyless gray enterprise
  panels; warmth and clear hierarchy are the antidote.
- **Don't** go **consumer/playful**: no bubbly toy radii, emoji, gamification, or bright
  primaries.
- **Don't** turn it into a **data-viz / BI tool**: charts and widgets must never crowd out
  the PDF and the evidence.
- **Don't** use the tiny uppercase tracked **mono eyebrow** as section scaffolding (e.g.
  `font-mono uppercase tracking-[0.2em]` "Prototype · completeness pass"). It reads as the
  AI kicker and as "prototype." Use a real heading.
- **Don't** use `border-left`/`border-right` > 1px as a colored accent stripe on cards or
  callouts. Use a full border or a tint.
- **Don't** add gradient text (`background-clip: text`) or decorative glassmorphism.
- **Don't** reuse the verdict colors as decoration — they mean a review judgment and
  nothing else.
- **Don't** put drop shadows on resting cards (The Flat-Paper Rule).
