#!/usr/bin/env python3
"""
export_rdf.py — generate a one-way RDF-schema view of the discourse graph for the vendored
jring-o/rdf Next.js renderer (site/).

WHAT
    Transform our canonical graph (Discourse Graph/**/*.md + relations.json) into the content-
    addressed schema the renderer consumes: graph/<type>/<ID>.md with frontmatter `edges:`.
    One-way: the vault + relations.json stay the source of truth; graph/ is regenerated.

MAPPING (hybrid — see Pipeline/export_rdf.md)
    QUE→question (Q)  CLM→claim (C)  EVD→evidence (E)  SRC→source (S)
    ART→artifact (A, extended type)
    CVT→folded into the qualified Evidence node's body as a "Caveats" section (no node).
    Edges: informs(CLM→QUE)→addresses · supports/opposes(EVD→CLM, CLM→CLM)→same ·
           EVD Source field→derivedFrom · body [[ART]] mention→usesArtifact · qualifies→folded.

INPUT   Discourse Graph/**/*.md, relations.json.
OUTPUT  graph/{questions,claims,evidence,sources,artifacts}/<ID>.md
        (regenerated each run; safe to delete).

USAGE
    python3 utils/export_rdf.py     # writes ./graph/, then: cd site && pnpm data:graph && pnpm dev

Design decisions, limitations, and the "smarter later" roadmap: Pipeline/export_rdf.md
"""

import json
import re
import shutil
from pathlib import Path
from urllib.parse import quote

import yaml

ROOT = Path(__file__).parent.parent
DG = ROOT / "Discourse Graph"
OUT = ROOT / "graph"
CREATED = "2026-06-05"

# our nodeTypeId -> (our code, their type, id-prefix, dir)
TMAP = {
    "node_LsIeSJxI7M9DoE3ISFEmw": ("QUE", "question", "Q", "questions"),
    "node_nMxzA_OByPwgPcmb6AN82": ("CLM", "claim", "C", "claims"),
    "node_huDx8FGfNSGQyongW5rk-": ("EVD", "evidence", "E", "evidence"),
    "node_Ne237S0BfRPDaeqB_gbuT": ("SRC", "source", "S", "sources"),
    "node_OULGh2SuqxP1oES9p2k_9": ("ART", "artifact", "A", "artifacts"),
    "node_Q4sxSAHaUscV3smL5OBnB": ("CVT", "caveat", "V", None),  # folded, not emitted
}
REL = {
    "relation_BO5BtVVpJGrw70jTCTznm": "supports",
    "relation_QtuzWZj3zndZBKQe7LcFK": "opposes",
    "relation_OxKXi9qk9qcigTKK2BGeY": "informs",
    "rel_o0a9NeAmWnhFBaVLNiJ1g": "qualifies",
}
# body sections to DROP (they're wikilink lists now carried by frontmatter edges, or paper lists)
DROP_SECTIONS = {
    "supporting evidence", "contradicting evidence", "qualifies", "claims addressing this question",
    "connected pattern", "connected discourse-graph nodes", "potentially relevant papers",
    "key papers asking this question", "key papers presenting this evidence",
    "key papers making this claim", "applies to", "source",
}


def split_fm(p: Path):
    c = p.read_text(encoding="utf-8", errors="ignore")
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", c, re.DOTALL)
    if not m:
        return {}, c
    try:
        return yaml.safe_load(m.group(1)) or {}, m.group(2)
    except yaml.YAMLError:
        return {}, m.group(2)


def title_of(stem):
    return re.sub(r"^(QUE|CLM|EVD|EP|CVT|ART|PTN) - ", "", stem).split(" - @")[0].lstrip("@").strip()


def section_body(body, drop):
    """Return body with the named ## / ### sections removed; strip callouts/embeds/comments."""
    parts = re.split(r"(^#{2,3}\s+.+$)", body, flags=re.MULTILINE)
    out, skip = [parts[0]], False
    for i in range(1, len(parts), 2):
        head = parts[i]
        name = re.sub(r"^#{2,3}\s+", "", head).strip().lower()
        skip = name in drop
        if not skip:
            out.append(head + parts[i + 1])
    txt = "".join(out)

    def emb(m):  # image embeds -> markdown image served from /attachments/; drop .base etc.
        tgt = m.group(1).split("|")[0].split("#")[0].strip()
        if re.search(r"\.(png|jpe?g|gif|webp)$", tgt, re.I):
            return f"![]( /attachments/{quote(tgt)})".replace("( ", "(")
        return ""
    txt = re.sub(r"!\[\[([^\]]+?)\]\]", emb, txt)
    txt = re.sub(r"> \[!\w[^\]]*\]\s*", "> ", txt)      # strip callout markers
    txt = re.sub(r"^>\s*$\n?", "", txt, flags=re.MULTILINE)  # drop empty blockquote lines
    txt = re.sub(r"<!--.*?-->", "", txt, flags=re.DOTALL)
    txt = re.sub(r"\n{3,}", "\n\n", txt)
    return txt.strip()


