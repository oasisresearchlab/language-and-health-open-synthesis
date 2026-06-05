import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LinkButton } from "@/components/link-button";
import { Separator } from "@/components/ui/separator";
import { loadGraph } from "@/lib/graph";
import { type NodeType } from "@/lib/types";
import { NodeBadge } from "@/components/node-badge";
import { GraphViewClient } from "@/components/graph-view-loader";

const TYPE_ANCHOR: Record<NodeType, string> = {
  question: "questions",
  claim: "claims",
  evidence: "evidence",
  method: "methods",
  source: "sources",
  evidencepattern: "evidence-patterns",
  artifact: "artifacts",
};

export default async function HomePage() {
  const graph = await loadGraph();
  const counts = (Object.entries(graph.byType) as [NodeType, unknown[]][]).map(
    ([type, list]) => ({ type, count: list.length }),
  );
  const previewNodes = Array.from(graph.nodes.values()).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
  }));
  const previewEdges = Array.from(graph.nodes.values()).flatMap((n) =>
    n.outgoing
      .filter((o) => graph.nodes.has(o.to))
      .map((o) => ({ from: n.id, to: o.to, edge: o.edge })),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      {/* Section 1 — Substance */}
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-12 lg:items-start">
        <div className="space-y-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            A SciOS whitepaper
          </p>
          <h1 className="font-heading text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Resilient Data Futures
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            The SciOS <em>Resilient Data Futures</em> whitepaper argues that
            research data loss is architectural rather than operational — and
            that the accumulated loss carries roughly{" "}
            <strong className="text-foreground">$1.1 billion per year</strong>{" "}
            in latent liability at a representative R1. The same architecture
            that hedges that liability also produces the infrastructure
            AI-ready data requires.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <LinkButton href="/narratives" size="lg">
              Read the paper
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </LinkButton>
          </div>
        </div>

        <div className="space-y-6">
          <Stat
            value="73–93%"
            label="of published research can't produce its data on request"
            nodeId="C-0002"
          />
          <Stat
            value="$1.1B / yr"
            label="latent liability at a representative R1 ($200M annual research)"
            nodeId="C-0005"
          />
          <Stat
            value="191"
            label="research data repositories closed since 2012"
            nodeId="E-0006"
          />
        </div>
      </section>

      <Separator className="my-16" />

      {/* Section 2 — Form */}
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-12 lg:items-start">
        <div className="space-y-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            The form
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            We publish the argument as a discourse graph
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Every claim, evidence item, question, method, and source is its
            own addressable node. You cite a claim by ID, contradict it with
            a counter-claim, or support it with a single new piece of
            evidence — without writing a paper around it. Narratives composed
            from the graph regenerate as new nodes accumulate.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <LinkButton href="/about" size="lg">
              What is a discourse graph?
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </LinkButton>
          </div>
          <div className="grid grid-cols-5 gap-2 pt-2">
            {counts.map(({ type, count }) => (
              <Link
                key={type}
                href={`/nodes#${TYPE_ANCHOR[type]}`}
                className="group flex flex-col gap-1.5 rounded-md border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <NodeBadge type={type} size="sm" />
                <p className="font-heading text-xl font-semibold tabular-nums leading-none">
                  {count}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <GraphViewClient
            nodes={previewNodes}
            edges={previewEdges}
            layout="cose"
            height={380}
            interactive={false}
            zoomBoost={1.7}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              {graph.nodes.size} nodes · {previewEdges.length} edges
            </p>
            <Link
              href="/graph"
              className="inline-flex items-center gap-1.5 font-sans text-xs font-medium text-primary hover:underline"
            >
              View full graph
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <Separator className="my-16" />

      {/* Section 3 — Three ways into the graph */}
      <section className="space-y-8">
        <div className="space-y-4 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Where to start
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Engaging with a discourse graph
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            A discourse graph isn&apos;t read like a paper. There&apos;s no
            fixed reading order — readers choose where to enter and what to
            follow. See the structure at a glance, read the argument end-to-end, or open a single node
            and follow its edges from there. Each path covers the same
            set of claims, evidence, questions, methods, and
            sources. Over time, as the graph grows, the seams between papers begin to dissolve: a Claim, an
            Evidence item, a Method belongs to the graph of human discourse — becomes a part of whatever uses it — not to any single
            publication that happened to introduce it. 
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <ProjectionLink
            href="/graph"
            title="Topology"
            body="The whole graph at a glance — every node coloured by type, every edge by relation. Filter by type, section, or status; click any node to surface its bundle. The fastest way to see how the argument actually connects."
          />
          <ProjectionLink
            href="/narratives"
            title="Narratives"
            body="The original whitepaper plus narratives composed from the graph — each a dated view of a specific bundle around a claim, a question, some evidence, generated by traversing the graph directly. Or generate your own from any anchor on demand."
          />
          <ProjectionLink
            href="/nodes"
            title="Browse Nodes"
            body="Every node sits at its own URL — body, outbound edges, inbound backlinks, all computed at build time. Cite a single claim or piece of evidence the way you'd cite a paper, or open a discussion against any node by ID."
          />
        </div>
      </section>
    </div>
  );
}

function Stat({
  value,
  label,
  nodeId,
}: {
  value: string;
  label: string;
  nodeId: string;
}) {
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <p className="font-heading text-2xl font-semibold tabular-nums sm:text-3xl">
        {value}
      </p>
      <p className="text-xs leading-snug text-muted-foreground">{label}</p>
      <Link
        href={`/node/${nodeId}`}
        className="inline-flex font-mono text-[10px] uppercase tracking-[0.15em] text-primary/80 hover:text-primary"
      >
        Citation: {nodeId}
      </Link>
    </div>
  );
}

function ProjectionLink({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <h3 className="font-heading text-lg font-semibold tracking-tight">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      <div className="mt-auto pt-6">
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
      </div>
    </Link>
  );
}
