import { promises as fs } from "node:fs";
import path from "node:path";

import { loadGeneratedGraph } from "./graph";
import type { GraphNode } from "./types";

// The accuracy pass reviews *existing* EVD extractions against the PDF, one EVD at a
// time, across a checklist (verbatim / grounding / polarity / substantive / methods).
// Data is reused from the exported graph (graph/) — no separate precompute.

// Review batch: the length-of-stay + readmission clusters. Upload these papers'
// PDFs (scripts/upload-review-pdfs.mjs) and rebuild review-data for them.
export const ACCURACY_BATCH = [
  "@Allan_2022_impact_English",
  "@Karliner_2017_Convenient_Access",
  "@Lindholm_2012_Professional_language",
  "@Wallbrecht_2014_difference_emergency",
  "@Greenky_2019_Reversed_Trend",
];

// Curated review set — ~4 LOS + ~4 readmission EVDs (spanning surgical/inpatient/
// ED/peds and effect/null). Only these are shown in the accuracy pane; leave empty
// to show every EVD of the batch papers. Keyed by EVD title (stable across re-export).
export const CURATED_EVD_TITLES = new Set<string>([
  // length of stay
  "LEP inpatients without a professional interpreter on both admission and discharge had a 0.75-1.47 day longer length of stay",
  "Bedside interpreter telephone access had no significant effect on length of stay",
  "No significant difference in length of stay after bariatric surgery between LEP and EP patients (adjusted IRR 0.94)",
  "Among LEP ED patients interpreter use was associated with significantly longer length of stay",
  // readmission
  "Bedside interpreter telephone access lowered LEP 30-day readmission during intervention (OR 0.64)",
  "LEP inpatients with no interpreter on admission or discharge had a higher 30-day readmission rate (24.3% vs 14.9%)",
  "No significant difference in one-year readmission after bariatric surgery between LEP and EP patients (adjusted OR 0.94)",
  "Adjusted odds of 7-day ED readmission were only 3% higher and non-significant for interpreter-requested pediatric patients",
]);

const isCurated = (title: string) =>
  CURATED_EVD_TITLES.size === 0 || CURATED_EVD_TITLES.has(title);

const PDFS = path.resolve(process.cwd(), "..", "data", "pdfs"); // local dev only
// Committed review data (works at build + runtime on Vercel — no fs outside site/).
const REVIEW_DATA = path.resolve(process.cwd(), "review-data");
// EVD id → physical PDF page, precomputed by utils/build_accuracy_pages.py.
const PAGES_FILE = path.join(REVIEW_DATA, "accuracy_pages.json");

async function physicalPages(): Promise<Record<string, number>> {
  try {
    return JSON.parse(await fs.readFile(PAGES_FILE, "utf-8"));
  } catch {
    return {};
  }
}

// EVD id → { finding|what|how|who → (QuoteRegion|null)[] }, from build_quote_regions.py
type RegionMap = Record<
  string,
  Record<string, (QuoteRegion | null)[]>
>;
const REGIONS_FILE = path.join(REVIEW_DATA, "quote_regions.json");

