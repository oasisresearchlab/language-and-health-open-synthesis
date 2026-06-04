#!/usr/bin/env python3
"""
refetch_by_title.py — remediate wrong identifiers. The source notes' TITLES are trusted, but some
`pubmed_id`s (and the DOIs/PDFs/full text derived from them) point to the wrong paper. This script
re-resolves the correct DOI / PMID / PMCID from the title via OpenAlex, flags discrepancies with the
source note, and (optionally) re-fetches corrected open-access full text by the right PMCID.

By default it targets papers flagged BAD/SUSPECT in data/fulltext_validation.tsv or BAD in
data/pdf_validation.tsv. Identifier corrections are REPORTED (propose-don't-commit) — source notes
are not rewritten. Full text IS regenerated (it's derived, gitignored) when --refetch-fulltext and a
strong title match + PMCID are found.

Usage:
    python3 utils/refetch_by_title.py                      # report on flagged papers
    python3 utils/refetch_by_title.py --all                # report on every source note
    python3 utils/refetch_by_title.py --refetch-fulltext   # also re-pull corrected OA full text
    python3 utils/refetch_by_title.py --citekeys @Foo_2020_Bar @Baz_2019_Qux
"""

import argparse
import csv
import re
import time
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

import requests
import yaml

EMAIL = "joelchan@umd.edu"
OPENALEX = "https://api.openalex.org/works"
EPMC_XML = "https://www.ebi.ac.uk/europepmc/webservices/rest/{pmcid}/fullTextXML"
IDCONV = "https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/"
HEADERS = {"User-Agent": f"lep-synthesis (mailto:{EMAIL})"}


def pmcid_from_pmid(pmid: str):
    """OpenAlex pmcid is unreliable; resolve PMID→PMCID via NCBI ID Converter."""
    try:
        r = requests.get(IDCONV, params={"ids": pmid, "format": "json", "tool": "lep-synthesis", "email": EMAIL},
                         headers=HEADERS, timeout=30)
        if r.status_code == 200:
            recs = r.json().get("records", [])
            if recs:
                return recs[0].get("pmcid")
    except Exception:
        pass
    return None


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKD", str(s)).lower())


def frontmatter(path: Path) -> dict:
    c = path.read_text(encoding="utf-8", errors="ignore")
    m = re.match(r"^---\s*\n(.*?)\n---", c, re.DOTALL)
    if not m:
        return {}
    try:
        return yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        return {}


def flagged_citekeys(root: Path):
    out = set()
    for name, badset in [("fulltext_validation.tsv", {"BAD", "SUSPECT"}), ("pdf_validation.tsv", {"BAD"})]:
        p = root / "data" / name
        if p.exists():
            for r in csv.DictReader(p.open(), delimiter="\t"):
                if r["verdict"] in badset:
                    ck = r["citekey"]
                    out.add(ck if ck.startswith("@") else f"@{ck}")
    return out


def openalex_by_title(title: str):
    try:
        r = requests.get(OPENALEX, params={"search": title, "per_page": 5, "mailto": EMAIL},
                         headers=HEADERS, timeout=30)
        if r.status_code != 200:
            return None
        results = r.json().get("results", [])
    except Exception:
        return None
    best, best_sim = None, 0.0
    tn = norm(title)
    for w in results:
        cand = w.get("title") or ""
        sim = SequenceMatcher(None, tn, norm(cand)).ratio()
        if sim > best_sim:
            best, best_sim = w, sim
    if not best:
        return None
    ids = best.get("ids", {})
    doi = (best.get("doi") or "").replace("https://doi.org/", "") or None
    pmid = (ids.get("pmid") or "").rstrip("/").split("/")[-1] or None
    pmcid = (ids.get("pmcid") or "").rstrip("/").split("/")[-1] or None  # OpenAlex pmcid ends with a slash
    return {"sim": round(best_sim, 3), "title": best.get("title"), "doi": doi,
            "pmid": pmid, "pmcid": pmcid, "year": best.get("publication_year")}


