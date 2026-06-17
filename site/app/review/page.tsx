import Link from "next/link";

import { reviewIndex } from "@/lib/review";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Completeness review",
  description: "Prototype: check each paper's enumerated results against the extracted evidence.",
};

export default async function ReviewIndexPage() {
  const papers = await reviewIndex();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
        Prototype · completeness pass
      </p>
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">
        Did we miss anything?
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        For each paper, the lists it enumerates — abstract result-sentences and
        tables/figures — become a checklist. Confirm what the AI already
        captured, promote anything it missed, dismiss what isn&apos;t a result.
        Recognition, not recall.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/review/accuracy"
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/50"
        >
          → Accuracy pass{" "}
          <span className="text-muted-foreground">(verify each EVD)</span>
        </Link>
        <Link
          href="/review/guide"
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/50"
        >
          Reviewer guide
        </Link>
      </div>

      {papers.length === 0 ? (
        <p className="mt-10 rounded-lg border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
          No review data found. Generate it locally:{" "}
          <code>python3 utils/build_review_anchors.py --cluster</code> (reads the
          gitignored <code>data/</code>).
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-lg border border-border">
          {papers.map((p) => (
            <li key={p.citekey}>
              <Link
                href={`/review/${encodeURIComponent(p.citekey)}`}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {p.citekey}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 font-mono text-xs text-muted-foreground">
                  <span title="abstract + object anchors">
                    {p.abstractAnchors + p.objectAnchors} anchors
                  </span>
                  <span className="text-primary" title="pre-linked to existing evidence">
                    {p.preLinked} pre-linked
                  </span>
                  {!p.hasPdf && (
                    <span className="text-destructive">no PDF</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
