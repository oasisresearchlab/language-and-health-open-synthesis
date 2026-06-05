import { ExternalLink, MessageSquare } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { GraphNode, NodeIssue } from "@/lib/types";
import { cn } from "@/lib/utils";

const REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO ?? "jring-o/rdf";

export function GithubIssueButton({
  node,
  existingIssue,
}: {
  node: GraphNode;
  existingIssue?: Pick<NodeIssue, "url" | "count" | "state"> | null;
}) {
  if (existingIssue?.url) {
    return (
      <a
        href={existingIssue.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "font-sans text-xs")}
      >
        <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
        Join discussion ({existingIssue.count})
        <ExternalLink className="ml-1.5 h-3 w-3 text-muted-foreground" />
      </a>
    );
  }

  const labels = encodeURIComponent(`node:${node.id}`);
  const title = encodeURIComponent(`[${node.id}] ${node.title}`);
  const body = encodeURIComponent(
    `Discussion of node \`${node.id}\` — ${node.title}\n\n` +
      `<!-- describe the change you'd like to propose, or the question you have -->\n`,
  );
  const href = `https://github.com/${REPO}/issues/new?template=discussion.md&labels=${labels}&title=${title}&body=${body}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "font-sans text-xs")}
    >
      <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
      Start discussion
      <ExternalLink className="ml-1.5 h-3 w-3 text-muted-foreground" />
    </a>
  );
}
