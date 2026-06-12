#!/usr/bin/env python3
"""
match_inbox_pdfs.py — match hand-collected inbox PDFs to source notes and ingest them.

WHAT
    The FIRST point of PDF retrieval (before any online fetch in plans/getting-papers.md).
    Matches each PDF in data/pdfs/inbox/ to a source note (Discourse Graph/Sources/@*.md),
    renames/copies confirmed matches to data/pdfs/@<citekey>.pdf (the same naming + location
    convention as fetch_pdfs.py), authors draft source-note stubs for genuinely new papers,
    and reconciles a `has_pdf:` flag across all notes so a .base can show the remaining gap.
    fetch_pdfs.py then only chases whatever the inbox could not fill.

HOW
    1. Parse each inbox filename -> (author, year, title_slug, pmid). PMID via _PMID(\\d+)\\.pdf.
       Non-PDF extensions -> not-a-pdf. Malformed PMID tokens (_PMIDmissing<n>, corrupted
       non-digit ids) -> pmid=None, fall through to content matching.
    2. Read PDF content with PyMuPDF (fitz): embedded DOI (metadata + XMP + first ~3 pages of
       text), title, first-author surname, year. A PDF that fails to open -> unreadable-pdf.
    3. Match + verify against a strict gate:
       Tier 1: filename PMID -> note via the pubmed_id index.
       Tier 2: content search across all notes — DOI exact (reverse lookup) first, then fuzzy
       title (rapidfuzz token_set_ratio if importable, else difflib) gated by author + year.
       The decision matrix (below) assigns one decision + a confidence to every inbox file.
    4. Always write a report (data/pdfs/inbox/_match_report.csv) and print a per-bucket summary.
    5. Only under --apply: copy confirmed/resolved/new PDFs to data/pdfs/@<citekey>.pdf, set
       has_pdf:true in the note (idempotent insertion after pubmed_id:), author NEW-PAPER stubs
       (metadata from PubMed esummary by PMID, else Crossref by DOI, else filename fallback),
       and shuffle consumed inbox files into _ingested/ (confirmed/new), _dup/ (already on disk),
       or _review/ (conflicts).

INPUT   data/pdfs/inbox/*.pdf (Author_Year_TitleSlug_PMID<id>.pdf), Discourse Graph/Sources/@*.md
        (frontmatter w/ citekey + pubmed_id + optional doi), data/pdfs/_idmap.json
        (pubmed_id -> {pmcid, doi, oa_pdf_url}, used to build a DOI->note reverse lookup).
OUTPUT  data/pdfs/inbox/_match_report.csv (always). Under --apply: data/pdfs/@<citekey>.pdf,
        new Discourse Graph/Sources/@<citekey>.md stubs, updated note frontmatter (has_pdf:),
        relocated inbox files under data/pdfs/inbox/_ingested/ and _review/.

INVARIANTS / NOTES
    - REPORT-ONLY BY DEFAULT: with no --apply the tool writes NOTHING except the report CSV.
      Every copy/move/frontmatter-edit/stub-write happens only under --apply.
    - Resume-safe + idempotent: skip-if-exists for dest PDFs (--force overrides), idempotent
      has_pdf insertion (replaces an existing line only if the value changed), idempotent stub
      creation (skips if the note already exists). One bad PDF never crashes the run.
    - Politeness: PubMed esummary + Crossref at NCBI-friendly ~3 req/s (RATE_LIMIT_DELAY).
    - Matching gates are conservative: a filename PMID whose PDF content disagrees becomes a
      CONFLICT for human review rather than a silent ingest.

USAGE
    python3 utils/match_inbox_pdfs.py                       # dry-run: report only, no writes
    python3 utils/match_inbox_pdfs.py --limit 20            # pilot the report on 20 files
    python3 utils/match_inbox_pdfs.py --apply --limit 20    # pilot the writes on 20 files
    python3 utils/match_inbox_pdfs.py --apply               # full ingest
    python3 utils/match_inbox_pdfs.py --apply               # re-run is idempotent
    python3 utils/match_inbox_pdfs.py --only-has-pdf        # report the has_pdf gap only
    python3 utils/match_inbox_pdfs.py --only-has-pdf --apply # write has_pdf across all notes
"""

import argparse
import csv
import json
import os
import re
import shutil
import time
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests

try:  # PyMuPDF is required for content reading but import-guarded for a clean error.
    import fitz  # type: ignore
except Exception:  # pragma: no cover
    fitz = None  # type: ignore

try:  # rapidfuzz is OPTIONAL — fall back to difflib when absent.
    from rapidfuzz import fuzz as _rf_fuzz  # type: ignore

    HAVE_RAPIDFUZZ = True
except Exception:
    import difflib as _difflib

    HAVE_RAPIDFUZZ = False

EMAIL = "joelchan@umd.edu"
TOOL = "lep-synthesis"

# Endpoints
ESUMMARY_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
CROSSREF_URL = "https://api.crossref.org/works/{doi}"

# Politeness
RATE_LIMIT_DELAY = 0.34  # NCBI / Crossref: ~3 req/s without an API key
HTTP_TIMEOUT = 30

# Matching
DEFAULT_MIN_TITLE_SIM = 0.85  # token_set_ratio (0..1) threshold for a content title match
HIGH_TITLE_SIM = 0.95         # margin above which a content match is "high" confidence
DOI_RE = re.compile(r"10\.\d{4,9}/[-._;()/:A-Za-z0-9]+")
PMID_RE = re.compile(r"_PMID(\d+)\.pdf$", re.IGNORECASE)
PMID_TOKEN_RE = re.compile(r"_PMID([^.]+)\.pdf$", re.IGNORECASE)  # any token, to detect malformed

