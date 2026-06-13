# Methodology decisions

Canonical, in-repo record of synthesis/extraction methodology decisions (so they live with the code,
not only in an assistant's private memory). Newest first. These refine `CLAUDE.md` / the `Skill-*.md`
references; where they conflict, the decision logged here wins.

## 2026-06-13

### Body-of-evidence appraisal lives on the CLM (GRADE-style), and EP is retired
- The `EvidencePattern` node type is **retired**. The judgment EP was meant to capture — treating a
  *collection* of EVDs as a unit and assessing the EVD→CLM inference (like **GRADE** rating a body of
  evidence) — now lives **on the CLM**: a `certainty` field (High | Moderate | Low | Very Low) + a
  `## Evidence appraisal` section.
- **The appraisal is an expert/clinician task — AI does NOT draft it.** AI leaves `certainty` blank and
  the appraisal section empty; only the human expert fills them. `propose_eps.py` is paused.
- This is distinct from any mechanical edge tally. A separate "body of evidence" node is reified **only**
  if one claim's evidence must be graded as separate sub-bodies (e.g. RCT vs observational) — the rare
  exception, not the default. The one prior EP was re-homed as a CLM.

### Mechanical evidence breadth ≠ certainty
- `supportPapers` / `opposePapers` (distinct source papers among supporting/opposing EVDs, computed by
  `export_rdf.py`) are a **breadth proxy** used for ranking (e.g. the homepage "best-supported claims").
  They are explicitly **not** a certainty rating, which stays the expert GRADE call above.

### Synthesis CLM conventions
- **Distinguish claims by contrast:** an *intervention* claim ("providing interpreters/concordance
  improves X") is separate from an *exposure* claim ("LEP/discordance is associated with X"). They test
  different things and may both exist for one outcome.
- **Surface disagreement in the topology:** when two claims genuinely conflict in direction, wire a
  `## Opposing Claims` (→ CLM—opposes→CLM) edge rather than hiding the tension. `## Related Claims`
  authors a CLM—informs→CLM edge.
- **The synthesis prose section is `## Narrative synthesis`** (renamed from "Other Notes" on CLMs).
- **Cite inline with wikilinks, not bare author-year:** in narrative prose, reference the specific EVD
  (or CLM) with `[[EVD - … - @citekey|Author Year]]`; `export_rdf.rewrite_links` turns an aliased link
  into `[Author Year](/node/<ID>)` (readable text + link), and a bare `[[EVD-…]]` into a clickable ID.

### Narrative/systematic reviews yield CLM/EP, not EVD
- A **narrative/systematic review** contributes **CLMs** (its synthesized theses), not EVDs — the EVDs
  live in the **primary papers it cites**. A **meta-analysis** is different: its pooled estimate is a
  new observation and *can* be an EVD.

### Qualitative EVDs: ground in participant quotes
- For qualitative findings, lead the EVD with the **verbatim participant quote** (patient/provider
  voice) where available; the authors' thematic statement is secondary context.

### Quant + qual synthesis is a core goal
- A primary aim is enabling synthesis **across quantitative and qualitative evidence** on the same
  claim. Do not prune qualitative evidence. Qual EVDs are grounded in quotes; quant in figures/tables;
  the review app must support both grounding modes.

### Source citation metadata in the app
- Source (SRC) nodes export bibliographic metadata (author, year, journal, title, DOI, PMID); the app
  renders a citation block with **clickable DOI (doi.org) and PMID (pubmed)** links, shown on source
  pages and prominently in each EVD's header (via its `derivedFrom` source).
