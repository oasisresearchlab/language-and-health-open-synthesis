import { notFound } from "next/navigation";
import Link from "next/link";

import {
  loadPaper,
  listNarratives,
  pickPrimary,
  type Narrative,
  type NarrativeFrontmatter,
} from "@/lib/paper";
import { loadGraph } from "@/lib/graph";
import { MarkdownProse } from "@/components/markdown-prose";
import {
  PaperViewToggle,
  type PaperToggleNarrative,
} from "@/components/paper-view-toggle";
import { BundleSummary, type BundleSummaryData } from "@/components/bundle-summary";
import { NodeBadge } from "@/components/node-badge";
import { Separator } from "@/components/ui/separator";
import type { GraphNode, NodeType } from "@/lib/types";

export const dynamicParams = false;

export async function generateStaticParams() {
  const narratives = await listNarratives();
  const anchors = new Set(narratives.map((n) => n.anchorId));
  return Array.from(anchors).map((anchor) => ({ anchor }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ anchor: string }>;
}) {
  const { anchor } = await params;
  return {
    title: `Composed narrative · ${anchor}`,
    description: `A narrative composed from the discourse graph, anchored at ${anchor}.`,
  };
}

function sidecarToSummaryData(
  sidecar: NonNullable<Narrative["sidecar"]>,
): BundleSummaryData {
  const bundle = sidecar.bundle ?? "1-hop";
  const breadth = sidecar.breadth;
  const strategyLabel =
    bundle === "semantic"
      ? `semantic walk${breadth ? ` · ${breadth}` : ""}`
      : `${bundle === "2-hop" ? 2 : 1}-hop walk`;
  return {
    anchor: sidecar.anchor,
    nodes: sidecar.nodes.map((n) => ({
      id: n.id,
      type: n.type as NodeType,
      title: n.title,
      isAnchor: n.isAnchor,
    })),
    edges: sidecar.edges,
    strategyLabel,
  };
}

function buildToggleNarratives(
  all: Narrative[],
  graphTitleFor: (anchorId: string) => string,
): PaperToggleNarrative[] {
  const byAnchor = new Map<string, Narrative[]>();
  for (const n of all) {
    const list = byAnchor.get(n.anchorId) ?? [];
    list.push(n);
    byAnchor.set(n.anchorId, list);
  }
  return all.map((n) => {
    const anchorList = byAnchor.get(n.anchorId) ?? [];
    const primary = pickPrimary(anchorList);
    const isPrimary = primary?.shortId === n.shortId;
    const formBits = [n.frontmatter.audience, n.frontmatter.voice].filter(
      (s): s is string => Boolean(s),
    );
    return {
      slug: n.slug,
      anchorId: n.anchorId,
      href: isPrimary
        ? `/narratives/${n.anchorId}`
        : `/narratives/${n.anchorId}/${n.shortId}`,
      title: graphTitleFor(n.anchorId),
      sublabel: formBits.length ? formBits.join(" · ") : "Composed · anchored",
    };
  });
}

function BundleDescription({
  anchorNode,
  anchorId,
  frontmatter,
}: {
  anchorNode: GraphNode | undefined;
  anchorId: string;
  frontmatter: NarrativeFrontmatter;
}) {
  const anchorLink = anchorNode ? (
    <Link
      href={`/node/${anchorNode.id}`}
      className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
    >
      <span className="inline-flex items-center gap-1.5">
        <NodeBadge type={anchorNode.type} size="sm" />
        {anchorNode.id}
      </span>
    </Link>
  ) : (
    <span className="font-mono">{anchorId}</span>
  );

  // Resolve strategy. `bundle` is the canonical record; older narratives may
  // only have `depth` (1 or 2) and no `bundle` field.
  const bundle =
    frontmatter.bundle ?? (frontmatter.depth === 2 ? "2-hop" : "1-hop");
  const closer =
    "The bundle is then handed to an LLM to generate a narrative, work that will improve as models continue to improve.";

  if (bundle === "semantic") {
    const breadth = frontmatter.breadth;
    const breadthThreshold =
      breadth === "tight" ? "≥3" : breadth === "wide" ? "≥1" : "≥2";
    const breadthLabel = breadth ?? "balanced";

    let body: React.ReactNode;
    if (anchorNode?.type === "question") {
      body = (
        <>
          From a Question anchor, that pulls its addressing Claims, each
          Claim&apos;s supporting and opposing Evidence with their Sources, the
          Methods used, and counter-Claims expanded recursively along
          opposes-chains; related Questions join when {breadthThreshold}{" "}
          in-bundle Claims address them ({breadthLabel} breadth). The walk
          stops on topology, not depth.
        </>
      );
    } else if (anchorNode?.type === "claim") {
      body = (
        <>
          From a Claim anchor, that pulls the argumentation lattice around it:
          the Question it addresses, supporting and opposing Evidence with
          their Sources, the Methods used, and counter-Claims expanded
          recursively along opposes-chains; related Questions join when{" "}
          {breadthThreshold} in-bundle Claims address them ({breadthLabel}{" "}
          breadth). The walk stops on topology, not depth.
        </>
      );
    } else {
      body = (
        <>
          The walk pulls neighbors by argumentative role ({breadthLabel}{" "}
          breadth) and stops on topology, not depth.
        </>
      );
    }

    return (
      <p>
        This page is one such narrative. The bundle around {anchorLink} was
        assembled by a <strong>semantic walk</strong> — a type-aware traversal
        driven by argumentative role rather than hop count. {body} {closer}
      </p>
    );
  }

  if (bundle === "2-hop") {
    return (
      <p>
        This page is one such narrative. The bundle around {anchorLink} is its{" "}
        <strong>depth-2 neighborhood</strong> — the anchor, its direct
        neighbors, and their neighbors in turn, regardless of edge type.{" "}
        {closer}
      </p>
    );
  }

  return (
    <p>
      This page is one such narrative. The bundle around {anchorLink} is its{" "}
      <strong>depth-1 neighborhood</strong> — the anchor plus every node it
      directly points to or is pointed at, regardless of edge type. {closer}
    </p>
  );
}

