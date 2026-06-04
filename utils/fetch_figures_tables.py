#!/usr/bin/env python3
"""
fetch_figures_tables.py — Route A: structured figures/tables for the PMC open-access subset.

WHAT
    For papers in the PMC OA subset, extracts figures and tables as standalone objects from the
    publisher's own structured markup — the high-quality ("ground truth") route, complementing the
    heuristic PDF route (Route B, extract_pdf_figures_tables.py) for everything else.

HOW
    1. From data/pdfs/_idmap.json, take each source note whose PMID resolved to a PMCID.
    2. Fetch the JATS full-text XML from Europe PMC; parse <table-wrap> (label/caption + serialized
       HTML table) and <fig> (label/caption + graphic hrefs), namespace-stripped.
    3. If any figure has graphics, fetch the supplementaryFiles ZIP; match each figure's graphic
       basename to a file in the ZIP, preferring image formats in IMG_PREF order.
    4. Write per-paper outputs and a manifest of labels/captions/file references.

INPUT   Discourse Graph/Sources/@*.md (pubmed_id); data/pdfs/_idmap.json (PMID->PMCID);
        Europe PMC fullTextXML + supplementaryFiles endpoints.
OUTPUT  data/figures/<citekey>/ : table_N.html (+ table_N.csv when pandas can parse it),
        fig_N.<ext> (image files), manifest.json.

INVARIANTS / NOTES
    - PMC OA subset only: non-PMC papers have no JATS XML and are out of scope here (Route B).
    - Tables are always saved as HTML; CSV is best-effort (skipped if not tabular-parseable).
    - Figure images come from the supp ZIP; a figure with no matchable graphic gets a manifest
      entry with image=None rather than being dropped.
    - Resume-safe: skips papers whose output dir already exists unless --force.

USAGE
    python3 utils/fetch_figures_tables.py --dry-run     # list eligible papers, no writes
    python3 utils/fetch_figures_tables.py --limit 5     # pilot
    python3 utils/fetch_figures_tables.py               # all PMCID papers
    python3 utils/fetch_figures_tables.py --force       # re-extract

Design decisions, limitations, and the "smarter later" roadmap: Pipeline/fetch_figures_tables.md
"""

import argparse
import io
import json
import re
import time
import zipfile
from pathlib import Path
from typing import Dict, List, Optional
import xml.etree.ElementTree as ET

import requests

EMAIL = "joelchan@umd.edu"
TOOL = "lep-synthesis"
HEADERS = {"User-Agent": f"{TOOL} (mailto:{EMAIL})"}

EPMC_XML = "https://www.ebi.ac.uk/europepmc/webservices/rest/{pmcid}/fullTextXML"
EPMC_SUPP = "https://www.ebi.ac.uk/europepmc/webservices/rest/{pmcid}/supplementaryFiles"

HTTP_TIMEOUT = 60
POLITE_DELAY = 0.3
IMG_PREF = [".jpg", ".jpeg", ".png", ".tif", ".tiff", ".gif"]  # preference order


# --------------------------------------------------------------------------- #
# Helpers (mirrors fetch_pdfs.py conventions)
# --------------------------------------------------------------------------- #
def extract_frontmatter(file_path: Path) -> Optional[Dict]:
    import yaml

    content = file_path.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if m:
        try:
            return yaml.safe_load(m.group(1))
        except yaml.YAMLError:
            return None
    return None


def clean_citekey(citekey: str) -> str:
    return citekey.replace('"', "").strip()


def strip_ns(tag: str) -> str:
    """Drop XML namespace from a tag name."""
    return tag.rsplit("}", 1)[-1]


def el_text(el: ET.Element) -> str:
    """All inner text of an element, whitespace-collapsed."""
    return re.sub(r"\s+", " ", "".join(el.itertext())).strip()


def xlink_href(el: ET.Element) -> Optional[str]:
    for k, v in el.attrib.items():
        if strip_ns(k) == "href":
            return v
    return None


# --------------------------------------------------------------------------- #
# Parsing
# --------------------------------------------------------------------------- #
def find_all(root: ET.Element, name: str) -> List[ET.Element]:
    return [e for e in root.iter() if strip_ns(e.tag) == name]


def child(el: ET.Element, name: str) -> Optional[ET.Element]:
    for c in el:
        if strip_ns(c.tag) == name:
            return c
    return None


def parse_tables(root: ET.Element) -> List[Dict]:
    """Return [{label, caption, html}] for each <table-wrap>."""
    out = []
    for tw in find_all(root, "table-wrap"):
        label_el = child(tw, "label")
        cap_el = child(tw, "caption")
        table_el = next((e for e in tw.iter() if strip_ns(e.tag) == "table"), None)
        html = None
        if table_el is not None:
            # Serialize the JATS <table> (XHTML-like) to a standalone HTML string.
            html = ET.tostring(table_el, encoding="unicode")
            html = re.sub(r"\sxmlns(:\w+)?=\"[^\"]*\"", "", html)  # drop namespace decls
        out.append(
            {
                "label": el_text(label_el) if label_el is not None else "",
                "caption": el_text(cap_el) if cap_el is not None else "",
                "html": html,
            }
        )
    return out


def parse_figures(root: ET.Element) -> List[Dict]:
    """Return [{label, caption, graphics:[href,...]}] for each <fig>."""
    out = []
    for fig in find_all(root, "fig"):
        label_el = child(fig, "label")
        cap_el = child(fig, "caption")
        graphics = [
            xlink_href(g) for g in fig.iter() if strip_ns(g.tag) == "graphic"
        ]
        graphics = [g for g in graphics if g]
        out.append(
            {
                "label": el_text(label_el) if label_el is not None else "",
                "caption": el_text(cap_el) if cap_el is not None else "",
                "graphics": graphics,
            }
        )
    return out


