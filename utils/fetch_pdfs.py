#!/usr/bin/env python3
"""
Retrieve open-access PDFs for source notes and enrich them with DOIs.

For each note in `Discourse Graph/Sources/@*.md` we:
  1. resolve identifiers (PMID -> PMCID + DOI) via NCBI ID Converter, falling back
     to OpenAlex for any missing DOI (and capturing an OA PDF candidate),
  2. write the DOI back into the note's YAML frontmatter, and
  3. download an OA PDF (first valid wins) from, in order:
        PMC OA subset -> Unpaywall -> Semantic Scholar -> OpenAlex,
     saving it to data/pdfs/@<citekey>.pdf.

Resume-safe: cached identifier map, skip-if-exists for PDFs, idempotent DOI insertion.

Usage:
    python3 utils/fetch_pdfs.py --dry-run        # resolve + report, no writes
    python3 utils/fetch_pdfs.py --limit 20       # pilot on first 20 notes
    python3 utils/fetch_pdfs.py                   # full run
    python3 utils/fetch_pdfs.py --only-doi        # resolve + write DOIs, no PDF downloads
    python3 utils/fetch_pdfs.py --force           # re-download existing PDFs
"""

import argparse
import csv
import json
import re
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests

EMAIL = "joelchan@umd.edu"
TOOL = "lep-synthesis"

# Endpoints
IDCONV_URL = "https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/"
EUROPEPMC_RENDER = "https://europepmc.org/articles/{pmcid}?pdf=render"
OPENALEX_URL = "https://api.openalex.org/works/pmid:{pmid}"
UNPAYWALL_URL = "https://api.unpaywall.org/v2/{doi}"
S2_URL = "https://api.semanticscholar.org/graph/v1/paper/{idtype}:{idval}"

# Politeness
RATE_LIMIT_DELAY = 0.34  # NCBI: ~3 req/s without an API key
POLITE_DELAY = 0.2
IDCONV_BATCH = 200
MIN_PDF_BYTES = 1024
HTTP_TIMEOUT = 30
DOWNLOAD_TIMEOUT = 90

HEADERS = {"User-Agent": f"{TOOL} (mailto:{EMAIL})"}


# --------------------------------------------------------------------------- #
# .env + frontmatter helpers
# --------------------------------------------------------------------------- #
def load_env(project_root: Path) -> Dict[str, str]:
    """Minimal .env parser (no dependency). Returns key->value."""
    env: Dict[str, str] = {}
    env_file = project_root / ".env"
    if not env_file.exists():
        return env
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        env[key.strip()] = val.strip().strip('"').strip("'")
    return env


def extract_frontmatter(file_path: Path) -> Optional[Dict]:
    """Extract YAML frontmatter from a markdown file."""
    import yaml

    content = file_path.read_text(encoding="utf-8")
    match = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if match:
        try:
            return yaml.safe_load(match.group(1))
        except yaml.YAMLError:
            return None
    return None


def clean_citekey(citekey: str) -> str:
    """Citekey as it should appear on disk (keep the @, drop quotes)."""
    return citekey.replace('"', "").strip()


def insert_doi_frontmatter(file_path: Path, doi: str) -> str:
    """
    Insert a `doi:` line into the YAML frontmatter immediately after the
    `pubmed_id:` line, without re-dumping the YAML. Idempotent.

    Returns: 'added' | 'exists' | 'no-frontmatter'
    """
    content = file_path.read_text(encoding="utf-8")
    m = re.match(r"^(---\s*\n)(.*?)(\n---)", content, re.DOTALL)
    if not m:
        return "no-frontmatter"

    fm = m.group(2)
    if re.search(r"^doi:\s*\S", fm, re.MULTILINE):
        return "exists"

    new_line = f"doi: {doi}"
    lines = fm.split("\n")
    out_lines: List[str] = []
    inserted = False
    for line in lines:
        out_lines.append(line)
        if not inserted and re.match(r"^pubmed_id:", line):
            out_lines.append(new_line)
            inserted = True
    if not inserted:  # no pubmed_id line; append at end of frontmatter
        out_lines.append(new_line)

    new_fm = "\n".join(out_lines)
    new_content = content[: m.start(2)] + new_fm + content[m.end(2):]
    file_path.write_text(new_content, encoding="utf-8")
    return "added"