export default async function NarrativePage({
  params,
}: {
  params: Promise<{ anchor: string }>;
}) {
  const { anchor } = await params;
  const [narratives, graph, paper] = await Promise.all([
    listNarratives(),
    loadGraph(),
    loadPaper(),
  ]);
  const forAnchor = narratives.filter((n) => n.anchorId === anchor);
  const primary = pickPrimary(forAnchor);
  if (!primary) notFound();
  const variants = forAnchor.filter((n) => n.shortId !== primary.shortId);
  const anchorNode = graph.nodes.get(primary.anchorId);

  const toggleNarratives = buildToggleNarratives(narratives, (id) => {
    const node = graph.nodes.get(id);
    return node?.title ?? id;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="space-y-4 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Composed narrative · anchored at {primary.anchorId}
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          {anchorNode?.title ?? primary.anchorId}
        </h1>

        <div className="space-y-3 text-muted-foreground">
          <p>
            Discourse graphs aren&apos;t designed to be read linearly. Once a
            graph exists — whether decomposed from a paper, accumulated
            through contributions, or both — narratives are composed by
            anchoring at a node and traversing its neighborhood. Each is a
            dated view of the argument at the moment it was rendered;
            regenerated next year against a graph that has accumulated new
            supporting and opposing evidence, the same anchor produces a
            different telling.
          </p>
          <BundleDescription
            anchorNode={anchorNode}
            anchorId={primary.anchorId}
            frontmatter={primary.frontmatter}
          />
          <p className="text-xs">
            Want to see the bundle this narrative drew from?{" "}
            <Link
              href={`/graph/${primary.anchorId}`}
              className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
            >
              Inspect the bundle visually.
            </Link>
          </p>
          {variants.length > 0 && (
            <p className="text-xs">
              {variants.length} other variant{variants.length === 1 ? "" : "s"}{" "}
              for this anchor:{" "}
              {variants.map((v, i) => (
                <span key={v.shortId}>
                  <Link
                    href={`/narratives/${v.anchorId}/${v.shortId}`}
                    className="font-mono text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
                  >
                    {v.shortId}
                  </Link>
                  {i < variants.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
          )}
        </div>

        <PaperViewToggle
          active={{ kind: "narrative", slug: primary.slug }}
          narratives={toggleNarratives}
        />
        {!paper.raw ? null : (
          <p className="text-xs text-muted-foreground">
            Looking for the source paper this graph was decomposed from?{" "}
            <Link href="/narratives" className="text-primary underline">
              Read the original whitepaper.
            </Link>
          </p>
        )}
      </header>

      <Separator className="my-10" />

      {primary.sidecar && (
        <div className="mx-auto max-w-3xl mb-10">
          <BundleSummary
            data={sidecarToSummaryData(primary.sidecar)}
            defaultOpen={false}
          />
        </div>
      )}

      <article
        className="mx-auto max-w-3xl min-w-0"
        data-pagefind-body
      >
        <MarkdownProse source={primary.body} />
      </article>
    </div>
  );
}
