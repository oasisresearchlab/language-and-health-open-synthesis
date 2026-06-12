# benchmark/

Immutable baselines + (later) gold labels for evaluating LLM performance on the extraction task.
**Tracked in git** (unlike `data/`) — this directory is the source of truth, later mirrored to Supabase.

## `extractions/<run_id>/`

Frozen, pre-review snapshots of AI-authored discourse nodes — the exact model output the review
app's human labels will be scored against. Written by `utils/freeze_extractions.py --apply`.

- `run_id = <date>_<model-slug>_<prompt_version>` — one baseline per (model, prompt) extraction run.
- One JSONL file per node type (`EVD.jsonl`, `CLM.jsonl`, …); one record per node:
  `{node_id, node_file, node_type, source, model, prompt_version, prompt_hash, extracted_at,
    frozen_at, frontmatter, body}`.
- **Immutable:** a node already present in a run's file is never rewritten. Re-extraction with a new
  model/prompt produces a new `run_id`, not an edit.

Why freeze: nodes get edited during human review. Without the frozen original + the `model`/
`prompt_version` pin, performance cannot be attributed. See `plans/review-app.md`
("Instrumentation & benchmark dataset").

## Later

- `gold/` — `Expert-verified`, ≥2-reviewer-agreement papers: gold extractions + per-dimension labels,
  plus a `hard/` split for disagreements. Built from review records (Supabase) joined to these baselines.