HEADERS = {"User-Agent": f"{TOOL} (mailto:{EMAIL})"}

SRC_NODE_TYPE_ID = "node_Ne237S0BfRPDaeqB_gbuT"

REPORT_FIELDS = [
    "inbox_file", "parsed_pmid", "matched_citekey", "tier", "decision", "confidence",
    "doi_pdf", "doi_note", "title_pdf", "title_note", "title_sim",
    "author_match", "year_match", "dest_path", "note",
]

# Sort order for the report: most-actionable buckets first.
DECISION_RANK = {
    "CONFLICT": 0, "NEW-PAPER": 1, "RESOLVED-BY-CONTENT": 2, "CONFIRMED": 3,
    "DUP": 4, "unreadable-pdf": 5, "not-a-pdf": 6,
}
CONFIDENCE_RANK = {"high": 0, "medium": 1, "low": 2, "": 3}


# --------------------------------------------------------------------------- #
# Node identity
# --------------------------------------------------------------------------- #
def uuid7() -> str:
    """UUIDv7 string. Uses stdlib uuid.uuid7 when present, else the same hand-rolled
    construction as utils/sync_relations.py (Python < 3.14 has no uuid.uuid7)."""
    fn = getattr(uuid, "uuid7", None)
    if fn is not None:
        return str(fn())
    ms = int(time.time() * 1000)
    b = bytearray(ms.to_bytes(6, "big") + os.urandom(10))
    b[6] = (b[6] & 0x0F) | 0x70
    b[8] = (b[8] & 0x3F) | 0x80
    return str(uuid.UUID(bytes=bytes(b)))


# --------------------------------------------------------------------------- #
# Frontmatter helpers (ported from fetch_pdfs.py)
# --------------------------------------------------------------------------- #
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


def normalize_doi(doi: Optional[str]) -> Optional[str]:
    if not doi:
        return None
    doi = doi.strip()
    doi = re.sub(r"^https?://(dx\.)?doi\.org/", "", doi, flags=re.IGNORECASE)
    # Strip a trailing run of characters that aren't valid DOI body chars.
    doi = doi.strip().rstrip(".,;)>]\"' ")
    return doi.lower() or None


def doi_related(a: Optional[str], b: Optional[str]) -> bool:
    """
    True when two DOIs denote the same article despite extraction noise. PDF-scraped DOIs are
    frequently truncated (10.15766/mep_2374-) or carry trailing junk (…20740.published), so a
    prefix relationship in EITHER direction counts as agreement; only genuinely diverging DOIs
    (…qcz061 vs …qcaa010) are treated as a conflict.
    """
    if not a or not b:
        return False
    return a == b or a.startswith(b) or b.startswith(a)


def set_has_pdf_frontmatter(file_path: Path, value: bool) -> str:
    """
    Set `has_pdf: <bool>` in YAML frontmatter immediately after the `pubmed_id:` line,
    without re-dumping the YAML. Idempotent: replaces an existing `has_pdf:` line only if
    the value differs.

    Returns: 'added' | 'updated' | 'unchanged' | 'no-frontmatter'
    """
    content = file_path.read_text(encoding="utf-8")
    m = re.match(r"^(---\s*\n)(.*?)(\n---)", content, re.DOTALL)
    if not m:
        return "no-frontmatter"

    fm = m.group(2)
    desired = "true" if value else "false"
    new_line = f"has_pdf: {desired}"

    existing = re.search(r"^has_pdf:\s*(\S+)", fm, re.MULTILINE)
    if existing:
        current = existing.group(1).strip().lower()
        if current == desired:
            return "unchanged"
        new_fm = re.sub(r"^has_pdf:.*$", new_line, fm, count=1, flags=re.MULTILINE)
        new_content = content[: m.start(2)] + new_fm + content[m.end(2):]
        file_path.write_text(new_content, encoding="utf-8")
        return "updated"

    # Insert after pubmed_id:, falling back to end of frontmatter.
    lines = fm.split("\n")
    out_lines: List[str] = []
    inserted = False
    for line in lines:
        out_lines.append(line)
        if not inserted and re.match(r"^pubmed_id:", line):
            out_lines.append(new_line)
            inserted = True
    if not inserted:
        out_lines.append(new_line)
    new_fm = "\n".join(out_lines)
    new_content = content[: m.start(2)] + new_fm + content[m.end(2):]
    file_path.write_text(new_content, encoding="utf-8")
    return "added"


# --------------------------------------------------------------------------- #
# Filename parsing
# --------------------------------------------------------------------------- #
def parse_inbox_filename(name: str) -> Dict[str, Optional[str]]:
    """
    Parse Author_Year_TitleSlug_PMID<id>.pdf -> {author, year, title_slug, pmid, malformed_pmid}.

    pmid is set only when the trailing _PMID token is all digits. _PMIDmissing<n> and corrupted
    non-digit tokens (e.g. _PMID3724c6143) set pmid=None and malformed_pmid=True.
    """
    out: Dict[str, Optional[str]] = {
        "author": None, "year": None, "title_slug": None, "pmid": None, "malformed_pmid": False,
    }
    m = PMID_RE.search(name)
    if m:
        out["pmid"] = m.group(1)
    else:
        tok = PMID_TOKEN_RE.search(name)
        if tok:
            out["malformed_pmid"] = True  # a _PMID token exists but isn't all-digits

    # Strip extension + the trailing _PMID... token for the descriptive part.
    stem = re.sub(r"\.pdf$", "", name, flags=re.IGNORECASE)
    stem = re.sub(r"_PMID[^_]*$", "", stem, flags=re.IGNORECASE)
    parts = stem.split("_", 2)
    if parts:
        out["author"] = parts[0] or None
    if len(parts) >= 2 and re.fullmatch(r"\d{4}", parts[1]):
        out["year"] = parts[1]
    if len(parts) >= 3:
        out["title_slug"] = parts[2] or None
    elif len(parts) == 2 and not out["year"]:
        out["title_slug"] = parts[1] or None
    return out


