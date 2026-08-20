# B2 — Review harvest: seeding the living synthesis from prior evidence syntheses

*2026-08-20 · branch `interventions-review-spec`. Splits from
[spec B](./2026-08-18-interventions-review-design.md); supersedes the 2026-08-19 update in
`plans/translation-interventions-review.md`.*

**Status: v0.** Sections 1–6 designed. Effort figures in §7 are estimates flagged as such; the
saturation protocol in §3 is what makes them firm.

## 1. What B2 is

Mine prior evidence syntheses to **seed** the living synthesis: harvest their extracted findings
and included-study lists, map them into our schema, and use the result to triage what still needs
fresh extraction.

This is a review of reviews, but **not the conventional genre**. An umbrella review synthesizes
review *conclusions* and appraises the reviews with AMSTAR. Here the reviews are **raw material**;
the object of synthesis is the primary literature underneath them. Say so explicitly in any
write-up, because a reader who knows the genre will expect the conventional thing.

**Two extraction families**, consistent with existing doctrine that reviews yield CLM, not EVD
(`plans/methodology-decisions.md`):

| Family | Example | Yields |
|---|---|---|
| **Evidence syntheses** with extraction tables | van Lent 2025, Kwan 2023, Gutman 2025 | Claims + pointers to per-study findings |
| **Framework / integrative / narrative reviews** | arXiv 2605.01441 | Programme theory, mechanisms, CMO candidates |

The second family feeds the top-down layer described in
[`plans/realist-synthesis-and-discourse-graphs.md`](../../../plans/realist-synthesis-and-discourse-graphs.md).

## 2. Baseline

From [`plans/review-overlap-analysis.md`](../../../plans/review-overlap-analysis.md), study-level:

| | Included | In our corpus | Missing |
|---|---:|---:|---:|
| van Lent 2025 | 26 | 7 (27%) | 19 |
| Kwan 2023 | 36 | 14 (39%) | 22 |
| **Union** | **55** | **~19 (35%)** | **36 (65%)** |

**The load-bearing number is 13%** — only 7 of 55 studies appear in *both* reviews. Two rigorous
reviews of overlapping questions agree on an eighth of their evidence base. So no single review
proxies the literature, harvesting across several is additive rather than duplicative, and **the
union should grow fast per review added**. That is the premise B2 rests on, and §3 tests it rather
than assuming it.

Corollary: B2 is **extension more than harvest**. 65% of the union is not in our corpus.

## 3. Review set and the saturation protocol

**Stratify the review set by layer**, and start with the provision layer only.

- **Provision layer** — does a language-access intervention work?
  1. **van Lent et al. 2025**, Patient Educ Couns 136:108767 (PROSPERO 469785) — 26 studies,
     GRADE applied, first to compare strategies. Search end Jul 2024. *Evidence Project RoB.*
  2. **Kwan et al. 2023**, IJERPH 20(6):5165 — integrative, hospital outcomes. Search end Dec 2020.
  3. **Heath et al. 2023**, J Migr Health 7:100162 (PROSPERO CRD42021247580) — 29 reports,
     compares interpreter types. Closest question-match to van Lent, so the cleanest saturation
     test; also uses the *same Evidence Project RoB tool*, making inherited assessments directly
     comparable. **Candidate fourth: Karliner 2007** — same layer, different era, tests whether
     older-literature coverage really is better.

- **Adoption layer** — how do you get clinicians to *use* one? **Gutman et al. 2025**,
  JAMA Netw Open 8(7):e2521492, 40 articles / 39 interventions. **Held separately, out of the
  provision saturation curve.** Bring it in only if B2's scope expands to adoption.

**Why the stratification.** Combining provision and adoption is a near-tautological hypothesis —
of course making clinicians use a provided service helps the service work. The non-obvious
combination question is **within** the provision layer, and it is the one van Lent names as
unstudied: *"no studies investigated whether combining different strategies (e.g., using digital
translation tools to translate specific words that an informal interpreter may not know) could
yield (more) positive results."* Machine translation plus informal interpreter, or translated
materials plus interpreter, could be complementary, substitutive, or interfering.

