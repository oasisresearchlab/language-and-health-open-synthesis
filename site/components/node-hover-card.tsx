import Link from "next/link";

import { NodeBadge } from "@/components/node-badge";
import type { GraphNode, NodeType } from "@/lib/types";

export interface NodePreview {
  id: string;
  type: NodeType;
  title: string;
  shortLabel?: string;
  status?: string;
  snippet?: string;
}

/** Build a lightweight preview from a full graph node (snippet = first prose). */
export function toPreview(node: GraphNode): NodePreview {
  return {
    id: node.id,
    type: node.type,
    title: node.title,
    shortLabel: node.shortLabel,
    status: node.status,
    snippet: snippetOf(node.body, node.id),
  };
}

function snippetOf(body: string, id: string): string {
  const text = body
    .replace(new RegExp(`^#\\s*${id}[^\\n]*\\n`), "") // drop the "# ID — Title" line
    .replace(/^#{1,6}\s+.*$/gm, "") // headings
    .replace(/>\s?/g, "") // blockquote markers
    .replace(/!\[\[[^\]]*\]\]/g, "") // embeds
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> text
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 220 ? text.slice(0, 220).trimEnd() + "…" : text;
}

/** A node link that reveals a Wikipedia-style preview card on hover (CSS-only). */
export function NodeHoverCard({
  href,
  preview,
  children,
  className,
}: {
  href: string;
  preview?: NodePreview;
  children: React.ReactNode;
  className?: string;
}) {
  if (!preview) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <span className="group/nl relative inline">
      <Link href={href} className={className}>
        {children}
      </Link>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute left-0 top-full z-50 mt-1 w-80 max-w-[88vw] translate-y-1 rounded-lg border border-border bg-card p-3 text-left opacity-0 shadow-lg transition duration-150 group-hover/nl:visible group-hover/nl:translate-y-0 group-hover/nl:opacity-100"
      >
        <span className="flex flex-wrap items-center gap-1.5">
          <NodeBadge type={preview.type} size="sm" />
          <span className="font-mono text-[10px] text-muted-foreground">
            {preview.id}
          </span>
          {preview.status ? (
            <span className="rounded border border-border px-1 text-[9px] uppercase tracking-wider text-muted-foreground">
              {preview.status}
            </span>
          ) : null}
        </span>
        <span className="mt-1.5 block font-heading text-sm font-medium leading-snug text-foreground">
          {preview.title}
        </span>
        {preview.snippet ? (
          <span className="mt-1 block text-xs leading-snug text-muted-foreground">
            {preview.snippet}
          </span>
        ) : null}
      </span>
    </span>
  );
}
