import Link from "next/link";
import { Check, Pencil, X, Minus, RefreshCw } from "lucide-react";

export const metadata = {
  title: "Reviewer guide",
  description:
    "What the discourse-graph node types are, and what counts as a correct and complete evidence or claim node.",
};

export default function ReviewerGuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
        Reviewer guide
      </p>
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">
        How to review an extraction
      </h1>
      <p className="mt-3 text-muted-foreground">
        We&apos;re turning papers into a <strong>discourse graph</strong>: a network of
        small, linked, quote-grounded nodes. Your job is to check that the AI&apos;s
        nodes are <em>faithful to the source</em> — not to write them from scratch.
        This guide says what each node type is and what a good one looks like.
      </p>

      <Callout>
        The golden rule everything else follows from:{" "}
        <strong>every substantive statement is backed by a verbatim quote</strong>{" "}
        with a page number, and <strong>each node says exactly one thing</strong>{" "}
        (one finding, one claim, one limitation). If a node mixes two findings, or
        a quote doesn&apos;t actually say what the node claims, it needs an edit.
      </Callout>

      {/* node types */}
      <Section title="The node types">
        <NodeDef
          tag="QUE"
          name="Question"
          color="text-violet-600 dark:text-violet-400"
        >
          An unknown we want to make known — e.g.{" "}
          <em>“How does language concordance affect healthcare outcomes?”</em>{" "}
          Claims answer questions.
        </NodeDef>
        <NodeDef
          tag="CLM"
          name="Claim"
          color="text-sky-600 dark:text-sky-400"
        >
          An <strong>atomic, generalized assertion</strong> about the world that
          (proposes to) answer a question — e.g.{" "}
          <em>“Professional interpreters reduce readmissions for LEP patients.”</em>{" "}
          A claim <strong>transcends any single paper</strong>: many studies can
          support or oppose it. Claims are deliberately more lossy than evidence.
        </NodeDef>
        <NodeDef
          tag="EVD"
          name="Evidence"
          color="text-emerald-600 dark:text-emerald-400"
        >
          A <strong>specific empirical observation from one study</strong> — a
          number, comparison, or qualitative finding, grounded in a verbatim quote
          (and a figure/table where relevant). Evidence <em>supports</em> or{" "}
          <em>opposes</em> a claim. <strong>This is what you review here.</strong>
        </NodeDef>
        <NodeDef tag="SRC" name="Source" color="text-muted-foreground">
          The paper itself (authors, year, journal, DOI). Evidence is{" "}
          <em>derived from</em> a source.
        </NodeDef>
        <NodeDef
          tag="CVT"
          name="Caveat"
          color="text-amber-600 dark:text-amber-400"
        >
          A limitation that <strong>qualifies a piece of evidence</strong> (not a
          claim) — e.g. a single-site sample, a retrospective design. Shown under
          the evidence it qualifies.
        </NodeDef>
      </Section>

      {/* good EVD */}
      <Section title="What a correct & complete EVD looks like">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <Li>
            <strong>Atomic.</strong> One finding. “LOS did not differ (IRR 0.94)”
            is one EVD; readmission is a <em>separate</em> EVD even from the same
            table.
          </Li>
          <Li>
            <strong>Verbatim-grounded.</strong> The quote is copied exactly from
            the paper and <em>actually states the finding</em> — it&apos;s the right
            sentence, not a coincidental keyword match. Page number present.
          </Li>
          <Li>
            <strong>Quantitatively faithful.</strong> Direction, magnitude,
            significance, and confidence intervals match the source. A null result
            is reported as a null result, not spun as an effect (or vice-versa).
          </Li>
          <Li>
            <strong>Grounded in the right object.</strong> If the finding lives in a
            table/figure, that object&apos;s crop is embedded — or it&apos;s correctly
            text-only.
          </Li>
          <Li>
            <strong>Methods context (What / How / Who).</strong>{" "}
            <em>What</em> = the observable measured (the outcome itself, not the
            design). <em>How</em> = the design and procedure. <em>Who</em> = the
            sample / setting it generalizes to. Each backed by its own quote.
          </Li>
          <Li>
            <strong>Linked to a claim with the right polarity.</strong> A null or
            contrary finding should <em>oppose</em> the claim it bears on, not
            support it.
          </Li>
        </ul>
      </Section>

      {/* good CLM */}
      <Section title="What a correct & complete CLM looks like">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <Li>
            <strong>One generalization.</strong> A claim that combines two distinct
            assertions should be split.
          </Li>
          <Li>
            <strong>Stated as a generalization, not a single result.</strong> “LEP
            is associated with longer stays” is a claim; “LOS was 2.26 vs 2.12 days”
            is evidence.
          </Li>
          <Li>
            <strong>Backed by evidence on both sides where it exists.</strong>{" "}
            Supporting and opposing EVDs are wired in; a contested claim should show
            both.
          </Li>
          <Li>
            <strong>Body-of-evidence appraisal is a human/clinician task.</strong>{" "}
            The certainty / GRADE judgment is authored by an expert, not the AI.
          </Li>
        </ul>
      </Section>

      {/* the checklist */}
      <Section title="The accuracy checklist (5 per evidence node)">
        <dl className="space-y-3 text-sm">
          <Dim name="Verbatim">
            Is the quote the right sentence, and does it match the PDF? (An audit
            already checked the <em>string</em>; you confirm the <em>meaning</em>.)
          </Dim>
          <Dim name="Grounding">
            Correct figure/table embedded — or correctly none.
          </Dim>
          <Dim name="Claim link &amp; polarity">
            Does this evidence really support / oppose the claim it&apos;s wired to?
          </Dim>
          <Dim name="Quant fidelity">
            Direction, magnitude, significance, CI faithful to the source.
          </Dim>
          <Dim name="Methods context">
            What / How / Who accurately describe the observable, design, and sample.
          </Dim>
        </dl>
      </Section>

      {/* verdicts */}
      <Section title="The five verdicts">
        <ul className="space-y-2 text-sm">
          <Verdict
            icon={<Check className="h-4 w-4" />}
            tone="text-primary"
            label="Correct"
          >
            Faithful as-is. The common case — one click.
          </Verdict>
          <Verdict
            icon={<Pencil className="h-4 w-4" />}
            tone="text-amber-600 dark:text-amber-400"
            label="Needs an edit"
          >
            Close but off — type the corrected value. This becomes a proposed fix.
          </Verdict>
          <Verdict
            icon={<X className="h-4 w-4" />}
            tone="text-rose-600 dark:text-rose-400"
            label="Wrong"
          >
            Not salvageable as written — say what&apos;s wrong.
          </Verdict>
          <Verdict
            icon={<RefreshCw className="h-4 w-4" />}
            tone="text-violet-600 dark:text-violet-400"
            label="Missing"
          >
            The element should exist but isn&apos;t there — e.g. a finding with no
            grounding quote, or a methods assertion the AI never extracted. Flags it
            for another extraction pass (say what&apos;s missing). Distinct from
            &ldquo;wrong&rdquo;: nothing was captured to be wrong.
          </Verdict>
          <Verdict
            icon={<Minus className="h-4 w-4" />}
            tone="text-muted-foreground"
            label="N/A"
          >
            The dimension genuinely doesn&apos;t apply (e.g. a text-only finding with
            no figure to ground).
          </Verdict>
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Effort scales with disagreement: an all-correct node is a few clicks; only
          edits need typing. Your name is attached to every judgment — you&apos;re
          <em> proposing</em> corrections, the maintainer commits them.
        </p>
      </Section>

      <div className="mt-10 flex gap-3">
        <Link
          href="/review/accuracy"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Start reviewing →
        </Link>
        <Link
          href="/about"
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/50"
        >
          Why discourse graphs?
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-heading text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm leading-relaxed">
      {children}
    </p>
  );
}

function NodeDef({
  tag,
  name,
  color,
  children,
}: {
  tag: string;
  name: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex gap-3">
      <span
        className={`mt-0.5 w-10 shrink-0 font-mono text-xs font-semibold ${color}`}
      >
        {tag}
      </span>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{name}.</span> {children}
      </p>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
      <span>{children}</span>
    </li>
  );
}

function Dim({ name, children }: { name: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded border border-border px-3 py-2">
      <dt className="font-medium">{name}</dt>
      <dd className="mt-0.5 text-muted-foreground">{children}</dd>
    </div>
  );
}

function Verdict({
  icon,
  tone,
  label,
  children,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 ${tone}`}>{icon}</span>
      <span className="text-muted-foreground">
        <span className="font-medium text-foreground">{label}</span> — {children}
      </span>
    </li>
  );
}
