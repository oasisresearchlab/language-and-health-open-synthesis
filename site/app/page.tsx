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
    shortLabel: n.shortLabel,
  }));
  const previewEdges = Array.from(graph.nodes.values()).flatMap((n) =>
    n.outgoing
      .filter((o) => graph.nodes.has(o.to))
      .map((o) => ({ from: n.id, to: o.to, edge: o.edge })),
  );

  // Best-supported claims: ranked by distinct supporting papers, excluding contested ones
  // (≥2 opposing papers). Mechanical evidence-breadth, not a certainty rating (expert-only).
  const topClaims = Array.from(graph.nodes.values())
    .filter(
      (n) =>
        n.type === "claim" &&
        (n.supportPapers ?? 0) >= 2 &&
        (n.opposePapers ?? 0) < 2,
    )
    .sort((a, b) => (b.supportPapers ?? 0) - (a.supportPapers ?? 0))
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      {/* Section 1 — Substance */}
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-12 lg:items-start">
        <div className="space-y-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            An open evidence synthesis
          </p>
          <h1 className="font-heading text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Language Access in Healthcare
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Language concordance</strong> —
            matching patients with providers or interpreters who share their
            language — is linked to better treatment adherence, shorter
            hospital stays, and fewer harmful miscommunications. Yet the
            evidence is scattered across many studies, with unsettled
            definitions and effects that depend heavily on context. This is an
            open synthesis of that literature: every question, claim, piece of
            evidence, and caveat is extracted as an addressable node —
            AI-assisted and expert-curated — so you can trace what holds, for
            whom, and under what conditions.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <LinkButton href="/graph" size="lg">
              Explore the graph
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </LinkButton>
            <LinkButton href="/nodes" size="lg" variant="outline">
              Browse the evidence
            </LinkButton>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Best-supported claims
          </p>
          <ul className="space-y-3">
            {topClaims.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/node/${c.id}`}
                  className="group flex flex-col gap-1.5 rounded-md border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <NodeBadge type="claim" size="sm" />
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {c.supportPapers} papers
                      {(c.opposePapers ?? 0) > 0
                        ? ` · ${c.opposePapers} opposing`
                        : ""}
                    </span>
                  </div>
                  <p className="text-sm leading-snug text-foreground">
                    {c.title}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Ranked by independent supporting papers (with little or no
            contradicting evidence) — a measure of evidential breadth, not a
            final certainty rating.
          </p>
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
            Every question, claim, evidence item, caveat, and source is its
            own addressable node. You cite a claim by ID, contradict it with
            a counter-claim, qualify a finding with a caveat, or support it
            with a single new piece of evidence — without writing a paper
            around it. As studies accumulate, claims gather supporting and
            opposing evidence in place.
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
            follow. See the structure at a glance, follow a question down to
            its evidence, or open a single node and follow its edges from
            there. Each path covers the same set of questions, claims,
            evidence, caveats, and sources. Over time, as the graph grows, the
            seams between papers begin to dissolve: a Claim, an Evidence item,
            a Caveat belongs to the graph of human discourse — becomes a part
            of whatever uses it — not to any single publication that happened
            to introduce it.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <ProjectionLink
            href="/graph"
            title="Topology"
            body="The whole graph at a glance — every node coloured by type, every edge by relation. Filter by type or curation status to separate expert-verified findings from initial AI drafts; click any node to surface its bundle. The fastest way to see how the evidence actually connects."
          />
          <ProjectionLink
            href="/narratives"
            title="Narratives"
            body="Linear readings composed from the graph — each a dated view of a specific bundle around a question, a claim, some evidence, generated by traversing the graph directly. Or generate your own from any anchor on demand."
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
