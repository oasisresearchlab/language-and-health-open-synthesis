"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GraphViewClient } from "@/components/graph-view-loader";
import { cn } from "@/lib/utils";
import type { EdgeType, NodeType } from "@/lib/types";

interface BundleNode {
  id: string;
  type: NodeType;
  title: string;
  isAnchor: boolean;
  status?: string;
  sections?: string[];
}

interface BundleEdge {
  from: string;
  to: string;
  edge: EdgeType;
}

interface BundleResponse {
  anchor: string;
  depth?: number;
  nodes: BundleNode[];
  edges: BundleEdge[];
}

const MAX_DEPTH = 6;

/**
 * Interactive depth-N bundle viewer for /graph/[id]. Initial nodes/edges are
 * server-rendered at depth 1. The "+1 hop" / "-1 hop" controls fetch from
 * /api/bundle and swap in the new bundle. Layout intentionally mirrors the
 * old static page: graph on the left, "In this bundle" list on the right.
 */
export function BundleExplorer({
  anchorId,
  initialNodes,
  initialEdges,
  initialDepth = 1,
}: {
  anchorId: string;
  initialNodes: BundleNode[];
  initialEdges: BundleEdge[];
  initialDepth?: number;
}) {
  const [nodes, setNodes] = React.useState<BundleNode[]>(initialNodes);
  const [edges, setEdges] = React.useState<BundleEdge[]>(initialEdges);
  const [depth, setDepth] = React.useState<number>(initialDepth);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reachedFrontier, setReachedFrontier] = React.useState(false);

  const setBundle = React.useCallback(
    async (newDepth: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          anchor: anchorId,
          strategy: "hops",
          depth: String(newDepth),
        });
        const res = await fetch(`/api/bundle?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          setError(`Error ${res.status}`);
          return;
        }
        const data = (await res.json()) as BundleResponse;
        const grew = data.nodes.length > nodes.length;
        setNodes(data.nodes);
        setEdges(data.edges);
        setDepth(newDepth);
        setReachedFrontier(newDepth > depth && !grew);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [anchorId, nodes.length, depth],
  );

  const canExpand = depth < MAX_DEPTH && !loading && !reachedFrontier;
  const canCollapse = depth > 1 && !loading;

  const sortedNonAnchor = React.useMemo(
    () =>
      nodes
        .filter((n) => !n.isAnchor)
        .sort((a, b) => a.id.localeCompare(b.id)),
    [nodes],
  );
  const anchor = React.useMemo(
    () => nodes.find((n) => n.isAnchor),
    [nodes],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Depth{" "}
            <span className="font-mono text-foreground">{depth}</span>
            {" · "}
            <span className="font-mono text-foreground">{nodes.length}</span>{" "}
            nodes,{" "}
            <span className="font-mono text-foreground">{edges.length}</span>{" "}
            edges
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBundle(depth - 1)}
              disabled={!canCollapse}
              className="gap-1.5"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              −1 hop
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBundle(depth + 1)}
              disabled={!canExpand}
              className="gap-1.5"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
              +1 hop
            </Button>
          </div>
        </div>
        {reachedFrontier && (
          <p className="text-[11px] text-muted-foreground">
            No new nodes — the connected component around{" "}
            <span className="font-mono">{anchorId}</span> is exhausted at this
            depth.
          </p>
        )}
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
        <GraphViewClient
          nodes={nodes}
          edges={edges}
          layout="concentric"
          anchorId={anchorId}
          height={620}
        />
        <p className="text-xs text-muted-foreground font-sans">
          Tip: scroll to zoom · drag to pan · click a node to inspect it.
        </p>
      </div>

      <aside className="self-start">
        <p className="mb-3 font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          In this bundle
        </p>
        <ul className="space-y-1 text-sm">
          {anchor && (
            <li className={cn("rounded bg-primary/10 px-2 py-1")}>
              <Link
                href={`/node/${anchor.id}`}
                className="flex items-baseline gap-2 font-mono text-xs text-primary"
              >
                <span>{anchor.id}</span>
                <span className="truncate font-sans text-foreground">
                  {anchor.title}
                </span>
              </Link>
            </li>
          )}
          {sortedNonAnchor.map((n) => (
            <li key={n.id}>
              <Link
                href={`/node/${n.id}`}
                className="flex items-baseline gap-2 rounded px-2 py-1 hover:bg-accent/50"
              >
                <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                  {n.id}
                </span>
                <span className="truncate text-xs">{n.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