def xml_to_text(xml: str) -> str:
    body = re.search(r"<body[ >].*?</body>", xml, re.DOTALL)
    txt = body.group(0) if body else xml
    txt = re.sub(r"<[^>]+>", " ", txt)
    return re.sub(r"\s+", " ", txt).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--citekeys", nargs="*")
    ap.add_argument("--refetch-fulltext", action="store_true")
    ap.add_argument("--min-title-sim", type=float, default=0.85)
    args = ap.parse_args()

    root = Path(__file__).parent.parent
    src_dir = root / "Discourse Graph" / "Sources"

    if args.citekeys:
        cks = [c if c.startswith("@") else f"@{c}" for c in args.citekeys]
    elif args.all:
        cks = sorted(p.stem for p in src_dir.glob("@*.md"))
    else:
        cks = sorted(flagged_citekeys(root))
    print(f"Resolving {len(cks)} papers by title via OpenAlex…\n")

    rows, refetched = [], 0
    for i, ck in enumerate(cks, 1):
        f = src_dir / f"{ck}.md"
        if not f.exists():
            continue
        fm = frontmatter(f)
        title = str(fm.get("title", "")).strip()
        if not title:
            continue
        src_pmid = str(fm.get("pubmed_id", "")).strip()
        src_doi = (str(fm.get("doi", "")) or "").replace("https://doi.org/", "").strip()
        res = openalex_by_title(title)
        time.sleep(0.15)
        if not res or res["sim"] < args.min_title_sim:
            rows.append([ck, src_pmid, "", "no-match", src_doi, "", "", res["sim"] if res else 0, "", "UNRESOLVED"])
            continue
        # only call it DIFFERENT when OpenAlex actually has a pmid that disagrees
        if not res["pmid"]:
            pmid_match = "no-openalex-pmid"
        elif (res["pmid"] or "") == src_pmid:
            pmid_match = "same"
        else:
            pmid_match = "DIFFERENT"
        doi_match = "same" if norm(res["doi"]) == norm(src_doi) and src_doi else ("DIFFERENT" if src_doi else "new")
        verdict = "OK" if pmid_match == "same" and doi_match in ("same",) else "FIX"
        # OpenAlex pmcid is often missing → resolve from the (verified) PMID via NCBI ID Converter
        pmcid = res["pmcid"]
        if not pmcid and res["pmid"]:
            pmcid = pmcid_from_pmid(res["pmid"])
            time.sleep(0.15)
        res["pmcid"] = pmcid
        ft_status = ""
        if args.refetch_fulltext and pmcid:
            try:
                rx = requests.get(EPMC_XML.format(pmcid=pmcid), headers=HEADERS, timeout=40)
                if rx.status_code == 200 and len(rx.content) > 500:
                    text = xml_to_text(rx.text)
                    if len(text) > 500:
                        (root / "data" / "fulltext" / f"{ck.lstrip('@')}.txt").write_text(text, encoding="utf-8")
                        ft_status = f"refetched({len(text)//1000}k)"
                        refetched += 1
                    else:
                        ft_status = "xml-no-body"
                else:
                    ft_status = "no-oa-xml"
            except Exception:
                ft_status = "fetch-error"
            time.sleep(0.3)
        rows.append([ck, src_pmid, res["pmid"] or "", pmid_match, src_doi, res["doi"] or "",
                     doi_match, res["sim"], res["pmcid"] or "", verdict + (f" {ft_status}" if ft_status else "")])
        if i % 25 == 0:
            print(f"  {i}/{len(cks)}")

    out = root / "data" / "refetch_report.tsv"
    with out.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh, delimiter="\t")
        w.writerow(["citekey", "src_pmid", "new_pmid", "pmid", "src_doi", "new_doi", "doi", "title_sim", "new_pmcid", "verdict"])
        w.writerows(rows)

    from collections import Counter
    diff_pmid = sum(1 for r in rows if r[3] == "DIFFERENT")
    unresolved = sum(1 for r in rows if r[9] == "UNRESOLVED")
    print(f"\nResolved: {len(rows)-unresolved}/{len(rows)} | wrong PMID in source: {diff_pmid} | unresolved: {unresolved}")
    if args.refetch_fulltext:
        print(f"Full text re-fetched: {refetched}")
    print("\nPapers with a DIFFERENT (likely wrong) source PMID:")
    for r in rows:
        if r[3] == "DIFFERENT":
            print(f"  {r[0][:48]:48} src_pmid={r[1] or '-':>9}  →  openalex_pmid={r[2] or '-':>9}  (title_sim {r[7]})")
    print(f"\nReport: {out}  —  identifier fixes are PROPOSED; source notes not rewritten.")


if __name__ == "__main__":
    main()