def pick_image(graphics: List[str], zip_names: List[str]) -> Optional[str]:
    """Pick the best available image file in the ZIP for a figure's graphic refs."""
    # Map basename(without ext) -> available files
    candidates = []
    bases = {Path(g).stem.lower() for g in graphics}
    for name in zip_names:
        if Path(name).stem.lower() in bases:
            candidates.append(name)
    if not candidates:
        return None

    def rank(n: str) -> int:
        ext = Path(n).suffix.lower()
        return IMG_PREF.index(ext) if ext in IMG_PREF else len(IMG_PREF)

    return sorted(candidates, key=rank)[0]


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser(description="Extract figures/tables for PMC OA papers.")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    root_dir = Path(__file__).parent.parent
    sources_dir = root_dir / "Discourse Graph" / "Sources"
    idmap_path = root_dir / "data" / "pdfs" / "_idmap.json"
    out_root = root_dir / "data" / "figures"

    idmap = json.loads(idmap_path.read_text(encoding="utf-8")) if idmap_path.exists() else {}

    # Build citekey + pmcid list from notes that resolved a pmcid
    eligible = []
    for f in sorted(sources_dir.glob("@*.md")):
        fm = extract_frontmatter(f) or {}
        pmid = str(fm.get("pubmed_id", "")).strip()
        pmcid = idmap.get(pmid, {}).get("pmcid") if pmid else None
        if pmcid:
            eligible.append((clean_citekey(str(fm.get("citekey", f.stem))), pmcid))

    if args.limit:
        eligible = eligible[: args.limit]
    print(f"Eligible PMC OA papers: {len(eligible)}")
    if args.dry_run:
        for ck, pmc in eligible:
            print(f"  {ck}  {pmc}")
        return

    out_root.mkdir(parents=True, exist_ok=True)
    stats = {"papers": 0, "skipped": 0, "tables": 0, "figs": 0, "fig_images": 0, "errors": 0}

    for i, (citekey, pmcid) in enumerate(eligible, 1):
        paper_dir = out_root / citekey
        if paper_dir.exists() and not args.force:
            stats["skipped"] += 1
            print(f"[{i}/{len(eligible)}] {citekey}: cached, skip")
            continue

        print(f"[{i}/{len(eligible)}] {citekey}  {pmcid}")
        try:
            r = requests.get(EPMC_XML.format(pmcid=pmcid), headers=HEADERS, timeout=HTTP_TIMEOUT)
            if r.status_code != 200 or not r.content.strip():
                print("  ! no full-text XML")
                stats["errors"] += 1
                time.sleep(POLITE_DELAY)
                continue
            root = ET.fromstring(r.content)
        except Exception as e:
            print(f"  ! XML error: {e}")
            stats["errors"] += 1
            time.sleep(POLITE_DELAY)
            continue
        time.sleep(POLITE_DELAY)

        tables = parse_tables(root)
        figures = parse_figures(root)

        # Fetch figure-image ZIP only if there are figures with graphics
        zip_names: List[str] = []
        zf: Optional[zipfile.ZipFile] = None
        if any(fig["graphics"] for fig in figures):
            try:
                rz = requests.get(EPMC_SUPP.format(pmcid=pmcid), headers=HEADERS, timeout=HTTP_TIMEOUT)
                if rz.status_code == 200 and rz.content[:2] == b"PK":
                    zf = zipfile.ZipFile(io.BytesIO(rz.content))
                    zip_names = zf.namelist()
            except Exception as e:
                print(f"  ! supp ZIP error: {e}")
            time.sleep(POLITE_DELAY)

        paper_dir.mkdir(parents=True, exist_ok=True)
        manifest = {"citekey": citekey, "pmcid": pmcid, "tables": [], "figures": []}

        # Tables -> HTML (+ CSV)
        for n, t in enumerate(tables, 1):
            entry = {"label": t["label"], "caption": t["caption"], "html": None, "csv": None}
            if t["html"]:
                html_name = f"table_{n}.html"
                (paper_dir / html_name).write_text(t["html"], encoding="utf-8")
                entry["html"] = html_name
                try:
                    import pandas as pd

                    dfs = pd.read_html(io.StringIO(t["html"]))
                    if dfs:
                        csv_name = f"table_{n}.csv"
                        dfs[0].to_csv(paper_dir / csv_name, index=False)
                        entry["csv"] = csv_name
                except Exception:
                    pass  # table HTML may not be tabular-parseable; HTML is still saved
            manifest["tables"].append(entry)
            stats["tables"] += 1

        # Figures -> image files
        for n, fig in enumerate(figures, 1):
            entry = {"label": fig["label"], "caption": fig["caption"], "image": None}
            if fig["graphics"] and zf is not None:
                chosen = pick_image(fig["graphics"], zip_names)
                if chosen:
                    ext = Path(chosen).suffix.lower() or ".img"
                    img_name = f"fig_{n}{ext}"
                    (paper_dir / img_name).write_bytes(zf.read(chosen))
                    entry["image"] = img_name
                    stats["fig_images"] += 1
            manifest["figures"].append(entry)
            stats["figs"] += 1

        (paper_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        if zf:
            zf.close()
        print(f"  tables={len(tables)} figures={len(figures)} images={sum(1 for f in manifest['figures'] if f['image'])}")
        stats["papers"] += 1

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for k, v in stats.items():
        print(f"  {k}: {v}")
    print(f"\nOutput: {out_root}")


if __name__ == "__main__":
    main()
