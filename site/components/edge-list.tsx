import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";

import {
  EDGE_LABEL,
  EDGE_INVERSE_LABEL,
  type EdgeType,
  type GraphNode,
  type IncomingEdge,
  type OutgoingEdge,
} from "@/lib/types";
import { NodeBadge } from "@/components/node-badge";

interface Props {
  edges: OutgoingEdge[] | IncomingEdge[];
  nodes: Map<string, GraphNode>;
  direction: "out" | "in";
  emptyLabel?: string;
}

function isOutgoing(
  edges: OutgoingEdge[] | IncomingEdge[],
  direction: "out" | "in",
): edges is OutgoingEdge[] {
  return direction === "out";
}

export function EdgeList({ edges, nodes, direction, emptyLabel }: Props) {
  if (edges.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        {emptyLabel ?? (direction === "out" ? "No outbound edges." : "No backlinks.")}
      </p>
    );
  }

  const grouped = new Map<EdgeType, Array<{ id: string; node?: GraphNode }>>();
  if (isOutgoing(edges, direction)) {
    for (const e of edges) {
      const list = grouped.get(e.edge) ?? [];
      list.push({ id: e.to, node: nodes.get(e.to) });
      grouped.set(e.edge, list);
    }
  } else {
    for (const e of edges) {
      const list = grouped.get(e.edge) ?? [];
      list.push({ id: e.from, node: nodes.get(e.from) });
      grouped.set(e.edge, list);
    }
  }

  const Icon = direction === "out" ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-5">
      {Array.from(grouped.entries()).map(([edgeType, items]) => (
        <div key={edgeType}>
          <h3 className="mb-2 flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Icon className="h-3 w-3" />
            <span
              className="text-foreground/80"
              style={{
                color: `var(--color-edge-${kebabCase(edgeType)})`,
              }}
            >
              {direction === "out"
                ? EDGE_LABEL[edgeType]
                : EDGE_INVERSE_LABEL[edgeType]}
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-muted-foreground/80">{items.length}</span>
          </h3>
          <ul className="space-y-1.5">
            {items.map(({ id, node }) => (
              <li key={id} className="flex items-baseline gap-2 text-sm leading-snug">
                {node ? (
                  <>
                    <NodeBadge type={node.type} size="sm" />
                    <Link
                      href={`/node/${node.id}`}
                      className="font-mono text-xs text-muted-foreground hover:text-primary"
                    >
                      {node.id}
                    </Link>
                    <Link
                      href={`/node/${node.id}`}
                      className="text-foreground/90 hover:text-primary"
                    >
                      {node.title}
                    </Link>
                  </>
                ) : (
                  <span className="font-mono text-xs text-destructive">
                    {id}{" "}
                    <span className="text-muted-foreground italic">
                      (broken edge)
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function kebabCase(s: string) {
  return s.replace(/[A-Z]/g, (m, i) => (i === 0 ? m.toLowerCase() : `-${m.toLowerCase()}`));
}
