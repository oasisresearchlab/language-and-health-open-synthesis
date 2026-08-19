#!/usr/bin/env python3
"""Baseline characterization of the source corpus for the interventions review.

Answers: how many sources are plausibly in scope for a review of language-access
interventions, what kinds of interventions, and what study designs back them.

This is a HEURISTIC KEYWORD PASS, not coding. It reports the *shape* of what is
available so a review can be scoped. It is deliberately transparent and
deterministic so the numbers in
`docs/superpowers/specs/2026-08-18-interventions-review-design.md` can be
regenerated and audited. Its known error modes are documented in that spec.

Usage:  python3 utils/profile_corpus_interventions.py [--json out.json]
"""
from __future__ import annotations
import argparse, collections, glob, json, re, sys

SOURCES = "Discourse Graph/Sources/@*.md"
EVIDENCE = "Discourse Graph/Evidence/*.md"

# --- frontmatter ------------------------------------------------------------

def parse_frontmatter(path: str) -> dict:
    """Tolerant YAML-ish frontmatter reader.

    The corpus uses block scalars (`abstract: |`) and quoted multi-line values,
    which a strict parser chokes on; we only need top-level scalars here.
    """
    text = open(path, encoding="utf-8", errors="ignore").read()
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    body = text[3 : end if end > 0 else len(text)]
    out: dict[str, str] = {}
    key, buf = None, []
    for line in body.split("\n"):
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*):\s?(.*)$", line)
        if m and not line.startswith(" "):
            if key:
                out[key] = "\n".join(buf).strip()
            key, val = m.group(1), m.group(2)
            buf = [] if val.strip() in ("|", ">", "|-", ">-") else [val]
        elif key is not None:
            buf.append(line.strip())
    if key:
        out[key] = "\n".join(buf).strip()
    return {k: v.strip().strip('"') for k, v in out.items()}

# --- classifying the legacy `intervention` field ----------------------------
# Imported verbatim from a hand-filled spreadsheet column named "Intervention?",
# so it holds four different data types. We separate them rather than trust it.

RE_NEGATIVE = re.compile(r"^\s*(false|no|none|n/?a)\s*$", re.I)
RE_BARE_YES = re.compile(r"^\s*(true|yes)\s*$", re.I)
RE_DESIGN_LABEL = re.compile(
    r"^\s*(systematic review|review|narrative review|cross-?sectional review|"
    r"meta-?analysis|commentar\w*|perspectives?|case report|case and commentary|"
    r"analysis|commentaries/\s*perspectives\??)\s*$", re.I)
PASTED_CONCLUSION_CHARS = 180  # above this it is prose, not a name

def classify_legacy_field(value: str) -> str:
    v = (value or "").strip()
    if not v:                              return "absent"
    if RE_NEGATIVE.match(v):               return "explicit_no"
    if RE_BARE_YES.match(v):               return "bare_yes"
    if RE_DESIGN_LABEL.match(v):           return "design_label_misfiled"
    if len(v) > PASTED_CONCLUSION_CHARS:   return "pasted_conclusion"
    return "named_intervention"

# --- taxonomies (ordered; first match wins) ---------------------------------

INTERVENTION_TAXONOMY = [
    ("Machine / AI translation",
     r"machine translat|google translat|translation (app|tool|system)|itranslate|canopy|"
     r"radtranslate|s-minds|speech translat|automatic translat|voice-enabled"),
    ("Digital health / mHealth",
     r"chatbo[tx]|\bsms\b|text messag|mobile app|mhealth|smartphone|patient portal|telehealth|"
     r"telemedicine|web-based|econsent|\bapp\b|digital"),
    ("Professional interpreting", r"interpret"),
    ("Language-concordant staff",
     r"bilingual (clinic|provider|physician|staff|team)|language[- ](concordant|congruent)|"
     r"spanish-(proficient|speaking) (clinician|physician)|concordant care|language assistance"),
    ("Translated written material",
     r"translated (form|document|material|instruction|consent)|written material|consent form|"
     r"pictogram|picture board|communication board|fotonovela|brochure|booklet|label|handbook"),
    ("Multimedia / video education", r"video|audio|film|multimedia|animation|instructional"),
    ("Provider education / training",
     r"curricul|training|educat|course|workshop|module|lecture|teach|medical spanish|"
     r"elective|simulation"),
    ("System / policy / workflow",
     r"protocol|workflow|policy|documentation|identification|staffing|quality improvement|"
     r"\bqi\b|huddle|rounds|discharge|scheduling|programme|program\b|service|initiative|"
     r"bundle|registry|medicare"),
    ("Community / navigation",
     r"navigator|promotora|doula|community health|coach|peer|advocate"),
]

DESIGN_TAXONOMY = [
    ("Systematic review / meta-analysis", r"systematic review|meta-?analys|scoping review"),
    ("Narrative review / commentary",
     r"narrative review|\breview\b|commentar|perspective|editorial|viewpoint"),
    ("RCT", r"randomi[sz]ed (controlled )?(clinical )?trial|\brct\b|randomly assigned|randomi[sz]ed to"),
    ("Quasi-experimental / pre-post / QI",
     r"pre-?post|before[- ]and[- ]after|quasi-?experimental|quality improvement|\bqi\b|"
     r"plan-do-study-act|\bpdsa\b|interrupted time series|implementation"),
    ("Prospective cohort", r"prospective(ly)? (cohort|stud|enroll|recruit)|prospective"),
    ("Retrospective / database",
     r"retrospective|chart review|medical record review|administrative (data|claim)|"
     r"database|registry|secondary analysis"),
    ("Qualitative",
     r"qualitative|semi-?structured interview|focus group|thematic analys|grounded theory|content analys"),
    ("Cross-sectional / survey", r"cross-?sectional|survey|questionnaire"),
    ("Mixed methods", r"mixed[- ]method"),
    ("Case report", r"case report|case stud"),
]

