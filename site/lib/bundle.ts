import type { EdgeType, Graph, GraphNode } from "./types";
import { loadGraph } from "./graph";

export interface BundleNode {
  id: string;
  type: GraphNode["type"];
  title: string;
  isAnchor: boolean;
  /**
   * Distance from the anchor along the bundle expansion. Meaningful for the
   * `hops` strategy; for the semantic walk the value is set to 0 for the
   * anchor and 1 for everything else (the walk doesn't track exact hop
   * distance — its stop conditions are type-aware, not depth-bounded).
   */
  depth: number;
}

export interface BundleEdge {
  from: string;
  to: string;
  edge: EdgeType;
}

export interface Bundle {
  anchor: string;
  nodes: BundleNode[];
  edges: BundleEdge[];
}

// ---------------------------------------------------------------------------
// Helpers

function edgesOfByType(node: GraphNode): Record<EdgeType, string[]> {
  const out: Record<EdgeType, string[]> = {
    addresses: [],
    supports: [],
    opposes: [],
    derivedFrom: [],
    informs: [],
    usesMethod: [],
    usesArtifact: [],
  };
  for (const e of node.outgoing) out[e.edge].push(e.to);
  return out;
}

function inboundOfByType(node: GraphNode): Record<EdgeType, string[]> {
  const out: Record<EdgeType, string[]> = {
    addresses: [],
    supports: [],
    opposes: [],
    derivedFrom: [],
    informs: [],
    usesMethod: [],
    usesArtifact: [],
  };
  for (const e of node.incoming) out[e.edge].push(e.from);
  return out;
}

/**
 * Given a set of node IDs, build the Bundle shape: BundleNode[] +
 * BundleEdge[] containing every edge that lies between two included nodes
 * (subgraph closure).
 */
