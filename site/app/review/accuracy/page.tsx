import Link from "next/link";

import { accuracyIndex } from "@/lib/review-accuracy";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Accuracy review",
  description: "Verify each extracted evidence node against the source PDF.",
};

export default async function AccuracyIndexPage() {
  const papers = await accuracyIndex();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
        Accuracy pass · clinician tier
      </p>
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">
        Is each extraction correct?
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        For each paper, walk its evidence nodes against the PDF and judge five
        things per node — verbatim quote, grounding, claim polarity, substantive
        fidelity, and methods context. New to the node types?{" "}
        <Link href="/review/guide" className="text-primary hover:underline">
          Read the reviewer guide
        </Link>
        .
      </p>

      <ul className="mt-8 divide-y divide-border rounded-lg border border-border">
        {papers.map((p) => (
          <li key={p.citekey}>
            <Link
              href={`/review/accuracy/${encodeURIComponent(p.citekey)}`}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {p.citekey}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 font-mono text-xs text-muted-foreground">
                <span>{p.evds} EVDs</span>
                {!p.hasPdf && <span className="text-destructive">no PDF</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
