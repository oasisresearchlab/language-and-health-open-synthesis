// Runtime-safe graph access for code that runs inside Vercel functions
// (i.e., the /api/generate route). Server components that run only at build
// time should keep using ./graph.ts, which reads ../graph/*.md fresh and
// gives a hot-reloading dev experience. This module reads the static JSON
// produced by scripts/build-graph-data.mjs, which is bundled into the
// function deployment.

import data from "./graph-data.generated.json";
import type {
  EdgeType,
  Graph,
  GraphNode,
  IncomingEdge,
  NodeIssueMap,
  NodeType,
  OutgoingEdge,
} from "./types";
import { NODE_TYPES } from "./types";

interface RawNode {
  id: string;
  type: NodeType;
  title: string;
  status?: string;
  source_section?: string;
  sections: string[];
  created?: string;
  body: string;
  outgoing: OutgoingEdge[];
}

interface RawData {
  nodes: RawNode[];
  paper: string;
  narratives: Array<{ anchorId: string; shortId: string; raw: string }>;
  nodeIssues?: NodeIssueMap;
}

const raw = data as unknown as RawData;

let cached: Graph | null = null;

function buildGraph(): Graph {
  const nodes = new Map<string, GraphNode>();
  for (const r of raw.nodes) {
    nodes.set(r.id, {
      id: r.id,
      type: r.type,
      title: r.title,
      status: r.status,
      source_section: r.source_section,
      sections: r.sections,
      created: r.created,
      body: r.body,
      filePath: "", // not meaningful at runtime
      outgoing: r.outgoing,
      incoming: [],
    });
  }

  for (const node of nodes.values()) {
    for (const out of node.outgoing) {
      const target = nodes.get(out.to);
      if (!target) continue;
      const inc: IncomingEdge = { edge: out.edge as EdgeType, from: node.id };
      target.incoming.push(inc);
    }
  }

  const byType = NODE_TYPES.reduce(
    (acc, t) => {
      acc[t] = [];
      return acc;
    },
    {} as Record<NodeType, GraphNode[]>,
  );
  for (const node of nodes.values()) byType[node.type].push(node);

  const bySection = new Map<string, GraphNode[]>();
  for (const node of nodes.values()) {
    for (const section of node.sections) {
      if (!bySection.has(section)) bySection.set(section, []);
      bySection.get(section)!.push(node);
    }
  }

  return {
    nodes,
    byType,
    bySection,
    brokenEdges: [],
    nodeIssues: raw.nodeIssues ?? {},
  };
}

export function loadGraphRuntime(): Graph {
  if (!cached) cached = buildGraph();
  return cached;
}

export function getPaperRaw(): string {
  return raw.paper;
}