function closeBundle(
  graph: Graph,
  anchorId: string,
  ids: Set<string>,
  depthHint: (id: string) => number,
): Bundle | null {
  const anchor = graph.nodes.get(anchorId);
  if (!anchor) return null;

  const nodes: BundleNode[] = [];
  for (const id of ids) {
    const n = graph.nodes.get(id);
    if (!n) continue;
    nodes.push({
      id: n.id,
      type: n.type,
      title: n.title,
      isAnchor: id === anchorId,
      depth: id === anchorId ? 0 : depthHint(id),
    });
  }

  const edges: BundleEdge[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const n = graph.nodes.get(id);
    if (!n) continue;
    for (const out of n.outgoing) {
      if (!ids.has(out.to)) continue;
      const key = `${id}|${out.edge}|${out.to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: id, to: out.to, edge: out.edge });
    }
  }

  return { anchor: anchor.id, nodes, edges };
}

// ---------------------------------------------------------------------------
// Strategy: hops (BFS to maxDepth, edge-direction-agnostic, type-blind)

/**
 * BFS expansion around an anchor up to `maxDepth` hops. Pulls every neighbor
 * — outbound or inbound — regardless of edge type. Closes the subgraph by
 * including any edges that exist between two already-included nodes.
 *
 * Type-blind. For type-aware walks driven by argumentative purpose, use
 * {@link buildSemanticBundle}.
 */
export function buildBundleFromGraph(
  graph: Graph,
  anchorId: string,
  maxDepth = 1,
): Bundle | null {
  const anchor = graph.nodes.get(anchorId);
  if (!anchor) return null;

  const depth = new Map<string, number>();
  depth.set(anchor.id, 0);
  const queue: Array<{ id: string; d: number }> = [{ id: anchor.id, d: 0 }];

  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    if (d >= maxDepth) continue;
    const node = graph.nodes.get(id);
    if (!node) continue;

    const neighbors = new Set<string>();
    for (const out of node.outgoing) neighbors.add(out.to);
    for (const inc of node.incoming) neighbors.add(inc.from);

    for (const nid of neighbors) {
      if (depth.has(nid)) continue;
      if (!graph.nodes.has(nid)) continue;
      depth.set(nid, d + 1);
      if (d + 1 < maxDepth) queue.push({ id: nid, d: d + 1 });
    }
  }

  const ids = new Set<string>(depth.keys());
  return closeBundle(graph, anchorId, ids, (id) => depth.get(id) ?? 1);
}

// ---------------------------------------------------------------------------
// Strategy: semantic
//
// Type-aware walk driven by argumentative purpose. Stop conditions per seed
// type.

/**
 * Walks the argumentation lattice from a Claim outward: supporting Evidence
 * (incoming `supports`) + their Sources, opposing Evidence (incoming
 * `opposes`) + their Sources, the Method the Claim uses, the Question(s) it
 * addresses (boundary), and counter-Claims (outgoing `opposes`).
 * Counter-Claims are themselves expanded the same way, so the walk follows
 * opposes-chains until they converge.
 *
 * Sibling Claims (other Claims addressing the same Question) are NOT pulled
 * in — that's a Question-seed walk's job.
 */
function claimNeighborhood(graph: Graph, seedCid: string): Set<string> {
  const bundle = new Set<string>([seedCid]);
  const visited = new Set<string>();
  let frontier: string[] = [seedCid];

  while (frontier.length > 0) {
    const next: string[] = [];
    for (const cid of frontier) {
      if (visited.has(cid)) continue;
      visited.add(cid);
      const n = graph.nodes.get(cid);
      if (!n || n.type !== "claim") continue;

      const out = edgesOfByType(n);
      const inc = inboundOfByType(n);

      // Method (boundary)
      for (const m of out.usesMethod) {
        if (graph.nodes.has(m)) bundle.add(m);
      }
      // Addressed Question (boundary — does NOT pull sibling Claims)
      for (const q of out.addresses) {
        if (graph.nodes.has(q)) bundle.add(q);
      }
      // Supporting Evidence (incoming) + their Sources
      for (const ev of inc.supports) {
        const evNode = graph.nodes.get(ev);
        if (!evNode) continue;
        bundle.add(ev);
        for (const s of edgesOfByType(evNode).derivedFrom) {
          if (graph.nodes.has(s)) bundle.add(s);
        }
      }
      // Opposing Evidence (incoming) + their Sources
      for (const ev of inc.opposes) {
        const evNode = graph.nodes.get(ev);
        if (!evNode) continue;
        bundle.add(ev);
        for (const s of edgesOfByType(evNode).derivedFrom) {
          if (graph.nodes.has(s)) bundle.add(s);
        }
      }
      // Counter-Claims (outgoing opposes) — recursively expanded
      for (const opp of out.opposes) {
        if (!graph.nodes.has(opp)) continue;
        bundle.add(opp);
        if (!visited.has(opp)) next.push(opp);
      }
    }
    frontier = next;
  }
  return bundle;
}

/**
 * Starts from a Question seed. Pulls all Claims that address it. Then
 * iteratively pulls in *related Questions* — Questions reached via Claims
 * already in the bundle that meet the qOverlap threshold (minimum number of
 * in-bundle Claims that must address the candidate Question for it to be
 * included). Each newly added Q's addressing Claims feed back into the
 * threshold check. Converges when no candidate meets the threshold.
 *
 * After the Q-set converges, every Claim in the bundle gets the full
 * claimNeighborhood treatment.
 */
function questionWalk(
  graph: Graph,
  seedQid: string,
  qOverlap: number,
): Set<string> {
  const inScopeQs = new Set<string>([seedQid]);
  const claimSet = new Set<string>();

  // Seed: all Claims that address Q.
  const seedNode = graph.nodes.get(seedQid);
  if (seedNode) {
    for (const e of seedNode.incoming) {
      if (e.edge === "addresses" && graph.nodes.has(e.from)) {
        claimSet.add(e.from);
      }
    }
  }

  // Iteratively pull related Qs.
  for (;;) {
    const candidateCounts = new Map<string, number>();
    for (const cid of claimSet) {
      const c = graph.nodes.get(cid);
      if (!c) continue;
      for (const q of edgesOfByType(c).addresses) {
        if (!inScopeQs.has(q) && graph.nodes.has(q)) {
          candidateCounts.set(q, (candidateCounts.get(q) ?? 0) + 1);
        }
      }
    }
    const newQs: string[] = [];
    for (const [q, n] of candidateCounts) {
      if (n >= qOverlap) newQs.push(q);
    }
    if (newQs.length === 0) break;
    for (const q of newQs) {
      inScopeQs.add(q);
      const qNode = graph.nodes.get(q);
      if (!qNode) continue;
      for (const e of qNode.incoming) {
        if (e.edge === "addresses" && graph.nodes.has(e.from)) {
          claimSet.add(e.from);
        }
      }
    }
  }

  const bundle = new Set<string>();
  for (const id of inScopeQs) bundle.add(id);
  for (const id of claimSet) bundle.add(id);
  for (const cid of claimSet) {
    for (const id of claimNeighborhood(graph, cid)) bundle.add(id);
  }
  return bundle;
}

function expandSeedSemantic(
  graph: Graph,
  seedId: string,
  qOverlap: number,
): Set<string> {
  const n = graph.nodes.get(seedId);
  if (!n) return new Set();
  switch (n.type) {
    case "question":
      return questionWalk(graph, seedId, qOverlap);
    case "claim":
      return claimNeighborhood(graph, seedId);
    case "evidence": {
      const bundle = new Set<string>([seedId]);
      const out = edgesOfByType(n);
      for (const s of out.derivedFrom) {
        if (graph.nodes.has(s)) bundle.add(s);
      }
      for (const cid of [...out.supports, ...out.opposes]) {
        if (graph.nodes.has(cid)) {
          for (const id of claimNeighborhood(graph, cid)) bundle.add(id);
        }
      }
      return bundle;
    }
    case "method": {
      const bundle = new Set<string>([seedId]);
      const out = edgesOfByType(n);
      const inc = inboundOfByType(n);
      for (const cid of out.informs) {
        if (graph.nodes.has(cid)) bundle.add(cid);
      }
      for (const cid of inc.usesMethod) {
        if (graph.nodes.has(cid)) bundle.add(cid);
      }
      return bundle;
    }
    case "source": {
      const bundle = new Set<string>([seedId]);
      const inc = inboundOfByType(n);
      for (const ev of inc.derivedFrom) {
        const evNode = graph.nodes.get(ev);
        if (!evNode) continue;
        bundle.add(ev);
        const evOut = edgesOfByType(evNode);
        for (const cid of [...evOut.supports, ...evOut.opposes]) {
          if (graph.nodes.has(cid)) bundle.add(cid);
        }
      }
      return bundle;
    }
  }
  return new Set([seedId]);
}

/**
 * Type-aware semantic walk from an anchor. See {@link claimNeighborhood} and
 * {@link questionWalk} for the per-seed-type rules. Closes the subgraph the
 * same way {@link buildBundleFromGraph} does.
 *
 * @param qOverlap minimum in-bundle Claims required to pull a related
 *   Question into a Question-seed walk. Default 2.
 */
export function buildSemanticBundle(
  graph: Graph,
  anchorId: string,
  qOverlap = 2,
): Bundle | null {
  const anchor = graph.nodes.get(anchorId);
  if (!anchor) return null;
  const ids = expandSeedSemantic(graph, anchorId, qOverlap);
  ids.add(anchorId);
  return closeBundle(graph, anchorId, ids, () => 1);
}

// ---------------------------------------------------------------------------

/** Build-time wrapper that loads the graph from disk. Existing callers. */
export async function buildBundle(anchorId: string): Promise<Bundle | null> {
  const g = await loadGraph();
  return buildBundleFromGraph(g, anchorId, 1);
}