**Saturation metric.** After each review is added, record: included studies, studies new to the
running union, and studies new to our corpus. Measure **within layer** — a review from an
unrepresented layer contributes almost everything by construction and tells you nothing about
convergence.

### Measured, 2026-08-20 — provision layer

| Order | Review | Included | Union after | New | % of its set |
|---|---|---:|---:|---:|---:|
| 1 | Kwan 2023 | 36 | 36 | 36 | — |
| 2 | + van Lent 2025 | 26 | 55 | 19 | 73% |
| 3 | + Heath 2023 | 28 | 66 | **11** | **39%** |
| 4 | + Karliner 2007 | 27 | 81 | 15 | 55% |

**Within-layer marginal contribution runs 39–73%, against Gutman's cross-layer 90%.** That
confirms the provision/adoption split quantitatively: same-layer reviews genuinely overlap,
cross-layer ones essentially do not.

**Pairwise overlap is 10–30%, and much of the spread is date windows rather than disagreement.**
Kwan ∩ Heath is highest at 30% — closest questions, overlapping eras. van Lent ∩ Karliner is
**0%**, but only because their search windows are disjoint (van Lent 2013+, Karliner to 2005).
Within layer *and* within era, overlap is a modest but real 22–30%. Earlier drafts of this spec
claimed the field has "no shared evidence base"; that was overstated.

**Still no saturation after four reviews** — 81 unique studies from 117 included-study slots — but
the decline is real where questions match. So the stopping rule remains **coverage of the
intervention spine** (spec B §3.7 families) rather than union saturation, now stratified by
**provision × adoption**.

### A pre-2008 stratum is required

Our corpus has a **hard date floor at 2008**: of 802 dated sources the earliest is 2008 and none
precede it. Karliner 2007's 27 included studies are all 1984–2004, hence its **0%** corpus
overlap. The corpus contains none of the foundational pre-2008 interpreting literature, and no
amount of harvesting from post-2008-bounded reviews will surface it. Karliner is therefore not
optional — it is the only route in the current set to that stratum. See
[`plans/review-overlap-analysis.md`](../../../plans/review-overlap-analysis.md).

**Deliberately deferred:** the Deaf/sign-language strand (distinct interventions and evidence
base) and the specialty-specific layer. Revisit after saturation is measured.

## 4. Pipeline

### 4.1 Harvest

For each review: extract the included-study list, and extract the findings table row by row.

Table structure is not per-study. van Lent's Table 3 is organised by *comparison × outcome
category*, with each bullet aggregating several studies and GRADE attached per outcome category —
e.g. *"For inpatient settings, use of a professional interpreter was associated with significantly
longer length of stay (IRR=2.2, p<.001 [43]; OR=1.3 and OR=1.41 [35]; p=.008 [47])."* One bullet,
three studies, three statistics. So a bullet decomposes into **one candidate CLM plus N EVD
pointers**.

### 4.2 Pointers, then ground

**Never import a finding as an EVD directly.** A review's table entry is their paraphrase of a
source we have not opened. The table tells us *which paper* and *which finding*; we then open the
PDF and ground it verbatim ourselves. This preserves the verbatim-from-source rule the graph's
credibility rests on, while still saving the expensive-in-attention parts: search, screening,
relevance judgment, and knowing what to look for.

**Track discrepancies.** Where our grounding disagrees with the review's extraction, record it.
Systematic disagreement is a finding about extraction reliability in published systematic reviews,
and one very few groups are positioned to produce.

### 4.3 Thin, then backfill

Harvested papers get **only the findings the review surfaced** — typically one or two, against our
measured from-scratch rate of **5.2 EVDs per paper** (median 4, max 13).

**This unevenness must be visible, because it biases count-based analysis.** A claim supported by
5 EVDs from one deeply-extracted paper and one supported by 5 EVDs from five thinly-harvested
papers look identical to a query and mean different things — and "how much evidence supports
this?" is precisely the question a Conservation Evidence–style surface invites.

So: **mark depth on every EVD, and mark review provenance on both EVD and SRC.**

```yaml
# on the EVD
harvestedFrom: "@vanLent_2025"          # null when extracted from source directly
extractionDepth: harvested               # harvested | full
```

