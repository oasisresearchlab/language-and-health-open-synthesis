"use client";

import * as React from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";
import Link from "next/link";
import { ArrowRight, ArrowLeft, ExternalLink } from "lucide-react";

import {
  EDGE_LABEL,
  EDGE_INVERSE_LABEL,
  type EdgeType,
  type NodeType,
} from "@/lib/types";
import { NodeBadge } from "@/components/node-badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LinkButton } from "@/components/link-button";
import { Button } from "@/components/ui/button";

export interface GraphViewNode {
  id: string;
  type: NodeType;
  title: string;
  isAnchor?: boolean;
  status?: string;
  sections?: string[];
}

export interface GraphViewEdge {
  from: string;
  to: string;
  edge: EdgeType;
}

interface RFGNode extends NodeObject {
  id: string;
  type: NodeType;
  title: string;
  isAnchor: boolean;
}

interface RFGLink extends LinkObject {
  source: string | RFGNode;
  target: string | RFGNode;
  edge: EdgeType;
}

export interface GraphViewProps {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
  /** Bundle: anchor centered, labels always shown. Cose: dense, labels hidden. */
  layout?: "concentric" | "cose";
  anchorId?: string;
  height?: number;
  /** When true, "Open full page" links open in a new tab. */
  openLinksInNewTab?: boolean;
  /**
   * When false, disable zoom/pan/drag/click — the graph renders as a static
   * preview. Default true.
   */
  interactive?: boolean;
  /**
   * After the initial zoomToFit, multiply zoom by this factor. Useful for
   * preview embeds where zoomToFit pads too far out due to outlier nodes.
   * Default 1 (no boost).
   */
  zoomBoost?: number;
}

const NODE_COLORS_LIGHT: Record<NodeType, string> = {
  question: "#2563eb",
  claim: "#b45309",
  evidence: "#15803d",
  method: "#7c3aed",
  source: "#57534e",
  evidencepattern: "#3b82a6",
  artifact: "#ce5555",
};

const NODE_COLORS_DARK: Record<NodeType, string> = {
  question: "#60a5fa",
  claim: "#fb923c",
  evidence: "#4ade80",
  method: "#c084fc",
  source: "#a8a29e",
  evidencepattern: "#5ba3c7",
  artifact: "#e07a7a",
};

const EDGE_COLORS_LIGHT: Record<EdgeType, string> = {
  supports: "#15803d",
  opposes: "#dc2626",
  addresses: "#2563eb",
  derivedFrom: "#a8a29e",
  usesMethod: "#7c3aed",
  informs: "#7c3aed",
  usesArtifact: "#ce5555",
};

const EDGE_COLORS_DARK: Record<EdgeType, string> = {
  supports: "#4ade80",
  opposes: "#f87171",
  addresses: "#60a5fa",
  derivedFrom: "#78716c",
  usesMethod: "#c084fc",
  informs: "#c084fc",
  usesArtifact: "#e07a7a",
};

function useDarkMode() {
  const [isDark, setIsDark] = React.useState(false);
  React.useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = React.useState({ width: 800, height: 540 });
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize((prev) =>
        prev.width === rect.width && prev.height === rect.height
          ? prev
          : { width: Math.floor(rect.width), height: Math.floor(rect.height) },
      );
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
  return size;
}

