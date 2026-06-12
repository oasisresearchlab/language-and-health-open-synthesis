#!/usr/bin/env python3
"""
gen_short_labels.py — propose a short, human-readable `shortLabel` for each discourse node.

WHAT
    The site's graph views draw the node id (C-0004) plus a `shortLabel` on each node and reveal
    the full title on hover. This script generates that label and writes it into the *canonical
    vault* frontmatter (Discourse Graph/**/*.md) as `shortLabel:`. export_rdf.py then carries it
    through to graph/, and the site renders it. The label lives with the node (like curationStatus),
    is version-controlled, and is human-editable — fitting "AI proposes, human commits": review the
    git diff and edit any label before committing.

HOW
    QUE/CLM/EVD/EP/ART  → 2–5 word semantic label via OpenRouter (set OPENROUTER_API_KEY).
    SRC                 → "Author Year", derived deterministically from the @Author_Year citekey
                          (no LLM call).
    Idempotent: nodes that already have a non-empty shortLabel are skipped unless --force.

USAGE
    export OPENROUTER_API_KEY=sk-or-...           # not needed with --sources-only
    python3 utils/gen_short_labels.py             # fill in missing labels
    python3 utils/gen_short_labels.py --force     # regenerate all
    python3 utils/gen_short_labels.py --dry-run   # print proposals, write nothing
    python3 utils/gen_short_labels.py --sources-only   # just the deterministic SRC labels
    python3 utils/gen_short_labels.py --limit 5   # cap LLM calls (smoke test)

    Then: python3 utils/export_rdf.py && (cd site && pnpm data:graph)

Mirrors the model used by the site's narrative generator (mistralai/mistral-large via OpenRouter).
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent.parent
DG = ROOT / "Discourse Graph"

# nodeTypeId -> (code, needs-LLM?)
TMAP = {
    "node_LsIeSJxI7M9DoE3ISFEmw": ("QUE", True),
    "node_nMxzA_OByPwgPcmb6AN82": ("CLM", True),
    "node_huDx8FGfNSGQyongW5rk-": ("EVD", True),
    "node_r2JRW9jgphgmMpz5mN7eG": ("EP", True),
    "node_OULGh2SuqxP1oES9p2k_9": ("ART", True),
    "node_Ne237S0BfRPDaeqB_gbuT": ("SRC", False),
}
MODEL = "mistralai/mistral-large"
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM = (
    "You write ultra-concise labels for nodes in a research discourse graph about language "
    "concordance and healthcare. Given a node's type and full title, return a 2-5 word label "
    "(<= 32 characters) that captures its gist for display on a small graph node. Use compact "
    "directional shorthand where natural: ↑ (increases), ↓ (decreases/reduces), → (leads to), "
    "≠ (is not). Keep domain abbreviations the field uses (LEP, ART, LOS, HbA1c). For Questions, "
    "phrase as a terse question ending in '?'. No quotes, no trailing period, no node id. "
    "Return ONLY the label text."
)

FM_RE = re.compile(r"^(---\s*\n)(.*?\n)(---\s*\n)(.*)$", re.DOTALL)
TITLE_RE = re.compile(r"^(QUE|CLM|EVD|EP|CVT|ART|PTN) - ")


def title_of(stem: str) -> str:
    return TITLE_RE.sub("", stem).split(" - @")[0].lstrip("@").strip()


def split_fm(text: str):
    m = FM_RE.match(text)
    if not m:
        return None
    open_f, fm, close_f, rest = m.groups()
    return open_f, fm, close_f, rest


def fm_get(fm: str, key: str) -> str:
    m = re.search(rf"^{re.escape(key)}:\s*(.*)$", fm, re.MULTILINE)
    return m.group(1).strip().strip('"').strip("'") if m else ""


def set_short_label(text: str, label: str) -> str:
    open_f, fm, close_f, rest = split_fm(text)
    val = label.replace("\\", "\\\\").replace('"', '\\"')
    line = f'shortLabel: "{val}"'
    if re.search(r"^shortLabel:.*$", fm, re.MULTILINE):
        fm = re.sub(r"^shortLabel:.*$", line, fm, count=1, flags=re.MULTILINE)
    else:
        fm = line + "\n" + fm  # first frontmatter key
    return open_f + fm + close_f + rest


def source_label(citekey_or_stem: str) -> str:
    """`Adams_2016_Communication_Barriers` -> `Adams 2016`."""
    parts = citekey_or_stem.lstrip("@").split("_")
    author = parts[0] if parts else citekey_or_stem
    year = next((p for p in parts[1:] if re.fullmatch(r"\d{4}", p)), "")
    return f"{author} {year}".strip()


def call_llm(api_key: str, node_type: str, title: str) -> str:
    body = json.dumps({
        "model": MODEL,
        "temperature": 0.2,
        "max_tokens": 32,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"Type: {node_type}\nTitle: {title}"},
        ],
    }).encode()
    req = urllib.request.Request(
        ENDPOINT, data=body,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())
    label = data["choices"][0]["message"]["content"].strip()
    label = label.strip().strip('"').strip("'").rstrip(".").strip()
    return label[:40]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="regenerate even if a label exists")
    ap.add_argument("--dry-run", action="store_true", help="print proposals, write nothing")
    ap.add_argument("--sources-only", action="store_true", help="only deterministic SRC labels")
    ap.add_argument("--limit", type=int, default=0, help="cap LLM calls (0 = no cap)")
    args = ap.parse_args()

    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    targets = []  # (path, code, needs_llm)
    for f in DG.rglob("*.md"):
        parts = split_fm(f.read_text(encoding="utf-8", errors="ignore"))
        if not parts:
            continue
        type_id = fm_get(parts[1], "nodeTypeId")
        if type_id not in TMAP:
            continue
        code, needs_llm = TMAP[type_id]
        if args.sources_only and code != "SRC":
            continue
        targets.append((f, code, needs_llm))

    written = skipped = called = 0
    for f, code, needs_llm in sorted(targets, key=lambda t: t[0].name):
        text = f.read_text(encoding="utf-8")
        parts = split_fm(text)
        if not parts:
            continue
        _, fm, _, _ = parts
        if fm_get(fm, "shortLabel") and not args.force:
            skipped += 1
            continue

        title = title_of(f.stem)
        if code == "SRC":
            label = source_label(title)
        else:
            if not api_key:
                print("ERROR: OPENROUTER_API_KEY not set (needed for non-source nodes).",
                      file=sys.stderr)
                return 1
            if args.limit and called >= args.limit:
                continue
            try:
                label = call_llm(api_key, code, title)
            except (urllib.error.URLError, KeyError, TimeoutError) as e:
                print(f"  ! {f.name}: LLM call failed ({e}); skipping", file=sys.stderr)
                continue
            called += 1

        if not label:
            continue
        print(f"  {code:3} {label!r}  <-  {title[:70]}")
        written += 1
        if not args.dry_run:
            f.write_text(set_short_label(text, label), encoding="utf-8")

    verb = "would write" if args.dry_run else "wrote"
    print(f"\n{verb} {written} labels  ·  skipped {skipped} (already labeled)  ·  {called} LLM calls")
    if not args.dry_run and written:
        print("Next: python3 utils/export_rdf.py && (cd site && pnpm data:graph)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
