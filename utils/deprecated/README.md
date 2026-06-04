# Deprecated scripts

These are the **original** paper-mining + claim-matching utilities, kept for provenance. None are
used in the current pipeline (see [[Pipeline]] / `../../Pipeline.md`), and no current script imports
them. Git history is preserved (they were `git mv`'d here), so any can be revived.

**The original workflow they implemented:** CSV of papers → per-paper markdown source notes →
abstract-based classification + evidence/variable extraction → embedding/entailment linking of papers
↔ claims ↔ evidence. That semantic-similarity linking has been replaced by the discourse-graph
extraction flow (verbatim-grounded EVD/CLM/CVT nodes + first-class plugin edges via
`sync_relations.py`), and the unreliable full-text fetch has been replaced by the PDF + validation
stack.

| Script | Prior usage | Status / superseded by |
|---|---|---|
| `convert_papers_to_md.py` | One-time importer: CSV (`data/LEP-papers-2025-06.csv`) → 785 `@citekey.md` source notes with YAML frontmatter. | The genesis of the source corpus. Not replaced — re-run only if the CSV is re-imported. |
| `classify_empirical.py` | Set `has_empirical_findings` on source notes from the abstract. | One-time; the field is already on the notes. |
| `extract_evidence.py` | Pulled candidate empirical results from abstracts into the `## Possible evidence` / `#evd-candidate` lists on source notes, tagged with factor/outcome variables. | Superseded by the discourse-graph **EVD extraction** flow (AI extraction with verbatim quotes + figure grounding), which produces real EVD nodes instead of abstract candidates. |
| `fetch_fulltext.py` | PMID → PMC ELink → full-text XML → `data/fulltext/*.txt`. | **Deprecated — unreliable** (~43% wrong-paper / review substitutions; see memory `fulltext-corpus-unreliable`). Superseded by `fetch_pdfs.py` + `validate_fulltext.py` + `refetch_by_title.py`. |
| `match_papers_to_claims.py` | Embedding (all-MiniLM-L6-v2) similarity between papers and claims → "## Potentially Relevant Papers" wikilink sections on CLM/QUE notes. | Superseded by discourse-graph extraction + `sync_relations.py` (first-class EVD→CLM/EP edges from authored wikilinks). Its embedding scaffolding was reused in `cluster_queue.py`. |
| `match_claims_to_evidence.py` | Embedding similarity to link claims to specific evidence extractions. | Superseded by explicit, authored EVD→CLM edges (`sync_relations.py`). |
| `match_claims_entailment.py` | LLM-based entailment to assess claim↔evidence support. | Experimental; superseded for now by manual/AI extraction with verbatim grounding. The *idea* lives on as a future direction — see GitHub issue #2 and [[propose_eps]]. |
| `test_entailment.py` | Smoke test for the entailment function above. | Obsolete with `match_claims_entailment.py`. |

To revive one: `git mv utils/deprecated/<script>.py utils/<script>.py`.
