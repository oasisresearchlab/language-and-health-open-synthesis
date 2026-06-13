#!/usr/bin/env python3
"""
cluster_queue.py — seed the extraction QUEUE with provisional factor×outcome buckets.

WHAT
    Group empirical papers into provisional EP/CLM buckets so discourse-node extraction can
    proceed cluster-by-cluster (see Skill.md / plans/extracting-discourse-nodes.md). PROPOSE,
    don't commit — no EP/CLM node files are written.

HOW
    Hybrid matrix + embeddings:
    1. MATRIX — from each source's `factors` + `outcomes_extracted` frontmatter, classify each
       term against a curated FACTOR vocab and OUTCOME vocab, and form factor×outcome cells (the
       seed buckets). Because this corpus stores some outcomes inside `factors`, outcome terms are
       read from BOTH fields.
    2. EMBEDDINGS — embed each paper (title+abstract+keywords) with sentence-transformers
       (all-MiniLM-L6-v2). Per cell: score coherence (mean cosine to centroid) and expand it with
       untagged-but-similar papers above --expand-threshold.
    3. EMERGENT (opt-in, --emergent-k) — KMeans-cluster papers with no recognised factor/outcome
       and label clusters by top TF-IDF terms.

INPUT   Discourse Graph/Sources/@*.md (has_empirical_findings + factors/outcomes_extracted/title/
        abstract/keywords frontmatter).
OUTPUT  Extraction Queue.md (vault root, human checklist) + data/queue.json (structured).

INVARIANTS / NOTES
    - Propose-don't-commit: emits a reviewable checklist only; the human promotes buckets to nodes.
    - MATRIX is the precision driver; embedding coherence and "suggested" papers are weak signals
      in this uniformly LEP-topical corpus (see the design note).
    - Emergent KMeans is OFF by default — it has segfaulted under the anaconda MKL/OpenMP duplicate
      runtime; the KMP_DUPLICATE_LIB_OK / OMP_NUM_THREADS guards above mitigate it.
    - --no-embeddings runs a fast matrix-only (keyword) pass.

USAGE
    python3 utils/cluster_queue.py                       # full run
    python3 utils/cluster_queue.py --top 15 --min-papers 3
    python3 utils/cluster_queue.py --expand-threshold 0.45
    python3 utils/cluster_queue.py --no-embeddings       # matrix-only (keyword fallback)

Design decisions, limitations, and the "smarter later" roadmap: Pipeline/cluster_queue.md
"""

import os
# Guard against the anaconda MKL/OpenMP duplicate-runtime segfault (torch + sklearn).
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

import numpy as np
import yaml

# --------------------------------------------------------------------------- #
# Controlled vocabulary (canonical -> aliases). Seeded from Variables.md; extend as needed.
# --------------------------------------------------------------------------- #
FACTOR_VOCAB: Dict[str, List[str]] = {
    "Limited English Proficiency (LEP)": ["limited english proficiency", "lep"],
    "Language discordance": ["language discordance", "discordance"],
    "Language concordance": ["language concordance", "concordance"],
    "Interpretation services": ["interpretation services", "interpreting services", "interpreter"],
    "Bilingual provider": ["bilingual provider", "bilingual clinician", "concordant provider"],
    "Machine translation / AI": ["machine translation", "automated translation", "ai translation"],
}
OUTCOME_VOCAB: Dict[str, List[str]] = {
    "Diagnosis accuracy": ["diagnosis accuracy", "diagnostic accuracy"],
    "Hospital stay length": ["hospital stay length", "length of stay", "los"],
    "Readmissions / recurrence": ["readmission", "recurrence", "likelihood of recurrence"],
    "Treatment adherence": ["treatment adherence", "adherence", "compliance"],
    "Physician trust": ["physician trust", "trust"],
    "Sense of empowerment": ["sense of empowerment", "empowerment"],
    "Physician time/effort": ["physician time/effort", "physician time", "provider time", "time/effort"],
    "Malpractice": ["malpractice"],
    "No-shows": ["no show", "no-show", "missed appointment"],
}


def _build_lookup(vocab: Dict[str, List[str]]) -> Dict[str, str]:
    lut = {}
    for canon, aliases in vocab.items():
        lut[canon.lower()] = canon
        for a in aliases:
            lut[a.lower()] = canon
    return lut


FACTOR_LUT = _build_lookup(FACTOR_VOCAB)
OUTCOME_LUT = _build_lookup(OUTCOME_VOCAB)


