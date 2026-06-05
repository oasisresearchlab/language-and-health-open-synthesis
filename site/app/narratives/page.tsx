import Link from "next/link";

import { loadPaper, listNarratives, pickPrimary } from "@/lib/paper";
import { loadGraph } from "@/lib/graph";
import { MarkdownProse } from "@/components/markdown-prose";
import {
  PaperViewToggle,
  type PaperToggleNarrative,
} from "@/components/paper-view-toggle";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "Narratives",
  description:
    "Read the original whitepaper that seeded this discourse graph, or one of the narratives composed from it.",
};

export default async function NarrativesPage() {
  const [paper, narratives, graph] = await Promise.all([
    loadPaper(),
    listNarratives(),
    loadGraph(),
  ]);

  if (!paper.raw) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="font-heading text-2xl font-semibold">
          Whitepaper not found
        </h1>
        <p className="mt-2 text-muted-foreground">
          Expected <code>paper/whitepaper-v3.md</code> at the repository root.
        </p>
      </div>
    );
  }

  const byAnchor = new Map<string, typeof narratives>();
  for (const n of narratives) {
    const list = byAnchor.get(n.anchorId) ?? [];
    list.push(n);
    byAnchor.set(n.anchorId, list);
  }

  const toggleNarratives: PaperToggleNarrative[] = narratives.map((n) => {
    const node = graph.nodes.get(n.anchorId);
    const anchorList = byAnchor.get(n.anchorId) ?? [];
    const primary = pickPrimary(anchorList);
    const isPrimary = primary?.shortId === n.shortId;
    const formBits = [n.frontmatter.audience, n.frontmatter.voice].filter(
      (s): s is string => Boolean(s),
    );
    const sublabel = formBits.length
      ? formBits.join(" · ")
      : n.frontmatter.generatedBy === "offline"
      ? "Composed · anchored"
      : "Composed · anchored";
    return {
      slug: n.slug,
      anchorId: n.anchorId,
      href: isPrimary
        ? `/narratives/${n.anchorId}`
        : `/narratives/${n.anchorId}/${n.shortId}`,
      title: node?.title ?? n.anchorId,
      sublabel,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="space-y-4 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Narratives · original whitepaper
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Resilient Data Futures
        </h1>
        <div className="space-y-3 text-muted-foreground">
          <p>
            This is the original whitepaper that seeded the graph. The first
            pass of {graph.nodes.size} nodes was decomposed from these
            sections — every Claim, Evidence, and Source carries a{" "}
            <code className="font-mono text-sm">source_section:</code> field
            pointing back here.
          </p>
          <p>
            That paper-first origin is unusual. Discourse graphs are normally
            built incrementally: contributors add Questions, Claims, Evidence,
            and counter-evidence over time, and the graph emerges. From any
            such graph, narratives are composed by anchoring at a node and
            traversing its neighborhood — each one a dated view of the
            argument at the moment it was rendered, regenerable as the graph
            accumulates new evidence. The composed narratives below are
            early demonstrations of that direction, or you can{" "}
            <Link
              href="/narratives/generate"
              className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
            >
              generate one on demand
            </Link>{" "}
            for any anchor.
          </p>
        </div>
        <PaperViewToggle
          active={{ kind: "whitepaper" }}
          narratives={toggleNarratives}
        />
      </header>

      <Separator className="my-10" />

      <div className="grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 self-start">
          <p className="mb-3 font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sections
          </p>
          <nav className="space-y-1.5 text-sm">
            {paper.sections
              .filter((s) => s.level <= 3)
              .map((s) => (
                <Link
                  key={s.slug || s.label}
                  href={`#${s.slug}`}
                  className="block hover:text-primary text-muted-foreground"
                  style={{ paddingLeft: `${(s.level - 2) * 0.75}rem` }}
                >
                  <span className="font-mono text-xs text-primary/70">
                    {s.label}
                  </span>
                  {s.title !== s.label && (
                    <span className="ml-1.5">{s.title}</span>
                  )}
                </Link>
              ))}
          </nav>
        </aside>

        <article className="min-w-0" data-pagefind-body>
          <MarkdownProse source={paper.raw} />
        </article>
      </div>
    </div>
  );
}
