import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LinkButton } from "@/components/link-button";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "What is a discourse graph?",
  description:
    "How to read this site. The graph is canonical; every claim, evidence item, question, method, and source is addressable. The paper is one rendered view over it.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="space-y-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          About
        </p>
        <h1 className="font-heading text-4xl font-semibold leading-[1.1] tracking-tight">
          What is a discourse graph, and why is the paper rendered as one?
        </h1>
      </div>

      <div className="prose-node mt-10 space-y-5 text-base leading-7">
        <p>
          A <strong>discourse graph</strong> is an alternative form of
          scientific communication. Instead of a single linear document, the
          argument is composed of typed nodes — Questions, Claims,
          Evidence, Methods, Sources — connected by typed edges:{" "}
          <em>addresses</em>, <em>supports</em>, <em>opposes</em>,{" "}
          <em>derived from</em>, <em>uses method</em>. Every node is
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
          remember; this project adds <strong>Method (M)</strong> as a fifth
          type for analytical instruments — taxonomies, formulas, frameworks
          — that Claims invoke but that are not Claims themselves.
        </p>

        <h2 className="font-heading">What discourse graphs change</h2>
        <p>
          The Resilient Data Futures whitepaper was written paper-first and
          then decomposed into a graph. That origin is unusual — discourse
          graphs are normally built incrementally, by contributors adding
          Questions, Claims, Evidence, and counter-evidence over time. We
          decomposed an existing paper to bootstrap the graph with real
          content, and to demonstrate what becomes possible once it exists.
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
          the methodologist who formalized a single instrument, the
          practitioner with one decisive field observation: each typically
          has to partner with a generalist who will wrap the piece in
          apparatus, or watch the contribution go uncredited. The graph
          removes the apparatus requirement. A Method, an Evidence, a
          Source, a single Claim is itself a complete, citable, credited
          contribution. Authorship stops being gated on the ability to
          produce a whole paper, and the population of people who can
          author scientific work expands to anyone with one good node.
        </p>
        <p>
          <strong>Credit becomes granular.</strong>{" "}
          Each node has its own ID and its own PID — citable independently. A Method, a Source,
          an Evidence, a Claim can be cited (and tracked) on its own merit.
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
          The original whitepaper, this site, and each composed narrative
          all derive from the same node files in <code>graph/</code>.
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
            <Link href="/narratives">/narratives</Link> renders the original
            whitepaper that seeded the graph, section by section, with each
            citation linked to its Source node. A toggle at the top swaps to
            other narratives composed directly from the graph for different
            audiences and framings.
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
            href="https://github.com/jring-o/rdf/blob/main/CONTRIBUTING.md"
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
            — Protocol Labs' framing of the form's research-infrastructure
            implications.
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
