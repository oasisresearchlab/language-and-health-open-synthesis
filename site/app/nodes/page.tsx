import Link from "next/link";

import { loadGraph } from "@/lib/graph";
import {
  NODE_TYPES,
  NODE_TYPE_LABEL,
  NODE_TYPE_DEFINITION,
  type NodeType,
} from "@/lib/types";
import { NodeBadge } from "@/components/node-badge";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "All nodes",
  description: "Browse every node in the discourse graph by type.",
};

const SECTION_ID: Record<NodeType, string> = {
  question: "questions",
  claim: "claims",
  evidence: "evidence",
  method: "methods",
  source: "sources",
  artifact: "artifacts",
};

export default async function NodesIndexPage() {
  const graph = await loadGraph();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="space-y-4">
        <h1 className="text-balance font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          All nodes
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          {graph.nodes.size} nodes — click any to read the body, follow edges,
          and see backlinks.
        </p>
        <nav className="flex flex-wrap gap-2 pt-2 font-sans text-xs">
          {NODE_TYPES.map((t) => (
            <a
              key={t}
              href={`#${SECTION_ID[t]}`}
              className="rounded-full border border-border px-3 py-1 transition-colors hover:border-primary/40 hover:text-primary"
            >
              {NODE_TYPE_LABEL[t]} ({graph.byType[t].length})
            </a>
          ))}
        </nav>
      </header>

      <Separator className="my-10" />

      <div className="space-y-12">
        {NODE_TYPES.map((t) => (
          <section
            key={t}
            id={SECTION_ID[t]}
            className="scroll-mt-20"
          >
            <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-semibold tracking-tight">
              <NodeBadge type={t} size="sm" />
              {NODE_TYPE_LABEL[t]}{" "}
              <span className="font-normal text-muted-foreground">
                · {graph.byType[t].length}
              </span>
            </h2>
            {NODE_TYPE_DEFINITION[t] ? (
              <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {NODE_TYPE_DEFINITION[t]}
              </p>
            ) : null}
            <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {graph.byType[t].map((n) => (
                <li key={n.id} className="min-w-0">
                  <Link
                    href={`/node/${n.id}`}
                    className="group flex items-baseline gap-2 rounded px-2 py-1 hover:bg-accent/50"
                  >
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground group-hover:text-primary">
                      {n.id}
                    </span>
                    <span className="truncate text-sm text-foreground/90 group-hover:text-foreground">
                      {n.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
