"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

import { GraphViewClient } from "@/components/graph-view-loader";
import { NodeBadge } from "@/components/node-badge";
import { cn } from "@/lib/utils";
import type { EdgeType, NodeType } from "@/lib/types";
import { NODE_TYPES } from "@/lib/types";

export interface BundleSummaryNode {
  id: string;
  type: NodeType;
  title: string;
  isAnchor: boolean;
}

export interface BundleSummaryEdge {
  from: string;
  to: string;
  edge: string;
}

export interface BundleSummaryData {
  anchor: string;
  nodes: BundleSummaryNode[];
  edges: BundleSummaryEdge[];
  /** Human-readable label like "semantic walk · q-overlap = 2" or "1-hop walk". */
  strategyLabel: string;
}

const TYPE_ORDER: NodeType[] = [
  "question",
  "method",
  "claim",
  "evidence",
  "source",
];

/**
 * Collapsible bundle inspector: anchor + node count + edge count + strategy
 * label in the header; force-directed graph + node chips grouped by type
 * inside. Used on /narratives/generate, /narratives/[anchor], and
 * /narratives/[anchor]/[short].
 *
 * Memoized because the parent on /narratives/generate re-renders on every
 * streamed chunk of the LLM output — without memoization the graph layout
 * would refit and stutter mid-stream.
 */
export const BundleSummary = React.memo(function BundleSummary({
  data,
  defaultOpen = true,
}: {
  data: BundleSummaryData;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  // Memoize the prop arrays for the force-graph viz so its internal effects
  // don't see new references on each parent re-render — without this the
  // layout refits and stutters when the parent updates frequently.
  const graphNodes = React.useMemo(
    () =>
      data.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        isAnchor: n.isAnchor,
      })),
    [data.nodes],
  );
  const graphEdges = React.useMemo(
    () =>
      data.edges.map((e) => ({
        from: e.from,
        to: e.to,
        edge: e.edge as EdgeType,
      })),
    [data.edges],
  );

  const grouped = React.useMemo(() => {
    const map = new Map<NodeType, BundleSummaryNode[]>();
    for (const t of NODE_TYPES) map.set(t, []);
    for (const n of data.nodes) {
      const list = map.get(n.type);
      if (list) list.push(n);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.isAnchor !== b.isAnchor) return a.isAnchor ? -1 : 1;
        return a.id.localeCompare(b.id);
      });
    }
    return map;
  }, [data.nodes]);

  return (
    <section className="rounded-lg border border-border bg-card/50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="space-y-0.5">
          <span className="block font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bundle
          </span>
          <span className="block text-sm">
            <span className="font-mono text-primary">{data.anchor}</span>
            <span className="text-muted-foreground">
              {" · "}
              {data.nodes.length} node{data.nodes.length === 1 ? "" : "s"},{" "}
              {data.edges.length} edge{data.edges.length === 1 ? "" : "s"}
              {" · "}
              {data.strategyLabel}
            </span>
          </span>
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          <div className="overflow-hidden rounded-md border border-border">
            <GraphViewClient
              nodes={graphNodes}
              edges={graphEdges}
              layout="concentric"
              anchorId={data.anchor}
              height={420}
              openLinksInNewTab
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            These are the nodes the model was given as context. Scroll the
            graph to zoom, drag to pan, click any node — chip or graph — to
            open it in a new tab.
          </p>
          {TYPE_ORDER.map((t) => {
            const list = grouped.get(t) ?? [];
            if (list.length === 0) return null;
            return (
              <div key={t} className="space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <NodeBadge type={t} size="sm" />
                  <span className="font-sans text-[11px] text-muted-foreground">
                    {list.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((n) => (
                    <Link
                      key={n.id}
                      href={`/node/${n.id}`}
                      target="_blank"
                      rel="noopener"
                      title={n.title}
                      className={cn(
                        "max-w-full truncate rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
                        n.isAnchor
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background hover:border-primary/50 hover:bg-accent",
                      )}
                    >
                      {n.id}
                      {n.isAnchor && (
                        <span className="ml-1 text-[9px] uppercase tracking-wider opacity-70">
                          anchor
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
});
