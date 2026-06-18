# Discourse-node extraction — node spec (quality & completeness)

A portable specification for extracting **grounded discourse nodes** from a body of
source material, with the quality bar an extracted node must meet. Source-agnostic:
the source can be a paper, a Jupyter notebook, an experiment log, a chat transcript,
or unstructured notes. Domain-agnostic: the facet vocabulary is yours to define.

This spec doubles as a **review rubric** — each quality criterion below is something a
reviewer (or an adversarial verifier agent) checks per node. Author so every node
would pass its own review.

> **Governance — propose, don't commit.** An agent *extracts* evidence/claims/caveats
> and *proposes* generalizations and merges. A human *commits* (accepts/edits per
> item) and owns any body-of-evidence/certainty judgment. Start every node at an
> explicit "draft / needs review" status; only a human advances it.

---

## The node types

| Type | Is | Atomic unit |
|---|---|---|
| **Question (QUE)** | An unknown the work addresses. | one question |
| **Claim (CLM)** | A generalized assertion that (proposes to) answer a question. **Transcends any single source** — many sources can support or oppose it. | one generalization |
| **Evidence (EVD)** | A specific observation **from one source**, grounded in a verbatim span. | one finding |
| **Source (SRC)** | The artifact an EVD is drawn from (paper, notebook, log run, chat, note). | one artifact |
| **Caveat (CVT)** | A limitation that **qualifies an EVD** (not a claim). | one limitation |
| *(optional)* **Artifact (ART)** | A concrete system/tool/intervention that an EVD's method uses. | one system |

The load-bearing distinction is **EVD ≠ CLM**: a measured/observed particular is
evidence; a generalization across particulars is a claim. If one sentence states both
("interpreters cut readmissions; in our cohort 14.9% vs 24.3%"), make both nodes.

A reliable surface cue is **tense**: **evidence is past tense** — what a specific
study/run *observed* ("LOS *was* 1.5 days longer") — which signals its situated,
contextual nature; **claims are present tense** — timeless generalizations
("interpreters *lower* readmission"). Mismatched tense usually means a node is on the
wrong side of the EVD/CLM line.

---

## Grounding model (the part that generalizes across sources)

Every substantive statement in an EVD is backed by a **verbatim span + a locator**.
"Verbatim" means copied exactly from the source; the locator is how a reviewer finds
it. The locator's shape is the only thing that varies by source kind:

| Source kind | verbatim span | locator |
|---|---|---|
| Paper / PDF | sentence or passage | page; figure/table number |
| Jupyter notebook | cell source or output text | cell id / execution count; output index |
| Experiment log / run | log line(s) | run id, timestamp, metric key |
| Chat transcript | message span | speaker + timestamp / message id |
| Unstructured notes | quoted span | heading / line / file + offset |

A grounded **object** (a figure, table, plot, or output artifact) is the second form
of grounding: when a finding *lives in* an object, point the EVD at that object's
locator (and, where possible, the exact region) — or record that there correctly is
none.

---

## Methods context — What / How / Who

Every EVD carries three method facets, **each grounded in its own span**. They invert
the usual "methods section" into the three things a reader needs to *use* the finding:

- **What** — the *observable itself*: the outcome/measure/quantity recorded. Not the
  design, not its value. (notebook: the metric/plot; log: the recorded measure.)
- **How** — the *procedure that produced it*: design, analysis, code, pipeline. Link
  the concrete system/script (an ART) where one exists.
- **Who** — the *equivalence class it generalizes to*: sample, dataset, run config,
  population, model system, setting; with the size/flow where applicable.

> Don't put the observable's *value* (effect sizes, the numbers) under **What** — those
> belong in the EVD's description. **What** is the variable, not its measurement.

---

## Quality bar per node type

