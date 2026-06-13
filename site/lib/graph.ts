import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import generated from "./graph-data.generated.json";
import {
  EDGE_TYPES,
  type EdgeType,
  type Graph,
  type GraphNode,
  type IncomingEdge,
  type NodeFrontmatter,
  type NodeIssueMap,
  type NodeType,
  type OutgoingEdge,
  NODE_TYPES,
} from "./types";

const generatedNodeIssues: NodeIssueMap =
  ((generated as { nodeIssues?: NodeIssueMap }).nodeIssues ?? {}) as NodeIssueMap;

const ROOT = path.resolve(process.cwd(), "..", "graph");

const TYPE_DIRS: Record<NodeType, string> = {
  question: "questions",
  claim: "claims",
  evidence: "evidence",
  method: "methods",
  source: "sources",
  evidencepattern: "evidencepatterns",
  artifact: "artifacts",
};

let cached: Graph | null = null;
let cachePromise: Promise<Graph> | null = null;

function toStringMaybe(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (v instanceof Date) {
    // YAML ISO date — render as YYYY-MM-DD
    return v.toISOString().slice(0, 10);
  }
  return String(v);
}

async function readNodeFile(filePath: string): Promise<GraphNode | null> {
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = matter(raw);
  const fm = parsed.data as Record<string, unknown> & NodeFrontmatter;
  if (!fm?.id || !fm?.type) {
    console.warn(`[graph] missing id/type in ${filePath}`);
    return null;
  }
  const sourceSectionStr = toStringMaybe(fm.source_section) ?? "";
  const sections = sourceSectionStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const outgoing: OutgoingEdge[] = [];
  const edges = fm.edges ?? {};
  for (const edge of EDGE_TYPES) {
    const targets = edges[edge];
    if (!Array.isArray(targets)) continue;
    for (const target of targets) {
      if (typeof target !== "string" || !target) continue;
      outgoing.push({ edge, to: target });
    }
  }

  return {
    id: String(fm.id),
    type: fm.type,
    title: toStringMaybe(fm.title) ?? String(fm.id),
    shortLabel: toStringMaybe(fm.shortLabel) || undefined,
    status: toStringMaybe(fm.status),
    source_section: sourceSectionStr || undefined,
    sections,
    created: toStringMaybe(fm.created),
    supportPapers: typeof fm.supportPapers === "number" ? fm.supportPapers : undefined,
    opposePapers: typeof fm.opposePapers === "number" ? fm.opposePapers : undefined,
    body: parsed.content.trim(),
    filePath,
    outgoing,
    incoming: [],
  };
}

async function readDir(dir: string): Promise<GraphNode[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const files = entries.filter((e) => e.endsWith(".md"));
  const out: GraphNode[] = [];
  for (const f of files) {
    const node = await readNodeFile(path.join(dir, f));
    if (node) out.push(node);
  }
  return out;
}

async function loadGraphImpl(): Promise<Graph> {
  const all: GraphNode[] = [];
  for (const type of NODE_TYPES) {
    const nodes = await readDir(path.join(ROOT, TYPE_DIRS[type]));
    all.push(...nodes);
  }

  const nodes = new Map<string, GraphNode>();
  for (const n of all) {
    if (nodes.has(n.id)) {
      console.warn(`[graph] duplicate id ${n.id} (second file: ${n.filePath})`);
      continue;
    }
    nodes.set(n.id, n);
  }

  const brokenEdges: Graph["brokenEdges"] = [];
  for (const node of nodes.values()) {
    for (const out of node.outgoing) {
      const target = nodes.get(out.to);
      if (!target) {
        brokenEdges.push({ from: node.id, to: out.to, edge: out.edge });
        continue;
      }
      const inc: IncomingEdge = { edge: out.edge, from: node.id };
      target.incoming.push(inc);
    }
  }

  for (const node of nodes.values()) {
    node.outgoing.sort((a, b) =>
      a.edge === b.edge ? a.to.localeCompare(b.to) : a.edge.localeCompare(b.edge),
    );
    node.incoming.sort((a, b) =>
      a.edge === b.edge
        ? a.from.localeCompare(b.from)
        : a.edge.localeCompare(b.edge),
    );
  }

  const byType = NODE_TYPES.reduce(
    (acc, t) => {
      acc[t] = [];
      return acc;
    },
    {} as Record<NodeType, GraphNode[]>,
  );
  for (const node of nodes.values()) {
    byType[node.type].push(node);
  }
  for (const t of NODE_TYPES) {
    byType[t].sort((a, b) => a.id.localeCompare(b.id));
  }

  const bySection = new Map<string, GraphNode[]>();
  for (const node of nodes.values()) {
    for (const section of node.sections) {
      if (!bySection.has(section)) bySection.set(section, []);
      bySection.get(section)!.push(node);
    }
  }
  for (const list of bySection.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id));
  }

  if (brokenEdges.length > 0) {
    console.warn(
      `[graph] ${brokenEdges.length} broken edges (e.g., ${brokenEdges
        .slice(0, 3)
        .map((b) => `${b.from} --${b.edge}--> ${b.to}`)
        .join("; ")})`,
    );
  }

  return { nodes, byType, bySection, brokenEdges, nodeIssues: generatedNodeIssues };
}

export async function loadGraph(): Promise<Graph> {
  // In dev, always re-read so edits to ../graph/*.md show up without restart.
  if (process.env.NODE_ENV !== "production") {
    return loadGraphImpl();
  }
  if (cached) return cached;
  if (!cachePromise) {
    cachePromise = loadGraphImpl().then((g) => {
      cached = g;
      return g;
    });
  }
  return cachePromise;
}

export async function getNode(id: string): Promise<GraphNode | undefined> {
  const g = await loadGraph();
  return g.nodes.get(id);
}

export async function getAllNodeIds(): Promise<string[]> {
  const g = await loadGraph();
  return Array.from(g.nodes.keys());
}

export function nodeTypeFromId(id: string): NodeType | null {
  const prefix = id.charAt(0).toUpperCase();
  switch (prefix) {
    case "Q":
      return "question";
    case "C":
      return "claim";
    case "E":
      return "evidence";
    case "M":
      return "method";
    case "S":
      return "source";
    case "P":
      return "evidencepattern";
    case "A":
      return "artifact";
    default:
      return null;
  }
}

export function isEdgeType(s: string): s is EdgeType {
  return (EDGE_TYPES as string[]).includes(s);
}
