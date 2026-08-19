#!/usr/bin/env python3
"""Stage 2: re-derive intervention labels for the in-scope set, with facets split out.

Stage 1 (`utils/code_interventions.py`) produced near-unique free-text labels — 234
distinct across 244 papers — because each label packed modality, population and setting
into one phrase. This stage extracts those as SEPARATE fields and asks for a deliberately
general label, so the label space converges and becomes clusterable.

It also asks the model to judge whether the intervention acts on the LANGUAGE BARRIER
itself, versus being a clinical service merely delivered to LEP patients — the scope
boundary that affects ~33 papers.

Input:  the in-scope set derived from data/coding/*.jsonl
Output: JSONL, resumable.

Usage:
  python3 utils/refine_interventions.py --out data/coding/refined.jsonl
  python3 utils/refine_interventions.py --limit 5 --out /tmp/smoke2.jsonl
"""
from __future__ import annotations
import argparse, concurrent.futures as cf, glob, importlib.util, json, os, re, subprocess, sys, threading, time

MODEL = "claude-haiku-4-5"

SYSTEM = """You are refining the classification of a language-access intervention already
identified in a biomedical abstract.

Return ONLY a JSON object with exactly these keys:

  intervention_label   string. A SHORT CANONICAL NOUN PHRASE for the intervention, 2-4 words.
                       CRITICAL: use the most GENERAL phrase that still identifies the kind of
                       intervention. Do NOT put the modality, the language, the patient
                       population, the clinical setting, or the specialty into this label —
                       those are separate fields below. Prefer reusing an obvious common phrase
                       over inventing a precise one. Good: "professional interpreting",
                       "interpreter training", "translated patient materials", "bilingual
                       clinician care". Bad: "telephone interpreting for Spanish-speaking
                       oncology patients".

  modality             exactly one of: "in_person", "telephone", "video_remote",
                       "digital_async", "written_material", "mixed", "not_stated".
                       "mixed" only if the study deliberately spans several. "not_stated" if
                       the abstract does not say — do not guess.

  facing               array, one or more of: "patient", "clinician", "interpreter",
                       "organization". Who does the intervention act ON? A training course for
                       doctors is ["clinician"]. A translated leaflet is ["patient"]. A
                       scheduling system is ["organization"]. A huddle protocol between
                       interpreters and clinicians is ["clinician","interpreter"].

  multi_component      boolean. Does it bundle genuinely distinct mechanisms (e.g. training
                       AND a new workflow)?
  components           array of short phrases naming each mechanism if multi_component, else [].

  acts_on_language_barrier
                       boolean. TRUE if the intervention's mechanism addresses the language
                       barrier itself (interpreting, translation, concordant care, language
                       training, translated materials). FALSE if it is a clinical or social
                       service merely DELIVERED TO limited-English-proficiency patients
                       (e.g. a depression care-management programme, group prenatal visits,
                       cancer-screening navigation) where language is the population
                       descriptor rather than the mechanism.

  evidence_span        VERBATIM quote from the abstract (<=200 chars) supporting modality and
                       facing. Must appear character-for-character in the abstract.
  confidence           "high" | "medium" | "low"."""

JSON_RE = re.compile(r"\{.*\}", re.S)

def load_inscope():
    spec = importlib.util.spec_from_file_location("prof", "utils/profile_corpus_interventions.py")
    prof = importlib.util.module_from_spec(spec); spec.loader.exec_module(prof)
    src = {}
    for p in sorted(glob.glob("Discourse Graph/Sources/@*.md")):
        fm = prof.parse_frontmatter(p); k = prof.citekey(p)
        if k: src[k] = {"citekey": k, "title": (fm.get("title") or "").strip(),
                        "abstract": (fm.get("abstract") or "").strip()}
    inscope = []
    for f in ("data/coding/pool.jsonl", "data/coding/rest.jsonl"):
        if not os.path.exists(f): continue
        for line in open(f):
            try: r = json.loads(line)
            except Exception: continue
            if r.get("language_access_relevant") and r.get("intervention_present"):
                if r["citekey"] in src and src[r["citekey"]]["abstract"]:
                    inscope.append((r, src[r["citekey"]]))
    return inscope

def refine_one(client, prior, rec, usage, lock, retries=2):
    user = (f"TITLE: {rec['title']}\n\nABSTRACT: {rec['abstract']}\n\n"
            f"PREVIOUSLY IDENTIFIED INTERVENTION: {prior.get('intervention_name') or '(unnamed)'}\n"
            f"PREVIOUS FREE-TEXT LABEL: {prior.get('intervention_category') or '(none)'}")
    last = None
    for attempt in range(retries + 1):
        try:
            r = client.messages.create(model=MODEL, max_tokens=800, system=SYSTEM,
                                       messages=[{"role": "user", "content": user}])
            with lock:
                usage["in"] += r.usage.input_tokens; usage["out"] += r.usage.output_tokens
                usage["calls"] += 1
            text = "".join(b.text for b in r.content if b.type == "text")
            m = JSON_RE.search(text)
            if not m: last = "no JSON"; continue
            obj = json.loads(m.group(0))
            obj["citekey"] = rec["citekey"]
            obj["prior_label"] = prior.get("intervention_category")
            span = (obj.get("evidence_span") or "").strip()
            obj["span_verbatim"] = bool(span) and span in rec["abstract"]
            return obj
        except json.JSONDecodeError as e:
            last = f"bad JSON: {e}"
        except Exception as e:
            last = f"{type(e).__name__}: {str(e)[:120]}"; time.sleep(1.5 * (attempt + 1))
    return {"citekey": rec["citekey"], "error": last}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/coding/refined.jsonl")
    ap.add_argument("--limit", type=int); ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    inscope = load_inscope()
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    done = set()
    if os.path.exists(a.out):
        for line in open(a.out):
            try: done.add(json.loads(line)["citekey"])
            except Exception: pass
    todo = [(p, s) for p, s in inscope if s["citekey"] not in done]
    if a.limit: todo = todo[: a.limit]
    print(f"in-scope with abstract={len(inscope)}  done={len(done)}  to-run={len(todo)}")
    if a.dry_run or not todo:
        print("dry run; nothing sent." if a.dry_run else "nothing to do."); return 0

    import anthropic
    tok = subprocess.check_output(["ant","auth","print-credentials","--access-token"], text=True).strip()
    client = anthropic.Anthropic(auth_token=tok,
                                 default_headers={"anthropic-beta": "oauth-2025-04-20"})
    usage = {"in":0,"out":0,"calls":0}; lock=threading.Lock(); wlock=threading.Lock()
    fh=open(a.out,"a"); t0=time.time(); n=0
    with cf.ThreadPoolExecutor(max_workers=a.workers) as ex:
        futs=[ex.submit(refine_one, client, p, s, usage, lock) for p,s in todo]
        for fut in cf.as_completed(futs):
            with wlock: fh.write(json.dumps(fut.result())+"\n"); fh.flush()
            n+=1
            if n%50==0 or n==len(todo): print(f"  {n}/{len(todo)} ({time.time()-t0:.0f}s)", flush=True)
    fh.close()
    cost = usage["in"]/1e6*1.0 + usage["out"]/1e6*5.0
    print(f"\ncalls={usage['calls']} in={usage['in']:,} out={usage['out']:,} cost=${cost:.2f} elapsed={time.time()-t0:.0f}s")
    return 0

if __name__ == "__main__":
    sys.exit(main())