export function GraphView({
  nodes,
  edges,
  layout = "concentric",
  anchorId,
  height = 540,
  openLinksInNewTab = false,
  interactive = true,
  zoomBoost = 1,
}: GraphViewProps) {
  const isDark = useDarkMode();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const fgRef = React.useRef<ForceGraphMethods<RFGNode, RFGLink> | undefined>(undefined);
  const { width: containerWidth } = useContainerSize(containerRef);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const hasFittedRef = React.useRef(false);
  // Reset fit-once flag whenever the underlying graph data changes
  React.useEffect(() => {
    hasFittedRef.current = false;
  }, [nodes, edges, anchorId]);

  const nodeColors = isDark ? NODE_COLORS_DARK : NODE_COLORS_LIGHT;
  const edgeColors = isDark ? EDGE_COLORS_DARK : EDGE_COLORS_LIGHT;
  const labelColor = isDark ? "#fafaf9" : "#1c1917";
  const labelHalo = isDark ? "rgba(12,10,9,0.85)" : "rgba(250,250,249,0.85)";

  const isBundle = layout === "concentric";
  const alwaysShowLabels = isBundle;

  const nodeMap = React.useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  const data = React.useMemo(() => {
    const rfgNodes: RFGNode[] = nodes.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      isAnchor: !!n.isAnchor || n.id === anchorId,
    }));
    const rfgLinks: RFGLink[] = edges.map((e) => ({
      source: e.from,
      target: e.to,
      edge: e.edge,
    }));
    return { nodes: rfgNodes, links: rfgLinks };
  }, [nodes, edges, anchorId]);

  // Tune simulation per layout intent.
  React.useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    type LinkForce = { distance: (d: number) => unknown };
    if (isBundle) {
      fg.d3Force("center")?.strength(1);
      fg.d3Force("charge")?.strength(-160);
      (fg.d3Force("link") as LinkForce | undefined)?.distance(70);
    } else {
      fg.d3Force("charge")?.strength(-50);
      (fg.d3Force("link") as LinkForce | undefined)?.distance(36);
    }
  }, [isBundle, data]);

  const drawNode = React.useCallback(
    (node: RFGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const radius = node.isAnchor ? 9 : 5;
      const fill = nodeColors[node.type] ?? "#999";
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (node.isAnchor || node.id === selectedId) {
        ctx.lineWidth = 2 / globalScale;
        ctx.strokeStyle = isDark ? "#fafaf9" : "#1c1917";
        ctx.stroke();
      }

      const showLabel =
        alwaysShowLabels ||
        globalScale > 1.6 ||
        node.isAnchor ||
        node.id === selectedId;
      if (showLabel) {
        const fontSize = Math.max(9 / globalScale, 2.2);
        ctx.font = `${fontSize}px JetBrains Mono, ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const text = node.id;
        const padX = 2 / globalScale;
        const padY = 1 / globalScale;
        const metrics = ctx.measureText(text);
        const ty = (node.y ?? 0) + radius + 2 / globalScale;
        ctx.fillStyle = labelHalo;
        ctx.fillRect(
          (node.x ?? 0) - metrics.width / 2 - padX,
          ty - padY,
          metrics.width + padX * 2,
          fontSize + padY * 2,
        );
        ctx.fillStyle = labelColor;
        ctx.fillText(text, node.x ?? 0, ty);
      }
    },
    [nodeColors, alwaysShowLabels, isDark, labelColor, labelHalo, selectedId],
  );

  const nodePointerArea = React.useCallback(
    (node: RFGNode, color: string, ctx: CanvasRenderingContext2D) => {
      const radius = (node.isAnchor ? 9 : 5) + 3;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, Math.PI * 2);
      ctx.fill();
    },
    [],
  );

  const linkColor = React.useCallback(
    (link: RFGLink) => edgeColors[link.edge] ?? "#999",
    [edgeColors],
  );

  const selectedNode = selectedId ? nodeMap.get(selectedId) : null;

  return (
    <>
      <div
        ref={containerRef}
        className="rounded-lg border border-border bg-card overflow-hidden"
        style={{ width: "100%", height }}
      >
        {containerWidth > 0 ? (
          <ForceGraph2D<RFGNode, RFGLink>
            ref={fgRef as React.MutableRefObject<ForceGraphMethods<RFGNode, RFGLink>>}
            width={containerWidth}
            height={height}
            graphData={data}
            backgroundColor="rgba(0,0,0,0)"
            nodeRelSize={5}
            nodeCanvasObject={drawNode}
            nodePointerAreaPaint={nodePointerArea}
            linkColor={linkColor}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={0.96}
            linkWidth={(l) => ((l as RFGLink).edge === "opposes" ? 1.4 : 0.9)}
            linkCurvature={0.06}
            cooldownTicks={isBundle ? 60 : 200}
            warmupTicks={isBundle ? 0 : 40}
            d3AlphaDecay={isBundle ? 0.05 : 0.03}
            enableNodeDrag={interactive}
            enableZoomInteraction={interactive}
            enablePanInteraction={interactive}
            onNodeClick={
              interactive
                ? (node) => setSelectedId((node as RFGNode).id)
                : undefined
            }
            onBackgroundClick={
              interactive ? () => setSelectedId(null) : undefined
            }
            onEngineStop={() => {
              if (hasFittedRef.current) return;
              hasFittedRef.current = true;
              const fg = fgRef.current;
              if (!fg) return;
              fg.zoomToFit(400, 24);
              if (zoomBoost !== 1) {
                window.setTimeout(() => {
                  // Re-center on the median of node positions — robust to a
                  // few outlier nodes pulling the bounding-box center off the
                  // visual mass. Then apply the zoom boost.
                  const xs: number[] = [];
                  const ys: number[] = [];
                  for (const n of data.nodes) {
                    if (typeof n.x === "number") xs.push(n.x);
                    if (typeof n.y === "number") ys.push(n.y);
                  }
                  xs.sort((a, b) => a - b);
                  ys.sort((a, b) => a - b);
                  const cx = xs.length ? xs[Math.floor(xs.length / 2)] : 0;
                  const cy = ys.length ? ys[Math.floor(ys.length / 2)] : 0;
                  const current = fg.zoom();
                  fg.centerAt(cx, cy, 250);
                  fg.zoom(current * zoomBoost, 250);
                }, 420);
              }
            }}
          />
        ) : null}
      </div>

      {interactive && (
        <Sheet
          open={!!selectedId}
          onOpenChange={(open) => {
            if (!open) setSelectedId(null);
          }}
          modal={false}
        >
          <SheetContent
            side="right"
            className="w-full sm:max-w-md p-0"
          >
            {selectedNode ? (
              <NodeDetailPanel
                node={selectedNode}
                edges={edges}
                nodeMap={nodeMap}
                onSelectNode={(id) => setSelectedId(id)}
                openLinksInNewTab={openLinksInNewTab}
              />
            ) : null}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

interface NodeDetailPanelProps {
  node: GraphViewNode;
  edges: GraphViewEdge[];
  nodeMap: Map<string, GraphViewNode>;
  onSelectNode: (id: string) => void;
  openLinksInNewTab?: boolean;
}

function NodeDetailPanel({
  node,
  edges,
  nodeMap,
  onSelectNode,
  openLinksInNewTab = false,
}: NodeDetailPanelProps) {
  const out: { edge: EdgeType; to: string }[] = [];
  const inc: { edge: EdgeType; from: string }[] = [];
  for (const e of edges) {
    if (e.from === node.id) out.push({ edge: e.edge, to: e.to });
    if (e.to === node.id) inc.push({ edge: e.edge, from: e.from });
  }
  out.sort((a, b) =>
    a.edge === b.edge ? a.to.localeCompare(b.to) : a.edge.localeCompare(b.edge),
  );
  inc.sort((a, b) =>
    a.edge === b.edge
      ? a.from.localeCompare(b.from)
      : a.edge.localeCompare(b.edge),
  );

  const groupedOut = groupBy(out, (e) => e.edge);
  const groupedIn = groupBy(inc, (e) => e.edge);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5 pb-4 pr-12">
        <div className="flex items-center gap-2">
          <NodeBadge type={node.type} size="sm" />
          <span className="font-mono text-xs text-muted-foreground">
            {node.id}
          </span>
        </div>
        <SheetTitle className="mt-2 font-heading text-lg leading-snug">
          {node.title}
        </SheetTitle>
        {(node.sections?.length || node.status) && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground font-sans">
            {node.sections?.length ? (
              <span>{node.sections.join(", ")}</span>
            ) : null}
            {node.status ? (
              <span className="uppercase tracking-wider">{node.status}</span>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <EdgeGroup
          title="Outbound"
          icon={<ArrowRight className="h-3 w-3" />}
          grouped={groupedOut}
          getId={(e) => e.to}
          labelMap={EDGE_LABEL}
          nodeMap={nodeMap}
          onSelectNode={onSelectNode}
          emptyText="No outbound edges."
        />
        <EdgeGroup
          title="Backlinks"
          icon={<ArrowLeft className="h-3 w-3" />}
          grouped={groupedIn}
          getId={(e) => e.from}
          labelMap={EDGE_INVERSE_LABEL}
          nodeMap={nodeMap}
          onSelectNode={onSelectNode}
          emptyText="No backlinks."
        />
      </div>

      <div className="border-t border-border p-4 flex items-center gap-2">
        <LinkButton
          href={`/node/${node.id}`}
          className="flex-1 justify-center"
          {...(openLinksInNewTab
            ? { target: "_blank", rel: "noopener" }
            : {})}
        >
          Open full page
          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
        </LinkButton>
        <Button
          variant="ghost"
          size="default"
          onClick={() => onSelectNode("")}
        >
          Close
        </Button>
      </div>
    </div>
  );
}

function EdgeGroup<T extends { edge: EdgeType }>({
  title,
  icon,
  grouped,
  getId,
  labelMap,
  nodeMap,
  onSelectNode,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  grouped: Map<EdgeType, T[]>;
  getId: (e: T) => string;
  labelMap: Record<EdgeType, string>;
  nodeMap: Map<string, GraphViewNode>;
  onSelectNode: (id: string) => void;
  emptyText: string;
}) {
  const total = Array.from(grouped.values()).reduce((s, l) => s + l.length, 0);
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
        <span className="text-muted-foreground/60">·</span>
        <span>{total}</span>
      </h3>
      {total === 0 ? (
        <p className="text-xs italic text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([edgeType, items]) => (
            <div key={edgeType}>
              <p
                className="mb-1 text-[10px] font-sans font-medium uppercase tracking-wider"
                style={{ color: edgeColorVar(edgeType) }}
              >
                {labelMap[edgeType]}
              </p>
              <ul className="space-y-1">
                {items.map((e, i) => {
                  const id = getId(e);
                  const target = nodeMap.get(id);
                  return (
                    <li key={`${id}-${i}`}>
                      {target ? (
                        <button
                          type="button"
                          onClick={() => onSelectNode(id)}
                          className="flex w-full items-baseline gap-2 rounded px-1.5 py-1 text-left hover:bg-accent/50"
                        >
                          <NodeBadge type={target.type} size="sm" />
                          <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                            {target.id}
                          </span>
                          <span className="truncate text-xs">
                            {target.title}
                          </span>
                        </button>
                      ) : (
                        <span className="px-1.5 py-1 text-xs text-destructive">
                          {id}{" "}
                          <span className="text-muted-foreground italic">
                            (broken edge)
                          </span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function edgeColorVar(edge: EdgeType): string {
  // Used for the small heading colour swatches in the detail panel
  return EDGE_COLORS_LIGHT[edge];
}

function groupBy<T, K>(items: T[], key: (t: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!out.has(k)) out.set(k, []);
    out.get(k)!.push(item);
  }
  return out;
}