These are the criteria a node must meet — and exactly what a reviewer checks. The
verdict vocabulary for review/self-check: **✓ correct · ✎ needs an edit · ✗ wrong ·
⟳ missing (should exist, doesn't — re-extract) · — n/a**. Author so every dimension is ✓.

### EVD — a correct & complete evidence node
1. **Atomic** — exactly one finding. A table with five results → five EVDs.
2. **Verbatim-grounded** — every substantive statement has an exact span + locator;
   the span actually *states* the finding (not a coincidental keyword match).
3. **Quantitatively faithful** — direction, magnitude, significance, and intervals
   match the source. A null result is reported as null, not spun (and vice-versa).
4. **Grounded in the right object** — the figure/table/output/plot that shows the
   finding is referenced (and embedded/located) — or it's correctly text-only.
5. **Methods What / How / Who present, each grounded** — every assertion about the
   observable, procedure, and scope has its own span. A methods claim with no span is
   a *missing* grounding, not an acceptable summary.
6. **Linked to ≥1 claim with correct polarity** — the EVD *supports* or *opposes* a
   claim, as stated. A null/contrary finding must oppose the claim it bears on, not
   support it.
7. **Past tense** — phrased as what was observed in *this* source ("LOS *was* 1.5 days
   longer"), which signals its situated, contextual nature. The timeless present-tense
   version is the claim's job. Title and description both.

### CLM — a correct & complete claim node
1. **One generalization** — split a claim that asserts two things.
2. **Stated as a generalization, in present tense** ("interpreters *lower* readmission")
   — timeless. The situated, past-tense particular is the EVD's job.
3. **Backed by evidence on both sides where it exists** — supporting *and* contradicting
   EVDs wired in; each link is statement-level (the EVD really bears on the claim), not
   mere source-overlap.
4. **Polarity correct** on every linked EVD.
5. **Body-of-evidence / certainty appraisal is a human task** — an agent leaves it
   blank; it is not auto-drafted.

### CVT — a correct & complete caveat
- **Qualifies an EVD, not a claim.** Mark `author-stated` vs `inferred`; ground it in a
  verbatim span (label clearly when inferred). Note severity.

### QUE — a correct & complete question
- A genuine unknown the work addresses. Any quote must be the source's *aim/question*,
  never its methods or results.

---

## Completeness (recall) — beyond per-node correctness

A node set is **complete** for a source when every result the source *enumerates* is
either captured as an EVD or consciously excluded. Use the lists the source itself
provides as the checklist:

- Paper → abstract result-sentences + every table/figure.
- Notebook → every output cell that reports a result (metric, plot, table).
- Log/run → every recorded metric of interest.
- Chat/notes → each distinct claim/observation asserted.

Recognition over recall: enumerate the source's own results, then confirm each is
covered, promote what's missing, dismiss non-results.

---

## Edges

Author each edge in **one** place (a wikilink/reference list) and materialize direction
mechanically; never author the same edge on both ends.

- `EVD —supports/opposes→ CLM` — listed on the claim (supporting / contradicting).
- `CVT —qualifies→ EVD` — listed on the caveat.
- `CLM —informs→ QUE` — listed on the question.

---

## What to configure for your domain / source (the adaptation slots)

The method above is fixed; these are the slots an adopter fills:

1. **Facet vocabulary** — the domain axes you tag EVD/CLM with. (This corpus uses
   `factor / outcome / context`; yours might be `component / behavior / environment`,
   or none.) Keep them faceted + as filterable fields.
2. **Source locator convention** — pick the locator shape for your source kind (table
   above) and use it consistently in citations and grounding.
3. **Grounding extractor** — whatever pulls the object + region for your source
   (figure cropper for PDFs; cell-output capture for notebooks; log slicer). The spec
   only requires that a locator + (where possible) a region is recorded.
4. **Store / tooling** — node ids, edge materialization, audits, and review surface are
   pluggable. Nodes are plain markdown with frontmatter; the method doesn't depend on
   any specific plugin or scripts.
5. **Verification step** — run the per-node quality bar as an explicit check (a review
   pass, or an adversarial verifier agent) before a human commits.

See `examples.md` for annotated gold nodes, and `README.md` for how to drop this into
an agentic workflow.
