# Representing evidence appraisal: RoB, indirectness, GRADE

*2026-08-19. Design note. Arises from [B2 (review-of-reviews seeding)](./open-questions.md) —
prior reviews ship appraisals we want to reuse — and from the
[realist synthesis note](./realist-synthesis-and-discourse-graphs.md).*

## The question

Kwan 2023 and van Lent 2025 ship risk-of-bias assessments and, in van Lent's case, GRADE
certainty ratings. What can we inherit, and where does each piece live?

## What each appraisal is a property *of*

This is the whole answer; everything else follows.

| Appraisal | Property of | Why |
|---|---|---|
| **Risk of bias** | the **EVD** | RoB (RoB 2, ROBINS-I) is assessed **per result** — randomization, deviations from intended intervention, missing data, outcome measurement, selective reporting. All are facts about how *that result was produced*. They do not change with what you point the result at. Our EVD is already atomic (one finding, one study), so this lands naturally on the node. |
| **Indirectness** | the **edge** | How well does this evidence bear on *this* claim's population, intervention, comparator, outcome? The same EVD can be direct evidence for one claim and indirect for another. It is a property of the fit, not of the study. |
| **GRADE certainty** | the **CLM** | An appraisal of a *body* of evidence for one outcome. Already where the project puts it: `certainty` field + `## Evidence appraisal` section, expert-assigned. |

A useful consequence: *which* RoB tool applies depends on the claim type the edge points at.
RoB-for-causal-inference is the right instrument when the edge lands on a causal claim and the
wrong one when the same EVD informs a prevalence or measurement claim.

## What can be inherited from a prior review

GRADE's five downgrade domains split cleanly by what they are properties of:

| Domain | Property of | Inheritable? |
|---|---|---|
| Risk of bias | individual studies | **yes** |
| Indirectness | evidence↔claim fit | **yes**, if the claim matches |
| Inconsistency | the set | no |
| Imprecision | the set | no |
| Publication bias | the set | no |

**So: inherit per-study RoB, never the GRADE rating.** Our evidence set will not be their set — we
aggregate across reviews and add the qualitative evidence van Lent explicitly excluded — so the
three set-properties must be recomputed regardless.

This needs no new provenance category, which is the tidy part. The thing that would have required
one (an imported certainty rating that is neither AI-drafted nor our expert's judgment) is exactly
the thing that cannot be imported. Standing doctrine — certainty is an expert task, AI does not
draft it — is untouched.

**Their GRADE is more useful as a comparator than as an input.** Where our evidence set overlaps
theirs, recompute and check whether we land on the same certainty. That is a second discrepancy
signal alongside the extraction one, and a more interesting one: it tests the *judgment* layer
rather than the transcription layer.

## Where it goes

### RoB → a list on the EVD

A **list**, because the same primary study will be assessed by van Lent *and* Kwan *and* possibly
us. Disagreement between published reviewers is data, not a merge conflict to resolve at import.

```yaml
riskOfBias:
  - tool: ROBINS-I
    overall: moderate
    assessedBy: "@vanLent_2025"
    assessedFor: "length of stay"
  - tool: ROBINS-I
    overall: serious
    assessedBy: "@Kwan_2023"
    assessedFor: "length of stay"
```

Naming: **not** `has_appraisal` — "appraisal" already means the GRADE-style body-of-evidence
judgment on CLM (`## Evidence appraisal`), and reusing it here would collide with the very
distinction this note draws. `riskOfBias` matches the camelCase of the other semantic fields
(`healthOutcome`, `curationStatus`, `deliveryContext`).

Start with tool + overall + assessedBy + assessedFor. Add per-domain detail only if queries
demand it — domain vocabularies and scales differ per tool (RoB 2 has five domains scored
low / some concerns / high; ROBINS-I seven scored low / moderate / serious / critical), so there
is no shared enum to standardise on anyway.

**Grain hazard.** RoB 2 is assessed per *result* — a specific outcome in a specific comparison.
Our EVD is atomic but not necessarily at the same grain. If van Lent rated RoB for "the mortality
outcome" and our EVD is a narrower finding inside it, the inherited rating is approximately right
rather than exactly right. `assessedFor:` records the outcome they actually rated, so the
looseness stays visible instead of being silently assumed away.

### Indirectness → an attribute on the edge record

```json
{
  "id": "019e8dd8-…",
  "type": "relation_BO5Bt…",
  "source": "<EVD nodeInstanceId>",
  "destination": "<CLM nodeInstanceId>",
  "created": 1780496213357,
  "indirectness": {
    "rating": "serious",
    "assessedBy": "@vanLent_2025",
    "note": "inpatient population; claim is cross-setting"
  }
}
```

**Why the edge and not a markdown annotation next to the wikilink.** `relations.json` is canonical
for edges and has two writers: the plugin's UI (which writes edges with **no wikilink
representation at all**) and `sync_relations.py` (which parses body wikilinks). A markdown
convention would therefore only cover edges that happened to be authored the scripted way —
inconsistent coverage decided by authoring accident. The edge record is the only place with
complete coverage. See the corrected edge-schema section in `CLAUDE.md`.

**This is safe against both writers.** The plugin's `loadRelations` passes `data.relations`
through without reshaping individual records; `updateRelation` does a spread merge
(`{...existing, ...patch}`); and `sync_relations.py` is additive, preserving existing edge records
and only appending. Unknown fields survive. There is precedent: the plugin already writes optional
edge fields (`authorId`, `importedFromRid`, `publishedToGroupId`, and a conditional `tentative`).

### GRADE → unchanged

Stays on the CLM as `certainty` + `## Evidence appraisal`. Expert-assigned, AI does not draft.
Recomputed on our evidence set, never imported.

## The visibility problem, and why it is a tooling gap

The obvious objection to putting anything on an edge is that you cannot see it — a 1,375-entry
JSON blob is not somewhere you read evidence. That is real, but it is a **reader** problem, not a
data-model problem, and two readers already exist:

- **`build_dgraph.py`** generates `DGRAPH.md` — a nested QUE→CLM→EVD index read *inside Obsidian*.
  Rendering the edge annotation there puts it where the work happens, without duplicating
  authorship.
- **`export_rdf.py` → the Vercel site**, which already renders the graph and could surface it on
  the edge.

Single source of truth, visibility via generated views. Neither hive.

## Open

1. **Does `sync_relations.py` need to update, not just append?** It is currently additive and never
   touches existing edges. If an indirectness rating is revised, nothing propagates. Adding an
   update path is small but changes its idempotence guarantee.
2. **Do imported RoB assessments need `curationStatus`-style state?** They are neither AI-drafted
   nor expert-verified by us. "Imported, cited" may be a sufficient third state, carried by
   `assessedBy` alone.
3. **Rendering.** Which of `DGRAPH.md` / the site / Bases should show appraisal, and at what
   density. Probably not all three.
4. **Does CVT overlap indirectness?** Caveats qualify EVD and are prose; indirectness is a graded
   edge property. Related, not the same — but worth checking they do not drift into duplicating
   each other.
