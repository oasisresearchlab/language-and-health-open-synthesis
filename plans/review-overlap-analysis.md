# Review overlap analysis — Kwan 2023, van Lent 2025 vs our corpus

*2026-08-19. Study-level overlap only — the "data exercise" half. EVD-level overlap, which is the
half requiring adjudication, can only be computed once B2 extracts findings from these reviews.*

## Result

| | Included studies | In our corpus | Missing |
|---|---:|---:|---:|
| **van Lent 2025** (PROSPERO 469785) | 26 | **7 (27%)** | 19 |
| **Kwan 2023** (PMC10048935) | 36 | **14 (39%)** | 22 |
| **Union of both** | **55** | **~19 (35%)** | **36 (65%)** |

## Two findings

**1. The reviews barely overlap with each other.** Only **7 of 55 studies (13%)** appear in both,
despite both addressing interpreting/language-barrier interventions: Abbato 2019, Anttila 2017,
Gutman 2018, Lion 2015, López 2015, Nápoles 2015, Schulz 2015.

This is the strongest argument for B2. If two rigorous reviews of overlapping questions agree on
an eighth of their evidence base, no single review proxies the literature, and harvesting across
several adds substantially rather than duplicating. It also implies the union grows quickly per
review added — worth testing against a third before assuming saturation.

**2. Our corpus covers the older literature better than the current one.** van Lent (2025, the
more recent and more on-topic review) overlaps *less* (27%) than Kwan (2023, 39%). Combined with
the finding that the corpus holds **zero** translation-technology papers dated 2025+
([prior-reviews sweep](./prior-reviews-sweep.md)), this is a second independent signal that the
legacy corpus under-covers current work.

**Consequence for A1.** The 689 legacy PMIDs were proposed as a relative-recall reference set
(A1 §2.1). A reference set that misses 65% of two reviews' included studies — in interpreting,
the corpus's *largest* family — is not a clean standard. Reinforces the mitigation already
recorded in A1 §2.5: stratify recall by intervention family and supplement the reference set from
outside the legacy corpus. These 36 missing studies are an obvious supplement.

## Method and its limits

- **van Lent**: included studies identified from the reference numbers stated in §3.2 — USA
  `[19,20,29–42]`, Australia `[21,43–48]`, Canada `[49]`, UK `[50]`, Switzerland `[51]` — resolved
  against the reference list. Exactly 26, matching the reported count.
- **Kwan**: 36 unique studies (the review reports 37 papers; some are listed under multiple
  outcome categories).
- **Matching**: first-author surname against citekey token and `author:` frontmatter, ±1 year.
- **Verified by hand**, which caught three false positives from the year tolerance: Panayiotou
  2019 and 2020 both matched one corpus file, as did Lee 2017 and 2018, and Kwan's Moreno 2010
  matched our Moreno 2011 (a different study). The percentages above are post-correction.
- **Likely still imperfect.** Surname matching is fallible where citekeys use given names (a known
  hazard in this corpus). Treat these as good estimates, not exact counts.

## Incidental data-quality findings

- A source note with citekey **`@Lopez`** — no year, title, or metadata. Empty stub.
- A source note whose citekey is literally **`@N`**.

## Missing studies — the extraction candidates

**From van Lent (19):** Gutman 2020, Schulz 2015, Anttila 2017, Bregio 2022, Brewster 2024,
Daggett 2023, López 2015, Luan Erfe 2017, Naimi 2023, Nápoles 2015, Sudore 2018, Turner 2019,
Abbato 2019, Beauchamp 2020, Shiner 2025, Zangiabadi 2023, Seale 2013, Jaeger 2019.

**From Kwan (22):** Flores 2012, Nápoles 2015, Flores 2003, Gany 2007, Hornberger 1996,
Anttila 2017, Fagan 2003, Davies 2016, Kilkenny 2018, Luan 2017, Tocher 1998, Bernstein 2002,
Hampers 2002, Abbato 2019, López 2015, Schulz 2015, Cunningham 2008, Jacobs 2007, Kuo 1999,
Bischoff 2008, Lee 2018, Moreno 2010.