def classify(term: str) -> Tuple[Optional[str], Optional[str]]:
    """Map a labeled term to (canonical_factor, canonical_outcome); either may be None."""
    t = str(term).strip().lower()
    if not t:
        return None, None
    factor = FACTOR_LUT.get(t)
    outcome = OUTCOME_LUT.get(t)
    if factor is None and outcome is None:  # substring fallback
        for alias, canon in FACTOR_LUT.items():
            if alias in t:
                factor = canon
                break
        for alias, canon in OUTCOME_LUT.items():
            if alias in t:
                outcome = canon
                break
    return factor, outcome


# --------------------------------------------------------------------------- #
# Loading
# --------------------------------------------------------------------------- #
def extract_frontmatter(file_path: Path) -> Dict:
    content = file_path.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if not m:
        return {}
    try:
        return yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        return {}


def paper_text(fm: Dict) -> str:
    parts = [str(fm.get(k, "")) for k in ("title", "abstract", "keywords", "outcomes")]
    return " ".join(p for p in parts if p)


def load_sources(sources_dir: Path, require_pdf: bool = False) -> List[Dict]:
    papers = []
    for f in sorted(sources_dir.glob("@*.md")):
        fm = extract_frontmatter(f)
        if not fm.get("has_empirical_findings", False):
            continue
        if require_pdf and fm.get("has_pdf") is not True:
            continue
        citekey = str(fm.get("citekey", f.stem)).replace('"', "").strip()
        labeled = []
        for key in ("factors", "outcomes_extracted"):
            val = fm.get(key) or []
            if isinstance(val, str):
                val = [val]
            labeled.extend(val)
        factors: Set[str] = set()
        outcomes: Set[str] = set()
        for term in labeled:
            fct, out = classify(term)
            if fct:
                factors.add(fct)
            if out:
                outcomes.add(out)
        papers.append({
            "citekey": citekey,
            "title": str(fm.get("title", "")),
            "text": paper_text(fm),
            "factors": factors,
            "outcomes": outcomes,
        })
    return papers


# --------------------------------------------------------------------------- #
# Embeddings
# --------------------------------------------------------------------------- #
def embed(texts: List[str]) -> Optional[np.ndarray]:
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")
        emb = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)
        return np.asarray(emb)
    except Exception as e:
        print(f"  embeddings unavailable ({e}); matrix-only mode")
        return None