def surname_from_author_token(author: Optional[str]) -> str:
    """
    The filename author token is a run-together name (e.g. 'AllisonSquires', 'Abdelmessih').
    Extract a best-guess surname: the trailing CamelCase word, else the token itself.
    """
    if not author:
        return ""
    words = re.findall(r"[A-Z][a-z]+", author)
    if words:
        return words[-1].lower()
    return author.lower()


# --------------------------------------------------------------------------- #
# PDF content extraction (PyMuPDF)
# --------------------------------------------------------------------------- #
def read_pdf_content(path: Path) -> Optional[Dict[str, Optional[str]]]:
    """
    Extract {doi, title, author_surname, year} from a PDF. Returns None if the PDF won't open.
    Defensive: any per-field failure degrades to None for that field, never raises.
    """
    if fitz is None:
        return None
    try:
        doc = fitz.open(str(path))
    except Exception:
        return None

    out: Dict[str, Optional[str]] = {"doi": None, "title": None, "author_surname": None, "year": None}
    try:
        meta = {}
        try:
            meta = doc.metadata or {}
        except Exception:
            meta = {}

        # --- DOI: metadata, then XMP, then first ~3 pages of text ---
        doi = None
        for key in ("doi", "subject", "keywords", "title"):
            val = meta.get(key) or ""
            mm = DOI_RE.search(val)
            if mm:
                doi = mm.group(0)
                break
        if not doi:
            # xref_xml_metadata() returns the XMP stream's xref NUMBER (int), not the XML — fetch
            # and decode the stream itself.
            xmp = ""
            try:
                xref = doc.xref_xml_metadata() if hasattr(doc, "xref_xml_metadata") else 0
                if isinstance(xref, int) and xref > 0:
                    raw = doc.xref_stream(xref)
                    xmp = raw.decode("utf-8", "ignore") if isinstance(raw, (bytes, bytearray)) else (raw or "")
            except Exception:
                xmp = ""
            if isinstance(xmp, str) and xmp:
                mm = DOI_RE.search(xmp)
                if mm:
                    doi = mm.group(0)

        head_text = ""
        try:
            n = min(3, doc.page_count)
            head_text = "\n".join(doc.load_page(i).get_text("text") for i in range(n))
        except Exception:
            head_text = ""
        if not doi and head_text:
            mm = DOI_RE.search(head_text)
            if mm:
                doi = mm.group(0)
        out["doi"] = normalize_doi(doi)

        # --- Title: metadata title, else largest-font block on page 1 ---
        title = (meta.get("title") or "").strip()
        if not title or len(title) < 8:
            title = largest_font_title(doc) or title
        out["title"] = title or None

        # --- First-author surname: metadata author, else first text line heuristic ---
        author = (meta.get("author") or "").strip()
        if author:
            out["author_surname"] = guess_surname(author)

        # --- Year: text (19xx/20xx), else metadata creationDate ---
        year = None
        if head_text:
            ym = re.search(r"\b(19|20)\d{2}\b", head_text)
            if ym:
                year = ym.group(0)
        if not year:
            cd = meta.get("creationDate") or ""
            ym = re.search(r"(19|20)\d{2}", cd)
            if ym:
                year = ym.group(0)
        out["year"] = year
    except Exception:
        # Per-field failure must never crash the run — return whatever we resolved so far.
        pass
    finally:
        try:
            doc.close()
        except Exception:
            pass
    return out


def largest_font_title(doc) -> Optional[str]:
    """Best-effort title = the largest-font text block on page 1 (defensive)."""
    try:
        page = doc.load_page(0)
        data = page.get_text("dict")
    except Exception:
        return None
    best_size = 0.0
    best_text = ""
    for block in data.get("blocks", []):
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            if not spans:
                continue
            size = max((s.get("size", 0.0) for s in spans), default=0.0)
            text = "".join(s.get("text", "") for s in spans).strip()
            if not text or len(text) < 8:
                continue
            if size > best_size:
                best_size = size
                best_text = text
    return best_text or None


def guess_surname(author_field: str) -> str:
    """From a PDF author string ('Jane Q. Smith' or 'Smith, Jane') guess a surname."""
    author_field = author_field.split(";")[0].split(",")[0].strip()
    if "," in author_field:
        return author_field.split(",")[0].strip().lower()
    words = re.findall(r"[A-Za-z][A-Za-z\-']+", author_field)
    if words:
        return words[-1].lower()
    return author_field.lower()


# --------------------------------------------------------------------------- #
# Fuzzy title similarity
# --------------------------------------------------------------------------- #
def title_similarity(a: Optional[str], b: Optional[str]) -> float:
    """token_set_ratio (rapidfuzz) or SequenceMatcher ratio, normalized to 0..1."""
    if not a or not b:
        return 0.0
    na, nb = a.strip().lower(), b.strip().lower()
    if not na or not nb:
        return 0.0
    if HAVE_RAPIDFUZZ:
        return _rf_fuzz.token_set_ratio(na, nb) / 100.0
    return _difflib.SequenceMatcher(None, na, nb).ratio()


