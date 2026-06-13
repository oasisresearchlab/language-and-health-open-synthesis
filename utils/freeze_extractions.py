#!/usr/bin/env python3
"""
freeze_extractions.py — stamp AI-extraction provenance + freeze an immutable benchmark baseline.

WHAT
    Every AI-authored discourse node is a model output we will later score against human review.
    This (1) stamps extraction provenance into the node's frontmatter (`extraction_model`,
    `extraction_prompt_version`, `extracted_at`) and (2) freezes the node's CURRENT content into an
    immutable, git-committed JSONL baseline under benchmark/extractions/<run_id>/ — the exact
    pre-review output the review app's labels will be scored against. Without this frozen baseline +
    version pin, model performance cannot be attributed (see plans/review-app.md).

HOW
    1. Scan Discourse Graph/**/*.md for nodes (have `nodeTypeId`) that are AI-authored
       (`curationStatus: Initial AI draft` by default; --all to include any curationStatus).
    2. STAMP (idempotent): insert extraction_model / extraction_prompt_version / extracted_at after
       the `curationStatus:` line if absent. `extracted_at` is the file's git add-date (first commit),
       falling back to now — the honest extraction time, not the freeze time.
    3. FREEZE (immutable): append one JSON record per node to
       benchmark/extractions/<run_id>/<NodeType>.jsonl. A node already present in that run's file is
       skipped — the first snapshot wins, so a re-run never rewrites a baseline. Re-extraction with a
       new model/prompt → a new run_id → a new baseline.

    run_id      = <date>_<model-slug>_<prompt_version>  (override with --run-id)
    prompt_hash = short sha256 of the Skill*.md prompt artifacts, recorded for traceability
    model       = --model (default claude-opus-4-8); the human running the freeze knows what authored

INPUT   Discourse Graph/**/*.md (frontmatter w/ nodeTypeId + curationStatus); Skill*.md; git history.
OUTPUT  benchmark/extractions/<run_id>/<NodeType>.jsonl (committed, immutable); stamped frontmatter.

INVARIANTS / NOTES
    - Report-only by default; --apply performs both the stamp and the freeze.
    - Idempotent: stamp skips already-stamped notes; freeze skips node_ids already in the run file.
    - benchmark/ is tracked in git (unlike data/) — it is the source of truth, later mirrored to Supabase.

USAGE
    python3 utils/freeze_extractions.py                       # report-only: what would freeze/stamp
    python3 utils/freeze_extractions.py --apply               # stamp + freeze the AI-draft nodes
    python3 utils/freeze_extractions.py --apply --model claude-opus-4-8 --prompt-version v2
    python3 utils/freeze_extractions.py --apply --all         # include non-draft nodes too
"""

import argparse
import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import yaml

ROOT = Path(__file__).parent.parent
GRAPH_DIR = ROOT / "Discourse Graph"
BENCH_DIR = ROOT / "benchmark" / "extractions"

DEFAULT_MODEL = "claude-opus-4-8"
DEFAULT_PROMPT_VERSION = "v1"
AI_DRAFT_STATUS = "Initial AI draft"

# Map nodeTypeId -> short label for the per-type JSONL filename.
NODETYPE_LABEL = {
    "node_LsIeSJxI7M9DoE3ISFEmw": "QUE",
    "node_nMxzA_OByPwgPcmb6AN82": "CLM",
    "node_huDx8FGfNSGQyongW5rk-": "EVD",
    "node_Ne237S0BfRPDaeqB_gbuT": "SRC",
    "node_r2JRW9jgphgmMpz5mN7eG": "EP",
    "node_vUzzS2ZuolcZzErZfyC72": "PTN",
    "node_OULGh2SuqxP1oES9p2k_9": "ART",
    "node_Q4sxSAHaUscV3smL5OBnB": "CVT",
}


