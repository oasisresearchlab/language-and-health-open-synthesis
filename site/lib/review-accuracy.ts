import { promises as fs } from "node:fs";
import path from "node:path";

import { loadGraph } from "./graph";
import type { GraphNode } from "./types";

// The accuracy pass reviews *existing* EVD extractions against the PDF, one EVD at a
// time, across a checklist (verbatim / grounding / polarity / quant / methods).
// Data is reused from the exported graph (graph/) — no separate precompute.

// Tomorrow's pilot batch. Add/trim citekeys here.
export const ACCURACY_BATCH = [
  "@Allan_2022_impact_English",
  "@Karliner_2017_Convenient_Access",
];

const PDFS = path.resolve(process.cwd(), "..", "data", "pdfs");

export interface LinkedClaim {
  id: string;
  title: string;
  polarity: "supports" | "opposes";
}

export interface AccuracyEvd {
  id: string; // E-0061
  title: string;
  shortLabel?: string;
  description: string; // prose (image + quotes stripped out)
  image: string | null; // grounding figure/table crop, /attachments/...
  quotes: string[]; // verbatim blockquotes from the Description
  what: string;
  how: string;
  who: string;
  claims: LinkedClaim[]; // the CLM(s) this EVD supports/opposes
  caveats: string[];
  tags: string[];
  page: number | null; // cited page from the first quote, for the PDF jump
}

export interface AccuracyPaper {
  citekey: string;
  title: string;
  author: string;
  year: string;
  doi: string;
  pubmedId: string;
  hasPdf: boolean;
  evds: AccuracyEvd[];
}

export interface AccuracyIndexEntry {
  citekey: string;
  title: string;
  evds: number;
  hasPdf: boolean;
}

// ── Markdown body parsing ────────────────────────────────────────────────────

function sections(body: string): Record<string, string> {
  // split on "## Header"
  const out: Record<string, string> = {};
  const parts = body.split(/^##\s+/m);
  for (const part of parts) {
    const nl = part.indexOf("\n");
    if (nl === -1) continue;
    const head = part.slice(0, nl).trim();
    out[head.toLowerCase()] = part.slice(nl + 1).trim();
  }
  return out;
}

function subSection(text: string, head: string): string {
  // pull a "### What?" block out of the Methods Context section
  const re = new RegExp(`###\\s+${head}\\s*\\n([\\s\\S]*?)(?:\\n###\\s+|$)`, "i");
  const m = text.match(re);
  if (!m) return "";
  return firstProse(m[1]);
}

function firstProse(text: string): string {
  // first non-quote, non-image paragraph
  for (const block of text.split(/\n\s*\n/)) {
    const t = block.trim();
    if (t && !t.startsWith(">") && !t.startsWith("![")) {
      return t.replace(/\s+/g, " ");
    }
  }
  return "";
}

function quotes(text: string): string[] {
  // contiguous "> …" blocks → one quote each (keep the page citation)
  const out: string[] = [];
  let cur: string[] = [];
  for (const line of text.split("\n")) {
    if (line.trim().startsWith(">")) {
      cur.push(line.replace(/^\s*>\s?/, ""));
    } else if (cur.length) {
      out.push(cur.join(" ").replace(/\s+/g, " ").trim());
      cur = [];
    }
  }
  if (cur.length) out.push(cur.join(" ").replace(/\s+/g, " ").trim());
  return out.filter(Boolean);
}

function firstImage(text: string): string | null {
  const m = text.match(/!\[\]?\(([^)]+)\)/);
  return m ? m[1] : null;
}

function descriptionProse(text: string): string {
  // everything in Description that isn't the image or a blockquote
  return text
    .split("\n")
    .filter((l) => !l.trim().startsWith(">") && !l.trim().startsWith("!["))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function caveatList(text: string): string[] {
  return text
    .split(/\n(?=[-*]\s)/)
    .map((b) => b.replace(/^[-*]\s+/, "").replace(/\s+/g, " ").trim())
    .filter((b) => b.length > 0);
}

function pageFromQuote(q: string): number | null {
  const m = q.match(/p\.?\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

// ── Assembly ─────────────────────────────────────────────────────────────────

export function buildEvd(
  node: GraphNode,
  nodes: Map<string, GraphNode>,
): AccuracyEvd {
  const secs = sections(node.body);
  const desc = secs["description"] ?? "";
  const methods = secs["methods context"] ?? "";
  const cav = secs["caveats"] ?? "";

  const claims: LinkedClaim[] = node.outgoing
    .filter((e) => e.edge === "supports" || e.edge === "opposes")
    .map((e) => {
      const target = nodes.get(e.to);
      return {
        id: e.to,
        title: target?.title ?? e.to,
        polarity: e.edge as "supports" | "opposes",
      };
    });

  const qs = quotes(desc);

  return {
    id: node.id,
    title: node.title,
    shortLabel: node.shortLabel,
    description: descriptionProse(desc),
    image: firstImage(desc),
    quotes: qs,
    what: subSection(methods, "What\\??"),
    how: subSection(methods, "How\\??"),
    who: subSection(methods, "Who\\??"),
    claims,
    caveats: caveatList(cav),
    tags: [],
    page: qs.map(pageFromQuote).find((p) => p !== null) ?? null,
  };
}

function citekeyOf(node: GraphNode, nodes: Map<string, GraphNode>): string | null {
  const src = node.outgoing.find((e) => e.edge === "derivedFrom");
  if (!src) return null;
  return nodes.get(src.to)?.citekey ?? null;
}

async function evdsByCitekey(): Promise<Map<string, GraphNode[]>> {
  const g = await loadGraph();
  const map = new Map<string, GraphNode[]>();
  for (const node of g.byType.evidence) {
    const ck = citekeyOf(node, g.nodes);
    if (!ck) continue;
    (map.get(ck) ?? map.set(ck, []).get(ck)!).push(node);
  }
  return map;
}

export async function accuracyIndex(): Promise<AccuracyIndexEntry[]> {
  const g = await loadGraph();
  const byCk = await evdsByCitekey();
  return Promise.all(
    ACCURACY_BATCH.map(async (ck) => {
      const src = g.byType.source.find((s) => s.citekey === ck);
      return {
        citekey: ck,
        title: src?.title ?? ck,
        evds: (byCk.get(ck) ?? []).length,
        hasPdf: await pdfExists(ck),
      };
    }),
  );
}

export async function accuracyPaper(
  citekey: string,
): Promise<AccuracyPaper | null> {
  if (!ACCURACY_BATCH.includes(citekey)) return null;
  const g = await loadGraph();
  const src = g.byType.source.find((s) => s.citekey === citekey);
  const byCk = await evdsByCitekey();
  const evdNodes = byCk.get(citekey) ?? [];
  if (!src && evdNodes.length === 0) return null;

  const evds = evdNodes
    .map((n) => buildEvd(n, g.nodes))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    citekey,
    title: src?.title ?? citekey,
    author: src?.author ?? "",
    year: src?.year ?? "",
    doi: src?.doi ?? "",
    pubmedId: src?.pubmedId ?? "",
    hasPdf: await pdfExists(citekey),
    evds,
  };
}

export async function pdfExists(citekey: string): Promise<boolean> {
  try {
    await fs.access(path.join(PDFS, `${citekey}.pdf`));
    return true;
  } catch {
    return false;
  }
}