# --------------------------------------------------------------------------- #
# Note index
# --------------------------------------------------------------------------- #
def build_note_index(sources_dir: Path) -> Tuple[List[Dict], Dict[str, Dict], Dict[str, Dict]]:
    """
    Read every @*.md note once. Returns:
      notes       — list of {file, citekey, pmid, doi, title, author, year}
      by_pmid     — pmid (str) -> note dict
      by_doi      — normalized doi -> note dict
    """
    notes: List[Dict] = []
    by_pmid: Dict[str, Dict] = {}
    by_doi: Dict[str, Dict] = {}
    for f in sorted(sources_dir.glob("@*.md")):
        fm = extract_frontmatter(f) or {}
        citekey = clean_citekey(str(fm.get("citekey", f.stem)))
        pmid = str(fm.get("pubmed_id", "")).strip()
        if pmid in ("", "9999", "None", "nan"):
            pmid = ""
        doi = normalize_doi(str(fm.get("doi")) if fm.get("doi") else None)
        note = {
            "file": f,
            "citekey": citekey,
            "pmid": pmid,
            "doi": doi,
            "title": (str(fm.get("title")) if fm.get("title") else "") or "",
            "author": (str(fm.get("author")) if fm.get("author") else "") or "",
            "year": str(fm.get("year")).strip() if fm.get("year") not in (None, "") else "",
        }
        notes.append(note)
        if pmid and pmid not in by_pmid:
            by_pmid[pmid] = note
        if doi and doi not in by_doi:
            by_doi[doi] = note
    return notes, by_pmid, by_doi


def best_content_match(
    pdf: Dict[str, Optional[str]],
    parsed: Dict[str, Optional[str]],
    notes: List[Dict],
    by_doi: Dict[str, Dict],
    min_title_sim: float,
) -> Tuple[Optional[Dict], float, bool, bool, str]:
    """
    Find the best content match. Returns (note|None, title_sim, author_match, year_match, how).
    DOI exact via reverse lookup wins outright; else best fuzzy title gated by author + year.
    `how` is 'doi' | 'title' | '' for reporting.
    """
    pdf_doi = pdf.get("doi")
    if pdf_doi and pdf_doi in by_doi:
        return by_doi[pdf_doi], 1.0, True, True, "doi"

    # Surname + year to gate fuzzy title. Prefer filename author/year, fall back to PDF.
    file_surname = surname_from_author_token(parsed.get("author"))
    pdf_surname = pdf.get("author_surname") or ""
    want_year = parsed.get("year") or pdf.get("year") or ""
    pdf_title = pdf.get("title")

    best_note: Optional[Dict] = None
    best_sim = 0.0
    best_author = False
    best_year = False
    for note in notes:
        sim = title_similarity(pdf_title, note["title"])
        if sim <= best_sim:
            continue
        note_surname = surname_from_author_token(note["author"]) or note["author"].lower()
        author_match = bool(
            (file_surname and note_surname and (file_surname in note_surname or note_surname in file_surname))
            or (pdf_surname and note_surname and (pdf_surname in note_surname or note_surname in pdf_surname))
        )
        year_match = bool(want_year and note["year"] and want_year == note["year"])
        best_note = note
        best_sim = sim
        best_author = author_match
        best_year = year_match
    return best_note, best_sim, best_author, best_year, "title"


# --------------------------------------------------------------------------- #
# Metadata resolution for NEW-PAPER stubs
# --------------------------------------------------------------------------- #
def pubmed_esummary(pmid: str) -> Optional[Dict[str, Optional[str]]]:
    """NCBI esummary -> {title, author, year, journal, doi}. None on failure."""
    try:
        r = requests.get(
            ESUMMARY_URL,
            params={"db": "pubmed", "id": pmid, "retmode": "json", "tool": TOOL, "email": EMAIL},
            headers=HEADERS,
            timeout=HTTP_TIMEOUT,
        )
        if r.status_code != 200:
            return None
        result = (r.json() or {}).get("result", {})
        rec = result.get(pmid)
        if not rec:
            return None
        authors = rec.get("authors") or []
        first_author = authors[0].get("name") if authors else ""
        pubdate = rec.get("pubdate") or rec.get("epubdate") or ""
        ym = re.search(r"(19|20)\d{2}", pubdate)
        doi = None
        for aid in rec.get("articleids", []) or []:
            if aid.get("idtype") == "doi":
                doi = normalize_doi(aid.get("value"))
                break
        return {
            "title": rec.get("title") or None,
            "author": guess_surname(first_author) if first_author else None,
            "year": ym.group(0) if ym else None,
            "journal": rec.get("fulljournalname") or rec.get("source") or None,
            "doi": doi,
        }
    except Exception as e:
        print(f"  ! esummary error for PMID {pmid}: {e}")
        return None


def crossref_lookup(doi: str) -> Optional[Dict[str, Optional[str]]]:
    """Crossref works/{doi} -> {title, author, year, journal, doi}. None on failure."""
    try:
        r = requests.get(
            CROSSREF_URL.format(doi=doi),
            params={"mailto": EMAIL},
            headers=HEADERS,
            timeout=HTTP_TIMEOUT,
        )
        if r.status_code != 200:
            return None
        msg = (r.json() or {}).get("message", {})
        title_list = msg.get("title") or []
        title = title_list[0] if title_list else None
        authors = msg.get("author") or []
        surname = (authors[0].get("family") or "").lower() if authors else None
        journal_list = msg.get("container-title") or []
        journal = journal_list[0] if journal_list else None
        year = None
        for key in ("published-print", "published-online", "issued", "created"):
            parts = (msg.get(key) or {}).get("date-parts") or []
            if parts and parts[0]:
                year = str(parts[0][0])
                break
        return {
            "title": title,
            "author": surname,
            "year": year,
            "journal": journal,
            "doi": normalize_doi(msg.get("DOI") or doi),
        }
    except Exception as e:
        print(f"  ! crossref error for {doi}: {e}")
        return None


