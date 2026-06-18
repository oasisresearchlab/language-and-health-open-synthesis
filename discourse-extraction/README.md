# discourse-extraction

A portable, source-agnostic spec for extracting **grounded discourse nodes**
(questions, claims, evidence, caveats) from source material — and the quality bar an
extracted node must meet. Lift it into your own agentic workflow.

It was distilled from a working system (a living evidence synthesis over health-care
papers) plus the review rubric we use to verify extractions. The domain and tooling
there are incidental; what's here is the reusable method.

## What's in the box

| File | What |
|---|---|
| **`node-spec.md`** | The node types, the grounding model, Methods What/How/Who, the **per-node quality & completeness bar** (= the review rubric), and the adaptation slots. Start here. |
| **`examples.md`** | Annotated gold nodes (evidence / claim / caveat) showing the bar met, plus anti-patterns review catches. |

## The core idea

Compress a corpus into small, **atomic**, **verbatim-grounded**, **linked** nodes:

- **Evidence (EVD)** = one observation from one source, backed by an exact span + a
  locator, with its *What / How / Who* method context each grounded.
- **Claim (CLM)** = one generalization across evidence; supported and/or opposed by EVDs.
- **Caveat (CVT)** qualifies evidence; **Question (QUE)** is the unknown claims answer.

This spec was developed with papers as the input source. We believe the same shape can be adapted to other input sources, such as a Jupyter notebook, an experiment
log, a chat, or a pile of notes. The adaptation will involve refining the **locator** changes (page → cell id → run id
→ message timestamp → line) for grounding. A starting point for this adaptation is described in the grounding table in `node-spec.md`.

## Two-fold quality spec

- **Accuracy (precision):** each node meets its bar — verbatim fidelity, grounding,
  claim-link polarity, substantive faithfulness, grounded methods. This is the review
  rubric; verdicts are `✓ correct · ✎ edit · ✗ wrong · ⟳ missing · — n/a`.
- **Completeness (recall):** every result a source *enumerates* (its tables, output
  cells, logged metrics, asserted claims) is captured or consciously excluded.

## Using it in an agentic workflow

1. **Extract** — an agent reads a source and authors EVD/CLM/CVT/QUE per `node-spec.md`,
   grounding every statement in a verbatim span + locator.
2. **Verify** — run the per-node quality bar as an explicit check (a review pass, or an
   adversarial verifier agent prompted to find each anti-pattern in `examples.md`).
   Treat a missing grounding as `⟳ missing`, not an acceptable summary.
3. **Commit (human)** — **propose, don't commit**: the agent extracts and proposes; a
   human accepts/edits and owns any certainty/body-of-evidence judgment.

## Adapting to your domain / source

Fill the slots in `node-spec.md` → *"What to configure"*: your facet vocabulary, your
source locator convention, your grounding extractor, your store/tooling, and where the
verification step runs. Nodes are plain markdown + frontmatter; nothing here is bound
to a particular plugin, language, or pipeline.

## Provenance

Distilled 2026-06-18 from the `language-and-health-open-synthesis` extraction Skill
(`Skill*.md`) and the review-app accuracy/completeness rubric. The project's own
`Skill.md` remains the domain-specific reference instance.
