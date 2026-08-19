#!/usr/bin/env python3
"""Stage 3: deterministically merge refined intervention labels into a two-level spine.

Stage 2 labels still contain near-duplicates ("professional interpreting" /
"professional interpreting services" / "professional medical interpreting"). This
collapses them with a stopword-stripped normal form, then assigns each cluster to a
mechanism family. Fully deterministic and auditable — no model call.

Usage: python3 utils/cluster_interventions.py [--json out.json]
"""
from __future__ import annotations
import argparse, collections, json, re, sys

REFINED = "data/coding/refined.jsonl"

# Words that carry no distinguishing signal in an intervention label.
STOP = {"service","services","program","programme","intervention","interventions","system",
        "systems","tool","tools","model","models","approach","strategy","professional",
        "medical","clinical","care","based","use","using","for","of","and","the","a","an",
        "with","in","to","patient","patients"}

def norm(label: str) -> str:
    toks = re.findall(r"[a-z]+", (label or "").lower())
    # crude singularisation so "materials"/"material" agree
    toks = [t[:-1] if len(t) > 4 and t.endswith("s") and not t.endswith("ss") else t for t in toks]
    STEM = {"interpreting":"interpret","interpreter":"interpret","interpretation":"interpret",
            "interpreters":"interpret","translated":"translat","translation":"translat",
            "translating":"translat","training":"train","trained":"train","education":"educat",
            "educational":"educat","concordant":"concord","concordance":"concord"}
    toks = [STEM.get(t, t) for t in toks]
    keep = [t for t in toks if t not in STOP]
    return " ".join(sorted(set(keep))) or " ".join(sorted(set(toks)))

# Mechanism families, tested most-specific first.
FAMILY = [
 ("A. Interpreting services",      r"interpret"),
 ("B. Translation of text/speech", r"translat|machine|chatbot|speech|multilingual (audio|conversational)"),
 ("C. Language-concordant care",   r"concordan|congruent|bilingual|language.?matched|spanish.speaking clinician"),
 ("D. Patient-facing materials",   r"video|material|leaflet|handbook|booklet|pictogram|label|"
                                   r"visual|audio|education(al)? (video|material)|prompt"),
 ("E. Workforce capability",       r"train|educat|curricul|course|workshop|simulat|certif|"
                                   r"competen|skill|proficiency"),
 ("F. Service delivery redesign",  r"navigat|workflow|policy|protocol|scheduling|screening|"
                                   r"coordination|redesign|integration|consent|telehealth|"
                                   r"telemedicine|advisory|incentive|access|"
                                   r"language service|linguistic|multilingual|language-?appropriate|"
                                   r"language-?discordant|call light|emergency communication"),
]
def family(label: str):
    for name, pat in FAMILY:
        if re.search(pat, label, re.I):
            return name
    return "G. Unassigned"

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--json"); a = ap.parse_args()
    rows = [json.loads(l) for l in open(REFINED)]
    rows = [r for r in rows if "error" not in r and r.get("intervention_label")]

    in_scope  = [r for r in rows if r.get("acts_on_language_barrier") is not False]
    out_scope = [r for r in rows if r.get("acts_on_language_barrier") is False]
    clusters = collections.defaultdict(list)
    for r in in_scope:
        clusters[norm(r["intervention_label"])].append(r)

    # canonical name = most common surface form in the cluster
    out = []
    for key, members in clusters.items():
        surface = collections.Counter(m["intervention_label"].strip().lower() for m in members)
        canon = surface.most_common(1)[0][0]
        out.append({"canonical": canon, "n": len(members),
                    "family": family(canon),
                    "variants": sorted(surface),
                    "citekeys": [m["citekey"] for m in members]})
    out.sort(key=lambda c: (-c["n"], c["canonical"]))

    print(f"records: {len(rows)}   acts-on-language-barrier: {len(in_scope)}   "
          f"clinical-service-for-LEP (excluded here): {len(out_scope)}")
    print(f"distinct labels before merge: {len({r['intervention_label'].strip().lower() for r in rows})}")
    print(f"clusters after merge:         {len(out)}")
    print(f"singleton clusters:           {sum(1 for c in out if c['n']==1)}\n")

    print("=== FAMILY totals ===")
    fam = collections.Counter()
    for c in out: fam[c["family"]] += c["n"]
    for k in sorted(fam): print(f"  {fam[k]:4d}  {k}")

    print("\n=== clusters with n>=3 ===")
    for c in out:
        if c["n"] < 3: continue
        extra = f"   <- merged {len(c['variants'])} variants" if len(c["variants"]) > 1 else ""
        print(f"  {c['n']:4d}  [{c['family'][0]}] {c['canonical']}{extra}")

    if a.json:
        json.dump(out, open(a.json, "w"), indent=1); print(f"\nwrote {a.json}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