```yaml
# on the SRC — also powers overlap and saturation queries
includedInReviews: ["@vanLent_2025", "@Kwan_2023"]
```

Backfill to full depth is a **separate, prioritized pass**, not automatic. Priority goes to papers
whose claims are load-bearing or contested.

### 4.4 Studies not in the corpus

The 36 missing studies need SRC nodes and PDF acquisition before grounding. That work belongs to
B2, not B — B's runway counts papers already in the corpus.

## 5. Representation

| Object | Where | Notes |
|---|---|---|
| Per-study finding (grounded by us) | **EVD** | With `harvestedFrom` + `extractionDepth` |
| Review's synthesis statement | **CLM**, provenance-marked | See below |
| Review's per-study risk of bias | **`riskOfBias` list on the EVD** | Inheritable; see the appraisal note |
| Review's GRADE rating | **not imported** | Set property; recomputed on our set. Used as a comparator |
| Indirectness | **edge attribute** | Property of evidence↔claim fit |

Full reasoning: [`plans/evidence-appraisal-representation.md`](../../../plans/evidence-appraisal-representation.md).

**Imported CLMs.** A review's synthesis statement becomes a CLM carrying its provenance, sitting
alongside our bottom-up CLMs. `curationStatus` currently has no state for "asserted by a published
review, not by us" — B2 needs one (see §8).

## 6. Aggregation is an explicit later step

Imported CLMs and our bottom-up CLMs are **not merged on import.** Reconciliation is a named
analysis phase with at least two available moves:

- **Merge** — where an imported claim and one of ours are the same claim, combine and record both
  provenances.
- **Prior** — use imported claims as *structure* for aggregating our EVDs: a review's synthesis
  statement is a hypothesis about how evidence groups, which bottom-up evidence can then confirm,
  refine, or contradict, potentially yielding a *new* claim neither source stated.

The second is the more interesting and connects directly to the top-down/bottom-up collision in
the realist note: **disagreement is signal, not noise.** An imported claim our evidence will not
support is a finding; evidence no imported claim predicts is also a finding.

Deferring this is deliberate — doing it at import time would silently resolve exactly the tensions
worth studying.

## 7. Effort — measured for the provision set

Table extraction is cheap (a PDF and a structured pass; stage-2 coding of 244 records cost $0.44).
Model cost is negligible throughout. The cost is human time in §4.2 grounding and §4.4 acquisition.

| Review set | Union | Already in corpus | **To acquire** |
|---|---:|---:|---:|
| Kwan + van Lent + Heath | 66 | 22 | **44** |
| + Karliner 2007 | 81 | 22 | **59** |

Karliner adds 15 studies and **none** of them are in the corpus — the date floor again.

So the provision-layer harvest is roughly **59 papers to acquire and 81 to ground thinly**, with
backfill on a prioritized subset. Adding the adoption layer (Gutman: 40 included, 22 already in
corpus) would add ~18 more acquisitions.

**These figures cover four provision reviews.** §3 shows the set does not saturate, so extending
further multiplies them — on current evidence roughly +11 to +19 unique studies per same-layer
review added. Do not put a total in a funding ask until the spine-coverage stopping rule is fixed.

## 8. Open

1. **What triggers EVD merge adjudication?** Same study + same outcome is the obvious rule; whether
   two reviews citing one study for one outcome yields one EVD or two needs deciding.
2. **A `curationStatus` state for imported claims.** Existing states are the AI-draft → expert-review
   ladder; an imported published claim is off that ladder.
3. **Sequencing against A1.** B2 inherits its reviews' search end dates (van Lent Jul 2024,
   Gutman Sep 2024, Kwan Dec 2020), so it cannot be current on its own. It seeds; A1 makes it live.
4. **Saturation threshold** — set after three data points (§3).
5. **Framework-review harvest** is sketched, not designed. Programme-theory extraction needs its
   own pass once the realist-layer tensions are resolved.

## 9. Non-goals

- Appraising the reviews themselves (AMSTAR etc.). They are raw material, not the object.
- Importing GRADE ratings. See §5.
- Merging imported and bottom-up claims at import time. See §6.
- Making the corpus current — that is A1.
