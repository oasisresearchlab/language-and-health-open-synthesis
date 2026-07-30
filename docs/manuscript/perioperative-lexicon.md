# Perioperative lexicon — surgical cluster sampling

Canonical, explicit term set for the within-corpus lexical identification of surgical language-concordance sources (Methods §B.3; companion to `plans/review-app/surgery-cluster-selection.md`).

> **Provenance / honesty note.** The original 2026-07-22 scan was performed ad-hoc by an extraction agent and its *exact* term set was **not persisted** — only an illustrative subset (ending in "…") was recorded in the selection log. This file is the **documented canonical lexicon**: it makes the include- and exclude-terms explicit for reproducibility. Terms are stems matched case-insensitively against each source's **title + filename** (`*` = prefix/substring match). The reported funnel (785 screened → 63 identified → 29 selected +5 prior) is as of the original run over 785 sources; the corpus is now 820, so a re-run would return a superset. **Review and edit this list to match intent before it anchors a submitted methods section.**

## Include terms (identification)

A source is a candidate if its title or filename matches **any** stem below.

**Core surgical / perioperative**
- `surg*` (surgery, surgical, surgeon)
- `periop*` (perioperative)
- `preoperat*`, `postoperat*`, `intraoperat*`
- `operat*` (operating room, operative) — see exclusions for non-surgical "operat…"
- `resect*`, `excision`, `incision`

**Anaesthesia / analgesia / pain (peri-surgical)**
- `anesthes*`, `anaesthes*`
- `analges*`
- `opioid`, `postoperative pain`, `regional anesthesia`, `nerve block`

**Procedures / subspecialties**
- `arthroplasty`, `joint replacement`, `TJA`, `TKA`, `THA`
- `spine`, `spinal` (surgical context)
- `bariatric`
- `transplant*`
- `colorectal` (surgical context — see exclusions for screening)
- `laparoscop*`
- `cataract`, `mammoplasty`, `diverticulitis` (as surgical procedures/indications)
- `craniotomy`, `hysterectomy`, `appendect*`, `cholecystect*`, `mastect*`

**Surgical process / consent**
- `consent` (surgical/procedural)
- `operating room`, `OR `, `perioperative unit`, `PACU`, `recovery room`

## Exclude terms (false-positive filter)

A lexical match is **dropped** on full-text check when it falls in a non-surgical context:

- **Cancer *screening*** (prevention, not surgery): `colorectal screening`, `cervical screening`, `breast screening`, `mammograph*` used for screening, `colonoscopy screening`.
- **Surgical *skill* / simulator** studies with no language-concordance angle: `surgical skill`, `simulator`, `training model`, `neuroimaging of surgeons`.
- **Diabetic retinopathy** and other `*Limited_English*` matches that are not the surgical paper of the same author-year (disambiguate by DOI/title).
- **Non-surgical "operat…"**: `cooperat*`, `postoperative-unrelated` administrative uses.
- **Topically adjacent, non-surgical**: mental-health service use, interpreter-in-medical- education, general communication technology without a surgical setting.

## De-duplication rule

Collapse re-import duplicates and same-paper/different-citekey pairs, keeping the record whose full-text PDF is on hand (e.g. `Claire_2022` = `Crescenzo_2022`; `Joshua_2023` = `Rainey_2023`).

## Reproducibility upgrade (optional, not yet done)

To make the funnel re-runnable rather than documented-after-the-fact, this list can be encoded as a small script over `Discourse Graph/Sources/@*.md` (title + filename) emitting the candidate set + a report CSV, and re-run against the current 820-source corpus. Flagged as a follow-up.