def main():
    # 1. load nodes
    nodes = {}        # iid -> node dict
    stem2iid = {}
    for f in DG.rglob("*.md"):
        fm, body = split_fm(f)
        iid = fm.get("nodeInstanceId")
        t = TMAP.get(fm.get("nodeTypeId"))
        if not iid or not t:
            continue
        code, rtype, prefix, d = t
        src = re.search(r"@[A-Za-z][\w\-]+", str(fm.get("Source", "")))
        nodes[iid] = {"iid": iid, "code": code, "rtype": rtype, "prefix": prefix, "dir": d,
                      "stem": f.stem, "title": title_of(f.stem), "body": body, "fm": fm,
                      "src_citekey": src.group(0) if src else None}
        stem2iid[f.stem] = iid

    # 2. edges from relations.json
    rels = list(json.loads((ROOT / "relations.json").read_text())["relations"].values())
    out_edges = {}   # iid -> list[(rel, dst_iid)]
    cvt_for = {}     # evd_iid -> list[cvt_iid]   (qualifies, for folding)
    for e in rels:
        s, d, r = e["source"], e["destination"], REL.get(e["type"])
        if s not in nodes or d not in nodes or not r:
            continue
        if r == "qualifies":
            cvt_for.setdefault(d, []).append(s)
        else:
            out_edges.setdefault(s, []).append((r, d))

    # per-CLM evidence breadth: distinct source papers among supporting / opposing EVDs.
    # A mechanical strength proxy for ranking (e.g. the homepage "most-supported claims") —
    # NOT a GRADE certainty judgment, which is expert-authored only.
    clm_sup, clm_opp = {}, {}
    for e in rels:
        s, d, r = e["source"], e["destination"], REL.get(e["type"])
        if s not in nodes or d not in nodes or nodes[d]["code"] != "CLM" or nodes[s]["code"] != "EVD":
            continue
        paper = nodes[s]["src_citekey"]
        if not paper:
            continue
        if r == "supports":
            clm_sup.setdefault(d, set()).add(paper)
        elif r == "opposes":
            clm_opp.setdefault(d, set()).add(paper)

    # 3. which sources are referenced (by EVD Source field) — only export those
    ref_src = set()
    for n in nodes.values():
        if n["code"] == "EVD" and n["src_citekey"] and n["src_citekey"] in stem2iid:
            ref_src.add(stem2iid[n["src_citekey"]])

    # 4. assign their-IDs (stable: sorted by nodeInstanceId within type)
    emit = [n for n in nodes.values() if n["code"] in ("QUE", "CLM", "EVD", "ART")]
    emit += [nodes[i] for i in ref_src]
    their_id = {}
    counters = {}
    for n in sorted(emit, key=lambda n: (n["prefix"], n["iid"])):
        counters[n["prefix"]] = counters.get(n["prefix"], 0) + 1
        their_id[n["iid"]] = f'{n["prefix"]}-{counters[n["prefix"]]:04d}'

    # body wikilink [[X]] -> their-ID token (renderer linkifies) or plain text
    def rewrite_links(txt):
        # Body [[stem]] / [[stem|alias]] -> node reference.
        #   resolved + alias  -> [alias](/node/<ID>)  (keeps readable citation text, still a link)
        #   resolved, no alias -> bare <ID> (linkified by the renderer's remark-graph-citations plugin)
        #   unresolved        -> alias/target text
        def repl(m):
            parts = m.group(1).split("|")
            tgt = parts[0].split("#")[0].strip()
            alias = parts[-1].split("#")[0].strip() if len(parts) > 1 else None
            iid = stem2iid.get(tgt)
            tid = their_id.get(iid) if iid else None
            if tid:
                return f"[{alias}](/node/{tid})" if alias else tid
            return alias or tgt
        return re.sub(r"\[\[([^\]]+?)\]\]", repl, txt)

    if OUT.exists():
        shutil.rmtree(OUT)
    written = {}
    for n in emit:
        if n["iid"] not in their_id:
            continue
        tid = their_id[n["iid"]]
        edges = {}
        # frontmatter edges from relations.json
        for r, d in out_edges.get(n["iid"], []):
            if d not in their_id:
                continue
            key = "addresses" if (r == "informs" and n["code"] == "CLM" and nodes[d]["code"] == "QUE") \
                else r if r in ("supports", "opposes") else None
            if key:
                edges.setdefault(key, []).append(their_id[d])
        # EVD -> derivedFrom Source
        if n["code"] == "EVD" and n["src_citekey"] and stem2iid.get(n["src_citekey"]) in their_id:
            edges.setdefault("derivedFrom", []).append(their_id[stem2iid[n["src_citekey"]]])
        # body [[ART]] mentions -> usesArtifact
        for m in re.finditer(r"\[\[(ART - [^\]\|#]+)", n["body"]):
            aid = their_id.get(stem2iid.get(m.group(1).strip()))
            if aid:
                edges.setdefault("usesArtifact", []).append(aid)
        edges = {k: sorted(set(v)) for k, v in edges.items()}

        # body
        if n["code"] == "SRC":
            ab = str(n["fm"].get("abstract", "")).strip()
            body = ab or f'{n["title"]}.'
        else:
            body = rewrite_links(section_body(n["body"], DROP_SECTIONS))
            # fold caveats into the evidence body
            if n["code"] == "EVD" and cvt_for.get(n["iid"]):
                cav = []
                for cvt in cvt_for[n["iid"]]:
                    cb = nodes[cvt]["body"]
                    lim = re.search(r"##\s*Limitation\s*\n(.*?)(?:\n##|\Z)", cb, re.DOTALL)
                    cav.append(f'- **{nodes[cvt]["title"]}** {section_body(lim.group(1) if lim else cb, set()).strip()}')
                body += "\n\n## Caveats\n\n" + "\n".join(cav)

        # curation status — the human-AI curation axis (Initial AI draft → In expert review →
        # Expert-verified), authored on the canonical synthesis nodes. Sources are bibliographic
        # records, not on this axis, so they carry no status.
        fm_out = {"id": tid, "type": n["rtype"], "title": n["title"]}
        short = str(n["fm"].get("shortLabel", "")).strip()
        if short:
            fm_out["shortLabel"] = short
        if n["code"] != "SRC":
            fm_out["status"] = str(n["fm"].get("curationStatus", "Initial AI draft")).strip()
        if n["code"] == "CLM":
            fm_out["supportPapers"] = len(clm_sup.get(n["iid"], set()))
            fm_out["opposePapers"] = len(clm_opp.get(n["iid"], set()))
        if n["code"] == "SRC":
            # use the real paper title (frontmatter) rather than the citekey-derived stem
            real_title = str(n["fm"].get("title", "")).strip()
            if real_title:
                fm_out["title"] = real_title
            # citation metadata for the renderer (clickable DOI/PMID, follow-the-source links)
            for src_key, out_key in (("author", "author"), ("year", "year"),
                                     ("journal", "journal"), ("doi", "doi"),
                                     ("pubmed_id", "pubmedId"), ("citekey", "citekey")):
                v = n["fm"].get(src_key)
                if v not in (None, ""):
                    fm_out[out_key] = str(v).replace('"', "").strip()
        fm_out["created"] = CREATED
        if edges:
            fm_out["edges"] = edges
        text = ("---\n" + yaml.safe_dump(fm_out, sort_keys=False, allow_unicode=True, width=999)
                + "---\n\n" + f'# {tid} — {n["title"]}\n\n' + body + "\n")
        d = OUT / n["dir"]
        d.mkdir(parents=True, exist_ok=True)
        (d / f"{tid}.md").write_text(text, encoding="utf-8")
        written[n["dir"]] = written.get(n["dir"], 0) + 1

    # copy figure/table images into the site's public/ so embeds resolve at /attachments/<name>
    pub = ROOT / "site" / "public" / "attachments"
    nimg = 0
    if (ROOT / "site").exists():
        pub.mkdir(parents=True, exist_ok=True)
        for src_dir in (ROOT / "attachments", ROOT / "data" / "attachments"):
            if src_dir.exists():
                for img in src_dir.iterdir():
                    if img.suffix.lower() in (".png", ".jpg", ".jpeg", ".gif", ".webp"):
                        shutil.copy(img, pub / img.name)
                        nimg += 1

    print("Wrote graph/:")
    for d, c in sorted(written.items()):
        print(f"  {d:18} {c}")
    print(f"  images copied to site/public/attachments: {nimg}")
    print(f"  caveats folded into {sum(1 for e in cvt_for if e in their_id)} evidence nodes")
    print(f"\nNext: cd site && corepack pnpm install && pnpm data:graph && pnpm dev")


if __name__ == "__main__":
    main()
