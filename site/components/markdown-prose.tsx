import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

import { remarkGraphCitations } from "@/lib/remark-graph-citations";
import { cn } from "@/lib/utils";

export interface MarkdownProseProps {
  source: string;
  className?: string;
  /** When true, render headings without the autolink/slug behavior. */
  plain?: boolean;
}

const components: Components = {
  // Skip <img> with no resolved src (reference-style refs the parser couldn't
  // resolve produce empty src and otherwise spam React's server-render logs).
  img(props) {
    const src = (props as { src?: string }).src;
    if (!src) return null;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
};

export function MarkdownProse({ source, className, plain }: MarkdownProseProps) {
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
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
