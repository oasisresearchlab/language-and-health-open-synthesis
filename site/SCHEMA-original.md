# Schema

The discourse graph for this repository follows the canonical [DiscourseGraphs](https://discoursegraphs.com/) Q/C/E/S model, extended with **Method (M)** as a fifth node type. Methods are categorically different from claims — they are analytical instruments (procedures, taxonomies, formulas, frameworks) used to produce or organize claims, not assertions in their own right.

## Node Types

| Prefix | Type | nodeTypeId | Purpose |
|---|---|---|---|
| `Q` | Question | `node_rdf_question` | A question the work addresses. Exists to gather Claims that respond to it. |
| `C` | Claim | `node_rdf_claim` | An assertion. Defended by Evidence; addresses a Question; may be opposed by another Claim. |
| `E` | Evidence | `node_rdf_evidence` | An empirical observation, datum, or specific event. Supports or opposes a Claim. Always derivedFrom a Source. |
| `S` | Source | `node_rdf_source` | A reference: paper, dataset, web archive, primary record. The provenance backstop for Evidence. |
| `M` | Method | `node_rdf_method` | An analytical instrument: a named taxonomy, formula, framework, or procedure that Claims invoke. Extension to canonical schema. |

## File Layout

Each node is a single Markdown file with YAML frontmatter and a body of standalone prose (50–250 words, sufficient that the node can be read and contributed to without loading the whole paper).

```
graph/<type>/<ID>.md
```

IDs are zero-padded sequential within type: `C-0001`, `E-0042`, `M-0003`. Numbering does not reset across sections.

### Required frontmatter

```yaml
---
id: C-0001
type: claim                       # question | claim | evidence | method | source
title: A short readable title for cross-references
status: draft | review | merged   # state in the contribution lifecycle
source_section: "§3.2"            # section of paper/whitepaper-v3.md this was decomposed from
                                  # comma-separated when the node maps to multiple sections,
                                  # e.g. "§1.2, §5.1"; omit entirely for net-new nodes
created: 2026-05-03
edges:
  addresses: [Q-0003]             # Claim → Question
  supports: [C-0017]              # Evidence → Claim, or Claim → Claim
  opposes: []                     # counterclaim / counter-evidence
  derivedFrom: [S-0042]           # Evidence → Source
  informs: [C-0099]               # Method → Claim that uses it
  usesMethod: [M-0001]            # Claim → Method it invokes
---
```

Any edge field may be omitted when empty; arrays are preferred to single values for forward-compatibility.

### Body

50–250 words of prose. The body must be self-contained: a contributor reading only this file should understand what is being asserted, observed, or asked, well enough to propose an edit, counterclaim, or counter-evidence.

Citations inline use the source IDs (`S-0042`) rather than numeric references; the canonical reference text lives in the Source node.

## Edge Types

| Edge | Direction | Meaning |
|---|---|---|
| `addresses` | Claim → Question | Claim is a candidate response to Question |
| `supports` | Evidence → Claim<br>Claim → Claim | Evidence corroborates a Claim<br>Claim follows from / strengthens another Claim |
| `opposes` | Claim → Claim<br>Evidence → Claim | Counterclaim<br>Counter-evidence |
| `derivedFrom` | Evidence → Source | Evidence is grounded in this Source |
| `informs` | Method → Claim | Method is the analytical instrument behind this Claim |
| `usesMethod` | Claim → Method | Claim invokes this Method (inverse of `informs`) |

Edges should be reciprocal where applicable (`supports` on the Evidence side, `derivedFrom` Source on the same Evidence; `usesMethod` on the Claim side, `informs` on the Method side). A consistency-check pass should catch missing reciprocals.

## Conventions

- **One claim per Claim node.** If a paragraph asserts two things, that's two Claim nodes.
- **Counterclaims are separate nodes.** Use `opposes:` rather than rewriting the original.
- **Evidence is specific.** "Many studies show X" is a Claim. "Vines 2014 retrieved 19% of 516 ecology datasets" is an Evidence node citing a single Source.
- **Method nodes are reusable instruments.** The four-tier taxonomy is M; a one-off comparison table is not.
- **Sources are atomic.** One Source = one citable artifact (paper, dataset, archived webpage). Multi-volume works get one Source unless individual volumes are cited distinctly.

### Reuse across sections

Nodes are *things*, not *section assignments*. When the same Claim, Evidence, or Source is invoked from multiple sections of the paper, do **not** duplicate the node.

- **Citation reuse (Evidence / Source).** One node, comma-separated `source_section:` listing every section the node was decomposed from or cited in. Consuming Claims link via `supports:` / `derivedFrom:` regardless of which section invoked them.
- **Cross-section invocation (Claim).** `source_section:` records where the Claim is *introduced*. Reuse from later sections is carried by edges (`supports: [C-0001]`), not by appending sections to the field. Don't duplicate a thesis Claim per section that invokes it.

### Multi-point Evidence

An Evidence node may contain multiple distinct empirical points from the same Source (e.g., "191 repositories closed, median age 12 years, 47% no migration" — three numbers, one Source). The first-pass decomposition keeps these as a single node when the points are typically cited together.

**Split rule:** when a contribution wants to oppose, edit, or extend one sub-point of a multi-point Evidence node without affecting the others, split the node first. The original `E-NNNN` becomes `E-NNNNa` / `E-NNNNb` / etc. (or fresh sequential IDs — contributor's choice), each carrying one sub-point. Inbound edges get re-pointed in the same PR.

Defer the split until a contribution forces it. Splitting prophylactically inflates the node count without serving discourse; splitting reactively keeps the graph readable until the granularity is actually needed.

## Numbering Authority

The next available ID for each type is determined by the highest-numbered file in that directory. Don't re-use IDs after deletion; leave the gap.
