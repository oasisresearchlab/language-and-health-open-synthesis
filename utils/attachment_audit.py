#!/usr/bin/env python3
"""
attachment_audit.py — verify discourse-graph attachment invariants against relations.json
(the plugin's instance-edge store). Exits 1 if any invariant is violated, so it can gate promotion.

Invariants:
  I1  CVT —qualifies→ only EVD          (caveats constrain evidence, not claims/questions)
  I2  every EVD supports ≥1 CLM or EP   (no orphan evidence)
  I3  every CLM informs ≥1 QUE          (no orphan claim)
  I4  every CLM has ≥1 supporting EVD   (claim is grounded)
  I5  every EP has ≥2 EVDs from ≥2 distinct papers
  I6  every EVD declares a Source

Usage:
    python3 utils/attachment_audit.py
    python3 utils/attachment_audit.py --scope adherence   # only audit nodes touching that tag/word
"""

import argparse
import json
import re
import sys
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
    "node_r2JRW9jgphgmMpz5mN7eG": "EP",
    "node_vUzzS2ZuolcZzErZfyC72": "PTN",
    "node_OULGh2SuqxP1oES9p2k_9": "ART",
    "node_Q4sxSAHaUscV3smL5OBnB": "CVT",
}


def frontmatter(path: Path):
    c = path.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---", c, re.DOTALL)
    if not m:
        return {}
    try:
        return yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        return {}


def paper_of(name: str, fm: dict):
    m = re.search(r"@[A-Za-z][\w\-]+", name)
    if m:
        return m.group(0)
    s = re.search(r"@[A-Za-z][\w\-]+", str(fm.get("Source", "")))
    return s.group(0) if s else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scope", default=None, help="Only audit nodes whose name/tags contain this substring.")
    args = ap.parse_args()

    root = Path(__file__).parent.parent
    dg = root / "Discourse Graph"

    nodes = {}  # iid -> {name, type, paper, fm}
    for f in dg.rglob("*.md"):
        fm = frontmatter(f)
        iid = fm.get("nodeInstanceId")
        if not iid:
            continue
        t = TYPE.get(fm.get("nodeTypeId"), "?")
        nodes[iid] = {"name": f.stem, "type": t, "paper": paper_of(f.stem, fm), "fm": fm}

    edges = list(json.loads((root / "relations.json").read_text())["relations"].values())

    def out_edges(iid, rel):
        return [e for e in edges if e["source"] == iid and e["type"] == REL[rel]]

    def in_edges(iid, rel):
        return [e for e in edges if e["destination"] == iid and e["type"] == REL[rel]]

    def in_scope(n):
        if not args.scope:
            return True
        hay = (n["name"] + " " + " ".join(map(str, n["fm"].get("tags", []) or []))).lower()
        return args.scope.lower() in hay

    violations = []

    # I1: qualifies edges land on EVD from CVT
    for e in edges:
        if e["type"] == REL["qualifies"]:
            s, d = nodes.get(e["source"]), nodes.get(e["destination"])
            if not s or s["type"] != "CVT" or not d or d["type"] != "EVD":
                violations.append(("I1", f"qualifies edge not CVT→EVD: {s and s['type']}→{d and d['type']}"))

    for iid, n in nodes.items():
        if not in_scope(n):
            continue
        if n["type"] == "EVD":
            # I2: supports a CLM or EP
            dests = [nodes.get(e["destination"], {}).get("type") for e in out_edges(iid, "supports")]
            dests += [nodes.get(e["destination"], {}).get("type") for e in out_edges(iid, "opposes")]
            if not any(t in ("CLM", "EP") for t in dests):
                violations.append(("I2", f"EVD supports no CLM/EP: {n['name'][:70]}"))
            # I6: has Source
            if not n["fm"].get("Source"):
                violations.append(("I6", f"EVD missing Source: {n['name'][:70]}"))
        elif n["type"] == "CLM":
            # I3: informs a QUE
            if not any(nodes.get(e["destination"], {}).get("type") == "QUE" for e in out_edges(iid, "informs")):
                violations.append(("I3", f"CLM informs no QUE: {n['name'][:70]}"))
            # I4: has a supporting EVD
            if not any(nodes.get(e["source"], {}).get("type") == "EVD" for e in in_edges(iid, "supports")):
                violations.append(("I4", f"CLM has no supporting EVD: {n['name'][:70]}"))
        elif n["type"] == "EP":
            # I5: >=2 EVDs from >=2 papers
            evd_papers = {nodes.get(e["source"], {}).get("paper") for e in in_edges(iid, "supports")
                          if nodes.get(e["source"], {}).get("type") == "EVD"}
            evd_papers.discard(None)
            if len(evd_papers) < 2:
                violations.append(("I5", f"EP has <2 papers ({len(evd_papers)}): {n['name'][:70]}"))

    # report
    from collections import Counter
    by = Counter(v[0] for v in violations)
    scoped = f" (scope='{args.scope}')" if args.scope else ""
    print(f"Audited {sum(1 for n in nodes.values() if in_scope(n))} in-scope nodes{scoped}; {len(edges)} edges")
    if not violations:
        print("✓ All invariants satisfied.")
        return
    print(f"✗ {len(violations)} violation(s): " + ", ".join(f"{k}={v}" for k, v in sorted(by.items())))
    for code, msg in violations:
        print(f"  [{code}] {msg}")
    sys.exit(1)


if __name__ == "__main__":
    main()
