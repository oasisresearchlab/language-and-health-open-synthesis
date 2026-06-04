# Progress log

Reverse-chronological log of work on the synthesis pipeline. Each entry links to that day's daily
note ([[YYYY-MM-DD]]). For the atemporal design, see [[Pipeline]] and `plans/`.

---

## [[2026-06-04]]

**Length-of-stay / interpretation cluster + legacy migration + figure grounding.**

- **New LOS cluster** (verify-first, parallel): extracted Lindholm 2012 (LOS 5.06 vs 2.57 d; readmission
  24.3% vs 14.9%), Lauren 2024 (RR+interpreters → mortality 7.42%→6.09%), L 2023 (dual-role nurse
  interpreters). **Wallbrecht caught as an identity mismatch** (its "validated" full text is a later
  paper citing it) — refused, no nodes.
- **Legacy migration:** wired all 12 legacy claims into the lodestar QUE (orphan-claim violations
  10→0); wired the 7 screenshot-grounded orphan EVDs (Karliner ×3, Adams, Abedini ×2, Allan) to their
  claims; re-grounded Aksharananda 2023 (pain OR 0.61) from validated full text; deleted superseded
  no-citekey duplicates. **Attachment violations 34 → 7** (remaining = informal legacy claims with no
  evidence: 55% malpractice, doctor time, "40% trust/adherence", etc.).
- **Figure grounding:** built `ground_figures.py` (adapted from remix `figure_pipeline.py`, extended
  for tables + Description-first embedding). Fixed an in-text-mention bug (caption-block locator with
  verb exclusion). **EVDs grounded 5 → 13** (every PDF-backed paper), visually verified.
- Wrote [[Pipeline]] + this log; committed on branch `synthesis-pipeline`.
- **Script documentation:** standardized module docstrings (WHAT/HOW/INPUT/OUTPUT/INVARIANTS/USAGE)
  and added a per-script design note `Pipeline/<script>.md` for all 13 pipeline scripts (decisions /
  limitations / future), linked from [[Pipeline]]. Filed GitHub issues
  [#1](https://github.com/oasisresearchlab/language-and-health-open-synthesis/issues/1) (facet-tagging
  dependency), [#2](https://github.com/oasisresearchlab/language-and-health-open-synthesis/issues/2)
  (statement-level EP detection), [#3](https://github.com/oasisresearchlab/language-and-health-open-synthesis/issues/3)
  (independence-aware counting), cross-linked from [[propose_eps]].
- **State:** 43 EVD · 29 CLM · 13 CVT · 2 ART · 1 EP · 6 QUE · 140 edges; 156 quotes verbatim-OK.

## [[2026-06-03]]

**Paper acquisition, skill system, adherence pilot, data-integrity layer.**

- **Acquisition (`getting-papers`):** built `fetch_pdfs.py` — added DOIs to 733 source notes, fetched
  148 OA PDFs (Europe PMC render after NCBI paths 404'd); figure/table extraction Route A (OA XML,
  20 papers) + Route B (PDF, 116 papers).
- **Skill system:** authored domain-adapted `CLAUDE.md` + `Skill.md`/`Skill-references.md`/
  `Skill-templates.md`/`Skill-synthesis.md` and node templates; planned the discourse-node extraction
  (`plans/extracting-discourse-nodes.md`), aligned to the Discourse Graphs plugin (first-class edges,
  added Caveat node type).
- **Graph pipeline:** built `cluster_queue`, `sync_relations`, `build_dgraph`, `verbatim_audit`,
  `attachment_audit`, `propose_eps`, `count_evds_per_subtask`.
- **Adherence pilot** (verify-first): Kahler, Moreno, Ratanawongsa, Zhang, Padilla, Stoneking, Ho,
  Kristen → first committed EvidencePattern ("language accessibility is the lever, not LEP status";
  5 independent papers, Moderate strength).
- **Data integrity:** discovered `data/fulltext/` is ~43% wrong-paper / review substitutions; a blind
  extraction batch produced 4/4 bad papers → rolled back. Built `validate_fulltext.py` (+`--pdf`) and
  `refetch_by_title.py`; fixed `Maria_2023` PMID (26030609→36030609); established the verify-or-refuse
  rule. See memory `fulltext-corpus-unreliable`.