def cos(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    return float(np.dot(a, b) / (na * nb)) if na and nb else 0.0


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser(description="Seed the extraction queue (provisional EP/CLM buckets).")
    ap.add_argument("--top", type=int, default=20, help="Max buckets to list.")
    ap.add_argument("--min-papers", type=int, default=2, help="Min tagged papers for a factor×outcome bucket.")
    ap.add_argument("--expand-threshold", type=float, default=0.45, help="Centroid-similarity cutoff for suggested (untagged) papers.")
    ap.add_argument("--max-suggest", type=int, default=8, help="Max embedding-suggested papers per bucket.")
    ap.add_argument("--emergent-k", type=int, default=0, help="KMeans clusters for unmapped papers (0 = skip; opt-in).")
    ap.add_argument("--no-embeddings", action="store_true")
    ap.add_argument("--require-pdf", action="store_true",
                    help="Only cluster papers that have an ingested PDF (has_pdf:true) — the extractable set.")
    args = ap.parse_args()

    root = Path(__file__).parent.parent
    sources_dir = root / "Discourse Graph" / "Sources"
    papers = load_sources(sources_dir, require_pdf=args.require_pdf)
    print(f"Loaded {len(papers)} empirical papers from {sources_dir}"
          f"{' (PDF-backed only)' if args.require_pdf else ''}")
    idx = {p["citekey"]: i for i, p in enumerate(papers)}

    emb = None if args.no_embeddings else embed([p["text"] for p in papers])

    # 1) factor×outcome cells from tags
    cells: Dict[Tuple[str, str], Set[str]] = defaultdict(set)
    for p in papers:
        for fct in p["factors"]:
            for out in p["outcomes"]:
                cells[(fct, out)].add(p["citekey"])

    buckets = []
    for (fct, out), tagged in cells.items():
        if len(tagged) < args.min_papers:
            continue
        b = {
            "factor": fct, "outcome": out,
            "tagged": sorted(tagged), "suggested": [],
            "coherence": None,
        }
        if emb is not None:
            members = [idx[c] for c in tagged]
            centroid = emb[members].mean(axis=0)
            # coherence = mean cosine of members to centroid
            b["coherence"] = round(float(np.mean([cos(emb[m], centroid) for m in members])), 3)
            # expand: untagged papers near the centroid
            sims = emb @ centroid / (np.linalg.norm(emb, axis=1) * np.linalg.norm(centroid) + 1e-9)
            order = np.argsort(-sims)
            for j in order:
                ck = papers[j]["citekey"]
                if ck in tagged:
                    continue
                if sims[j] < args.expand_threshold:
                    break
                b["suggested"].append({"citekey": ck, "sim": round(float(sims[j]), 3)})
                if len(b["suggested"]) >= args.max_suggest:
                    break
        buckets.append(b)

    # rank: tagged count, then coherence
    buckets.sort(key=lambda b: (len(b["tagged"]), b["coherence"] or 0), reverse=True)
    buckets = buckets[: args.top]

    # 2) emergent clusters from unmapped papers
    emergent = []
    unmapped = [i for i, p in enumerate(papers) if not p["factors"] or not p["outcomes"]]
    if emb is not None and args.emergent_k and len(unmapped) >= args.emergent_k:
        try:
            from sklearn.cluster import KMeans
            from sklearn.feature_extraction.text import TfidfVectorizer
            sub = emb[unmapped]
            km = KMeans(n_clusters=args.emergent_k, random_state=42, n_init=10).fit(sub)
            tfidf = TfidfVectorizer(max_features=2000, stop_words="english")
            X = tfidf.fit_transform([papers[i]["text"] for i in unmapped])
            get_names = getattr(tfidf, "get_feature_names_out", None) or tfidf.get_feature_names
            terms = np.array(get_names())
            for k in range(args.emergent_k):
                members = [unmapped[j] for j, lab in enumerate(km.labels_) if lab == k]
                if len(members) < args.min_papers:
                    continue
                rows = [j for j, lab in enumerate(km.labels_) if lab == k]
                top_terms = terms[np.asarray(X[rows].mean(axis=0)).ravel().argsort()[::-1][:8]].tolist()
                emergent.append({
                    "label": ", ".join(top_terms),
                    "papers": [papers[m]["citekey"] for m in members][:15],
                    "size": len(members),
                })
            emergent.sort(key=lambda c: c["size"], reverse=True)
        except Exception as e:
            print(f"  emergent clustering skipped ({e})")
            emergent = []

    # ---- write JSON (gitignored data/) ----
    (root / "data").mkdir(exist_ok=True)
    title_of = {p["citekey"]: p["title"] for p in papers}
    (root / "data" / "queue.json").write_text(
        json.dumps({"buckets": buckets, "emergent": emergent}, indent=2), encoding="utf-8")

    # ---- write human checklist (vault root, tracked) ----
    lines = [
        "# Extraction Queue (proposal)",
        "",
        "> Generated by `utils/cluster_queue.py`. Provisional factor→outcome buckets to focus extraction.",
        "> **Propose, don't commit:** review/edit before promoting any bucket to real EP/CLM nodes.",
        "",
        "## Factor → Outcome buckets",
        "",
    ]
    for n, b in enumerate(buckets, 1):
        coh = f" · coherence {b['coherence']}" if b["coherence"] is not None else ""
        lines.append(f"### {n}. {b['factor']} → {b['outcome']}  ({len(b['tagged'])} tagged{coh})")
        lines.append("")
        lines.append(f"- [ ] **Provisional EP:** _{b['factor']} is associated with {b['outcome'].lower()}_")
        lines.append("- Tagged papers:")
        for ck in b["tagged"]:
            lines.append(f"    - [[{ck}]] — {title_of.get(ck,'')[:90]}")
        if b["suggested"]:
            lines.append("- Embedding-suggested (untagged, verify):")
            for s in b["suggested"]:
                lines.append(f"    - [[{s['citekey']}]] (sim {s['sim']}) — {title_of.get(s['citekey'],'')[:80]}")
        lines.append("")
    if emergent:
        lines += ["## Emergent clusters (unmapped papers)", ""]
        for n, c in enumerate(emergent, 1):
            lines.append(f"### E{n}. {c['label']}  ({c['size']} papers)")
            for ck in c["papers"]:
                lines.append(f"    - [[{ck}]] — {title_of.get(ck,'')[:80]}")
            lines.append("")
    (root / "Extraction Queue.md").write_text("\n".join(lines), encoding="utf-8")

    # ---- summary ----
    print(f"\nBuckets (≥{args.min_papers} tagged): {len(buckets)} shown")
    for b in buckets[:10]:
        print(f"  {len(b['tagged']):3}  {b['factor']} → {b['outcome']}"
              f"  (+{len(b['suggested'])} suggested, coh {b['coherence']})")
    if emergent:
        print(f"Emergent clusters: {len(emergent)}")
    print("\nWrote: Extraction Queue.md  +  data/queue.json")


if __name__ == "__main__":
    main()
