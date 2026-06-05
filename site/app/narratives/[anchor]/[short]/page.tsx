import { notFound } from "next/navigation";
import Link from "next/link";

import {
  loadPaper,
  listNarratives,
  pickPrimary,
  type Narrative,
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
import type { NodeType } from "@/lib/types";

export const dynamicParams = false;

export async function generateStaticParams() {
  const narratives = await listNarratives();
  return narratives.map((n) => ({ anchor: n.anchorId, short: n.shortId }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ anchor: string; short: string }>;
}) {
  const { anchor, short } = await params;
  return {
    title: `Narrative · ${anchor} · ${short}`,
    description: `A narrative variant composed from the discourse graph, anchored at ${anchor}.`,
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

export default async function NarrativeVariantPage({
  params,
}: {
  params: Promise<{ anchor: string; short: string }>;
}) {
  const { anchor, short } = await params;
  const [narratives, graph, paper] = await Promise.all([
    listNarratives(),
    loadGraph(),
    loadPaper(),
  ]);
  const narrative = narratives.find(
    (n) => n.anchorId === anchor && n.shortId === short,
  );
  if (!narrative) notFound();

  const anchorNode = graph.nodes.get(narrative.anchorId);
  const toggleNarratives = buildToggleNarratives(narratives, (id) => {
    const node = graph.nodes.get(id);
    return node?.title ?? id;
  });

  const fm = narrative.frontmatter;
  const provenance = [
    fm.audience && `audience: ${fm.audience}`,
    fm.length && `length: ${fm.length}`,
    fm.voice && `voice: ${fm.voice}`,
    fm.bundle && `bundle: ${fm.bundle}${fm.breadth ? ` (${fm.breadth})` : ""}`,
    fm.depth && !fm.bundle && `depth: ${fm.depth}`,
    fm.model && `model: ${fm.model}`,
    fm.generatedAt && `generated: ${fm.generatedAt}`,
    fm.contributor && `by: @${fm.contributor}`,
  ].filter((s): s is string => Boolean(s));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="space-y-4 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Composed narrative · {narrative.anchorId} · {narrative.shortId}
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          {anchorNode?.title ?? narrative.anchorId}
        </h1>

        <div className="space-y-3 text-muted-foreground">
          <p>
            A composed narrative anchored at{" "}
            {anchorNode ? (
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
              <span className="font-mono">{narrative.anchorId}</span>
            )}
            . The graph is the source of truth; this is one telling.
          </p>
          {provenance.length > 0 && (
            <p className="font-mono text-xs">{provenance.join(" · ")}</p>
          )}
          <p className="text-xs">
            <Link
              href={`/narratives/${narrative.anchorId}`}
              className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
            >
              Back to the primary narrative for {narrative.anchorId}.
            </Link>
          </p>
        </div>

        <PaperViewToggle
          active={{ kind: "narrative", slug: narrative.slug }}
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

      {narrative.sidecar && (
        <div className="mx-auto max-w-3xl mb-10">
          <BundleSummary
            data={sidecarToSummaryData(narrative.sidecar)}
            defaultOpen={false}
          />
        </div>
      )}

      <article className="mx-auto max-w-3xl min-w-0" data-pagefind-body>
        <MarkdownProse source={narrative.body} />
      </article>
    </div>
  );
}