# --------------------------------------------------------------------------- #
# Step 1: identifier resolution
# --------------------------------------------------------------------------- #
def idconv_batch(pmids: List[str]) -> Dict[str, Dict[str, Optional[str]]]:
    """NCBI ID Converter: PMID -> {pmcid, doi}. Batched."""
    result: Dict[str, Dict[str, Optional[str]]] = {}
    for i in range(0, len(pmids), IDCONV_BATCH):
        chunk = pmids[i : i + IDCONV_BATCH]
        params = {
            "ids": ",".join(chunk),
            "format": "json",
            "tool": TOOL,
            "email": EMAIL,
        }
        try:
            r = requests.get(IDCONV_URL, params=params, headers=HEADERS, timeout=HTTP_TIMEOUT)
            r.raise_for_status()
            data = r.json()
            for rec in data.get("records", []):
                pmid = str(rec.get("pmid", "")).strip()
                if not pmid:
                    continue
                result[pmid] = {
                    "pmcid": rec.get("pmcid"),
                    "doi": rec.get("doi"),
                }
        except Exception as e:
            print(f"  ! idconv error for batch starting {chunk[0]}: {e}")
        time.sleep(RATE_LIMIT_DELAY)
        print(f"  idconv: resolved {len(result)}/{len(pmids)}")
    return result


def openalex_lookup(pmid: str) -> Dict[str, Optional[str]]:
    """OpenAlex by PMID -> {doi, oa_pdf_url}."""
    out: Dict[str, Optional[str]] = {"doi": None, "oa_pdf_url": None}
    try:
        r = requests.get(
            OPENALEX_URL.format(pmid=pmid),
            params={"mailto": EMAIL},
            headers=HEADERS,
            timeout=HTTP_TIMEOUT,
        )
        if r.status_code != 200:
            return out
        data = r.json()
        doi = data.get("doi")  # e.g. https://doi.org/10.xxxx
        if doi:
            out["doi"] = doi.replace("https://doi.org/", "").strip()
        best = data.get("best_oa_location") or {}
        oa = data.get("open_access") or {}
        out["oa_pdf_url"] = best.get("pdf_url") or oa.get("oa_url")
    except Exception as e:
        print(f"  ! openalex error for PMID {pmid}: {e}")
    return out


def normalize_doi(doi: Optional[str]) -> Optional[str]:
    if not doi:
        return None
    doi = doi.strip()
    doi = re.sub(r"^https?://(dx\.)?doi\.org/", "", doi, flags=re.IGNORECASE)
    return doi or None


# --------------------------------------------------------------------------- #
# Step 3: PDF sources
# --------------------------------------------------------------------------- #
def pmc_oa_pdf_url(pmcid: str) -> Optional[str]:
    """
    PDF for a PMC article via Europe PMC's render endpoint.

    NCBI's own OA paths (oa.fcgi FTP links, /articles/.../pdf/) are either 404 or
    bot-blocked for programmatic clients, but Europe PMC reliably renders the OA PDF
    by PMCID. download_pdf() validates the result, so non-OA articles simply fall
    through to the next source.
    """
    if not pmcid:
        return None
    return EUROPEPMC_RENDER.format(pmcid=pmcid)


def is_ncbi_blocked(url: Optional[str]) -> bool:
    """NCBI article PDF URLs are bot-blocked / 404 for direct download; skip them."""
    if not url:
        return True
    return "ncbi.nlm.nih.gov" in url.lower()


def unpaywall_pdf_url(doi: str) -> Optional[str]:
    try:
        r = requests.get(
            UNPAYWALL_URL.format(doi=doi),
            params={"email": EMAIL},
            headers=HEADERS,
            timeout=HTTP_TIMEOUT,
        )
        if r.status_code != 200:
            return None
        data = r.json()
        best = data.get("best_oa_location") or {}
        return best.get("url_for_pdf")
    except Exception as e:
        print(f"  ! unpaywall error for {doi}: {e}")
    return None


def s2_pdf_url(pmid: Optional[str], doi: Optional[str], api_key: Optional[str]) -> Optional[str]:
    headers = dict(HEADERS)
    if api_key:
        headers["x-api-key"] = api_key
    attempts: List[Tuple[str, str]] = []
    if pmid:
        attempts.append(("PMID", pmid))
    if doi:
        attempts.append(("DOI", doi))
    for idtype, idval in attempts:
        for retry in range(3):
            try:
                r = requests.get(
                    S2_URL.format(idtype=idtype, idval=idval),
                    params={"fields": "openAccessPdf,externalIds"},
                    headers=headers,
                    timeout=HTTP_TIMEOUT,
                )
                if r.status_code == 429:
                    time.sleep(2 * (retry + 1))
                    continue
                if r.status_code != 200:
                    break
                data = r.json()
                oa = data.get("openAccessPdf") or {}
                if oa.get("url"):
                    return oa["url"]
                break
            except Exception as e:
                print(f"  ! s2 error for {idtype}:{idval}: {e}")
                break
        time.sleep(POLITE_DELAY)
    return None


