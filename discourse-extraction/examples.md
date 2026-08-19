# Gold examples — annotated

Real nodes from the language-access corpus, annotated against the quality bar in
`node-spec.md`. The domain (interpreter access → length-of-stay / readmission) is
incidental — read them for *shape*, not content. Each is grounded in a paper, but the
same structure applies to a notebook, log, or chat (swap "page N" for the matching
locator).

---

## EVD — gold

> **Source:** Lindholm 2012, *Professional Language Interpretation and Inpatient
> Length of Stay and Readmission Rates*. **Finding:** no interpreter on both
> admission & discharge → longer LOS.

```markdown
---
title: LEP inpatients without a professional interpreter on both admission and
  discharge had a 0.75–1.47 day longer length of stay   # PAST tense (situated)
NodeType: Evidence
Source: "[[@Lindholm_2012_Professional_language]]"
shortLabel: "No interpreter → longer LOS"
tags: [factor/interpreting-services, outcome/length-of-stay, epistemic/effect-size]
curationStatus: Initial AI draft          # human advances this; agent never does
---
## Description

![[Lindholm_2012_Professional_language-table4.png]]   ← grounding OBJECT, embedded first

In multivariable regression models controlling for patient characteristics, LEP
inpatients who did not receive professional interpretation … had a longer length of
stay … The increase ranged between 0.75 and 1.47 days (Table 4). … (β=1.49, SE 0.46,
P<0.01) …

> "Patients who did not receive professional interpretation at admission or both
> admission/discharge had an increase in their LOS of between 0.75 and 1.47 days …
> (P<0.02)." (Lindholm, 2012, p. 1294)            ← verbatim span + locator

## Methods Context

### What?
Inpatient length of stay (LOS) in days, modeled as a regression coefficient …
> "Using date of admission and discharge we calculated length of stay (LOS) in days
> for all patients." (Lindholm, 2012, p. 1295)     ← What grounded in its own span

### How?
Multivariable regression controlling for age, gender, language, diagnosis, severity;
four-level interpreter indicator; mixed-model for repeat stays …
> "…we used multivariable models that controlled for patient characteristics,
> including age, gender, language, primary diagnosis, and illness severity."
> (Lindholm, 2012, p. 1295)                         ← How grounded

### Who?
3071 LEP admissions (≥18) at one tertiary university hospital, 2004–2007, LOS 1–85 days …
> "The study population includes 3071 admissions with a LOS between 1 and 85 days."
> (Lindholm, 2012, p. 1295)                         ← Who grounded

## Other Notes
Single-institution; no English-speaking comparison group (contrast is within LEP).
```

**Why it's gold (maps to the EVD quality bar):**
- **Atomic** — one finding (LOS by interpreter-access pattern). Readmission from the
  same paper is a *separate* EVD.
- **Verbatim-grounded** — the finding and each methods facet carry an exact quote +
  page. The quotes *state* the finding, not just share keywords.
- **Substantively faithful** — the coefficients/SEs/p-values match the source; the
  non-significant arm (0.25, P=0.33) is reported as non-significant.
- **Grounded object** — Table 4 (the model output) is embedded first.
- **What / How / Who each grounded** — three method facets, three spans. None is an
  ungrounded summary.
- **Polarity** — wired to a claim it bears on with the right sign (see CLM below).
- **Past tense** — the title and description say what *was observed* ("…*had* a longer
  length of stay"), marking the finding as situated. Contrast the claim's title below.

*Other-source analogue:* for a notebook, the embedded Table 4 → the output of the
regression cell; "(p. 1295)" → "(cell 12, out[3])"; the rest is identical.

---

## CLM — gold

> A generalization that several EVDs (from different papers) bear on — both ways.

```markdown
---
title: Professional interpretation at admission or discharge lowers 30-day
  readmission for LEP inpatients               # PRESENT tense (timeless generalization)
NodeType: Claim
shortLabel: "Interpretation ↓ readmission"
tags: [factor/interpreting-services, outcome/readmissions, epistemic/effect-size]
---
## Supporting Evidence
- [[EVD - LEP inpatients with no interpreter … higher 30-day readmission (24.3% vs 14.9%) - @Lindholm_2012…]]
- [[EVD - Bedside interpreter telephone access lowered LEP 30-day readmission (OR 0.64) - @Karliner_2017…]]

## Contradicting Evidence
- [[EVD - Adjusted odds of 7-day ED readmission only 3% higher, non-significant … pediatric - @Greenky_2019…]]
- [[EVD - Improving interpreter use did not reduce 48-hour ED return-visit rate (3.1%) - @Martinez_2021…]]

## Narrative synthesis
LEP inpatients who received interpretation … were less likely to be readmitted within
30 days … The unadjusted gradient (24.3% vs 14.9%) supports the same direction.
```

**Why it's gold:**
- **A generalization**, not a single result — the specific numbers live in the EVDs.
- **Present tense** — the title states a timeless rule ("interpretation *lowers*
  readmission"), vs. the past-tense, situated EVD titles it aggregates.
- **Transcends sources** — supported by Lindholm *and* Karliner (two independent studies).
- **Both sides wired** — contradicting EVDs (Greenky, Martinez) are listed too; a
  reviewer sees the claim is contested. Each link is statement-level.
- **No certainty/GRADE field drafted** by the agent — that appraisal is left for a human.

---

## CVT — gold

> Qualifies specific EVDs; grounded; typed.

```markdown
---
title: Findings are single-site patient perceptions from Spanish-speaking focus
  groups; providers were not interviewed and outcomes were not measured
NodeType: Caveat
type: author-stated          # vs "inferred" — label which
severity: moderate
---
## Source
[[@Brooks_2016_Patient_Perspectives]]

## Limitation
Perceptions of 22 Spanish-speaking LEP patients in one county … providers were not
interviewed and no clinical outcomes were measured …

## Supporting Quote
> "One limitation of our study is that we did not speak with providers about their
> reasons for choosing not to utilize professional interpreters…" (Brooks, 2016, p. 32)

## Qualifies
- [[EVD - LEP patients reported providers overestimate their English comprehension … - @Brooks_2016…]]
- [[EVD - LEP patients perceived inferior care and described concrete harms … - @Brooks_2016…]]
```

**Why it's gold:** qualifies **EVDs** (not a claim), is `author-stated` and grounded in
a verbatim quote, and names exactly which findings it limits.

---

## Anti-patterns (what review catches)

- **Two findings in one EVD** → split. ("interpreters cut readmission *and* LOS" = 2.)
- **Ungrounded methods summary** — a *What/How/Who* with no span. Reviewer verdict:
  *missing* → re-extract that grounding.
- **Spun null** — "interpreters reduced LOS" when the arm was non-significant. Verdict:
  *wrong* (substantive fidelity).
- **Wrong polarity** — a null/contrary EVD filed as *supporting*. Verdict: *wrong*.
- **Claim-as-evidence** — an EVD whose "finding" is actually a generalization with no
  particular behind it. Promote to / fold into a CLM.
- **Coincidental quote** — a verbatim span that contains the keywords but doesn't state
  the finding. Verdict: *wrong* (verbatim).
- **Tense mismatch** — an EVD phrased as a timeless rule ("interpreters reduce LOS"),
  or a claim phrased as a one-off observation. Usually a sign the node is on the wrong
  side of the EVD/CLM line. Verdict: *edit* (or reclassify).