def yaml_scalar(value: Optional[str]) -> str:
    """Quote a frontmatter scalar value when it contains YAML-significant characters."""
    if value is None:
        return '""'
    s = str(value).strip()
    if s == "":
        return '""'
    if re.search(r'[:#\[\]{}",\'&*!|>%@`]', s) or s.lower() in ("true", "false", "null", "yes", "no"):
        return '"' + s.replace('"', '\\"') + '"'
    return s


def write_new_paper_stub(
    note_path: Path,
    citekey: str,
    meta: Dict[str, Optional[str]],
    pmid: Optional[str],
    flagged: bool,
) -> None:
    """
    Author a draft SRC stub mirroring the real note frontmatter shape. Idempotent: the caller
    skips if the note already exists. `meta` carries title/author/year/journal/doi (any may be None).
    """
    node_instance_id = uuid7()
    empty = '""'
    lines = ["---"]
    lines.append(f"nodeTypeId: {SRC_NODE_TYPE_ID}")
    lines.append(f"nodeInstanceId: {node_instance_id}")
    lines.append(f"citekey: {yaml_scalar(citekey)}")
    if meta.get("author"):
        # Match the corpus convention of a capitalized surname (author: Abdelmessih).
        lines.append(f"author: {yaml_scalar(str(meta['author']).strip().capitalize())}")
    if meta.get("year"):
        lines.append(f"year: {meta['year']}")
    if meta.get("title"):
        lines.append(f"title: {yaml_scalar(meta['title'])}")
    if meta.get("journal"):
        lines.append(f"journal: {yaml_scalar(meta['journal'])}")
    lines.append(f"pubmed_id: {pmid if pmid else empty}")
    lines.append("has_pdf: true")
    if meta.get("doi"):
        lines.append(f"doi: {meta['doi']}")
    lines.append("curationStatus: Initial AI draft")
    lines.append("---")
    lines.append("")
    if flagged:
        lines.append(
            "> [!warning] Auto-generated stub — metadata resolution failed; fields parsed "
            "from the inbox filename only. Verify title/author/year and complete the source note."
        )
        lines.append("")
    lines.append("")
    note_path.write_text("\n".join(lines), encoding="utf-8")


# --------------------------------------------------------------------------- #
# has_pdf backfill
# --------------------------------------------------------------------------- #
def run_has_pdf_backfill(sources_dir: Path, pdf_dir: Path, apply: bool) -> Dict[str, int]:
    """
    Reconcile has_pdf for ALL notes against disk. Writes true AND false explicitly so a .base can
    filter the gap. Report-only unless apply=True.
    """
    stats = {"true": 0, "false": 0, "added": 0, "updated": 0, "unchanged": 0, "would-write": 0}
    for f in sorted(sources_dir.glob("@*.md")):
        fm = extract_frontmatter(f) or {}
        citekey = clean_citekey(str(fm.get("citekey", f.stem)))
        has = (pdf_dir / f"{citekey}.pdf").exists()
        stats["true" if has else "false"] += 1
        current = fm.get("has_pdf")
        already = (current is True and has) or (current is False and not has)
        if apply:
            outcome = set_has_pdf_frontmatter(f, has)
            stats[outcome] = stats.get(outcome, 0) + 1
        elif not already:
            stats["would-write"] += 1
    return stats