Kwan's missing set skews old (1996–2003) and includes foundational interpreting work.

---

## Update 2026-08-20: Gutman 2025 added — no saturation

**Gutman et al. 2025**, JAMA Netw Open 8(7):e2521492 (PMID 40674051), 40 articles / 39
interventions, searches Jul 2023 + Sep 2024.

| | Included | In our corpus | Missing |
|---|---:|---:|---:|
| Gutman 2025 | 40 | **22 (55%)** | 18 |

Corpus overlap is markedly higher than the other two — unsurprising, since Gutman covers
implementation interventions in US clinical settings, which is the corpus's centre of gravity.

### Saturation: the union is accelerating, not converging

| | Included | Running union | New this review |
|---|---:|---:|---:|
| Kwan 2023 | 36 | 36 | — |
| + van Lent 2025 | 26 | 55 | **19** |
| + Gutman 2025 | 40 | **91** | **36 (90% of its set)** |

Gutman overlaps the prior union by **4 studies**. Across all three reviews: **102 included-study
slots yield 91 unique studies — only 11 duplications.**

**Three systematic reviews of language-access interventions share roughly 11% of their evidence
base.** Marginal new studies per review added went *up* (19 → 36), not down.

### What this means

1. **No saturation is in sight.** The catalogued candidate set (~20 further reviews) would
   plausibly yield several hundred unique studies. B2's scope cannot be bounded by "add reviews
   until they stop contributing" — on this evidence they never will.
2. **It is itself a finding about the field.** Different inclusion criteria, terminology (see the
   LEP→NELP/LOE hazard) and framing carve out near-disjoint literatures. There is no shared
   evidence base to appeal to.
3. **It strengthens the case for harvesting over reviewing.** Any single new review would capture
   one more slice. Integration across reviews is the contribution.
4. **B2 needs a different stopping rule** — coverage of the *intervention spine* rather than
   saturation of the study union.

### Caveat on matching

Several matches came via the `author:` field where the citekey uses a given name — `Douglas 2024`
→ `@Natalie_2025_Role_Health`, `Buser 2022` → `@Sina_2023_use_intercultural`, `Behairy 2023` →
`@Mohga_2023_Increasing_Language`, `Trang 2024` → `@Karen_2024_Impact_Using`. A few carry a 1–2
year offset (online-first vs print, or a genuine mismatch) and need hand-verification. The
headline is robust to a handful of errors: even ±5 matches leaves the 90%-new figure intact.

---

## Correction 2026-08-20: the saturation reading conflated two review layers

**The 2026-08-20 saturation conclusion above is wrong as stated.** It treated three reviews as
comparable members of one curve. They are not.

- **van Lent 2025, Kwan 2023 — provision layer.** Does a language-access intervention work?
- **Gutman 2025 — adoption layer.** How do you get clinicians to *use* one?

That is precisely the provision/adoption distinction derived independently from our own
co-occurrence analysis ([realist note](./realist-synthesis-and-discourse-graphs.md)).

### Our own facets detect the difference

Across matched studies in the spine:

| | Gutman (adoption) | van Lent + Kwan (provision) |
|---|---:|---:|
| organization-facing | **44%** | **0%** |
| multi-component | **55%** | **0%** |
| clinician-facing | 100% | 76% |
| patient-facing | 66% | 100% |
| n | 18 | 13 |

Organization-facing and multi-component separate the layers perfectly. (The mechanism *family*
facet does not — Gutman is 15/18 "Interpreting services", Kwan 12/12 — because family captures
what the intervention *is*, not what it *acts on*.)

### What this changes

1. **Gutman's 90%-new is expected, not evidence of fragmentation.** A review from an unrepresented
   layer contributes almost everything by construction.
2. **The real fragmentation signal is Kwan ∩ van Lent = 13%** — two same-layer reviews — and it
   rests on two data points. It has *not* been replicated.
3. **Saturation must be measured within layer.** A third *provision* review is needed to test
   provision-layer saturation. The "marginal contribution is rising" claim is an artefact of
   layer-mixing and should not be relied on.
