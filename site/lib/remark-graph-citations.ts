import type { Plugin } from "unified";
import type { Root, Text, Link, Parent } from "mdast";
import { visit, SKIP } from "unist-util-visit";

const CITATION_RE = /\b([QCEMSPA]-\d{4}[a-z]?)\b/g;

/**
 * Remark plugin: replace bare graph IDs (Q-0001, C-0042, S-0001a) inside
 * regular text with internal links to /node/<ID>. Skips text already inside
 * a link or code node so we don't double-link or mangle code blocks.
 */
export const remarkGraphCitations: Plugin<[], Root> = () => (tree) => {
  visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
    if (!parent || index == null) return;
    if (parent.type === "link" || parent.type === "linkReference") return;
    if (parent.type === "code" || parent.type === "inlineCode") return;
    const value = node.value;
    CITATION_RE.lastIndex = 0;
    const matches = [...value.matchAll(CITATION_RE)];
    if (matches.length === 0) return;

    const newNodes: Array<Text | Link> = [];
    let cursor = 0;
    for (const m of matches) {
      const start = m.index ?? 0;
      if (start > cursor) {
        newNodes.push({ type: "text", value: value.slice(cursor, start) });
      }
      const id = m[0];
      const link: Link = {
        type: "link",
        url: `/node/${id}`,
        children: [{ type: "text", value: id }],
        data: { hProperties: { className: "citation-link" } },
      };
      newNodes.push(link);
      cursor = start + id.length;
    }
    if (cursor < value.length) {
      newNodes.push({ type: "text", value: value.slice(cursor) });
    }
    parent.children.splice(index, 1, ...newNodes);
    return [SKIP, index + newNodes.length];
  });
};