# --------------------------------------------------------------------------- #
# Per-file decision
# --------------------------------------------------------------------------- #
def decide_for_file(
    path: Path,
    parsed: Dict[str, Optional[str]],
    pdf: Optional[Dict[str, Optional[str]]],
    by_pmid: Dict[str, Dict],
    by_doi: Dict[str, Dict],
    notes: List[Dict],
    pdf_dir: Path,
    min_title_sim: float,
) -> Dict:
    """Apply the decision matrix. Returns a report-row dict (also carries _note/_dest internally)."""
    row = {k: "" for k in REPORT_FIELDS}
    row["inbox_file"] = path.name
    row["parsed_pmid"] = parsed.get("pmid") or ""
    row["_note"] = None
    row["_dest"] = None

    # PDF content (may be None if unreadable).
    if pdf is None:
        row["decision"] = "unreadable-pdf"
        row["confidence"] = ""
        row["note"] = "PyMuPDF could not open the file"
        return row
    row["doi_pdf"] = pdf.get("doi") or ""
    row["title_pdf"] = (pdf.get("title") or "")[:200]

    pmid = parsed.get("pmid")
    candidate: Optional[Dict] = None
    tier = ""

    # Tier 1: filename PMID -> note.
    if pmid and pmid in by_pmid:
        candidate = by_pmid[pmid]
        tier = "1"

    # Tier 2: content search (no/invalid PMID, or PMID matched no note).
    content_how = ""
    title_sim = 0.0
    author_match = False
    year_match = False
    if candidate is None:
        candidate, title_sim, author_match, year_match, content_how = best_content_match(
            pdf, parsed, notes, by_doi, min_title_sim
        )
        tier = "2"
    else:
        # We still compute content agreement to verify the Tier-1 candidate.
        title_sim = title_similarity(pdf.get("title"), candidate["title"])
        c_surname = surname_from_author_token(candidate["author"]) or candidate["author"].lower()
        f_surname = surname_from_author_token(parsed.get("author"))
        p_surname = pdf.get("author_surname") or ""
        author_match = bool(
            (f_surname and c_surname and (f_surname in c_surname or c_surname in f_surname))
            or (p_surname and c_surname and (p_surname in c_surname or c_surname in p_surname))
        )
        want_year = parsed.get("year") or pdf.get("year") or ""
        year_match = bool(want_year and candidate["year"] and want_year == candidate["year"])

    row["tier"] = tier
    row["title_sim"] = f"{title_sim:.3f}"
    row["author_match"] = "yes" if author_match else "no"
    row["year_match"] = "yes" if year_match else "no"

    if candidate is not None:
        row["matched_citekey"] = candidate["citekey"]
        row["doi_note"] = candidate["doi"] or ""
        row["title_note"] = (candidate["title"] or "")[:200]
        row["_note"] = candidate
        dest = pdf_dir / f"{candidate['citekey']}.pdf"
        row["_dest"] = dest
        row["dest_path"] = str(dest)

    pdf_doi = pdf.get("doi")
    note_doi = candidate["doi"] if candidate else None
    doi_agree = doi_related(pdf_doi, note_doi)
    doi_conflict = bool(pdf_doi and note_doi and not doi_agree)

    # --- Decision matrix ---
    if candidate is not None and tier == "1":
        # Filename PMID matched a note; verify with content. Positive corroboration (DOI agreement,
        # or a near-identical title with author + year) wins BEFORE a DOI mismatch forces a conflict,
        # because PDF-scraped DOIs are noisy — a genuine conflict needs the title to fail too.
        dest = pdf_dir / f"{candidate['citekey']}.pdf"
        if dest.exists():
            row["decision"], row["confidence"] = "DUP", "high"
            row["note"] = "note already has a PDF on disk"
        elif doi_agree:
            row["decision"], row["confidence"] = "CONFIRMED", "high"
            row["note"] = "PMID match + DOI agrees"
        elif title_sim >= HIGH_TITLE_SIM and author_match and year_match:
            row["decision"], row["confidence"] = "CONFIRMED", "high"
            row["note"] = "PMID match + near-identical title/author/year (DOI noisy or absent)"
        elif doi_conflict:
            row["decision"], row["confidence"] = "CONFLICT", ""
            row["note"] = "filename PMID matched a note but DOI disagrees and title not near-identical"
        elif pdf.get("title") and title_sim < min_title_sim and not (author_match and year_match):
            row["decision"], row["confidence"] = "CONFLICT", ""
            row["note"] = f"filename PMID matched a note but PDF title disagrees (title_sim {title_sim:.2f} < {min_title_sim})"
        else:
            row["decision"], row["confidence"] = "CONFIRMED", "medium"
            row["note"] = "PMID match (content weakly corroborating)"
        return row

    if candidate is not None and tier == "2":
        dest = pdf_dir / f"{candidate['citekey']}.pdf"
        if doi_agree:
            if dest.exists():
                row["decision"], row["confidence"] = "DUP", "high"
                row["note"] = "DOI content match but note already has a PDF"
            else:
                row["decision"], row["confidence"] = "RESOLVED-BY-CONTENT", "high"
                row["note"] = "DOI exact content match (no usable filename PMID)"
            return row
        if title_sim >= min_title_sim and author_match and year_match:
            conf = "high" if title_sim >= HIGH_TITLE_SIM else "medium"
            if dest.exists():
                row["decision"], row["confidence"] = "DUP", conf
                row["note"] = "title/author/year content match but note already has a PDF"
            else:
                row["decision"], row["confidence"] = "RESOLVED-BY-CONTENT", conf
                row["note"] = f"title_sim {title_sim:.2f} + author + year agree"
            return row

    # No confident note match -> a genuinely new paper.
    row["decision"], row["confidence"] = "NEW-PAPER", "low" if not pmid else "medium"
    if parsed.get("malformed_pmid"):
        row["note"] = "no note match; filename PMID token malformed"
    elif pmid:
        row["note"] = "no note match; filename PMID resolved no note and content found none"
    else:
        row["note"] = "no note match; no usable filename PMID"
    # Keep matched_citekey clearing for NEW-PAPER (the best fuzzy note was below gate).
    row["matched_citekey"] = ""
    row["_note"] = None
    row["_dest"] = None
    row["dest_path"] = ""
    return row


# --------------------------------------------------------------------------- #
# Apply actions
# --------------------------------------------------------------------------- #
def apply_decision(
    row: Dict,
    src_path: Path,
    parsed: Dict[str, Optional[str]],
    pdf: Optional[Dict[str, Optional[str]]],
    pdf_dir: Path,
    sources_dir: Path,
    ingested_dir: Path,
    review_dir: Path,
    dup_dir: Path,
    force: bool,
    stats: Dict[str, int],
) -> None:
    """Perform writes for a single decided row. Only called under --apply."""
    decision = row["decision"]

    if decision in ("CONFIRMED", "RESOLVED-BY-CONTENT"):
        note = row["_note"]
        dest = row["_dest"]
        if dest.exists() and not force:
            stats["pdf_skip_exists"] += 1
        else:
            try:
                shutil.copy2(src_path, dest)
                stats["pdf_copied"] += 1
            except Exception as e:
                print(f"  ! copy failed for {src_path.name}: {e}")
                stats["errors"] += 1
                return
        set_has_pdf_frontmatter(note["file"], True)
        _relocate(src_path, ingested_dir, stats, "ingested")
        return

    if decision == "NEW-PAPER":
        citekey = build_new_citekey(parsed, pdf)
        note_path = sources_dir / f"{citekey}.md"
        if note_path.exists():
            # Citekey collision with an existing note that the matcher didn't link — treat as
            # a review item rather than clobber.
            print(f"  ! NEW-PAPER citekey {citekey} already exists; routing to review")
            _relocate(src_path, review_dir, stats, "review")
            return
        meta, flagged = resolve_new_paper_meta(parsed, pdf)
        write_new_paper_stub(note_path, citekey, meta, parsed.get("pmid"), flagged)
        stats["stub_written"] += 1
        if flagged:
            stats["stub_flagged"] += 1
        dest = pdf_dir / f"{citekey}.pdf"
        if not (dest.exists() and not force):
            try:
                shutil.copy2(src_path, dest)
                stats["pdf_copied"] += 1
            except Exception as e:
                print(f"  ! copy failed for {src_path.name}: {e}")
                stats["errors"] += 1
        _relocate(src_path, ingested_dir, stats, "ingested")
        return

    if decision == "CONFLICT":
        _relocate(src_path, review_dir, stats, "review")
        return

    if decision == "DUP":
        _relocate(src_path, dup_dir, stats, "dup")
        return

    # not-a-pdf / unreadable-pdf: leave in place.


