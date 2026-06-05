import { loadGraph } from "@/lib/graph";
import { NODE_TYPE_LABEL } from "@/lib/types";
import { GenerateClient } from "./generate-client";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "Generate a narrative",
  description:
    "Compose a new narrative from the discourse graph on demand: pick an anchor, audience, length, and voice.",
};

export default async function GeneratePage() {
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
          Narratives · generator
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Compose a new narrative
        </h1>
        <p className="text-muted-foreground">
          Pick an anchor, choose how to bundle the graph around it — by hop
          count or a semantic walk that follows argumentative role — and set
          the form, audience, length, and voice.
        </p>
      </header>

      <Separator className="my-10" />

      <GenerateClient nodes={options} />
    </div>
  );
}
