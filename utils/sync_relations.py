#!/usr/bin/env python3
"""
sync_relations.py — the hybrid-edges bridge: materialise body wikilinks into relations.json.

WHAT
    Read edge-authoring wikilink sections from node bodies and materialise them into
    relations.json (the Discourse Graphs plugin's instance-edge store), with the correct schema
    direction + relation type. Node bodies are the authoring surface; this script is the bridge.

HOW
    1. Index every node under Discourse Graph/ by stem → {nodeInstanceId, node-type}.
    2. For each node body, walk its ## / ### sections; a (node-type, heading) pair matches a
       SECTION_RULE that fixes the relation, the direction (which endpoint is source), and the
       EXPECTED linked-node type.
    3. For each wikilink in a matched section, resolve it, apply the type-guard, orient the edge
       per the rule's direction, and queue it if absent.

    Authoring conventions (one location per edge — see Skill-references "Edge authoring"):
      CLM  ## Supporting Evidence    [[EVD]]  -> EVD  —supports→  CLM
      CLM  ## Contradicting Evidence [[EVD]]  -> EVD  —opposes→   CLM
      EP   ## Supporting Evidence    [[EVD]]  -> EVD  —supports→  EP
      EP   ## Contradicting Evidence [[EVD]]  -> EVD  —opposes→   EP
      CVT  ## Qualifies              [[EVD]]  -> CVT  —qualifies→ EVD
      QUE  ## Claims addressing this question [[CLM]] -> CLM —informs→ QUE

INPUT   Discourse Graph/**/*.md (nodeInstanceId/nodeTypeId frontmatter + edge-authoring sections).
OUTPUT  relations.json (only with --apply) + a console diff. Dry-run by default.

INVARIANTS / NOTES
    - One authoring location per edge: an edge is declared in exactly one node body.
    - Additive + idempotent: existing edges are preserved; an edge is added only if no edge with
      the same (source, destination, type) already exists. There is NO prune.
    - Type-guard: a linked node whose type ≠ the rule's expected type is skipped (e.g. a legacy
      [[@Source]] link under an Evidence section) and reported as mismatched.

USAGE
    python3 utils/sync_relations.py            # dry-run: report edges that would be added
    python3 utils/sync_relations.py --apply    # write to relations.json

Design decisions, limitations, and the "smarter later" roadmap: Pipeline/sync_relations.md
"""

import argparse
import json
import os
import re
import time
import uuid as _uuid
from pathlib import Path

import yaml

REL = {
    "supports": "relation_BO5BtVVpJGrw70jTCTznm",
    "opposes": "relation_QtuzWZj3zndZBKQe7LcFK",
    "informs": "relation_OxKXi9qk9qcigTKK2BGeY",
    "qualifies": "rel_o0a9NeAmWnhFBaVLNiJ1g",
}
TYPE = {
    "node_LsIeSJxI7M9DoE3ISFEmw": "QUE",
    "node_nMxzA_OByPwgPcmb6AN82": "CLM",
    "node_huDx8FGfNSGQyongW5rk-": "EVD",
    "node_Ne237S0BfRPDaeqB_gbuT": "SRC",
    "node_Q4sxSAHaUscV3smL5OBnB": "CVT",
}

# (node-type, section-heading) -> (relation, direction, expected linked-node type)
# direction "in"  : linked node is the SOURCE, this node the DESTINATION
# direction "out" : this node is the SOURCE, linked node the DESTINATION
# The expected-type guard ignores legacy sections that link papers ([[@Source]]) instead of EVDs.
SECTION_RULES = {
    ("CLM", "supporting evidence"): ("supports", "in", "EVD"),
    ("CLM", "contradicting evidence"): ("opposes", "in", "EVD"),
    ("EP", "supporting evidence"): ("supports", "in", "EVD"),
    ("EP", "contradicting evidence"): ("opposes", "in", "EVD"),
    ("CVT", "qualifies"): ("qualifies", "out", "EVD"),
    ("QUE", "claims addressing this question"): ("informs", "in", "CLM"),
    ("CLM", "opposing claims"): ("opposes", "out", "CLM"),
    ("CLM", "related claims"): ("informs", "out", "CLM"),
}

WIKILINK = re.compile(r"\[\[([^\]\|#]+)")


