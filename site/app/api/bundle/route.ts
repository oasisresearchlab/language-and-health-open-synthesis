import { NextResponse } from "next/server";

import { buildBundleFromGraph, buildSemanticBundle } from "@/lib/bundle";
import { loadGraphRuntime } from "@/lib/graph-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRATEGIES = ["hops", "semantic"] as const;
type Strategy = (typeof STRATEGIES)[number];

function isStrategy(v: string | null): v is Strategy {
  return v !== null && (STRATEGIES as readonly string[]).includes(v);
}

const MAX_HOP_DEPTH = 6;

function parseHopDepth(raw: string | null): number {
  const n = raw ? parseInt(raw, 10) : 1;
  if (Number.isNaN(n) || n < 1) return 1;
  return Math.min(n, MAX_HOP_DEPTH);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const anchor = url.searchParams.get("anchor");
  const rawStrategy = url.searchParams.get("strategy");
  const rawDepth = url.searchParams.get("depth");
  const rawQOverlap = url.searchParams.get("qOverlap");

  if (!anchor || !/^[A-Z]-\d+[a-z]?$/.test(anchor)) {
    return NextResponse.json({ error: "invalid_anchor" }, { status: 400 });
  }
  if (rawStrategy !== null && !isStrategy(rawStrategy)) {
    return NextResponse.json({ error: "invalid_strategy" }, { status: 400 });
  }
  const strategy: Strategy = isStrategy(rawStrategy) ? rawStrategy : "hops";
  const depth = parseHopDepth(rawDepth);
  const qOverlap: 1 | 2 | 3 =
    rawQOverlap === "1" ? 1 : rawQOverlap === "3" ? 3 : 2;

  const graph = loadGraphRuntime();
  const bundle =
    strategy === "semantic"
      ? buildSemanticBundle(graph, anchor, qOverlap)
      : buildBundleFromGraph(graph, anchor, depth);

  if (!bundle) {
    return NextResponse.json({ error: "anchor_not_found" }, { status: 404 });
  }

  const enrichedNodes = bundle.nodes.map((n) => {
    const full = graph.nodes.get(n.id);
    return {
      ...n,
      status: full?.status,
      sections: full?.sections,
    };
  });

  return NextResponse.json({
    anchor: bundle.anchor,
    strategy,
    ...(strategy === "hops" ? { depth } : { qOverlap }),
    nodes: enrichedNodes,
    edges: bundle.edges,
  });
}
