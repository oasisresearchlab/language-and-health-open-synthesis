import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LinkButton } from "@/components/link-button";
import { Separator } from "@/components/ui/separator";
import { NodeBadge } from "@/components/node-badge";
import { NODE_TYPE_DEFINITION, NODE_TYPE_LABEL } from "@/lib/types";

const GLOSSARY: { type: Parameters<typeof NodeBadge>[0]["type"]; def: string }[] =
  [
    { type: "question", def: NODE_TYPE_DEFINITION.question! },
    { type: "claim", def: NODE_TYPE_DEFINITION.claim! },
    { type: "evidence", def: NODE_TYPE_DEFINITION.evidence! },
    { type: "source", def: NODE_TYPE_DEFINITION.source! },
    { type: "artifact", def: NODE_TYPE_DEFINITION.artifact! },
  ];

export const metadata = {
  title: "What is a discourse graph?",
  description:
    "How to read this site. The graph is canonical; every question, claim, evidence item, caveat, and source is addressable. Narratives are rendered views over it.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="space-y-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          About
        </p>
        <h1 className="font-heading text-4xl font-semibold leading-[1.1] tracking-tight">
          What is a discourse graph, and why is this synthesis rendered as one?
        </h1>
      </div>

      <div className="prose-node mt-10 space-y-5 text-base leading-7">
        <p>
          A <strong>discourse graph</strong> is an alternative form of
          scientific communication. Instead of a single linear document, the
          argument is composed of typed nodes — Questions, Claims,
          Evidence, Sources — connected by typed edges:{" "}
          <em>addresses</em>, <em>supports</em>, <em>opposes</em>,{" "}
          <em>derived from</em>, <em>qualifies</em>. Every node is
          self-contained, addressable, and individually contributable.
        </p>
        <p>
          The form was developed by{" "}
          <a
            href="https://discoursegraphs.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Joel Chan, Matthew Akamatsu, and collaborators
          </a>
          , and refined inside Roam Research, Protocol Labs, and adjacent
          research communities. The Q/C/E/S core schema is small enough to
          remember; this synthesis extends it with a few types specific to
          evidence work: <strong>Caveat</strong> (a limitation that qualifies a
          piece of Evidence) and <strong>Artifact</strong> (a concrete
          intervention or system — a tablet-on-wheels interpreting cart, a
          bilingual-provider program — that the evidence is about).
        </p>

        <dl className="grid gap-x-6 gap-y-3 rounded-lg border border-border bg-card/50 p-5 sm:grid-cols-[auto_1fr]">
          {GLOSSARY.map(({ type, def }) => (
            <div
              key={type}
              className="contents sm:grid sm:grid-cols-subgrid sm:col-span-2"
            >
              <dt className="flex items-start">
                <NodeBadge type={type} size="sm" />
              </dt>
              <dd className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">
                  {NODE_TYPE_LABEL[type]}.
                </span>{" "}
                {def}
              </dd>
            </div>
          ))}
        </dl>

        <h2 className="font-heading">How this synthesis is built</h2>
        <p>
          This graph is extracted from the published literature on language
          access in healthcare, working from a curated corpus of research
          papers. An AI-assisted pipeline reads each paper and drafts the
          nodes — the Questions it asks, the Claims it makes, the Evidence
          behind them, and the Caveats that bound them — every quote grounded
          verbatim against the source. Domain experts then review and commit:
          the AI <em>proposes</em>, the human <em>verifies</em>. Every node
          therefore carries a <strong>curation status</strong> —{" "}
          <em>Initial AI draft</em>, <em>In expert review</em>, or{" "}
          <em>Expert-verified</em> — and you can filter the{" "}
          <Link href="/graph">topology</Link> by it to separate what an expert
          has checked from what is still a first draft. Nothing here is a
          finished review; it is a living evidence base that gets stronger as
          claims accumulate supporting and opposing evidence over time.
        </p>
        <p>
          <strong>Contributions become atomic.</strong>{" "}
          A paper bundles a question, methods, claims, and evidence
          together; none of it gets published until all of it does. To
          share one new observation, you write the surrounding apparatus —
          introduction, methods, related work, discussion — even when
          none of that is new. A discourse graph removes the bundle. One
          new observation is one Evidence node, with edges to the Claims
          it supports or opposes. One new assertion is one Claim node,
          addressing a Question and supporting or opposing other Claims.
          One new line of inquiry is one Question node. Each attaches to
          what it bears on, and that&apos;s the contribution.
        </p>
        <p>
          <strong>Specialists become authors.</strong>{" "}
          A paper demands generalist scaffolding — introduction, methods,
          related work, framing, discussion — so the people who hold one
          sharp contribution often can&apos;t be authors on their own
          terms. The data curator who tracked down a hard-to-find Source,
          the clinician who can name the caveat that bounds a finding, the
          practitioner with one decisive field observation: each typically
          has to partner with a generalist who will wrap the piece in
          apparatus, or watch the contribution go uncredited. The graph
          removes the apparatus requirement. A Caveat, an Evidence item, a
          Source, a single Claim is itself a complete, citable, credited
          contribution. Authorship stops being gated on the ability to
          produce a whole paper, and the population of people who can
          author scientific work expands to anyone with one good node.
        </p>
        <p>
          <strong>Credit becomes granular.</strong>{" "}
          Each node has its own ID and its own PID — citable independently. A Caveat, a Source,
          an Evidence item, a Claim can be cited (and tracked) on its own merit.
          The contributor who proposed C-0017 gets credit when C-0017 is
          invoked, even when the paper that introduced it isn&apos;t.
          Funders, hiring committees, and citation indexes can resolve
          attribution to the unit of contribution rather than rolling it
          up into &ldquo;lead author of paper X.&rdquo;
        </p>
        <p>
          <strong>Review becomes a linter; validation becomes topological.</strong>{" "}
          Peer review of a paper bundles many things at once —
          gatekeeping, wording, framing, validating the work, signaling
          trust to the reader. The bundle dissolves at the node level.
          Reviewing a node is mostly form-checking: does this Evidence
          cite the Source it claims, is the Claim it points at really a
          Claim, is the prose self-contained. Most of that is lintable.
          The substantive work — what&apos;s true, what holds up, what
          matters — doesn&apos;t happen in a review pass; it happens in
          the graph itself, over time. A weak Claim accumulates opposing
          Evidence. A strong one accumulates supporting Evidence and
          Claims that build on it. The trust signal is the topology, not a
          stamp.
        </p>
        <p>
          <strong>Publishing becomes continuous.</strong>{" "}
          A paper waits — for a journal slot, a conference deadline, a
          grant cycle, an annual report. By the time the work appears it
          is often eighteen months old, and a counter-finding discovered
          next week has nowhere to land until the next cycle opens. The
          graph has no cycle. A new Evidence node ships the day it is
          found; a counter-Claim ships the day it is formulated; a
          Question that opens up at midnight is addressable by morning.
          Publishing tracks the rhythm of inquiry instead of the rhythm of
          institutions.
        </p>
        <p>
          <strong>Narratives become snapshots.</strong>{" "}
          A paper captures the state of the argument at the moment it was
          written, and that is the state it continues to assert long after
          the evidence has moved. A narrative composed from the graph is
          dated by construction. Today&apos;s telling reflects today&apos;s
          evidence; next year&apos;s telling, regenerated against a graph
          that has accumulated supporting and opposing evidence in the
          meantime, is a different telling. Nothing is rewritten — the
          underlying nodes have moved, and the rendering follows. The
          narrative is a view of the graph at a moment in time, and
          another view can be composed whenever it is useful.
        </p>
        <p>
          This site and each composed narrative all derive from the same node
          files in <code>graph/</code>.
        </p>

        <h2 className="font-heading">
          Why this form — a revisable intermediate representation
        </h2>
        <p>
          Ways of organizing a literature sit on a spectrum. At one end,{" "}
          <strong>literature graphs</strong> (citation networks, topic maps)
          cover almost everything but say little about what any of it{" "}
          <em>means</em>. At the other, <strong>knowledge graphs</strong> and{" "}
          <strong>meta-analyses</strong> are richly expressive — typed entities
          and relations, pooled effect sizes — but only over the narrow slice of
          a literature that has been forced into a fixed schema or a single
          shared construct. A <strong>discourse graph</strong> sits in the
          middle: expressive enough to reason over, broad enough to cover a
          messy literature, and — crucially — carrying granular{" "}
          <strong>provenance and uncertainty</strong> on every node.
        </p>
        <p>
          That middle position is the point, not a compromise. The graph is an{" "}
          <strong>intermediate representation</strong> — like a compiler&apos;s
          IR between source code and machine code. Source papers compile{" "}
          <em>into</em> the graph once; the graph then compiles <em>out</em> to
          whatever you need — a narrative, a knowledge graph, a meta-analysis for
          the sub-question where the evidence is commensurable. The expensive,
          lossy step — reading the papers — happens once. When the model has to
          change (a construct splits in two, a schema is revised, a moderator
          turns out to matter) you <strong>re-wire the graph</strong>; you do not
          re-read the corpus. Revising a model built on the graph is cheap; going
          destructively back to the source texts to start over is not.
        </p>
        <p>
          That makes the graph a <strong>resource people build on directly</strong>,
          not just a finished output. A natural extension is letting a reader
          pick a claim&apos;s body of evidence and run a{" "}
          <strong>living meta-analysis of their own choosing</strong> over it —
          assembling the commensurable Evidence, pooling it under assumptions
          they can see and contest, and having it <em>re-run as new evidence
          lands</em> — rather than inheriting one pooled estimate, frozen at
          publication, that someone else chose for them.
        </p>
        <p>
          This is why <strong>Evidence and Claims are distinct node types</strong>.
          A Claim is a compressed, generalized assertion — modular and quotable,
          but <em>lossy</em>: it has abstracted away the particulars. An Evidence
          node is the balance point between compression and context — modular
          enough to reuse, yet grounded in a verbatim quote and linked to the
          specific methods that produced it (its What, How, and Who). That
          retained context is what lets the graph be synthesized{" "}
          <em>responsibly</em>: deciding whether two findings measure the same
          construct, reasoning about whether they are commensurable enough to
          pool, noticing a hidden moderator that explains why they disagree.
          Compile straight from text to one pooled number and those judgments are
          made silently and irreversibly; hold them in the graph and they stay
          explicit and contestable.
        </p>
        <p>
          The longer-term aim is to make even this cheaper: if research were{" "}
          <strong>modular by construction</strong> — a finding published as a
          grounded, addressable unit in the first place — the extraction step
          that builds this graph would be less necessary, or unnecessary. This
          synthesis extracts the graph from conventional papers because that is
          the literature we have; the form points at a world where the graph{" "}
          <em>is</em> the literature.
        </p>

        <h2 className="font-heading">How to read it</h2>
        <ul>
          <li>
            <strong>By topology</strong>:{" "}
            <Link href="/graph">/graph</Link> shows the whole argument at a
            glance. Nodes are colored by type; edges are colored by relation.
            Click any node to inspect its bundle — everything one hop away.
          </li>
          <li>
            <strong>As narratives</strong>:{" "}
            <Link href="/narratives">/narratives</Link> renders linear readings
            composed directly from the graph, with each citation linked to its
            Source node. A toggle at the top swaps between narratives written
            for different audiences and framings.
          </li>
          <li>
            <strong>By node</strong>: every node sits at{" "}
            <code>/node/&lt;ID&gt;</code>. Each page shows the prose body,
            outbound edges, inbound backlinks, and a deep link to open a
            GitHub issue about that one node.
          </li>
        </ul>

        <h2 className="font-heading">How to contribute</h2>
        <p>
          Discussion happens at node granularity. Open an issue with the{" "}
          <code>node:&lt;ID&gt;</code>{" "}
          label, or open a pull request that
          adds a counterclaim, counter-evidence, or a new question. The full
          contribution model lives in{" "}
          <a
            href="https://github.com/oasisresearchlab/language-and-health-open-synthesis/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            CONTRIBUTING.md
          </a>
          .
        </p>

        <h2 className="font-heading">Further reading</h2>
        <ul>
          <li>
            <a
              href="https://discoursegraphs.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              discoursegraphs.com
            </a>{" "}
            — the canonical Q/C/E framework and its provenance.
          </li>
          <li>
            <a
              href="https://research.protocol.ai/blog/2023/discourse-graphs-and-the-future-of-science/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discourse graphs and the future of science
            </a>{" "}
            — Protocol Labs&apos; framing of the form&apos;s
            research-infrastructure implications.
          </li>
          <li>
            <a
              href="https://github.com/DiscourseGraphs/schemas"
              target="_blank"
              rel="noopener noreferrer"
            >
              DiscourseGraphs/schemas
            </a>{" "}
            — the underlying schema repository this work extends.
          </li>
        </ul>
      </div>

      <Separator className="my-12" />
      <div className="flex flex-wrap gap-3">
        <LinkButton href="/graph">
          Open the topology
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </LinkButton>
        <LinkButton href="/narratives" variant="outline">
          Read the narratives
        </LinkButton>
      </div>
    </article>
  );
}