def uuid7() -> str:
    ms = int(time.time() * 1000)
    b = bytearray(ms.to_bytes(6, "big") + os.urandom(10))
    b[6] = (b[6] & 0x0F) | 0x70
    b[8] = (b[8] & 0x3F) | 0x80
    return str(_uuid.UUID(bytes=bytes(b)))


def split_frontmatter(path: Path):
    c = path.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", c, re.DOTALL)
    if not m:
        return {}, c
    try:
        fm = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        fm = {}
    return fm, m.group(2)


def sections(body: str):
    """Yield (heading_lower, section_text) for each ## / ### heading."""
    parts = re.split(r"^#{2,3}\s+(.+?)\s*$", body, flags=re.MULTILINE)
    # parts[0] is preamble; then alternating heading, text
    for i in range(1, len(parts), 2):
        yield parts[i].strip().lower(), parts[i + 1]


def main():
    ap = argparse.ArgumentParser(description="Materialize wikilink edges into relations.json.")
    ap.add_argument("--apply", action="store_true", help="Write changes (default: dry-run).")
    args = ap.parse_args()

    root = Path(__file__).parent.parent
    dg = root / "Discourse Graph"
    rel_path = root / "relations.json"

    # name(stem) -> {iid, type}; also collect per-file info
    by_name = {}
    files = []
    for f in dg.rglob("*.md"):
        fm, body = split_frontmatter(f)
        iid = fm.get("nodeInstanceId")
        ntype = TYPE.get(fm.get("nodeTypeId"))
        if iid and ntype:
            by_name[f.stem] = {"iid": iid, "type": ntype}
        files.append((f, fm, body, iid, ntype))

    # existing edges
    data = json.loads(rel_path.read_text(encoding="utf-8")) if rel_path.exists() else {"version": 1, "relations": {}}
    existing = data.get("relations", {})
    have = {(e["source"], e["destination"], e["type"]) for e in existing.values()}

    to_add = []
    unresolved = []
    mismatched = []
    for f, fm, body, iid, ntype in files:
        if not iid or not ntype:
            continue
        for heading, text in sections(body):
            rule = SECTION_RULES.get((ntype, heading))
            if not rule:
                continue
            rel, direction, expected = rule
            for link in WIKILINK.findall(text):
                tgt = by_name.get(link.strip())
                if not tgt:
                    if link.strip().startswith(("EVD", "CLM", "QUE", "EP", "CVT")):
                        unresolved.append((f.stem, link.strip()))
                    continue
                if tgt["type"] != expected:   # e.g. legacy [[@Source]] under an Evidence section
                    mismatched.append((f.stem, link.strip(), tgt["type"], expected))
                    continue
                if direction == "in":      # linked node -> this node
                    src, dst = tgt["iid"], iid
                else:                       # this node -> linked node
                    src, dst = iid, tgt["iid"]
                key = (src, dst, REL[rel])
                if key in have:
                    continue
                have.add(key)
                to_add.append({"src": src, "dst": dst, "rel": rel, "where": f.stem, "link": link.strip()})

    print(f"Nodes indexed: {len(by_name)} | existing edges: {len(existing)}")
    print(f"Edges to add: {len(to_add)}")
    for e in to_add[:40]:
        print(f"  + {e['rel']:9} {e['where'][:40]} -> {e['link'][:40]}")
    if len(to_add) > 40:
        print(f"  … and {len(to_add)-40} more")
    if mismatched:
        print(f"\nSkipped (linked node type ≠ expected; e.g. legacy [[@Source]] under an Evidence section): {len(mismatched)}")
        for w, l, got, exp in mismatched[:10]:
            print(f"  ~ in {w[:38]}: [[{l[:34]}]] is {got}, expected {exp}")
    if unresolved:
        print(f"\nUnresolved wikilinks (no matching node / missing nodeInstanceId): {len(unresolved)}")
        for w, l in unresolved[:15]:
            print(f"  ? in {w[:40]}: [[{l}]]")

    if not args.apply:
        print("\n(dry-run; re-run with --apply to write relations.json)")
        return

    now = int(time.time() * 1000)
    for e in to_add:
        eid = uuid7()
        existing[eid] = {"id": eid, "type": REL[e["rel"]], "source": e["src"], "destination": e["dst"], "created": now}
    data["relations"] = existing
    data["version"] = data.get("version", 1)
    data["lastModified"] = now
    rel_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"\nApplied: +{len(to_add)} edges → {rel_path} (total {len(existing)})")


if __name__ == "__main__":
    main()
