import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, FileText, Hash, GitBranch } from "lucide-react";

import { loadGraph, getAllNodeIds } from "@/lib/graph";
import { NODE_TYPE_LABEL } from "@/lib/types";
import { NodeBadge } from "@/components/node-badge";
import { MarkdownProse } from "@/components/markdown-prose";
import { EdgeList } from "@/components/edge-list";
import { GithubIssueButton } from "@/components/github-issue-button";
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
  const graph = await loadGraph();
  const node = graph.nodes.get(id);
  if (!node) return { title: id };
  return {
    title: `${node.id} — ${node.title}`,
    description: node.body.slice(0, 200).replace(/\s+/g, " "),
  };
}

export default async function NodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const graph = await loadGraph();
  const node = graph.nodes.get(id);
  if (!node) notFound();
  const existingIssue = graph.nodeIssues[node.id] ?? null;

  return (
    <article
      className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
      data-pagefind-body
    >
      {/* Header */}
      <header className="space-y-4 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <NodeBadge type={node.type} />
          <span className="text-muted-foreground">{node.id}</span>
          {node.status && (
            <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {node.status}
            </span>
          )}
        </div>
        <h1
          className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
          data-pagefind-meta="title"
        >
          {node.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-sans">
          {node.sections.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {node.sections.join(", ")}
            </span>
          )}
          {node.created && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {node.created}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <GitBranch className="h-3 w-3" />
            {node.outgoing.length} out · {node.incoming.length} in
          </span>
        </div>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Body */}
        <div className="min-w-0 space-y-8">
          {node.type === "source" ? (
            <SourceCallout node={node} />
          ) : null}

          <MarkdownProse source={stripDuplicateTitle(node.body, node.id)} />

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            <GithubIssueButton node={node} existingIssue={existingIssue} />
            <LinkButton
              href={`/graph/${node.id}`}
              variant="ghost"
              size="sm"
              className="font-sans text-xs"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Inspect bundle
            </LinkButton>
          </div>
        </div>

        {/* Side: edges */}
        <aside className="space-y-8">
          <section>
            <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Outbound edges
            </h2>
            <EdgeList edges={node.outgoing} nodes={graph.nodes} direction="out" />
          </section>
          <section>
            <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Backlinks
            </h2>
            <EdgeList edges={node.incoming} nodes={graph.nodes} direction="in" />
          </section>
        </aside>
      </div>
    </article>
  );
}

function SourceCallout({ node }: { node: { body: string } }) {
  const citationMatch = /\*\*Citation:\*\*\s*([^\n]+)/.exec(node.body);
  if (!citationMatch) return null;
  return (
    <div className="rounded-lg border border-border bg-accent/40 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Source citation
      </p>
      <p className="mt-2 font-serif text-base leading-relaxed">
        {citationMatch[1]}
      </p>
    </div>
  );
}

/** Many bodies start with "# C-0001 — Title". The page already shows that
 * heading, so strip the duplicate from rendered prose. */
function stripDuplicateTitle(body: string, id: string): string {
  const lines = body.split(/\r?\n/);
  const firstNonEmpty = lines.findIndex((l) => l.trim().length > 0);
  if (firstNonEmpty === -1) return body;
  const first = lines[firstNonEmpty];
  if (first.startsWith("# ") && first.includes(id)) {
    return lines.slice(firstNonEmpty + 1).join("\n").trim();
  }
  return body;
}
