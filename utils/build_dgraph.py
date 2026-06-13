#!/usr/bin/env python3
"""
build_dgraph.py — generate a nested discourse-graph index (DGRAPH.md) from relations.json.

WHAT
    Materialises the plugin's instance-edge store into a single human-readable, nested index of the
    discourse graph. Read-only over the vault: it derives the view, never mutates nodes or edges.

HOW
    1. Walk every node note's frontmatter to build instanceId -> {name, type, citekey}, mapping the
       plugin's hardcoded nodeTypeId values to short tags (QUE/CLM/EVD/CVT/EP/...).
    2. Load relations.json edges as (source, destination, type) triples.
    3. For each QUE, nest CLMs that inform it → EVDs that support/oppose each CLM → CVTs that qualify
       each EVD, resolving every node by its nodeInstanceId.
    4. Emit a separate EvidencePatterns section: each EP with its supporting EVDs and a distinct-paper
       count (citekey, falling back to the filename's "@citekey" suffix).

INPUT   Discourse Graph/**/*.md (frontmatter); relations.json.
OUTPUT  DGRAPH.md (vault root) + a console node/edge summary. Read-only over the graph.

INVARIANTS / NOTES
    - Read-only: never writes node files or edges; the index is fully regenerable.
    - The plugin's node-type and relation ids are hardcoded; changing the plugin schema breaks them.
    - Nodes are joined to edges by nodeInstanceId, not filename — robust to renames.

USAGE
    python3 utils/build_dgraph.py

Design decisions, limitations, and the "smarter later" roadmap: Pipeline/build_dgraph.md
"""

import json
import re
from pathlib import Path

import yaml

REL = {
    "supports": "relation_BO5BtVVpJGrw70jTCTznm",
    "opposes": "relation_QtuzWZj3zndZBKQe7LcFK",
    "informs": "relation_OxKXi9qk9qcigTKK2BGeY",
    "qualifies": "rel_o0a9NeAmWnhFBaVLNiJ1g",
}
REL_INV = {v: k for k, v in REL.items()}
TYPE = {
    "node_LsIeSJxI7M9DoE3ISFEmw": "QUE",
    "node_nMxzA_OByPwgPcmb6AN82": "CLM",
    "node_huDx8FGfNSGQyongW5rk-": "EVD",
    "node_Ne237S0BfRPDaeqB_gbuT": "SRC",
    "node_vUzzS2ZuolcZzErZfyC72": "PTN",
    "node_OULGh2SuqxP1oES9p2k_9": "ART",
    "node_Q4sxSAHaUscV3smL5OBnB": "CVT",
}


def frontmatter(path: Path) -> dict:
    c = path.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---", c, re.DOTALL)
    if not m:
        return {}
    try:
        return yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        return {}


def main():
    root = Path(__file__).parent.parent
    dg = root / "Discourse Graph"

    # instanceId -> {name, type}
    nodes = {}
    for f in dg.rglob("*.md"):
        d = frontmatter(f)
        iid = d.get("nodeInstanceId")
        if iid:
            nodes[iid] = {"name": f.stem, "type": TYPE.get(d.get("nodeTypeId"), "?"), "citekey": d.get("citekey")}

    rels = json.loads((root / "relations.json").read_text(encoding="utf-8")).get("relations", {})
    edges = [(r["source"], r["destination"], r["type"]) for r in rels.values()]

    def sources_to(dst_id, rel, src_type):
        """instanceIds of `src_type` nodes pointing to dst_id via `rel`."""
        out = []
        for s, d, t in edges:
            if d == dst_id and t == REL[rel] and nodes.get(s, {}).get("type") == src_type:
                out.append(s)
        return out

    def name(iid):
        return nodes.get(iid, {}).get("name", iid)

    lines = [
        "---",
        "page_type: dgraph",
        "generated_by: utils/build_dgraph.py",
        "---",
        "",
        "# Discourse graph index",
        "",
        "> Auto-generated from `relations.json`. Nesting: QUE → CLM → EVD → ⚠️ CVT.",
        "",
    ]

    ques = sorted([i for i, n in nodes.items() if n["type"] == "QUE"], key=name)
    for q in ques:
        lines.append(f"### [[{name(q)}]]")
        clms = sorted(sources_to(q, "informs", "CLM"), key=name)
        if not clms:
            lines.append("- _(no claims linked yet)_")
        for c in clms:
            lines.append(f"- [[{name(c)}]]")
            for e in sorted(sources_to(c, "supports", "EVD"), key=name):
                lines.append(f"    - [[{name(e)}]]")
                for v in sorted(sources_to(e, "qualifies", "CVT"), key=name):
                    lines.append(f"        - ⚠️ [[{name(v)}]]")
            for e in sorted(sources_to(c, "opposes", "EVD"), key=name):
                lines.append(f"    - ✗ (opposes) [[{name(e)}]]")
        lines.append("")

    # EvidencePatterns
    eps = sorted([i for i, n in nodes.items() if n["type"] == "EP"], key=name)
    if eps:
        lines += ["## Evidence patterns", ""]
        for ep in eps:
            evds = sources_to(ep, "supports", "EVD")
            papers = {nodes[e].get("citekey") or name(e).split(" - @")[-1] for e in evds}
            lines.append(f"### [[{name(ep)}]]  ({len(evds)} EVDs · {len(papers)} papers)")
            for e in sorted(evds, key=name):
                lines.append(f"- [[{name(e)}]]")
            lines.append("")

    (root / "DGRAPH.md").write_text("\n".join(lines), encoding="utf-8")

    # summary
    by_type = {}
    for n in nodes.values():
        by_type[n["type"]] = by_type.get(n["type"], 0) + 1
    print("Nodes:", ", ".join(f"{k}={v}" for k, v in sorted(by_type.items())))
    print(f"Edges: {len(edges)} ({', '.join(sorted(set(REL_INV.get(t,'?') for _,_,t in edges)))})")
    print(f"QUEs indexed: {len(ques)} | EPs: {len(eps)}")
    print("Wrote DGRAPH.md")


if __name__ == "__main__":
    main()
