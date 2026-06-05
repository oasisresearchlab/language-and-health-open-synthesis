import { NextResponse } from "next/server";

import { loadGraphRuntime } from "@/lib/graph-runtime";
import type { NodeType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: NodeType[] = [
  "question",
  "claim",
  "evidence",
  "method",
  "source",
];

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
  "vs",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Lexical similarity score: blends substring containment and token-overlap
 * (Jaccard on tokenized titles). No LLM. Cheap and good enough for "did you
 * mean…" type duplicate hints.
 */
function similarity(a: string, b: string): number {
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (!al || !bl) return 0;
  if (al === bl) return 1;

  // Substring boost: query fully contained in title (or vice versa) is a
  // strong dedup signal.
  let containment = 0;
  if (bl.includes(al) || al.includes(bl)) {
    containment = Math.min(al.length, bl.length) / Math.max(al.length, bl.length);
  }

  const aTok = new Set(tokenize(a));
  const bTok = new Set(tokenize(b));
  if (aTok.size === 0 || bTok.size === 0) return containment;
  let intersection = 0;
  for (const t of aTok) if (bTok.has(t)) intersection += 1;
  const union = aTok.size + bTok.size - intersection;
  const jaccard = union === 0 ? 0 : intersection / union;

  return Math.max(jaccard, containment * 0.9);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim();
  const k = Math.min(
    Math.max(parseInt(url.searchParams.get("k") ?? "3", 10) || 3, 1),
    10,
  );

  if (!VALID_TYPES.includes(typeParam as NodeType)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  if (q.length < 2) {
    return NextResponse.json({ matches: [] });
  }

  const graph = loadGraphRuntime();
  const candidates = graph.byType[typeParam as NodeType] ?? [];
  const scored = candidates
    .map((n) => ({
      id: n.id,
      title: n.title,
      score: similarity(q, n.title),
    }))
    .filter((m) => m.score >= 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ id, title, score }) => ({
      id,
      title,
      score: Number(score.toFixed(3)),
    }));

  return NextResponse.json({ matches: scored });
}