4. **The B2 review set should be stratified by layer**, mirroring the spine's own
   provision/adoption structure. The stopping rule (spine coverage rather than union saturation)
   still looks right, but the axis should be **provision × adoption coverage**, not families alone.

### What survives

The corpus-overlap numbers are unaffected: Gutman 22/40 (55%), van Lent 7/26 (27%), Kwan 14/36
(39%). The three-review union of 91 unique studies is still 91 — it simply spans two layers rather
than sampling one.

Third independent convergence worth noting: provision/adoption emerged from our co-occurrence
data, independently sorts the review landscape, and is measurable with facets we already built.

---

## Update 2026-08-20 (b): four provision-layer reviews, and a corpus date floor

Gutman is held out (adoption layer). Four **provision-layer** reviews measured:

| Review | Included | In corpus | |
|---|---:|---:|---|
| Kwan 2023 | 36 | 16 | 44% |
| van Lent 2025 | 26 | 7 | 26% |
| Heath 2023 (CRD42021247580) | 28 | 6 | 21% |
| **Karliner 2007** | 27 | **0** | **0%** |

### The corpus has a hard date floor at 2008

Of 802 dated sources, the earliest is **2008**; there are **zero** before it. Not a tail-off — a
cliff.

| Window | n |
|---|---:|
| 1980–1999 | 0 |
| 2000–2005 | 0 |
| 2006–2010 | 20 |
| 2011–2015 | 113 |
| 2016–2020 | 215 |
| 2021–2026 | 454 |

That is a **date filter in the original retrieval**. Together with the LEP anchoring
([terminology note](./benchmark-reviews-and-terminology.md)), two concrete properties of the
unknown original query are now established:

1. **LEP-anchored terminology** — zero sources use NELP/LOE without also using LEP.
2. **A ~2008 date floor** — zero sources predate 2008.

It also fully explains Karliner's 0%: all 27 of its studies are 1984–2004, entirely below the
floor. The corpus contains **none of the foundational pre-2008 interpreting literature.**

### Within-layer saturation — the test Gutman could not provide

| Order | Review | Included | Union after | New | % of its set |
|---|---|---:|---:|---:|---:|
| 1 | Kwan 2023 | 36 | 36 | 36 | — |
| 2 | + van Lent 2025 | 26 | 55 | 19 | 73% |
| 3 | + Heath 2023 | 28 | 66 | **11** | **39%** |
| 4 | + Karliner 2007 | 27 | 81 | 15 | 55% |

**Within-layer marginal contribution runs 39–73%, against Gutman's cross-layer 90%.** That
confirms the provision/adoption distinction quantitatively: same-layer reviews genuinely overlap,
cross-layer ones essentially do not.

Still no saturation after four reviews — the union reached 81 unique studies from 117
included-study slots — but the decline is real where questions match.

### Pairwise overlap (shared / union)

| | Kwan | van Lent | Heath | Karliner |
|---|---:|---:|---:|---:|
| **Kwan 2023** | — | 12% | **30%** | 12% |
| **van Lent 2025** | 12% | — | 10% | **0%** |
| **Heath 2023** | 30% | 10% | — | 22% |
| **Karliner 2007** | 12% | 0% | 22% | — |

**Much of the apparent fragmentation is date windows, not disagreement.** Kwan ∩ Heath is highest
(30%) — closest questions, overlapping eras. van Lent ∩ Karliner is **0%** because their windows
are disjoint: van Lent restricted to 2013+, Karliner searched only to 2005. That is not two
reviews disagreeing about what counts as evidence; it is two reviews looking at different decades.

So the earlier "the field has no shared evidence base" reading was too strong. Within-layer,
within-era overlap is a modest-but-real 22–30%.

### Consequences

- **B2's harvest should include a pre-2008 stratum.** Karliner alone contributes 27 studies the
  corpus cannot contain by construction, and Heath adds more.
- **A1 must set its date floor deliberately**, and justify it. The current one appears inherited
  rather than chosen.
- **The 689 as a relative-recall reference set is further weakened** — it is bounded in both
  vocabulary *and* time.
