import Link from "next/link";

import { loadGraph } from "@/lib/graph";
import { GraphTopologyClient } from "@/components/graph-topology-client";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "Graph topology",
  description:
    "The whole discourse graph rendered as a force-directed view. Each node is one assertion, observation, question, source, or method.",
};

export default async function GraphTopologyPage() {
  const graph = await loadGraph();
  const nodes = Array.from(graph.nodes.values()).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    status: n.status,
    sections: n.sections,
  }));
  const edges = Array.from(graph.nodes.values()).flatMap((n) =>
    n.outgoing
      .filter((o) => graph.nodes.has(o.to))
      .map((o) => ({ from: n.id, to: o.to, edge: o.edge })),
  );

  const sectionSet = new Set<string>();
  for (const n of nodes) {
    for (const s of n.sections ?? []) sectionSet.add(s);
  }
  const availableSections = Array.from(sectionSet).sort(sectionCompare);

  const statusSet = new Set<string>();
  for (const n of nodes) {
    if (n.status) statusSet.add(n.status);
  }
  const availableStatuses = Array.from(statusSet).sort();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="space-y-4 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Topology
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          The whole graph
        </h1>
        <p className="text-muted-foreground">
          {graph.nodes.size} nodes, {edges.length} edges. Click any node to
          inspect its details, or use the filters to isolate a layer of the
          argument. For a focused view of one node and its neighbors, use the{" "}
          <Link href="/nodes" className="underline">
            per-node browse
          </Link>{" "}
          and follow &ldquo;Inspect bundle.&rdquo;
        </p>
      </header>

      <Separator className="my-8" />

      <GraphTopologyClient
        nodes={nodes}
        edges={edges}
        availableSections={availableSections}
        availableStatuses={availableStatuses}
      />
    </div>
  );
}

/** Sort §1.2 before §10.3 — natural for paper sections. */
function sectionCompare(a: string, b: string) {
  const re = /(\d+)/g;
  const an = (a.match(re) ?? []).map(Number);
  const bn = (b.match(re) ?? []).map(Number);
  for (let i = 0; i < Math.max(an.length, bn.length); i++) {
    const ai = an[i] ?? 0;
    const bi = bn[i] ?? 0;
    if (ai !== bi) return ai - bi;
  }
  return a.localeCompare(b);
}