def extract_frontmatter(path: Path) -> Optional[Dict]:
    """YAML frontmatter as a dict (mirrors fetch_pdfs.py)."""
    content = path.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if not m:
        return None
    try:
        return yaml.safe_load(m.group(1))
    except yaml.YAMLError:
        return None


def split_node(path: Path):
    """Return (frontmatter_text, body_text) or (None, full) if no frontmatter."""
    content = path.read_text(encoding="utf-8")
    m = re.match(r"^(---\s*\n)(.*?)(\n---\n?)(.*)$", content, re.DOTALL)
    if not m:
        return None, content
    return m.group(2), m.group(4)


def git_add_date(path: Path) -> Optional[str]:
    """ISO date of the file's first commit (the add) — the honest extraction time."""
    try:
        out = subprocess.run(
            ["git", "log", "--diff-filter=A", "--follow", "--format=%aI", "--", str(path)],
            cwd=ROOT, capture_output=True, text=True, timeout=15,
        )
        lines = [ln for ln in out.stdout.splitlines() if ln.strip()]
        return lines[-1] if lines else None  # last = earliest (the add)
    except Exception:
        return None


def prompt_hash() -> str:
    """Short sha256 over the Skill*.md prompt artifacts, for traceability."""
    h = hashlib.sha256()
    for f in sorted(ROOT.glob("Skill*.md")):
        h.update(f.read_bytes())
    return h.hexdigest()[:12]


def stamp_frontmatter(path: Path, model: str, prompt_version: str, extracted_at: str) -> str:
    """
    Insert extraction_model / extraction_prompt_version / extracted_at after the `curationStatus:`
    line (else at end of frontmatter), without re-dumping YAML. Idempotent.
    Returns: 'stamped' | 'exists' | 'no-frontmatter'
    """
    content = path.read_text(encoding="utf-8")
    m = re.match(r"^(---\s*\n)(.*?)(\n---)", content, re.DOTALL)
    if not m:
        return "no-frontmatter"
    fm = m.group(2)
    if re.search(r"^extraction_model:\s*\S", fm, re.MULTILINE):
        return "exists"

    new_lines = [
        f"extraction_model: {model}",
        f"extraction_prompt_version: {prompt_version}",
        f"extracted_at: {extracted_at}",
    ]
    lines = fm.split("\n")
    out: List[str] = []
    inserted = False
    for line in lines:
        out.append(line)
        if not inserted and re.match(r"^curationStatus:", line):
            out.extend(new_lines)
            inserted = True
    if not inserted:
        out.extend(new_lines)

    new_fm = "\n".join(out)
    path.write_text(content[: m.start(2)] + new_fm + content[m.end(2):], encoding="utf-8")
    return "stamped"


def source_citekey(fm: Dict) -> Optional[str]:
    """Best-effort source identity: EVD `Source` wikilink, or SRC `citekey`."""
    src = fm.get("Source") or fm.get("source")
    if isinstance(src, str):
        mm = re.search(r"\[\[(@[^\]]+)\]\]", src)
        if mm:
            return mm.group(1)
        return src.strip().strip('"') or None
    ck = fm.get("citekey")
    return str(ck).strip().strip('"') if ck else None


