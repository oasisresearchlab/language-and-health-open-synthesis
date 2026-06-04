---
type: pipeline-spec
script: utils/attachment_audit.py
updated: 2026-06-04
---
# attachment_audit.py — design note

Usage + spec live in the module docstring (`utils/attachment_audit.py`). This note holds the **why**,
the **limitations**, and the **roadmap**. Part of [[Pipeline]].

**In one line:** enforce six structural invariants over `relations.json` and exit non-zero on any
violation, so a malformed discourse graph can gate the next extraction step.

## Design decisions

- **Invariants as the contract.** Six checks encode the discourse-graph grammar:
  I1 CVT qualifies EVD only · I2 every EVD supports a CLM/EP · I3 every CLM informs a QUE ·
  I4 every CLM has a supporting EVD · I5 every EP has ≥2 EVDs from ≥2 papers · I6 every EVD has a
  Source. Together they mean: no orphan evidence, no orphan/ungrounded claim, caveats land only on
  evidence, and EvidencePatterns are genuinely cross-paper.
- **Exit 1 on violation → it gates.** A non-zero exit lets the audit block promotion to the next
  cluster in CI / the pipeline; a clean graph is a precondition, not a suggestion.
- **Check edges in `relations.json`, types in frontmatter.** Edges come from the plugin's instance-edge
  store; node type/paper come from frontmatter (`nodeTypeId`, filename `@citekey` / `Source`). Same id
  tables and `nodeInstanceId` join as the rest of the pipeline.
- **I5 paper-distinctness via the filename `@citekey`.** "Cross-paper" is judged by distinct papers,
  not distinct EVDs, so two EVDs from one paper can't fake a pattern.
- **`--scope` for partial runs.** Limit the per-node invariants (I2–I6) to nodes whose name/tags
  contain a substring, to audit just the cluster you're working on; I1 stays global.
- **Read-only.** Reports + sets the exit code; it never repairs the graph (repair is a human edit,
  consistent with propose-don't-commit).

## Known limitations

- **Remaining I4 debt is expected.** A residue of I4 violations (CLM with no supporting EVD) is the
  pool of informal legacy claims authored before the evidence-grounding discipline — known debt, not a
  regression. Don't treat a non-zero I4 count as a fresh break without checking it's that legacy set.
- **Structure only, no semantics.** It verifies an EVD *supports* a CLM, never that the EVD actually
  supports it — content fidelity is `verbatim_audit.py`'s job, not this one.
- **Same-cohort papers count as distinct.** I5 counts distinct citekeys, so re-analyses of one dataset
  both count, overstating an EP's independence (same caveat as `propose_eps`).
- **Plugin-schema-coupled.** Hardcoded node-type/relation ids; a plugin schema change mistypes nodes
  (`?`) and can hide or invent violations.
- **`--scope` is a substring over name/tags**, not a structural neighborhood — it can miss a node that
  belongs to the cluster but doesn't carry the keyword, or pull in an unrelated namesake.

## Future — "smarter later"

- **Pay down I4 debt:** either ground each legacy claim with an EVD or explicitly mark it as informal,
  so I4 can become a hard zero and a real regression signal.
- **Severity levels:** distinguish hard violations (orphan EVD) from known-debt classes so the gate can
  fail on the former while tracking the latter.
- **Schema ids from plugin config** instead of constants, so the audit survives a plugin reinstall.
- **Independence-aware I5:** detect shared cohorts (author + sample + site) so cross-paper means
  independent replication, not re-analysis.
- **Machine-readable report:** emit the violations as JSON/TSV alongside the console output so CI can
  diff and annotate them per node.
