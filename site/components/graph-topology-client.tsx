"use client";

import * as React from "react";

import { GraphViewClient } from "@/components/graph-view-loader";
import { GraphLegend } from "@/components/graph-legend";
import {
  GraphFilters,
  defaultFilters,
  type GraphFiltersState,
} from "@/components/graph-filters";
import type { GraphViewEdge, GraphViewNode } from "@/components/graph-view";

interface Props {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
  availableSections: string[];
  availableStatuses: string[];
}

export function GraphTopologyClient({
  nodes,
  edges,
  availableSections,
  availableStatuses,
}: Props) {
  const [filters, setFilters] = React.useState<GraphFiltersState>(
    defaultFilters,
  );

  const filteredNodes = React.useMemo(() => {
    return nodes.filter((n) => {
      if (!filters.nodeTypes.has(n.type)) return false;
      if (filters.sections.size > 0) {
        const hasSection = (n.sections ?? []).some((s) =>
          filters.sections.has(s),
        );
        if (!hasSection) return false;
      }
      if (filters.statuses.size > 0) {
        if (!n.status || !filters.statuses.has(n.status)) return false;
      }
      return true;
    });
  }, [nodes, filters]);

  const filteredEdges = React.useMemo(() => {
    const visible = new Set(filteredNodes.map((n) => n.id));
    return edges.filter(
      (e) =>
        filters.edgeTypes.has(e.edge) &&
        visible.has(e.from) &&
        visible.has(e.to),
    );
  }, [edges, filteredNodes, filters.edgeTypes]);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-20 self-start space-y-6 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
        <GraphLegend />
        <GraphFilters
          filters={filters}
          onChange={setFilters}
          availableSections={availableSections}
          availableStatuses={availableStatuses}
          visibleNodeCount={filteredNodes.length}
          totalNodeCount={nodes.length}
          visibleEdgeCount={filteredEdges.length}
          totalEdgeCount={edges.length}
        />
      </aside>
      <div>
        <GraphViewClient
          nodes={filteredNodes}
          edges={filteredEdges}
          layout="cose"
          height={680}
        />
        <p className="mt-3 text-xs text-muted-foreground font-sans">
          Tip: scroll to zoom · drag to pan · click a node to inspect.
        </p>
      </div>
    </div>
  );
}