def _relocate(src_path: Path, dest_dir: Path, stats: Dict[str, int], label: str) -> None:
    dest_dir.mkdir(parents=True, exist_ok=True)
    target = dest_dir / src_path.name
    if target.exists():
        stats[f"{label}_skip"] = stats.get(f"{label}_skip", 0) + 1
        return
    try:
        shutil.move(str(src_path), str(target))
        stats[f"{label}_moved"] = stats.get(f"{label}_moved", 0) + 1
    except Exception as e:
        print(f"  ! move failed for {src_path.name}: {e}")
        stats["errors"] += 1


def build_new_citekey(parsed: Dict[str, Optional[str]], pdf: Optional[Dict]) -> str:
    """
    @Author_Year_TitleWords — first 2 title words, alnum only. Mirrors the corpus convention.
    Prefers filename-parsed author/year/title; falls back to PDF-extracted fields.
    """
    surname = surname_from_author_token(parsed.get("author"))
    if not surname and pdf:
        surname = pdf.get("author_surname") or ""
    surname = (surname or "Unknown").capitalize()
    year = parsed.get("year") or (pdf.get("year") if pdf else "") or "ND"
    slug = parsed.get("title_slug") or (pdf.get("title") if pdf else "") or "Untitled"
    # Split run-together CamelCase title slugs (ExploringHealthCare -> Exploring Health Care)
    # so the citekey takes the corpus's first-two-title-words form.
    spaced = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", slug)
    words = re.findall(r"[A-Za-z0-9]+", spaced)
    title_part = "_".join(words[:2]) if words else "Untitled"
    return f"@{surname}_{year}_{title_part}"


