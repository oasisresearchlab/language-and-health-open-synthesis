import React from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

import { remarkGraphCitations } from "@/lib/remark-graph-citations";
import { cn } from "@/lib/utils";
import { NodeHoverCard, type NodePreview } from "@/components/node-hover-card";

export interface MarkdownProseProps {
  source: string;
  className?: string;
  /** When true, render headings without the autolink/slug behavior. */
  plain?: boolean;
  /** id -> preview, so inline /node/<id> links get a Wikipedia-style hover card. */
  previews?: Record<string, NodePreview>;
}

const NODE_HREF = /^\/node\/([A-Za-z]-\d{4}[a-z]?)$/;

// Methods-Context section definitions surfaced as a hover affordance on the heading.
const SECTION_DEFS: Record<string, string> = {
  "What?": "The observable — the outcome/measure recorded, not the study design.",
  "How?": "The design + procedure used to observe it (study design, comparison, analysis).",
  "Who?": "The equivalence class this generalizes to — setting, sample, participants.",
};

function nodeText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(nodeText).join("");
  if (React.isValidElement(children)) {
    return nodeText(
      (children.props as { children?: React.ReactNode }).children,
    );
  }
  return "";
}

function buildComponents(previews?: Record<string, NodePreview>): Components {
  return {
    img(props) {
      const src = (props as { src?: string }).src;
      if (!src) return null;
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
      return <img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />;
    },
    a(props) {
      const href = (props as { href?: string }).href ?? "";
      const m = NODE_HREF.exec(href);
      if (m) {
        return (
          <NodeHoverCard
            href={href}
            preview={previews?.[m[1]]}
            className={
              (props as { className?: string }).className ?? "citation-link"
            }
          >
            {props.children}
          </NodeHoverCard>
        );
      }
      return <a {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)} />;
    },
    h3(props) {
      const def =
        SECTION_DEFS[nodeText(props.children).replace(/\s*#\s*$/, "").trim()];
      return (
        <h3 {...(props as React.HTMLAttributes<HTMLHeadingElement>)}>
          {props.children}
          {def ? (
            <abbr
              title={def}
              className="ml-1.5 cursor-help align-middle font-sans text-xs font-normal text-muted-foreground no-underline"
            >
              ⓘ
            </abbr>
          ) : null}
        </h3>
      );
    },
  };
}

export function MarkdownProse({
  source,
  className,
  plain,
  previews,
}: MarkdownProseProps) {
  const rehypePlugins = plain
    ? []
    : [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "append",
            properties: {
              className: "heading-anchor",
              ariaLabel: "Permalink to this heading",
            },
            content: { type: "text", value: " #" },
          },
        ] as const,
      ];

  return (
    <div className={cn("prose-node", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkGraphCitations]}
        rehypePlugins={rehypePlugins as never}
        components={buildComponents(previews)}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
