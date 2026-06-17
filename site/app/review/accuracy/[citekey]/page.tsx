import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { accuracyPaper } from "@/lib/review-accuracy";
import { AccuracyPane } from "@/components/review/accuracy-pane";

export const dynamic = "force-dynamic";

export default async function AccuracyPaperPage({
  params,
}: {
  params: Promise<{ citekey: string }>;
}) {
  const { citekey } = await params;
  const ck = decodeURIComponent(citekey);
  const paper = await accuracyPaper(ck);
  if (!paper) notFound();

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-2">
        <Link
          href="/review/accuracy"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Papers
        </Link>
        <span className="text-border">/</span>
        <h1 className="min-w-0 flex-1 truncate text-sm font-medium" title={paper.title}>
          {paper.title}
        </h1>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          {paper.citekey}
        </span>
      </header>
      <AccuracyPane paper={paper} />
    </div>
  );
}
