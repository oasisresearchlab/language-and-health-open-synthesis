import { LinkButton } from "@/components/link-button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-5 px-6 py-24 text-left">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
        404
      </p>
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        That node isn&apos;t in the graph.
      </h1>
      <p className="text-muted-foreground">
        The ID may have been deleted, renamed, or never minted. Browse the full
        node index to find what you were looking for.
      </p>
      <div className="flex gap-2">
        <LinkButton href="/nodes">Browse all nodes</LinkButton>
        <LinkButton href="/" variant="outline">Home</LinkButton>
      </div>
    </div>
  );
}