async function quoteRegions(): Promise<RegionMap> {
  try {
    return JSON.parse(await fs.readFile(REGIONS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

// attach precomputed regions to an EVD's quotes (by role + index)
function withRegions(evd: AccuracyEvd, roles?: Record<string, (QuoteRegion | null)[]>): AccuracyEvd {
  if (!roles) return evd;
  const zip = (qs: Quote[], role: string): Quote[] =>
    qs.map((q, i) => ({ ...q, region: roles[role]?.[i] ?? null }));
  return {
    ...evd,
    imageRegion: roles["figure"]?.[0] ?? evd.imageRegion,
    quotes: zip(evd.quotes, "finding"),
    methods: evd.methods.map((p) => ({ ...p, quotes: zip(p.quotes, p.key) })),
  };
}

export interface LinkedClaim {
  id: string;
  title: string;
  polarity: "supports" | "opposes";
}

// Exact PDF location of a quote, precomputed by utils/build_quote_regions.py.
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
} // normalized 0..1
export interface QuoteRegion {
  page: number; // physical 1-based
  rects: Rect[];
}
export interface Quote {
  text: string;
  region: QuoteRegion | null; // null if PyMuPDF couldn't locate it
}

export interface MethodsPart {
  key: "what" | "how" | "who";
  label: string;
  summary: string;
  quotes: Quote[]; // the verbatim quote(s) grounding this assertion
}

export interface AccuracyEvd {
  id: string; // E-0061
  title: string;
  shortLabel?: string;
  description: string; // prose (image + quotes stripped out)
  image: string | null; // grounding figure/table crop, /attachments/...
  imageRegion: QuoteRegion | null; // exact PDF location of the figure/table caption
  quotes: Quote[]; // verbatim blockquotes from the Description
  methods: MethodsPart[]; // What / How / Who, each with its grounding quote(s)
  claims: LinkedClaim[]; // the CLM(s) this EVD supports/opposes
  otherNotes: string; // ## Other Notes (synthesis prose)
  caveats: string[];
  tags: string[];
  page: number | null; // PHYSICAL pdf page for the jump (mapped from the journal page)
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

const METHODS_HEADS: { key: MethodsPart["key"]; label: string }[] = [
  { key: "what", label: "What" },
  { key: "how", label: "How" },
  { key: "who", label: "Who" },
];

function methodsParts(methods: string): MethodsPart[] {
  const parts: MethodsPart[] = [];
  for (const { key, label } of METHODS_HEADS) {
    const re = new RegExp(
      `###\\s+${label}\\??\\s*\\n([\\s\\S]*?)(?=\\n###\\s+|$)`,
      "i",
    );
    const m = methods.match(re);
    if (!m) continue;
    const block = m[1];
    const summary = firstProse(block);
    const qs = quotes(block).map((t) => ({ text: t, region: null }));
    if (summary || qs.length) parts.push({ key, label, summary, quotes: qs });
  }
  return parts;
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
  const other = secs["other notes"] ?? "";

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

  const qs = quotes(desc).map((t) => ({ text: t, region: null }));

  return {
    id: node.id,
    title: node.title,
    shortLabel: node.shortLabel,
    description: descriptionProse(desc),
    image: firstImage(desc),
    imageRegion: null, // attached later, in accuracyPaper
    quotes: qs,
    methods: methodsParts(methods),
    claims,
    otherNotes: firstProse(other) ? other.replace(/\n{3,}/g, "\n\n").trim() : "",
    caveats: caveatList(cav),
    tags: [],
    page: qs.map((q) => pageFromQuote(q.text)).find((p) => p !== null) ?? null,
  };
}

// Some early EVD files are unfilled template stubs (e.g. E-0001..E-0007) — exclude
// them from review so reviewers never see placeholder boilerplate.
export function isTemplateStub(body: string): boolean {
  return (
    body.includes("Screenshots of key figure/table") ||
    body.includes("observable measures/data** were collected")
  );
}

function citekeyOf(node: GraphNode, nodes: Map<string, GraphNode>): string | null {
  const src = node.outgoing.find((e) => e.edge === "derivedFrom");
  if (!src) return null;
  return nodes.get(src.to)?.citekey ?? null;
}

async function evdsByCitekey(): Promise<Map<string, GraphNode[]>> {
  const g = loadGeneratedGraph();
  const map = new Map<string, GraphNode[]>();
  for (const node of g.byType.evidence) {
    if (isTemplateStub(node.body)) continue; // skip unfilled template stubs
    const ck = citekeyOf(node, g.nodes);
    if (!ck) continue;
    (map.get(ck) ?? map.set(ck, []).get(ck)!).push(node);
  }
  return map;
}

export async function accuracyIndex(): Promise<AccuracyIndexEntry[]> {
  const g = loadGeneratedGraph();
  const byCk = await evdsByCitekey();
  return Promise.all(
    ACCURACY_BATCH.map(async (ck) => {
      const src = g.byType.source.find((s) => s.citekey === ck);
      return {
        citekey: ck,
        title: src?.title ?? ck,
        evds: (byCk.get(ck) ?? []).filter((n) => isCurated(n.title)).length,
        hasPdf: await pdfExists(ck),
      };
    }),
  );
}

export async function accuracyPaper(
  citekey: string,
): Promise<AccuracyPaper | null> {
  if (!ACCURACY_BATCH.includes(citekey)) return null;
  const g = loadGeneratedGraph();
  const src = g.byType.source.find((s) => s.citekey === citekey);
  const byCk = await evdsByCitekey();
  const evdNodes = byCk.get(citekey) ?? [];
  if (!src && evdNodes.length === 0) return null;

  const [pages, regions] = await Promise.all([physicalPages(), quoteRegions()]);
  const evds = evdNodes
    .filter((n) => isCurated(n.title))
    .map((n) => buildEvd(n, g.nodes))
    .map((e) => ({ ...e, page: pages[e.id] ?? e.page }))
    .map((e) => withRegions(e, regions[e.id]))
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

// "Available" = local file (dev) OR production (served from Supabase Storage; the
// PdfPane shows its own graceful error if the route can't find it).
export async function pdfExists(citekey: string): Promise<boolean> {
  if (process.env.NODE_ENV === "production") return true;
  try {
    await fs.access(path.join(PDFS, `${citekey}.pdf`));
    return true;
  } catch {
    return false;
  }
}
