#!/usr/bin/env python3
"""
validate_fulltext.py — identity gate: flag fetched text/PDFs that are NOT the paper they claim to be.

WHAT
    Detects wrong-paper and review-substitution files (a known failure of the PMID->PMC fetch: ~43%
    of data/fulltext/ is the wrong paper) so extraction grounds only in validated sources. Same logic
    serves both the .txt corpus and the downloaded PDFs (--pdf).

HOW
    The source note's abstract is trusted (curated CSV); the fetched body is not. Embed the abstract,
    embed the body in chunks, and take the best-matching chunk's cosine similarity (all-MiniLM-L6-v2).
    A correct body elaborates the same study (high maxSim); a wrong paper or a review that merely
    cites it scores lower. Verdict: OK if maxSim >= --ok, BAD if < --bad, else SUSPECT.

INPUT   data/fulltext/*.txt (default) or data/pdfs/@*.pdf (--pdf, text via PyMuPDF); matching
        Discourse Graph/Sources/@<citekey>.md frontmatter (abstract).
OUTPUT  data/fulltext_validation.tsv (or data/pdf_validation.tsv with --pdf), sorted worst-first
        (citekey, maxSim, top3, verdict) + a console summary. Read-only over the corpus.

INVARIANTS / NOTES
    - Calibration (2026-06-03): GOOD 0.78-0.84, BAD/review 0.55-0.69 -> default --ok 0.74 / --bad 0.66.
      The threshold is the whole game: thresholds are corpus-calibrated, not universal.
    - Files < 200 chars, no source note, or abstract < 80 chars are skipped / marked NO-ABSTRACT.
    - This flags identity, not quality; SUSPECT/BAD need a manual check or refetch_by_title.py.

USAGE
    python3 utils/validate_fulltext.py
    python3 utils/validate_fulltext.py --pdf
    python3 utils/validate_fulltext.py --ok 0.74 --bad 0.66 --limit 50

Design decisions, limitations, and the "smarter later" roadmap: Pipeline/validate_fulltext.md
"""

import os
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

import argparse
import re
from pathlib import Path

import numpy as np
import yaml


def frontmatter(path: Path) -> dict:
    c = path.read_text(encoding="utf-8", errors="ignore")
    m = re.match(r"^---\s*\n(.*?)\n---", c, re.DOTALL)
    if not m:
        return {}
    try:
        return yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        return {}


def chunks(text: str, size: int = 700, cap_chars: int = 60000):
    text = re.sub(r"\s+", " ", text)[:cap_chars]
    return [text[i:i + size] for i in range(0, len(text), size)] or [""]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ok", type=float, default=0.74, help="maxSim >= this → OK")
    ap.add_argument("--bad", type=float, default=0.66, help="maxSim < this → BAD")
    ap.add_argument("--limit", type=int, default=None, help="Only check first N files (debug).")
    ap.add_argument("--pdf", action="store_true", help="Validate data/pdfs/*.pdf instead of full text.")
    args = ap.parse_args()

    root = Path(__file__).parent.parent
    ft_dir = root / "data" / "fulltext"
    src_dir = root / "Discourse Graph" / "Sources"

    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("all-MiniLM-L6-v2")

    if args.pdf:
        files = sorted((root / "data" / "pdfs").glob("@*.pdf"))
        out_name = "pdf_validation.tsv"
    else:
        files = sorted(ft_dir.glob("*.txt"))
        out_name = "fulltext_validation.tsv"
    if args.limit:
        files = files[: args.limit]

    def read_text(f: Path) -> str:
        if f.suffix == ".pdf":
            try:
                import fitz
                doc = fitz.open(f)
                t = "".join(p.get_text() for p in doc)
                doc.close()
                return t
            except Exception:
                return ""
        return f.read_text(encoding="utf-8", errors="ignore")

    rows = []
    skipped = 0
    for i, f in enumerate(files, 1):
        t = read_text(f)
        if len(t) < 200:
            skipped += 1
            continue
        # source note: full-text stem has no @, pdf stem already has @
        src = src_dir / (f"{f.stem}.md" if f.stem.startswith("@") else f"@{f.stem}.md")
        if not src.exists():
            skipped += 1
            continue
        ab = str(frontmatter(src).get("abstract", "")).strip()
        if len(ab) < 80:
            rows.append((f.stem, -1.0, -1.0, "NO-ABSTRACT"))
            continue
        av = model.encode([ab[:2000]], normalize_embeddings=True)[0]
        cv = model.encode(chunks(t), normalize_embeddings=True, batch_size=64)
        sims = cv @ av
        mx = float(sims.max())
        top3 = float(np.sort(sims)[-3:].mean())
        verdict = "OK" if mx >= args.ok else "BAD" if mx < args.bad else "SUSPECT"
        rows.append((f.stem, mx, top3, verdict))
        if i % 50 == 0:
            print(f"  checked {i}/{len(files)}")

    rows.sort(key=lambda r: (r[1] if r[1] >= 0 else 99))
    out = root / "data" / out_name
    with out.open("w", encoding="utf-8") as fh:
        fh.write("citekey\tmaxSim\ttop3\tverdict\n")
        for ck, mx, t3, v in rows:
            fh.write(f"{ck}\t{mx:.3f}\t{t3:.3f}\t{v}\n")

    from collections import Counter
    counts = Counter(r[3] for r in rows)
    print(f"\nValidated {len(rows)} full-text files (skipped {skipped} empty/no-source)")
    for v in ["OK", "SUSPECT", "BAD", "NO-ABSTRACT"]:
        if counts.get(v):
            print(f"  {v:12} {counts[v]}")
    bad = [r for r in rows if r[3] in ("BAD", "SUSPECT")]
    print(f"\nWorst {min(25, len(bad))} (likely wrong-paper / review):")
    for ck, mx, t3, v in bad[:25]:
        print(f"  [{v:7} {mx:.2f}] {ck}")
    print(f"\nReport: {out}")


if __name__ == "__main__":
    main()
