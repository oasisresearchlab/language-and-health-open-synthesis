export type NodeType =
  | "question"
  | "claim"
  | "evidence"
  | "method"
  | "source"
  | "evidencepattern"
  | "artifact";

export type EdgeType =
  | "addresses"
  | "supports"
  | "opposes"
  | "derivedFrom"
  | "informs"
  | "usesMethod"
  | "usesArtifact";

export const NODE_TYPES: NodeType[] = [
  "question",
  "claim",
  "evidence",
  "method",
  "source",
  "evidencepattern",
  "artifact",
];

export const EDGE_TYPES: EdgeType[] = [
  "addresses",
  "supports",
  "opposes",
  "derivedFrom",
  "informs",
  "usesMethod",
  "usesArtifact",
];

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  question: "Question",
  claim: "Claim",
  evidence: "Evidence",
  method: "Method",
  source: "Source",
  evidencepattern: "Evidence Pattern",
  artifact: "Artifact",
};

export const EDGE_LABEL: Record<EdgeType, string> = {
  addresses: "addresses",
  supports: "supports",
  opposes: "opposes",
  derivedFrom: "derived from",
  informs: "informs",
  usesMethod: "uses method",
  usesArtifact: "uses artifact",
};

export const EDGE_INVERSE_LABEL: Record<EdgeType, string> = {
  addresses: "addressed by",
  supports: "supported by",
  opposes: "opposed by",
  derivedFrom: "source for",
  informs: "informed by",
  usesMethod: "used by",
  usesArtifact: "used by",
};

export interface NodeFrontmatter {
  id: string;
  type: NodeType;
  title: string;
  /** Generated 2–5 word semantic label shown on the node in graph views. */
  shortLabel?: string;
  status?: string;
  source_section?: string;
  created?: string;
  /** Distinct source papers among supporting / opposing EVDs (CLM only; mechanical strength proxy, not GRADE). */
  supportPapers?: number;
  opposePapers?: number;
  /** Bibliographic metadata (SRC only) for citations + follow-the-source links. */
  author?: string;
  year?: string;
  journal?: string;
  doi?: string;
  pubmedId?: string;
  citekey?: string;
  edges?: Partial<Record<EdgeType, string[]>>;
}

export interface OutgoingEdge {
  edge: EdgeType;
  to: string;
}

export interface IncomingEdge {
  edge: EdgeType;
  from: string;
}

export interface GraphNode {
  id: string;
  type: NodeType;
  title: string;
  /** Generated 2–5 word semantic label shown on the node in graph views. */
  shortLabel?: string;
  status?: string;
  source_section?: string;
  sections: string[];
  created?: string;
  /** Distinct source papers among supporting / opposing EVDs (CLM only; mechanical strength proxy, not GRADE). */
  supportPapers?: number;
  opposePapers?: number;
  /** Bibliographic metadata (SRC only) for citations + follow-the-source links. */
  author?: string;
  year?: string;
  journal?: string;
  doi?: string;
  pubmedId?: string;
  citekey?: string;
  body: string;
  filePath: string;
  outgoing: OutgoingEdge[];
  incoming: IncomingEdge[];
}

export interface NodeIssue {
  number: number;
  url: string;
  state: string;
  count: number;
}

export type NodeIssueMap = Record<string, NodeIssue>;

export interface Graph {
  nodes: Map<string, GraphNode>;
  byType: Record<NodeType, GraphNode[]>;
  bySection: Map<string, GraphNode[]>;
  brokenEdges: Array<{ from: string; to: string; edge: EdgeType }>;
  nodeIssues: NodeIssueMap;
}
