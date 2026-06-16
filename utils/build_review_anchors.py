#!/usr/bin/env python3
"""
build_review_anchors.py — precompute the completeness-review anchor set for the review-app prototype.

WHAT
    For each paper, emit the anchors an RA checks for completeness — the lists the paper itself
    enumerates — plus the existing extraction so most rows arrive pre-answered:
      - abstract result-sentences (segmented + filtered to result-bearing)
      - table/figure objects (from data/figures_pdf/<citekey>/manifest.json, with page+bbox+crop)
      - the paper's already-extracted EVDs (for pre-linking "covered")
      - the source note's #evd-candidate bullets (promotion suggestions)
    Each anchor is pre-linked to its best-matching EVD (token overlap → confidence), so the RA mostly
    confirms; the real work is the low-confidence + unlinked rows.

OUTPUT
    data/review/<citekey>.json (one per paper) + data/review/_index.json (the picker list).
    data/ is gitignored — this is local prototype data; PDFs are served from data/pdfs/.

USAGE
    python3 utils/build_review_anchors.py @Allan_2022_impact_English @Kyle_2023_Association_Between
    python3 utils/build_review_anchors.py --cluster      # the Interp×LOS cluster papers with EVDs
"""

import argparse
import json
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).parent.parent
SRC = ROOT / "Discourse Graph" / "Sources"
EVD = ROOT / "Discourse Graph" / "Evidence"
FIGB = ROOT / "data" / "figures_pdf"
PDFS = ROOT / "data" / "pdfs"
OUT = ROOT / "data" / "review"

RESULT_CUE = re.compile(
    r"\d|%|p\s*[<=>]|95%|\bCI\b|\bOR\b|\bRR\b|\bHR\b|\bIRR\b|"
    r"associat|significan|increase|decrease|reduc|longer|shorter|higher|lower|"
    r"\bmore\b|\bless\b|greater|fewer|no difference|did not differ|odds|likelihood|rate",
    re.IGNORECASE,
)
ABBREV = {"e.g", "i.e", "vs", "Dr", "no", "et al", "Fig", "Inc", "approx", "p"}


def frontmatter(path: Path) -> dict:
    m = re.match(r"^---\s*\n(.*?)\n---", path.read_text(encoding="utf-8"), re.DOTALL)
    return (yaml.safe_load(m.group(1)) or {}) if m else {}


def body_of(path: Path) -> str:
    m = re.match(r"^---\s*\n.*?\n---\s*\n?(.*)$", path.read_text(encoding="utf-8"), re.DOTALL)
    return m.group(1) if m else path.read_text(encoding="utf-8")


def split_sentences(text: str):
    text = re.sub(r"\s+", " ", text).strip()
    # protect common abbreviations from being treated as sentence ends
    for ab in ("e.g.", "i.e.", "vs.", "et al.", "approx.", "Dr.", "Fig.", "No.", "Mr.", "cf."):
        text = text.replace(ab, ab.replace(".", "∙"))
    # structured-abstract headers (Background:/Methods:/Results:/…) are hard boundaries
    text = re.sub(
        r"\b(Background|Objective|Objectives|Aim|Aims|Purpose|Method|Methods|Materials and methods|"
        r"Result|Results|Finding|Findings|Conclusion|Conclusions|Design|Setting|Participants|"
        r"Importance|Interventions?|Measurements?|Main outcomes?[\w ]*)\s*:",
        r"|||", text,
    )
    parts = re.split(r"(?<=[.?!])\s+(?=[\"“A-Z0-9])|\|\|\|", text)
    out = []
    for p in parts:
        p = p.replace("∙", ".").strip()
        if len(p) > 12:
            out.append(p)
    return out


WORD = re.compile(r"[a-z0-9]+")


def tokens(s: str) -> set:
    stop = {"the", "a", "an", "of", "in", "and", "or", "to", "for", "with", "was", "were",
            "is", "are", "on", "by", "that", "this", "as", "at", "not", "no", "had", "have",
            "than", "between", "after", "their", "from", "but", "did"}
    return {w for w in WORD.findall(s.lower()) if len(w) > 2 and w not in stop}


def overlap(a: str, b: str) -> float:
    ta, tb = tokens(a), tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def evds_for(citekey: str):
    """Existing EVDs for this paper: title + finding text + referenced Table/Fig numbers."""
    out = []
    for f in sorted(EVD.glob(f"EVD - *- {citekey}.md")):
        body = body_of(f)
        desc = ""
        m = re.search(r"## Description\s*\n(.*?)(?:\n## |\Z)", body, re.DOTALL)
        if m:
            # first prose paragraph (skip embeds/quotes)
            for ln in m.group(1).splitlines():
                s = ln.strip()
                if s and not s.startswith(("![[", ">", "<!--")):
                    desc = s
                    break
        title = re.sub(r"^EVD - (.*?) - @.*$", r"\1", f.stem)
        refs = sorted(set(re.findall(r"\((?:Fig|Figure|Table)\s*(\d+)\)|\bTable (\d+)|\bFig\.? (\d+)", body)
                          and [g for t in re.findall(r"(?:Fig|Figure|Table)\s*(\d+)", body) for g in [t]] or []))
        tabs = sorted(set(re.findall(r"Table\s*(\d+)", body)))
        figs = sorted(set(re.findall(r"(?:Fig|Figure)\.?\s*(\d+)", body)))
        out.append({"title": title, "finding": desc or title, "tables": tabs, "figures": figs})
    return out


def candidates_for(path: Path):
    """#evd-candidate bullets from the source note's 'Possible evidence' (or any) section."""
    body = body_of(path)
    out = []
    for ln in body.splitlines():
        if "#evd-candidate" in ln:
            t = re.sub(r"#evd-candidate", "", ln).strip().lstrip("-").strip()
            if t:
                out.append(t)
    return out