def main():
    ap = argparse.ArgumentParser(
        description="Stamp extraction provenance and freeze an immutable benchmark baseline (report-only unless --apply)."
    )
    ap.add_argument("--apply", action="store_true", help="Perform the stamp + freeze. Default is report-only.")
    ap.add_argument("--model", default=DEFAULT_MODEL, help=f"Model that authored the extractions (default {DEFAULT_MODEL}).")
    ap.add_argument("--prompt-version", default=DEFAULT_PROMPT_VERSION, help=f"Prompt/skill version label (default {DEFAULT_PROMPT_VERSION}).")
    ap.add_argument("--run-id", default=None, help="Override the run_id (default <date>_<model>_<prompt_version>).")
    ap.add_argument("--all", action="store_true", help="Include nodes of any curationStatus (default: only AI drafts).")
    args = ap.parse_args()

    ph = prompt_hash()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    model_slug = re.sub(r"[^a-z0-9]+", "", args.model.lower())
    run_id = args.run_id or f"{today}_{model_slug}_{args.prompt_version}"
    run_dir = BENCH_DIR / run_id

    # Existing frozen node_ids per type (immutability guard), loaded once.
    frozen: Dict[str, set] = {}
    if run_dir.exists():
        for jf in run_dir.glob("*.jsonl"):
            frozen[jf.stem] = {
                json.loads(ln)["node_id"]
                for ln in jf.read_text(encoding="utf-8").splitlines() if ln.strip()
            }

    nodes = []
    for f in sorted(GRAPH_DIR.rglob("*.md")):
        fm = extract_frontmatter(f)
        if not fm or not fm.get("nodeTypeId"):
            continue
        # Sources are bibliographic, not AI extractions — never freeze/stamp them, even though
        # inbox-authored stubs may carry curationStatus.
        if fm.get("nodeTypeId") == "node_Ne237S0BfRPDaeqB_gbuT":
            continue
        status = fm.get("curationStatus")
        if not args.all and status != AI_DRAFT_STATUS:
            continue
        nodes.append((f, fm))

    print(f"run_id: {run_id}   model: {args.model}   prompt_version: {args.prompt_version}   prompt_hash: {ph}")
    print(f"candidate nodes: {len(nodes)} ({'all curationStatus' if args.all else AI_DRAFT_STATUS})")
    if not args.apply:
        print("\n(report-only — re-run with --apply to stamp + freeze)")

    counts = {"stamped": 0, "stamp-exists": 0, "frozen": 0, "freeze-skip": 0}
    to_write: Dict[str, List[str]] = {}

    for f, fm in nodes:
        label = NODETYPE_LABEL.get(fm["nodeTypeId"], "OTHER")
        node_id = str(fm.get("nodeInstanceId") or f.stem)
        extracted_at = git_add_date(f) or datetime.now(timezone.utc).isoformat()

        already = node_id in frozen.get(label, set()) or node_id in {
            json.loads(r)["node_id"] for r in to_write.get(label, [])
        }
        if args.apply:
            res = stamp_frontmatter(f, args.model, args.prompt_version, extracted_at)
            counts["stamped" if res == "stamped" else "stamp-exists"] += 1

        if already:
            counts["freeze-skip"] += 1
            continue

        fm_text, body = split_node(f)
        record = {
            "node_id": node_id,
            "node_file": str(f.relative_to(ROOT)),
            "node_type": label,
            "nodeTypeId": fm["nodeTypeId"],
            "source": source_citekey(fm),
            "model": args.model,
            "prompt_version": args.prompt_version,
            "prompt_hash": ph,
            "extracted_at": extracted_at,
            "frozen_at": datetime.now(timezone.utc).isoformat(),
            "frontmatter": fm,
            "body": body,
        }
        to_write.setdefault(label, []).append(json.dumps(record, ensure_ascii=False, default=str))
        counts["frozen"] += 1

    if args.apply:
        run_dir.mkdir(parents=True, exist_ok=True)
        for label, recs in to_write.items():
            with (run_dir / f"{label}.jsonl").open("a", encoding="utf-8") as fh:
                for r in recs:
                    fh.write(r + "\n")

    print("\nsummary:")
    print(f"  would-freeze / froze : {counts['frozen']}")
    print(f"  freeze-skip (immutable, already in run): {counts['freeze-skip']}")
    if args.apply:
        print(f"  stamped : {counts['stamped']}   already-stamped : {counts['stamp-exists']}")
        print(f"  baseline: {run_dir.relative_to(ROOT)}/")
    else:
        for label, recs in sorted(to_write.items()):
            print(f"    {label}: {len(recs)}")


if __name__ == "__main__":
    main()