# Abstract language suggesting an intervention even when the legacy field is
# empty or negative. Defines the "recoverable pool".
RE_INTERVENTION_SIGNAL = re.compile(
    r"\bintervention\b|implement|pilot|trial of|program(me)?\b|initiative|"
    r"we (developed|designed|introduced|deployed|tested|evaluated)|training|curricul|toolkit|protocol",
    re.I)

def first_match(taxonomy, text: str, default: str):
    for label, pattern in taxonomy:
        if re.search(pattern, text, re.I):
            return label
    return default

def all_matches(taxonomy, text: str):
    return [label for label, pattern in taxonomy if re.search(pattern, text, re.I)]

# --- main -------------------------------------------------------------------

def citekey(path: str):
    m = re.search(r"(@[A-Za-z0-9_]+)", path.split("/")[-1])
    return m.group(1) if m else None

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", help="also write per-source records here")
    args = ap.parse_args()

    files = sorted(glob.glob(SOURCES))
    if not files:
        print(f"no sources matched {SOURCES!r} — run from the repo root", file=sys.stderr)
        return 1

    extracted = set()
    for f in glob.glob(EVIDENCE):
        extracted |= set(re.findall(r"@[A-Za-z0-9_]+",
                                    open(f, encoding="utf-8", errors="ignore").read()))

    records, legacy_buckets = [], collections.Counter()
    for path in files:
        fm = parse_frontmatter(path)
        legacy = (fm.get("intervention") or "").strip()
        bucket = classify_legacy_field(legacy)
        legacy_buckets[bucket] += 1
        abstract = fm.get("abstract") or ""
        named = bucket == "named_intervention"
        design_hits = all_matches(DESIGN_TAXONOMY, f"{abstract} {legacy if named else ''}")
        records.append({
            "citekey": citekey(path),
            "legacy_bucket": bucket,
            "named_intervention": legacy if named else None,
            "intervention_type": first_match(INTERVENTION_TAXONOMY, legacy, "Other / unclassified") if named else None,
            "design": design_hits[0] if design_hits else "Undetermined",
            "design_ambiguous": len(design_hits) > 1,
            "has_abstract": bool(abstract.strip()),
            "recoverable": (not named) and bool(RE_INTERVENTION_SIGNAL.search(abstract)),
            "extracted": citekey(path) in extracted,
            "has_pdf": (fm.get("has_pdf") or "").strip().lower() == "true",
        })

    n = len(records)
    named = [r for r in records if r["named_intervention"]]
    pool = [r for r in records if r["recoverable"]]

    print(f"sources parsed: {n}\n")
    print("=== what the legacy `intervention` field holds ===")
    for k, c in legacy_buckets.most_common():
        print(f"  {c:5d}  {k}")

    print("\n=== available pool for an interventions review ===")
    print(f"  named intervention in legacy field   {len(named):5d}")
    print(f"  + abstract reads intervention-like   {len(pool):5d}   (recoverable, needs coding)")
    print(f"  = plausible upper bound              {len(named)+len(pool):5d}  of {n}")
    print(f"\n  already extracted into the graph:  "
          f"{sum(r['extracted'] for r in named)} of {len(named)} named, "
          f"{sum(r['extracted'] for r in pool)} of {len(pool)} recoverable")
    print(f"  named with a retrievable PDF:      {sum(r['has_pdf'] for r in named)} of {len(named)}")

    print("\n=== intervention type (named only) ===")
    for k, c in collections.Counter(r["intervention_type"] for r in named).most_common():
        print(f"  {c:5d}  {k}")

    print("\n=== study design (all sources, inferred from abstract) ===")
    for k, c in collections.Counter(r["design"] for r in records).most_common():
        print(f"  {c:5d}  {k}")

    print("\n=== intervention type x study design (named only) ===")
    designs = ["RCT", "Quasi-experimental / pre-post / QI", "Prospective cohort",
               "Retrospective / database", "Cross-sectional / survey", "Qualitative",
               "Narrative review / commentary", "Systematic review / meta-analysis",
               "Undetermined"]
    short = ["RCT", "QI/prepost", "ProspCoh", "Retro", "XSect", "Qual", "Review", "SysRev", "Undet"]
    tab = collections.defaultdict(collections.Counter)
    for r in named:
        tab[r["intervention_type"]][r["design"]] += 1
    print("  %-30s" % "" + "".join(f"{h:>11s}" for h in short))
    for itype in sorted(tab, key=lambda k: -sum(tab[k].values())):
        cells = "".join(f"{tab[itype][d] or '.':>11}" for d in designs)
        print("  %-30s" % itype[:30] + cells)

    amb = sum(r["design_ambiguous"] for r in records)
    no_abs = sum(not r["has_abstract"] for r in records)
    undet_with_abs = sum(1 for r in records if r["design"] == "Undetermined" and r["has_abstract"])
    print("\n=== known limits of this pass ===")
    print(f"  design matched >1 pattern (resolved by ordering): {amb} ({100*amb//n}%)")
    print(f"  no abstract at all:                               {no_abs}")
    print(f"  has abstract but design undetermined:             {undet_with_abs}")
    print(f"  intervention type 'Other / unclassified':         "
          f"{sum(1 for r in named if r['intervention_type']=='Other / unclassified')} of {len(named)}")

    if args.json:
        json.dump(records, open(args.json, "w"), indent=1)
        print(f"\nwrote {args.json}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