def resolve_new_paper_meta(
    parsed: Dict[str, Optional[str]], pdf: Optional[Dict]
) -> Tuple[Dict[str, Optional[str]], bool]:
    """
    Resolve authoritative metadata for a NEW-PAPER stub. PubMed esummary by PMID first; then
    Crossref by the PDF's embedded DOI; finally a filename/PDF fallback (flagged=True).
    """
    pmid = parsed.get("pmid")
    if pmid:
        meta = pubmed_esummary(pmid)
        time.sleep(RATE_LIMIT_DELAY)
        if meta and (meta.get("title") or meta.get("doi")):
            return meta, False

    pdf_doi = (pdf or {}).get("doi")
    if pdf_doi:
        meta = crossref_lookup(pdf_doi)
        time.sleep(RATE_LIMIT_DELAY)
        if meta and meta.get("title"):
            return meta, False

    # Fallback: parse from filename + whatever the PDF gave us. Flag for human verification.
    title_slug = parsed.get("title_slug") or ""
    title = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", title_slug).strip()
    fallback = {
        "title": title or (pdf or {}).get("title") or None,
        "author": surname_from_author_token(parsed.get("author")) or (pdf or {}).get("author_surname"),
        "year": parsed.get("year") or (pdf or {}).get("year"),
        "journal": None,
        "doi": pdf_doi,
    }
    return fallback, True


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    parser = argparse.ArgumentParser(
        description="Match inbox PDFs to source notes and ingest them (report-only unless --apply)."
    )
    parser.add_argument("--apply", action="store_true",
                        help="Perform writes (copies, frontmatter edits, stubs, moves). Default is report-only.")
    parser.add_argument("--limit", type=int, default=None, help="Process only the first N inbox files.")
    parser.add_argument("--only-has-pdf", action="store_true",
                        help="Run only the has_pdf backfill across all notes (report-only unless --apply).")
    parser.add_argument("--min-title-sim", type=float, default=DEFAULT_MIN_TITLE_SIM,
                        help=f"Fuzzy title-match threshold 0..1 (default {DEFAULT_MIN_TITLE_SIM}).")
    parser.add_argument("--force", action="store_true",
                        help="Overwrite existing dest PDFs in data/pdfs/.")
    args = parser.parse_args()

    project_root = Path(__file__).parent.parent
    sources_dir = project_root / "Discourse Graph" / "Sources"
    pdf_dir = project_root / "data" / "pdfs"
    inbox_dir = pdf_dir / "inbox"
    ingested_dir = inbox_dir / "_ingested"
    review_dir = inbox_dir / "_review"
    dup_dir = inbox_dir / "_dup"
    report_path = inbox_dir / "_match_report.csv"

    apply = args.apply
    print(f"Mode: {'APPLY (writing)' if apply else 'DRY-RUN (report only)'}")
    print(f"rapidfuzz: {'yes' if HAVE_RAPIDFUZZ else 'no (difflib fallback)'}; "
          f"PyMuPDF: {'yes' if fitz is not None else 'MISSING'}")

    # --only-has-pdf: just reconcile the flag and exit.
    if args.only_has_pdf:
        print("\nhas_pdf backfill across all notes...")
        stats = run_has_pdf_backfill(sources_dir, pdf_dir, apply)
        print("\n" + "=" * 60)
        print("has_pdf BACKFILL" + ("" if apply else " (dry run)"))
        print("=" * 60)
        print(f"notes with PDF (true):  {stats['true']}")
        print(f"notes missing PDF:      {stats['false']}")
        if apply:
            print(f"frontmatter added:      {stats.get('added', 0)}")
            print(f"frontmatter updated:    {stats.get('updated', 0)}")
            print(f"frontmatter unchanged:  {stats.get('unchanged', 0)}")
        else:
            print(f"would write/change:     {stats.get('would-write', 0)}")
        return

    if fitz is None:
        print("ERROR: PyMuPDF (fitz) is required to read PDF content. Install pymupdf.")
        return

    notes, by_pmid, by_doi = build_note_index(sources_dir)
    # Augment the DOI reverse lookup with _idmap.json (pubmed_id -> doi) so notes whose DOI lives
    # only in the idmap (not yet written to frontmatter) are still matchable by content DOI.
    idmap_path = pdf_dir / "_idmap.json"
    if idmap_path.exists():
        try:
            idmap = json.loads(idmap_path.read_text(encoding="utf-8"))
        except Exception:
            idmap = {}
        for pmid, rec in idmap.items():
            note = by_pmid.get(str(pmid))
            d = normalize_doi(rec.get("doi"))
            if note and d and d not in by_doi:
                by_doi[d] = note
    print(f"Indexed {len(notes)} notes ({len(by_pmid)} by PMID, {len(by_doi)} by DOI).")

    inbox_files = sorted(p for p in inbox_dir.iterdir() if p.is_file() and not p.name.startswith("_"))
    if args.limit:
        inbox_files = inbox_files[: args.limit]
    print(f"Scanning {len(inbox_files)} inbox files from {inbox_dir}\n")

    if apply:
        pdf_dir.mkdir(parents=True, exist_ok=True)

    report_rows: List[Dict] = []
    apply_stats = {
        "pdf_copied": 0, "pdf_skip_exists": 0, "stub_written": 0, "stub_flagged": 0,
        "ingested_moved": 0, "review_moved": 0, "dup_moved": 0, "errors": 0,
    }

    for idx, path in enumerate(inbox_files, 1):
        # Non-PDF extensions short-circuit.
        if path.suffix.lower() != ".pdf":
            row = {k: "" for k in REPORT_FIELDS}
            row["inbox_file"] = path.name
            row["decision"] = "not-a-pdf"
            row["note"] = f"non-PDF extension '{path.suffix}'"
            row["_note"] = None
            row["_dest"] = None
            report_rows.append(row)
            print(f"[{idx}/{len(inbox_files)}] {path.name}  -> not-a-pdf")
            continue

        parsed = parse_inbox_filename(path.name)
        pdf = read_pdf_content(path)  # None if unreadable
        row = decide_for_file(path, parsed, pdf, by_pmid, by_doi, notes, pdf_dir, args.min_title_sim)
        report_rows.append(row)
        print(f"[{idx}/{len(inbox_files)}] {path.name}  -> {row['decision']}"
              f" {('('+row['confidence']+')') if row['confidence'] else ''}"
              f" {row['matched_citekey']}")

        if apply:
            apply_decision(
                row, path, parsed, pdf, pdf_dir, sources_dir,
                ingested_dir, review_dir, dup_dir, args.force, apply_stats,
            )

    # --- Report (always) ---
    report_rows.sort(key=lambda r: (
        DECISION_RANK.get(r.get("decision", ""), 9),
        CONFIDENCE_RANK.get(r.get("confidence", ""), 9),
        r.get("inbox_file", ""),
    ))
    inbox_dir.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=REPORT_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(report_rows)

    # --- Summary ---
    buckets: Dict[str, int] = {}
    for r in report_rows:
        buckets[r["decision"]] = buckets.get(r["decision"], 0) + 1
    print("\n" + "=" * 60)
    print("SUMMARY" + ("" if apply else " (dry run — no writes except the report CSV)"))
    print("=" * 60)
    print(f"Inbox files scanned:   {len(report_rows)}")
    for decision in sorted(buckets, key=lambda d: DECISION_RANK.get(d, 9)):
        print(f"  {decision:<22}{buckets[decision]}")
    if apply:
        print("-" * 60)
        print(f"PDFs copied:            {apply_stats['pdf_copied']}")
        print(f"PDFs skipped (exists):  {apply_stats['pdf_skip_exists']}")
        print(f"New-paper stubs:        {apply_stats['stub_written']} ({apply_stats['stub_flagged']} flagged)")
        print(f"Moved -> _ingested:     {apply_stats['ingested_moved']}")
        print(f"Moved -> _review:       {apply_stats['review_moved']}")
        print(f"Moved -> _dup:          {apply_stats['dup_moved']}")
        print(f"Errors:                 {apply_stats['errors']}")
        # has_pdf reconciliation runs at the end so newly-ingested PDFs are reflected.
        print("\nReconciling has_pdf across all notes...")
        hp = run_has_pdf_backfill(sources_dir, pdf_dir, apply=True)
        print(f"  has_pdf true/false:   {hp['true']}/{hp['false']} "
              f"(added {hp.get('added', 0)}, updated {hp.get('updated', 0)})")
    print(f"\nReport: {report_path}")


if __name__ == "__main__":
    main()
