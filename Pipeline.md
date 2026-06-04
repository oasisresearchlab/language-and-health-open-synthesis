# Pipeline overview — LEP / language-concordance synthesis

The reproducible process that turns the LEP corpus (785 source notes) into a **grounded discourse
graph** (Questions → Claims → Evidence → Caveats, plus cross-paper EvidencePatterns and Artifacts),
with data-integrity checks at every step. This file is the **atemporal reference**; for what was done
when, see [[Progress Log]]. Design rationale: `plans/extracting-discourse-nodes.md` and
`plans/getting-papers.md`. Operating rules: `CLAUDE.md` + `Skill*.md`.

## The process

```mermaid
flowchart TD
    subgraph ACQUIRE["1 · Acquire"]
        S[785 source notes] --> FP[fetch_pdfs.py<br/>DOIs + OA PDFs]
        FP --> P[(OA PDFs)]
        P --> FA[fetch_figures_tables.py<br/>Route A · OA-XML]
        P --> FB[extract_pdf_figures_tables.py<br/>Route B · PDF]
        FA --> FT[(figures + tables)]
        FB --> FT
    end
    subgraph VALIDATE["2 · Validate identity — integrity gate"]
        V[validate_fulltext.py · --pdf<br/>abstract↔text embedding check]
        RF[refetch_by_title.py<br/>fix wrong PMIDs · recover OA text]
        V --> TM[(trust manifests)]
        RF --> TM
    end
    subgraph QUEUE["3 · Queue by evidence pattern"]
        CQ[cluster_queue.py<br/>factor×outcome + embeddings] --> Q[[Extraction Queue.md]]
    end
    subgraph EXTRACT["4 · Extract a cluster — loop"]
        SK["human SKIM (context, not mastery)"] --> AX["AI EXTRACT — VERIFY-OR-REFUSE<br/>EVD · CLM · CVT · ART<br/>verbatim quotes + What/How/Who"]
        AX --> GF[ground_figures.py<br/>crop + embed fig/table FIRST]
    end
    subgraph GRAPH["5 · Materialise the graph"]
        SR[sync_relations.py<br/>wikilinks → relations.json] --> BD[build_dgraph.py<br/>→ DGRAPH.md]
        BD --> VA[verbatim_audit.py] --> AA[attachment_audit.py]
    end
    subgraph SYNTH["6 · Cross-paper synthesis"]
        PE[propose_eps.py<br/>→ EP Proposals.md]
        CE[count_evds_per_subtask.py<br/>→ Evidence Summary.md]
        EP[[EvidencePattern nodes]]
    end
    FT --> V
    TM --> CQ
    Q --> SK
    GF --> SR
    AA -->|pass| PE
    AA -->|pass| CE
    PE -->|human commits| EP
    AA -. next cluster .-> SK
```

**The load-bearing rule:** *ground only in validated sources, and the extractor must verify a paper's
identity and refuse rather than fabricate.*

## Scripts (`utils/`)

| Script | Role |
|---|---|
| [[fetch_pdfs]] | Resolve DOIs (NCBI ID Converter → OpenAlex) + download OA PDFs (Europe PMC → Unpaywall → S2 → OpenAlex); write DOIs to notes |
| [[fetch_figures_tables]] | Route A — figures/tables for OA papers via Europe PMC JATS XML + supplementary ZIP |
| [[extract_pdf_figures_tables]] | Route B — figures/tables from PDFs via PyMuPDF |
| [[validate_fulltext]] | Flag wrong-paper text/PDFs by embedding the abstract vs the body (`--pdf` for PDFs) |
| [[refetch_by_title]] | Re-resolve correct DOI/PMID/PMCID by title; flag wrong PMIDs; recover OA full text |
| [[cluster_queue]] | Seed the extraction queue: factor×outcome matrix + embeddings → provisional buckets |
| [[ground_figures]] | Locate a referenced `(Fig N)`/`(Table N)` in the PDF and embed it first in the EVD |
| [[sync_relations]] | Materialise body wikilinks into plugin `relations.json` edges (correct schema direction) |
| [[build_dgraph]] | Generate the nested QUE→CLM→EVD→⚠️CVT index (`DGRAPH.md`) from `relations.json` |
| [[verbatim_audit]] | Check every `> "…"` quote against the source PDF/full text (NFKD+alnum) |
| [[attachment_audit]] | Enforce graph invariants (CVT qualifies EVD only; every EVD→CLM/EP; every CLM→QUE; EP ≥2 papers) |
| [[propose_eps]] | Propose candidate EvidencePatterns as a human accept/reject checklist (never auto-commits) |
| [[count_evds_per_subtask]] | Refresh the per-question evidence-summary index + EP strength tags |

**Two-layer docs:** each script's **usage + spec** lives in its module docstring; its **design
decisions, limitations, and "smarter later" roadmap** live in a per-script note `Pipeline/<script>.md`
(linked above). Every pipeline script now has both.

Generated artifacts: `DGRAPH.md`, `Extraction Queue.md`, `EP Proposals.md`, `Evidence Summary.md`,
`relations.json`; trust manifests + reports under `data/` (gitignored).

## Integrity rules

- Ground only in **validated** sources; the extractor runs an **identity gate** (confirm the paper or
  refuse). The earlier `data/fulltext/` corpus is ~43% wrong-paper; PDFs ~97% clean.
- **Propose, don't commit** for synthesis — EvidencePatterns, merges, and summary cells are AI
  proposals; the human commits.
- Edges live in the plugin's `relations.json`; node bodies author them as wikilinks and
  `sync_relations.py` materialises them. Promotion is gated by the verbatim + attachment audits.
