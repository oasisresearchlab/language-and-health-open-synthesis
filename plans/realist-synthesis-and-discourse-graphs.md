# Realist synthesis × discourse graphs — working note

*2026-08-19. Thinking, not a spec. Captures the shape of an integration and the tensions it
raises, so the next session does not re-derive it.*

## Why the fit is structural rather than metaphorical

Realist synthesis asks *what works, for whom, in what circumstances, and why*. Its unit is the
**CMO configuration** — Context + Mechanism → Outcome — and its output is a **programme theory**
progressively refined against evidence.

Its practical weakness is that CMO configurations live in prose, and the links from a given piece
of evidence to a given configuration are implicit. That is why realist reviews are hard to
appraise and why RAMESES standards had to be written.

A discourse graph makes exactly those links explicit, typed and queryable. The integration is not
"realist synthesis *plus* a graph" — the graph is an operationalization of what realist synthesis
already wants to do and currently does narratively.

## Proposed representation: fields on a claim, not new node types

Follow the **EP-retirement precedent** (`methodology-decisions.md`, 2026-06-13): *reify a node only
if one claim's evidence must be graded as separate sub-bodies.* That decision went against adding
a node type once already, and the same logic applies here.

So: a **CMO configuration is a mechanism-type CLM carrying structured fields** — `context:`,
`mechanism:`, `outcome:` — not three new node types wired together.

**Claim typing.** `methodology-decisions.md` already separates an *effect* claim ("X improves Y")
from an *exposure* claim ("discordance is associated with Y"), because they test different things.
A **mechanism** claim is a third member of that same axis, not a new architecture.

**Existing hook.** 122 nodes already carry `epistemic/mechanism`. A partial mechanism layer exists
accidentally; check what it actually contains before designing on top of it.

## What this buys: a principled division of evidential labour

van Lent 2025 excluded qualitative studies because they cannot establish effectiveness — then
apologised for it in the limitations. In realist terms that is a category error. Qualitative and
quantitative evidence occupy **different slots of the CMO**:

| Evidence | Answers | Slot |
|---|---|---|
| Qualitative | *why* / *how* it works, for whom | **Mechanism**, Context |
| Quantitative | *whether* and *how much* | **Outcome** |

They stop competing. This converts the project's stated goal of quant+qual synthesis from "we
also include qualitative, somewhat awkwardly" into a principled design, and it directly addresses
the gap the closest competing review names about itself.

## Two directions that should meet and fight

**Bottom-up** — atomic EVD extracted from primary studies, including qualitative, verbatim-grounded,
theory-neutral by design. This is the current pipeline.

**Top-down** — programme theories and CMO configurations extracted from framework and integrative
reviews, theory-laden by design.

They collide at the CLM layer. **Disagreement is signal, not noise**: a programme theory that the
bottom-up evidence does not support is a finding, and so is evidence that no existing theory
predicts. The graph is the right place to hold both precisely because it can represent
support/oppose relations rather than forcing a reconciliation in prose.

### Two families of prior work, two extraction targets

| Family | Example | Yields |
|---|---|---|
| **Evidence syntheses** (systematic reviews with extraction tables) | Kwan 2023, van Lent 2025 | Evidence + pointers to included studies |
| **Framework / integrative / narrative reviews** | arXiv 2605.01441 (AI language technologies in multilingual healthcare, 2026) | **Programme theory**, mechanisms, CMO candidates |

This is consistent with existing doctrine: `methodology-decisions.md` already holds that
narrative and systematic reviews yield **CLM, not EVD** — EVDs live in the cited primaries. The
two-families split extends that rule rather than bending it.

## A candidate initial programme theory, empirically derived

From the co-occurrence analysis over 90 multi-component interventions in the spine
(spec B §3.7): interpreting appears in 43 bundles and is the hub; the two most common pairings are
**interpreting + service redesign (13)** and **interpreting + workforce capability (12)**.

Neither redesign nor training provides any language access on its own. They exist because the
field's best-documented failure mode is **underutilization**. So the implicit theory is a
two-stage pathway:

- **Provision** — is the resource available? (families A, B, C, D)
- **Adoption** — is it actually used? (families E, F)

*Provision mechanisms underperform in isolation because they do not address adoption; adoption
mechanisms act at a different point in the same causal chain.* That is a middle-range theory,
testable: do provision+adoption bundles outperform provision-only, and do the 46 within-family
bundles behave as substitutes rather than complements?

**Caveat 1.** This is co-occurrence in what researchers chose to bundle — it reflects their
theories of the problem, not demonstrated synergy. It establishes what the field believes, which is
the right starting point for a programme theory and the wrong thing to report as a result.

**Caveat 2 (2026-08-20) — as stated, this is near-tautological.** "Provision plus adoption beats
provision alone" is not a hypothesis anyone would doubt: of course getting clinicians to use a
provided service helps it work. Two non-trivial versions survive:

- **Magnitude.** What share of provision's measured failure is *actually* adoption failure? If
  underutilization dominates, the field's effectiveness estimates for provision are systematically
  depressed by an implementation problem rather than measuring the intervention.
- **Within-layer combination.** Whether combining two *provision* mechanisms helps — machine
  translation plus an informal interpreter, translated materials plus an interpreter — is genuinely
  open, and is exactly the gap van Lent 2025 names as unstudied. These could be complementary,
  substitutive, or interfering.

The second is where the real programme-theory work is.

## Open tensions — resolve before this goes in a spec

1. **Theory-laden vs theory-neutral extraction.** Bottom-up extraction is deliberately
   theory-neutral; realist coding is deliberately theory-laden. Does the mechanism layer sit
   *above* untouched evidence as a lens, or does it change how extraction is done? The former
   preserves the existing pipeline and the graph's credibility; the latter is closer to orthodox
   realist method.
2. **Representing disagreement.** `supports`/`opposes` exists for EVD→CLM. Is a programme theory
   contradicted by evidence just an opposed CLM, or does it need its own treatment?
3. **RAMESES.** Realist synthesis has publication standards. A *living* realist synthesis in a
   discourse graph has no template — a contribution, but reviewers will have no prior to judge it
   against.
4. **Where CVT fits.** Caveats currently qualify EVD. In a realist frame, context conditions are
   first-class, not caveats. Is there overlap to reconcile?
5. **Scope discipline.** This is a methods contribution stacked on top of two other unfinished
   ones. It should probably follow B2 rather than precede it.
