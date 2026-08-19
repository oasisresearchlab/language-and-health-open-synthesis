#!/usr/bin/env python3
"""AI coding pass: classify sources for the language-access interventions review.

Free-text coding (the model names categories in its own words) so that
categories missing from the heuristic taxonomy in
`utils/profile_corpus_interventions.py` can surface. Every call carries a
verbatim span from the abstract, matching the project's grounding rule and
making the human-validation sample fast to audit.

Resumable: results append to a JSONL file; re-running skips citekeys already done.

Usage:
  python3 utils/code_interventions.py --scope pool  --out data/coding/pool.jsonl
  python3 utils/code_interventions.py --scope rest  --out data/coding/rest.jsonl
  python3 utils/code_interventions.py --scope pool  --limit 10 --dry-run
"""
from __future__ import annotations
import argparse, concurrent.futures as cf, glob, importlib.util, json, os, re, subprocess, sys, threading, time

MODEL = "claude-haiku-4-5"
SOURCES = "Discourse Graph/Sources/@*.md"

SYSTEM = """You classify biomedical abstracts for a systematic review of LANGUAGE-ACCESS interventions \
(interventions addressing communication with patients who have limited English proficiency, or who \
speak a language their clinician does not).

Return ONLY a JSON object, no prose, with exactly these keys:

  language_access_relevant  boolean. Is this paper about language access / LEP / interpreting /
                            translation at all? A cardiac procedure or a survey of unrelated care
                            is NOT relevant merely because it uses the word "intervention".
  intervention_present      boolean. Does the paper EVALUATE or DESCRIBE a specific language-access
                            intervention? Papers that only measure disparities, with no intervention,
                            are false.
  intervention_name         string or null. The intervention as the paper names it. Null if none.
  intervention_category     string or null. YOUR OWN short label for the kind of intervention
                            (2-5 words). Do not pick from a fixed list; name what you actually see.
  study_design              string. YOUR OWN short label (e.g. "randomized controlled trial",
                            "retrospective cohort", "qualitative interviews", "narrative review").
                            Use "unclear" if the abstract does not say.
  care_setting              string or null. e.g. "inpatient", "outpatient", "emergency department",
                            "perioperative", "community". Null if not stated.
  specialty                 string or null. e.g. "oncology", "pediatrics", "primary care".
  evidence_span             string. A VERBATIM quote from the abstract (<=200 chars) that justifies
                            intervention_present. Empty string if intervention_present is false.
  confidence                "high" | "medium" | "low".

The verbatim span must appear character-for-character in the abstract. Do not paraphrase it."""

def load_sources():
    spec = importlib.util.spec_from_file_location("prof", "utils/profile_corpus_interventions.py")
    prof = importlib.util.module_from_spec(spec); spec.loader.exec_module(prof)
    out = {}
    for path in sorted(glob.glob(SOURCES)):
        fm = prof.parse_frontmatter(path)
        key = prof.citekey(path)
        if not key: continue
        out[key] = {
            "citekey": key,
            "title": (fm.get("title") or "").strip(),
            "abstract": (fm.get("abstract") or "").strip(),
        }
    return out, prof

def get_client():
    import anthropic
    tok = subprocess.check_output(["ant", "auth", "print-credentials", "--access-token"],
                                  text=True).strip()
    return anthropic.Anthropic(auth_token=tok,
                               default_headers={"anthropic-beta": "oauth-2025-04-20"})

JSON_RE = re.compile(r"\{.*\}", re.S)

def code_one(client, rec, usage, lock, retries=2):
    user = f"TITLE: {rec['title']}\n\nABSTRACT: {rec['abstract']}"
    last = None
    for attempt in range(retries + 1):
        try:
            r = client.messages.create(
                model=MODEL, max_tokens=900, system=SYSTEM,
                messages=[{"role": "user", "content": user}],
            )
            with lock:
                usage["in"] += r.usage.input_tokens
                usage["out"] += r.usage.output_tokens
                usage["calls"] += 1
            text = "".join(b.text for b in r.content if b.type == "text")
            m = JSON_RE.search(text)
            if not m:
                last = "no JSON in response"; continue
            obj = json.loads(m.group(0))
            obj["citekey"] = rec["citekey"]
            # verify the span is genuinely verbatim — the project's grounding rule
            span = (obj.get("evidence_span") or "").strip()
            obj["span_verbatim"] = bool(span) and span in rec["abstract"]
            return obj
        except json.JSONDecodeError as e:
            last = f"bad JSON: {e}"
        except Exception as e:
            last = f"{type(e).__name__}: {str(e)[:120]}"
            time.sleep(1.5 * (attempt + 1))
    return {"citekey": rec["citekey"], "error": last}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scope", choices=["pool", "rest", "all"], default="pool")
    ap.add_argument("--out", default="data/coding/pool.jsonl")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    srcs, prof = load_sources()

    # recompute pool membership from the baseline profiler so the two agree
    pool_keys, rest_keys = set(), set()
    for path in sorted(glob.glob(SOURCES)):
        fm = prof.parse_frontmatter(path); key = prof.citekey(path)
        if not key: continue
        legacy = (fm.get("intervention") or "").strip()
        named = prof.classify_legacy_field(legacy) == "named_intervention"
        recoverable = (not named) and bool(prof.RE_INTERVENTION_SIGNAL.search(fm.get("abstract") or ""))
        (pool_keys if (named or recoverable) else rest_keys).add(key)

    targets = {"pool": pool_keys, "rest": rest_keys, "all": pool_keys | rest_keys}[a.scope]
    targets = [k for k in sorted(targets) if srcs[k]["abstract"]]

    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    done = set()
    if os.path.exists(a.out):
        for line in open(a.out):
            try: done.add(json.loads(line)["citekey"])
            except Exception: pass
    todo = [k for k in targets if k not in done]
    if a.limit: todo = todo[: a.limit]

    print(f"scope={a.scope}  with-abstract={len(targets)}  already-done={len(done)}  to-run={len(todo)}")
    if a.dry_run:
        print("dry run; nothing sent."); return 0
    if not todo:
        print("nothing to do."); return 0

    client = get_client()
    usage = {"in": 0, "out": 0, "calls": 0}
    lock = threading.Lock()
    wlock = threading.Lock()
    fh = open(a.out, "a")
    t0 = time.time()
    n = 0
    with cf.ThreadPoolExecutor(max_workers=a.workers) as ex:
        futs = {ex.submit(code_one, client, srcs[k], usage, lock): k for k in todo}
        for fut in cf.as_completed(futs):
            rec = fut.result()
            with wlock:
                fh.write(json.dumps(rec) + "\n"); fh.flush()
            n += 1
            if n % 25 == 0 or n == len(todo):
                print(f"  {n}/{len(todo)}  ({time.time()-t0:.0f}s)", flush=True)
    fh.close()

    cost = usage["in"] / 1e6 * 1.0 + usage["out"] / 1e6 * 5.0   # Haiku 4.5: $1 / $5 per MTok
    print(f"\ncalls={usage['calls']}  in={usage['in']:,}  out={usage['out']:,}  "
          f"cost=${cost:.2f}  elapsed={time.time()-t0:.0f}s")
    return 0

if __name__ == "__main__":
    sys.exit(main())