def object_anchors(citekey: str):
    mf = FIGB / citekey / "manifest.json"
    if not mf.exists():
        return []
    try:
        m = json.loads(mf.read_text())
    except Exception:
        return []
    out = []
    for kind in ("tables", "figures"):
        for i, o in enumerate(m.get(kind, []), 1):
            label = o.get("label") or f"{kind[:-1].title()} {i}"
            num = (re.search(r"(\d+)", label) or [None, None])[1] if re.search(r"(\d+)", label) else str(i)
            crop = f"{citekey}-{'table' if kind == 'tables' else 'fig'}{num}.png"
            out.append({
                "kind": "table" if kind == "tables" else "figure",
                "label": label,
                "caption": o.get("caption", ""),
                "page": o.get("page"),
                "bbox": o.get("bbox"),
                "num": num,
                "crop": crop if (ROOT / "attachments" / crop).exists() else None,
            })
    return out


def build(citekey: str):
    sp = SRC / f"{citekey}.md"
    if not sp.exists():
        return None
    fm = frontmatter(sp)
    evds = evds_for(citekey)
    cands = candidates_for(sp)

    # abstract result-sentences
    abstract = str(fm.get("abstract", "") or "")
    abstract = re.sub(r"\^[\w\-]+", "", abstract)  # strip block-ref anchors
    sentences = [s for s in split_sentences(abstract) if RESULT_CUE.search(s)]

    def best_evd(text):
        best, score = None, 0.0
        for j, e in enumerate(evds):
            o = overlap(text, e["finding"])
            if o > score:
                best, score = j, o
        return best, round(score, 2)

    abstract_anchors = []
    for k, s in enumerate(sentences):
        ei, sc = best_evd(s)
        # best candidate too
        bc, bcs = None, 0.0
        for ci, c in enumerate(cands):
            o = overlap(s, c)
            if o > bcs:
                bc, bcs = ci, o
        abstract_anchors.append({
            "id": f"abs-{k}", "kind": "abstract", "text": s,
            "linkedEvd": ei if sc >= 0.18 else None, "evdConfidence": sc,
            "linkedCandidate": bc if bcs >= 0.22 else None, "candConfidence": round(bcs, 2),
        })

    objs = object_anchors(citekey)
    for k, o in enumerate(objs):
        o["id"] = f"obj-{k}"
        # covered if any EVD references this object number
        n = o["num"]
        linked = [j for j, e in enumerate(evds)
                  if (o["kind"] == "table" and n in e["tables"]) or (o["kind"] == "figure" and n in e["figures"])]
        o["linkedEvds"] = linked

    return {
        "citekey": citekey,
        "title": str(fm.get("title", citekey)),
        "author": str(fm.get("author", "")),
        "year": str(fm.get("year", "")),
        "doi": str(fm.get("doi", "")),
        "pubmedId": str(fm.get("pubmed_id", "")),
        "hasPdf": (PDFS / f"{citekey}.pdf").exists(),
        "evds": evds,
        "candidates": cands,
        "abstractAnchors": abstract_anchors,
        "objectAnchors": objs,
    }


CLUSTER = [
    "@Allan_2022_impact_English", "@Aparna_2025_Clinician_Perspectives", "@Benda_2022_active_role",
    "@Davis_2019_Translating_Discharge", "@Estrada_2015_conversation_analysis", "@Greenky_2019_Reversed_Trend",
    "@J_2025_Pilot_study", "@Jennifer_2023_Evaluation_Patient", "@Karliner_2017_Convenient_Access",
    "@Kilian_2021_When_roles", "@Kyle_2023_Association_Between", "@Marshall_2016_Creating_Professional",
    "@Martinez_2021_Improving_Equity", "@Morris_2021_Factors_associated", "@Nicole_2024_Pediatric_Hearing",
    "@Seible_2021_Influence_Patient-Provider", "@Wallbrecht_2014_difference_emergency",
    "@Daly_2019_effect_limited", "@Brooks_2016_Patient_Perspectives",
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("citekeys", nargs="*")
    ap.add_argument("--cluster", action="store_true", help="build the Interp×LOS cluster papers")
    args = ap.parse_args()
    cks = args.citekeys or (CLUSTER if args.cluster else [])
    if not cks:
        ap.error("pass citekeys or --cluster")
    OUT.mkdir(parents=True, exist_ok=True)
    index = []
    for ck in cks:
        d = build(ck)
        if not d:
            print(f"  ! {ck}: no source note")
            continue
        (OUT / f"{ck}.json").write_text(json.dumps(d, indent=1, ensure_ascii=False))
        n_abs, n_obj = len(d["abstractAnchors"]), len(d["objectAnchors"])
        pre = sum(1 for a in d["abstractAnchors"] if a["linkedEvd"] is not None) + \
              sum(1 for o in d["objectAnchors"] if o["linkedEvds"])
        index.append({"citekey": ck, "title": d["title"], "hasPdf": d["hasPdf"],
                      "abstractAnchors": n_abs, "objectAnchors": n_obj,
                      "evds": len(d["evds"]), "preLinked": pre})
        print(f"  {ck[1:]:<36} abs={n_abs} obj={n_obj} evd={len(d['evds'])} pre-linked={pre} pdf={'y' if d['hasPdf'] else 'n'}")
    (OUT / "_index.json").write_text(json.dumps(index, indent=1, ensure_ascii=False))
    print(f"\nWrote {len(index)} papers → {OUT}")


if __name__ == "__main__":
    main()
