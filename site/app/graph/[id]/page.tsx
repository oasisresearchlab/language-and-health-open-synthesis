import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { loadGraph, getAllNodeIds } from "@/lib/graph";
import { buildBundle } from "@/lib/bundle";
import { BundleExplorer } from "@/components/bundle-explorer";
import { GraphLegend } from "@/components/graph-legend";
import { NodeBadge } from "@/components/node-badge";
import { LinkButton } from "@/components/link-button";
import { Separator } from "@/components/ui/separator";

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await getAllNodeIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: `Bundle · ${id}`,
    description: `Depth-1 bundle around ${id}.`,
  };
}

export default async function BundlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [graph, bundle] = await Promise.all([loadGraph(), buildBundle(id)]);
  if (!bundle) notFound();
  const node = graph.nodes.get(id)!;

  const enrichedBundleNodes = bundle.nodes.map((n) => {
    const full = graph.nodes.get(n.id);
    return {
      ...n,
      status: full?.status,
      sections: full?.sections,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="space-y-4 max-w-3xl">
        <LinkButton
          href={`/node/${node.id}`}
          variant="ghost"
          size="sm"
          className="font-sans text-xs -ml-2 self-start"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Back to {node.id}
        </LinkButton>
        <div className="flex items-center gap-2">
          <NodeBadge type={node.type} />
          <span className="font-mono text-xs text-muted-foreground">{node.id}</span>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Bundle around <span className="text-primary">{node.title}</span>
        </h1>
        <p className="text-muted-foreground">
          The anchor plus every node it directly points to or is pointed at.
          Use the &ldquo;+1 hop&rdquo; button to expand outward — each click
          adds the next ring of neighbors.
        </p>
      </header>

      <Separator className="my-8" />

      <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 self-start">
          <GraphLegend />
        </aside>
        <BundleExplorer
          anchorId={node.id}
          initialNodes={enrichedBundleNodes}
          initialEdges={bundle.edges}
          initialDepth={1}
        />
      </div>
    </div>
  );
}