def download_pdf(url: str, dest: Path) -> bool:
    """Download and validate a PDF (magic bytes + min size). Returns success.

    Retries once on transient network errors (e.g. Europe PMC read timeouts).
    """
    for attempt in range(2):
        try:
            r = requests.get(url, headers=HEADERS, timeout=DOWNLOAD_TIMEOUT, allow_redirects=True)
            if r.status_code != 200:
                return False
            content = r.content
            if len(content) < MIN_PDF_BYTES or not content[:5].startswith(b"%PDF"):
                return False
            dest.write_bytes(content)
            return True
        except requests.exceptions.RequestException as e:
            if attempt == 0:
                time.sleep(2)
                continue
            print(f"  ! download error {url}: {e}")
            return False
    return False


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    parser = argparse.ArgumentParser(description="Fetch OA PDFs and enrich notes with DOIs.")
    parser.add_argument("--limit", type=int, default=None, help="Process only the first N notes.")
    parser.add_argument("--only-doi", action="store_true", help="Resolve + write DOIs; skip PDF download.")
    parser.add_argument("--force", action="store_true", help="Re-download even if a PDF exists.")
    parser.add_argument("--dry-run", action="store_true", help="Resolve + report only; no writes.")
    args = parser.parse_args()

    project_root = Path(__file__).parent.parent
    sources_dir = project_root / "Discourse Graph" / "Sources"
    pdf_dir = project_root / "data" / "pdfs"
    idmap_path = pdf_dir / "_idmap.json"
    report_path = pdf_dir / "_fetch_report.csv"

    if not args.dry_run:
        pdf_dir.mkdir(parents=True, exist_ok=True)

    env = load_env(project_root)
    s2_key = env.get("SEMANTIC_SCHOLAR_API_KEY")
    print(f"Semantic Scholar API key: {'loaded' if s2_key else 'NOT found (keyless mode)'}")

    note_files = sorted(sources_dir.glob("@*.md"))
    if args.limit:
        note_files = note_files[: args.limit]
    print(f"Processing {len(note_files)} notes from {sources_dir}")

    # Gather notes + PMIDs
    notes = []  # list of dicts
    pmids_to_resolve: List[str] = []
    for f in note_files:
        fm = extract_frontmatter(f) or {}
        citekey = clean_citekey(str(fm.get("citekey", f.stem)))
        pmid = str(fm.get("pubmed_id", "")).strip()
        if pmid in ("", "9999", "None"):
            pmid = ""
        existing_doi = normalize_doi(str(fm.get("doi", "")) if fm.get("doi") else None)
        notes.append({"file": f, "citekey": citekey, "pmid": pmid, "doi": existing_doi})
        if pmid:
            pmids_to_resolve.append(pmid)

    # Load cached idmap
    idmap: Dict[str, Dict] = {}
    if idmap_path.exists():
        try:
            idmap = json.loads(idmap_path.read_text(encoding="utf-8"))
        except Exception:
            idmap = {}

    # Step 1a: NCBI ID Converter for PMIDs not already cached
    uncached = [p for p in dict.fromkeys(pmids_to_resolve) if p not in idmap]
    if uncached:
        print(f"\nStep 1: resolving {len(uncached)} PMIDs via NCBI ID Converter...")
        resolved = idconv_batch(uncached)
        for pmid, rec in resolved.items():
            idmap[pmid] = {
                "pmcid": rec.get("pmcid"),
                "doi": normalize_doi(rec.get("doi")),
                "oa_pdf_url": None,
            }
        for pmid in uncached:  # record misses too, so we don't requery endlessly
            idmap.setdefault(pmid, {"pmcid": None, "doi": None, "oa_pdf_url": None})

    # Step 1b: OpenAlex fallback for PMIDs still missing a DOI
    need_openalex = [
        p for p in dict.fromkeys(pmids_to_resolve)
        if not idmap.get(p, {}).get("doi") or not idmap.get(p, {}).get("oa_pdf_url")
    ]
    if need_openalex:
        print(f"\nStep 1b: OpenAlex lookup for {len(need_openalex)} PMIDs (missing DOI/OA url)...")
        for i, pmid in enumerate(need_openalex, 1):
            oa = openalex_lookup(pmid)
            entry = idmap.setdefault(pmid, {"pmcid": None, "doi": None, "oa_pdf_url": None})
            if not entry.get("doi") and oa.get("doi"):
                entry["doi"] = normalize_doi(oa["doi"])
            if not entry.get("oa_pdf_url") and oa.get("oa_pdf_url"):
                entry["oa_pdf_url"] = oa["oa_pdf_url"]
            time.sleep(POLITE_DELAY)
            if i % 25 == 0:
                print(f"  openalex: {i}/{len(need_openalex)}")

    if not args.dry_run:
        idmap_path.write_text(json.dumps(idmap, indent=2), encoding="utf-8")

    # Steps 2 + 3 + 4
    report_rows = []
    stats = {"doi_added": 0, "doi_exists": 0, "pdf": {}, "pdf_cached": 0, "pdf_fail": 0, "no_id": 0}

    for idx, note in enumerate(notes, 1):
        f = note["file"]
        citekey = note["citekey"]
        pmid = note["pmid"]
        entry = idmap.get(pmid, {}) if pmid else {}
        doi = note["doi"] or entry.get("doi")
        pmcid = entry.get("pmcid")
        print(f"\n[{idx}/{len(notes)}] {citekey}  pmid={pmid or '-'} doi={doi or '-'} pmcid={pmcid or '-'}")

        if not pmid and not doi:
            stats["no_id"] += 1

        # Step 2: write DOI
        doi_status = "skip"
        if doi and not note["doi"]:
            if args.dry_run:
                doi_status = "would-add"
            else:
                doi_status = insert_doi_frontmatter(f, doi)
                if doi_status == "added":
                    stats["doi_added"] += 1
        elif note["doi"]:
            doi_status = "exists"
            stats["doi_exists"] += 1

        # Step 3: fetch PDF
        pdf_source = ""
        pdf_status = "skipped" if args.only_doi else "none"
        pdf_path = ""
        dest = pdf_dir / f"{citekey}.pdf"

        if not args.only_doi and not args.dry_run:
            if dest.exists() and not args.force:
                pdf_status = "cached"
                pdf_source = "cached"
                pdf_path = str(dest)
                stats["pdf_cached"] += 1
            else:
                candidates: List[Tuple[str, Optional[str]]] = []
                if pmcid:
                    candidates.append(("pmc", "DEFERRED"))  # resolved lazily below
                if doi:
                    candidates.append(("unpaywall", "DEFERRED"))
                candidates.append(("s2", "DEFERRED"))
                if entry.get("oa_pdf_url"):
                    candidates.append(("openalex", entry["oa_pdf_url"]))

                for source, url in candidates:
                    if url == "DEFERRED":
                        if source == "pmc":
                            url = pmc_oa_pdf_url(pmcid)
                            time.sleep(RATE_LIMIT_DELAY)
                        elif source == "unpaywall":
                            url = unpaywall_pdf_url(doi)
                            time.sleep(POLITE_DELAY)
                        elif source == "s2":
                            url = s2_pdf_url(pmid or None, doi, s2_key)
                    if not url:
                        continue
                    if source != "pmc" and is_ncbi_blocked(url):
                        # NCBI article PDFs can't be fetched directly; the PMC source
                        # (Europe PMC render) already covers this paper if it's OA.
                        print(f"  skip {source} (ncbi-blocked): {url[:70]}")
                        continue
                    print(f"  trying {source}: {url[:80]}")
                    if download_pdf(url, dest):
                        pdf_status = "downloaded"
                        pdf_source = source
                        pdf_path = str(dest)
                        stats["pdf"][source] = stats["pdf"].get(source, 0) + 1
                        print(f"  ✓ saved via {source}")
                        break
                if pdf_status not in ("downloaded", "cached"):
                    pdf_status = "failed"
                    stats["pdf_fail"] += 1
                    print("  ✗ no OA PDF found")

        report_rows.append(
            {
                "citekey": citekey,
                "pubmed_id": pmid,
                "pmcid": pmcid or "",
                "doi": doi or "",
                "doi_status": doi_status,
                "pdf_source": pdf_source,
                "pdf_status": pdf_status,
                "path": pdf_path,
            }
        )

    # Write report
    if not args.dry_run:
        with report_path.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=[
                    "citekey", "pubmed_id", "pmcid", "doi",
                    "doi_status", "pdf_source", "pdf_status", "path",
                ],
            )
            writer.writeheader()
            writer.writerows(report_rows)

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY" + (" (dry run)" if args.dry_run else ""))
    print("=" * 60)
    have_doi = sum(1 for r in report_rows if r["doi"])
    print(f"Notes processed:        {len(notes)}")
    print(f"DOIs available:         {have_doi}")
    print(f"DOIs newly added:       {stats['doi_added']}")
    print(f"DOIs already present:   {stats['doi_exists']}")
    print(f"Notes with no id:       {stats['no_id']}")
    if not args.only_doi and not args.dry_run:
        for src, n in sorted(stats["pdf"].items()):
            print(f"PDFs via {src:<12}{n}")
        print(f"PDFs cached:            {stats['pdf_cached']}")
        print(f"PDFs failed/none:       {stats['pdf_fail']}")
    if not args.dry_run:
        print(f"\nReport: {report_path}")
        print(f"ID map: {idmap_path}")


if __name__ == "__main__":
    main()
