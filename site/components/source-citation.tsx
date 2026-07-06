import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { GraphNode } from "@/lib/types";

/**
 * Citation block for a source (SRC) node: human-readable reference plus
 * clickable DOI / PubMed links. Rendered full on a source page, and compact
 * in the header of an evidence node (its derived-from source).
 */
export function SourceCitation({
  source,
  variant = "full",
  showNodeLink = variant === "compact",
}: {
  source: GraphNode;
  variant?: "full" | "compact";
  showNodeLink?: boolean;
}) {
  const { author, year, title, journal, doi, pubmedId, id } = source;
  const lead = [author, year ? `(${year})` : null].filter(Boolean).join(" ");

  return (
    <div
      className={`rounded-lg border border-border bg-accent/40 ${
        variant === "compact" ? "p-4" : "p-5"
      }`}
    >
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Source
      </p>
      <p className="mt-2 font-serif text-[15px] leading-relaxed">
        {lead ? <span>{lead}. </span> : null}
        <span className="italic">{title}</span>
        {journal ? <span>. {journal}.</span> : null}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs">
        {doi ? (
          <a
            href={`https://doi.org/${doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            doi:{doi}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
        {pubmedId ? (
          <a
            href={`https://pubmed.ncbi.nlm.nih.gov/${pubmedId}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            PMID:{pubmedId}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
        {showNodeLink ? (
          <Link
            href={`/node/${id}`}
            className="text-muted-foreground hover:text-foreground"
          >
            {id} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
