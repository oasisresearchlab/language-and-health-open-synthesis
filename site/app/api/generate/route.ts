import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";

import { loadGraphRuntime } from "@/lib/graph-runtime";
import { buildBundleFromGraph, buildSemanticBundle } from "@/lib/bundle";
import type { GraphNode } from "@/lib/types";
import { EDGE_LABEL, EDGE_INVERSE_LABEL, NODE_TYPE_LABEL } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const AUDIENCES = ["academic", "executive", "blog", "position"] as const;
const LENGTHS = ["short", "medium", "long"] as const;
const VOICES = ["formal", "conversational", "plain"] as const;
const STRATEGIES = ["hops", "semantic"] as const;

type Audience = (typeof AUDIENCES)[number];
type Length = (typeof LENGTHS)[number];
type Voice = (typeof VOICES)[number];
type Strategy = (typeof STRATEGIES)[number];

interface GenerateRequest {
  anchorId: string;
  strategy: Strategy;
  depth: 1 | 2;
  /** Q-overlap threshold for the semantic walk: 1 (wide) | 2 (balanced) | 3 (tight). */
  qOverlap: 1 | 2 | 3;
  audience: Audience;
  length: Length;
  voice: Voice;
}

const AUDIENCE_BRIEF: Record<Audience, string> = {
  academic:
    "an academic paper section: dense argument, formal register, willing to use technical vocabulary, citations as inline node IDs.",
  executive:
    "an executive brief: top-line first, plain English, what-it-means-for-the-org framing, short paragraphs.",
  blog:
    "a blog post: lively but accurate, scene-setting opener, paragraph rhythm that propels reading, no bureaucratic phrasing.",
  position:
    "a position statement: declarative, principled, names the stake clearly, ends with what the audience should commit to.",
};

interface LengthSpec {
  /** Word range — secondary support to the structural targets below. */
  words: [number, number];
  /** Paragraph count — the primary structural anchor. LLMs match paragraphs reliably. */
  paragraphs: string;
  /** Heading rules. */
  headings: string;
  /** Roughly how many bundle nodes to cite inline. */
  citations: [number, number];
}

const LENGTH_SPEC: Record<Length, LengthSpec> = {
  short: {
    words: [250, 400],
    paragraphs: "2 to 3 paragraphs",
    headings: "no headings — straight prose",
    citations: [3, 5],
  },
  medium: {
    words: [600, 900],
    paragraphs: "4 to 7 paragraphs",
    headings: "1 short section heading is optional, otherwise none",
    citations: [5, 10],
  },
  long: {
    words: [1200, 1800],
    paragraphs: "8 to 14 paragraphs",
    headings: "3 to 5 section headings, dividing the argument",
    citations: [10, 20],
  },
};

const VOICE_BRIEF: Record<Voice, string> = {
  formal: "formal, careful, third-person; no contractions.",
  conversational:
    "conversational and direct, second-person where it helps; contractions ok; no slang.",
  plain:
    "plain-language, jargon-free; explain technical terms in passing; concrete over abstract.",
};

