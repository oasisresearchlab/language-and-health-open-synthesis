---
name: skill-references
description: Reference — naming conventions, key principles, tag facets, edge-authoring convention, Methods-Context definitions, common pitfalls.
parent_skill: extract-discourse-nodes
---

# Skill — References

## Naming conventions

| Type | Filename |
|---|---|
| QUE | `QUE - <question>.md` |
| CLM | `CLM - <claim>.md` |
| EVD | `EVD - <finding> - @<citekey>.md` (citekey in name) |
| EP | `EP - <pattern>.md` |
| CVT | `CVT - <limitation>.md` |
| ART | `ART - <system>.md` |
| PTN | `PTN - <concept>.md` |
| SRC | `@<citekey>.md` |
| PNG | `<citekey>-<evd|clm|cvt|que>-p<N>-<idx>.png` (quote crops); `<citekey>-fig<N>.png` / `-table<N>.png` (grounding) |

## Key principles

1. **Verbatim quotes** ground every substantive statement (Author, year, p. N); audited against the PDF.
2. **Atomicity** — one question/finding/generalization/limitation per node. Split, don't merge.
3. **EVD ≠ CLM** — numbers/observations → EVD; generalizations → CLM. If a sentence states both, make both.
4. **CLMs transcend papers** — multiple papers can support one CLM.
5. **Caveats qualify EVDs, not CLMs** — `CVT —qualifies→ EVD` only. Mark `type: author-stated|inferred`.
6. **EPs need ≥2 independent papers**; single-paper regularities stay CLMs.
7. **One `epistemic/*` tag** per QUE/CLM/EVD/EP: `mechanism` | `effect-size` | `measurement`
   (~~`design-principle` dropped~~).
8. **Propose, don't commit** — EPs, upgrades, merges, and summary-cell values are AI proposals; human commits.
9. **NodeFormality** starts `draft`; promote after audits pass.
10. **Provenance** — every generated artifact carries frontmatter + links back to its prompt; log to History.

## Tag facets (domain) + mirrored YAML fields

Faceted hierarchical tags **and** matching YAML list fields (same names) on EVD/CLM/EP — fields let
`.base` views filter without tag parsing. Seed from `Variables.md`; extend as needed.

- `languageConcordanceFactor/...` — `/discordance`, `/concordanceIntervention/interpretingServices`,
  `/concordanceIntervention/bilingualProvider`, … (extend: machine-translation, family-interpreter)
- `healthOutcome/...` — `/lengthOfStay`, `/diagnosticAccuracy`, `/readmissions`, `/adherence`,
  `/trust`, `/empowerment`, `/providerTimeEffort`, `/malpractice`, …
- `deliveryContext/...` — care setting: `/ed`, `/inpatient`, `/primaryCare`, `/telehealth`, … (bootstrap
  from sources' `specialty`/`region`)

EP also carries `ep/scope/cross-paper` and `ep/strength/<N>-papers`.

## Methods Context (EVD) — inverted What/How/Who

- **What?** the **observable** itself (the outcome/measure recorded), NOT the design.
- **How?** the **design + procedure** used to observe it; link `[[ART - ...]]` for a specific system.
- **Who?** the **equivalence class** to generalize to (setting, sample, participants, model system,
  hospital setting; sample-size flow where applicable).

Each block: one-line structured summary + verbatim quote + auto quote-crop screenshot.

## Edge authoring (one authoring location per edge → sync_relations materializes direction)

| Edge (schema: source→dest) | Authored on | Section |
|---|---|---|
| EVD —supports/opposes→ CLM | CLM | `## Supporting Evidence` / `## Contradicting Evidence` |
| EVD —supports/opposes→ EP | EP | `## Supporting Evidence` (+ Contradicting) |
| CVT —qualifies→ EVD | CVT | `## Qualifies` |
| CLM —informs→ QUE | QUE | `## Claims addressing this question` (nested) |
| SRC/EVD —informs→ QUE | derived by sync (transitive) | — |

`sync_relations.py` reads these wikilink sections + each node's `nodeInstanceId` and writes the edge
with the correct schema direction. Idempotent; safe to re-run.

## Node identity

AI-authored nodes need `nodeTypeId` (from CLAUDE.md table) and a fresh `nodeInstanceId`
(`python3 -c "import uuid; print(uuid.uuid7())"`). Without these, `relations.json` edges can't resolve.

## Common pitfalls

- Don't put effect sizes under **What** — that's the observable's *value*, it belongs in the Description.
- Don't author the same edge on both sides (creates duplicate `relations.json` entries).
- `.base` `description:` containing a colon inside backticks must be quoted (YAML parse error otherwise).
- pdftotext renders en-dashes oddly (`Human−AI` → `HumaneAI`): a known verbatim-audit false positive.
