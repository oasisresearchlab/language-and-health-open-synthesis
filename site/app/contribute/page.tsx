import { loadGraph } from "@/lib/graph";
import { NODE_TYPE_LABEL } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { ContributeClient } from "./contribute-client";

export const metadata = {
  title: "Contribute a node",
  description:
    "Assemble a draft graph node — Question, Claim, Evidence, Method, or Source — and submit it as a pull request. No CLI required.",
};

export default async function ContributePage() {
  const graph = await loadGraph();
  const options = Array.from(graph.nodes.values())
    .map((n) => ({
      id: n.id,
      title: n.title,
      type: n.type,
      typeLabel: NODE_TYPE_LABEL[n.type],
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="space-y-4 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Contribute · node
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Add a node to the graph
        </h1>
        <div className="space-y-3 text-muted-foreground">
          <p>
            Pick a node type, draft a title and 50–250 words of self-contained
            prose, point at the existing nodes you connect to, and submit. The
            form opens GitHub&apos;s &ldquo;Compare &amp; pull request&rdquo;
            page on a branch in your fork — you finalize and click
            &ldquo;Create pull request&rdquo; there.
          </p>
        </div>
      </header>

      <Separator className="my-10" />

      <ContributeClient nodes={options} />
    </div>
  );
}