function nodeMarkdownBlock(node: GraphNode): string {
  const meta: string[] = [];
  if (node.status) meta.push(`status: ${node.status}`);
  if (node.source_section) meta.push(`source: ${node.source_section}`);
  if (node.created) meta.push(`created: ${node.created}`);

  const out = node.outgoing.map(
    (e) => `  - ${EDGE_LABEL[e.edge]} → ${e.to}`,
  );
  const inc = node.incoming.map(
    (e) => `  - ${EDGE_INVERSE_LABEL[e.edge]} ← ${e.from}`,
  );

  return [
    `### ${node.id} · ${NODE_TYPE_LABEL[node.type]} · ${node.title}`,
    meta.length ? `_${meta.join(" · ")}_` : "",
    "",
    node.body || "_(no body)_",
    "",
    out.length ? "Outbound:" : "",
    ...out,
    inc.length ? "Inbound:" : "",
    ...inc,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildPromptBundle(
  graph: ReturnType<typeof loadGraphRuntime>,
  anchorId: string,
  strategy: Strategy,
  depth: 1 | 2,
  qOverlap: 1 | 2 | 3,
): { text: string; nodeCount: number } | null {
  const bundle =
    strategy === "semantic"
      ? buildSemanticBundle(graph, anchorId, qOverlap)
      : buildBundleFromGraph(graph, anchorId, depth);
  if (!bundle) return null;

  const ordered = [...bundle.nodes].sort((a, b) => {
    if (a.isAnchor !== b.isAnchor) return a.isAnchor ? -1 : 1;
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.id.localeCompare(b.id);
  });

  const composition =
    strategy === "semantic"
      ? `Bundle = type-aware semantic walk from anchor (q-overlap = ${qOverlap}). ${bundle.nodes.length} nodes, ${bundle.edges.length} edges.`
      : `Bundle = depth-${depth} neighborhood. ${bundle.nodes.length} nodes, ${bundle.edges.length} edges.`;

  const parts: string[] = [];
  parts.push(`# Anchor: ${anchorId}`);
  parts.push("");
  parts.push(composition);
  parts.push("");
  for (const bn of ordered) {
    const full = graph.nodes.get(bn.id);
    if (!full) continue;
    const tag = bn.isAnchor
      ? " [ANCHOR]"
      : strategy === "semantic"
      ? ""
      : ` [depth ${bn.depth}]`;
    parts.push(`## ${full.id}${tag}`);
    parts.push("");
    parts.push(nodeMarkdownBlock(full));
    parts.push("");
  }
  return { text: parts.join("\n"), nodeCount: bundle.nodes.length };
}

const SYSTEM_PROMPT = `You compose narratives from a discourse graph of research nodes — Questions, Claims, Evidence, Methods, Sources. The graph is the source of truth.

A narrative is a single argument grounded in the bundle. The anchor node is the spine; supporting nodes weave in around it. Use edge relationships as structural hints — supporting evidence supports, opposing evidence pushes back, methods clarify how a claim was reached, sources back up evidence.

Cite nodes inline by ID in square brackets, drawn directly from the bundle: [C-0001], [E-0014], [M-0003]. Use IDs as citations within sentences — never as bullet points or a reference list. Stay grounded in what the bundle says: every claim, number, name, or fact in your output must be traceable to a node. Where the bundle has gaps relative to the argument, name the gap explicitly rather than filling it.

The bundle is candidate context, not a checklist. The user prompt specifies how many nodes to cite — most nodes in the bundle will not appear in the output, and that is correct. Pick the ones carrying the argument's load: usually the anchor plus its strongest supporting Claims and a handful of their Evidence and Sources. Skip the rest.

Output GitHub-flavored Markdown — flowing prose, not lists.`;

function userPrompt(
  bundle: string,
  bundleNodeCount: number,
  audience: Audience,
  length: Length,
  voice: Voice,
): string {
  const spec = LENGTH_SPEC[length];
  const [wLo, wHi] = spec.words;
  const [cLo, cHi] = spec.citations;
  return [
    `Compose a narrative from the bundle below.`,
    "",
    `## Output specification`,
    "",
    `- **Structure:** ${spec.paragraphs}, ${spec.headings}.`,
    `- **Length:** ${wLo}–${wHi} words (use the paragraph count as your primary target; the word range is the band you should land in).`,
    `- **Citations:** ${cLo}–${cHi} node IDs from the bundle, inline within sentences.`,
    "",
    `The bundle has ${bundleNodeCount} nodes. Most will not appear in your output. Pick the ${cLo}–${cHi} nodes carrying the argument's load — usually the anchor plus its strongest supporting Claims and a couple of their Evidence — and write only about those. Keep every sentence load-bearing: each one should assert, deliver a fact, or move the argument forward.`,
    "",
    `## Audience`,
    AUDIENCE_BRIEF[audience],
    "",
    `## Voice`,
    VOICE_BRIEF[voice],
    "",
    `--- BUNDLE (${bundleNodeCount} nodes) ---`,
    bundle,
    `--- END BUNDLE ---`,
    "",
    `Write the narrative now. Target: ${spec.paragraphs} (${wLo}–${wHi} words), ${spec.headings}, ${cLo}–${cHi} inline citations. Keep every sentence load-bearing.`,
  ].join("\n");
}

function isAudience(v: unknown): v is Audience {
  return typeof v === "string" && (AUDIENCES as readonly string[]).includes(v);
}
function isLength(v: unknown): v is Length {
  return typeof v === "string" && (LENGTHS as readonly string[]).includes(v);
}
function isVoice(v: unknown): v is Voice {
  return typeof v === "string" && (VOICES as readonly string[]).includes(v);
}
function isStrategy(v: unknown): v is Strategy {
  return typeof v === "string" && (STRATEGIES as readonly string[]).includes(v);
}

export async function POST(req: Request) {
  let body: Partial<GenerateRequest>;
  try {
    body = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const anchorId = body.anchorId;
  const strategy: Strategy = isStrategy(body.strategy) ? body.strategy : "hops";
  const depth = body.depth === 2 ? 2 : 1;
  const qOverlap: 1 | 2 | 3 =
    body.qOverlap === 1 || body.qOverlap === 3 ? body.qOverlap : 2;
  const audience = isAudience(body.audience) ? body.audience : "academic";
  const length = isLength(body.length) ? body.length : "medium";
  const voice = isVoice(body.voice) ? body.voice : "formal";

  if (typeof anchorId !== "string" || !/^[A-Z]-\d+[a-z]?$/.test(anchorId)) {
    return new Response("invalid anchorId", { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response("OPENROUTER_API_KEY not set", { status: 500 });
  }

  const graph = loadGraphRuntime();
  const built = buildPromptBundle(graph, anchorId, strategy, depth, qOverlap);
  if (!built) {
    return new Response(`anchor not found: ${anchorId}`, { status: 404 });
  }

  const openrouter = createOpenRouter({ apiKey });
  const model = openrouter("mistralai/mistral-large", {
    extraBody: {
      models: [
        "mistralai/mistral-large",
        "google/gemini-2.5-flash",
        "google/gemini-2.5-flash-lite",
      ],
    },
  });

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    prompt: userPrompt(built.text, built.nodeCount, audience, length, voice),
    temperature: 0.7,
  });

  return result.toTextStreamResponse();
}
