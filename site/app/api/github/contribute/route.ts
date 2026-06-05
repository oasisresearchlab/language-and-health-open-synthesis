import crypto from "node:crypto";
import { NextResponse } from "next/server";

import {
  clearTokenCookie,
  EnvMissingError,
  readGithubEnv,
  readTokenCookie,
} from "@/lib/github-oauth";
import {
  AuthExpiredError,
  createBranch,
  createFork,
  getBranchSha,
  getFile,
  getViewer,
  GithubApiError,
  hasFork,
  putFile,
  waitForFork,
} from "@/lib/github-api";
import { buildBundleFromGraph, buildSemanticBundle } from "@/lib/bundle";
import { loadGraphRuntime } from "@/lib/graph-runtime";
import { EDGE_TYPES, NODE_TYPES, type EdgeType, type NodeType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const AUDIENCES = ["academic", "executive", "blog", "position"] as const;
const LENGTHS = ["short", "medium", "long"] as const;
const VOICES = ["formal", "conversational", "plain"] as const;
const BUNDLES = ["1-hop", "2-hop", "semantic"] as const;
const BREADTHS = ["tight", "balanced", "wide"] as const;

const MAX_CONTENT_BYTES = 50_000;

interface ContributeBody {
  // Discriminator. Defaults to "narrative" for backward compatibility with
  // the existing /narratives/generate flow which never sent a `kind`.
  kind?: string;

  // Narrative fields:
  anchorId?: string;
  audience?: string;
  length?: string;
  voice?: string;
  bundle?: string;
  breadth?: string;
  model?: string;
  content?: string;

  // Node fields:
  type?: string;
  title?: string;
  body?: string;
  edges?: Record<string, unknown>;
}

interface ValidationError {
  status: number;
  body: { error: string; detail?: string };
}

function isValidationError<T>(v: T | ValidationError): v is ValidationError {
  return (v as ValidationError).status !== undefined;
}

// ---------------------------------------------------------------------------
// Narrative branch — preserved verbatim from the original implementation so
// the existing /narratives/generate submit flow keeps working unchanged.
// ---------------------------------------------------------------------------

interface NarrativeInput {
  anchorId: string;
  audience: (typeof AUDIENCES)[number];
  length: (typeof LENGTHS)[number];
  voice: (typeof VOICES)[number];
  bundle: (typeof BUNDLES)[number];
  /** Only meaningful when bundle === "semantic". */
  breadth?: (typeof BREADTHS)[number];
  model: string;
  content: string;
}

function validateNarrative(body: ContributeBody): NarrativeInput | ValidationError {
  if (!body.anchorId || !/^[A-Z]-\d+[a-z]?$/.test(body.anchorId)) {
    return { status: 400, body: { error: "invalid_anchor" } };
  }
  if (!body.audience || !AUDIENCES.includes(body.audience as (typeof AUDIENCES)[number])) {
    return { status: 400, body: { error: "invalid_audience" } };
  }
  if (!body.length || !LENGTHS.includes(body.length as (typeof LENGTHS)[number])) {
    return { status: 400, body: { error: "invalid_length" } };
  }
  if (!body.voice || !VOICES.includes(body.voice as (typeof VOICES)[number])) {
    return { status: 400, body: { error: "invalid_voice" } };
  }
  if (!body.bundle || !BUNDLES.includes(body.bundle as (typeof BUNDLES)[number])) {
    return { status: 400, body: { error: "invalid_bundle" } };
  }
  let breadth: (typeof BREADTHS)[number] | undefined;
  if (body.bundle === "semantic") {
    if (
      !body.breadth ||
      !BREADTHS.includes(body.breadth as (typeof BREADTHS)[number])
    ) {
      return { status: 400, body: { error: "invalid_breadth" } };
    }
    breadth = body.breadth as (typeof BREADTHS)[number];
  }
  if (typeof body.content !== "string" || body.content.length === 0) {
    return { status: 400, body: { error: "missing_content" } };
  }
  if (Buffer.byteLength(body.content, "utf-8") > MAX_CONTENT_BYTES) {
    return { status: 413, body: { error: "content_too_large" } };
  }
  if (typeof body.model !== "string" || body.model.length === 0) {
    return { status: 400, body: { error: "missing_model" } };
  }
  if (body.model.length > 200 || /[\r\n]/.test(body.model)) {
    return { status: 400, body: { error: "invalid_model" } };
  }

  const graph = loadGraphRuntime();
  if (!graph.nodes.has(body.anchorId)) {
    return { status: 404, body: { error: "anchor_not_in_graph" } };
  }

  return {
    anchorId: body.anchorId,
    audience: body.audience as (typeof AUDIENCES)[number],
    length: body.length as (typeof LENGTHS)[number],
    voice: body.voice as (typeof VOICES)[number],
    bundle: body.bundle as (typeof BUNDLES)[number],
    breadth,
    model: body.model,
    content: body.content,
  };
}

const BREADTH_TO_QOVERLAP: Record<(typeof BREADTHS)[number], 1 | 2 | 3> = {
  tight: 3,
  balanced: 2,
  wide: 1,
};

function buildNarrativeSidecarJson(
  v: NarrativeInput,
  generatedAt: string,
  contributor: { login: string; htmlUrl: string },
): string | null {
  const graph = loadGraphRuntime();
  let bundle;
  if (v.bundle === "semantic") {
    const qOverlap = v.breadth
      ? BREADTH_TO_QOVERLAP[v.breadth]
      : 2;
    bundle = buildSemanticBundle(graph, v.anchorId, qOverlap);
  } else {
    const depth = v.bundle === "2-hop" ? 2 : 1;
    bundle = buildBundleFromGraph(graph, v.anchorId, depth);
  }
  if (!bundle) return null;

  const sidecar = {
    anchor: bundle.anchor,
    bundle: v.bundle,
    ...(v.breadth ? { breadth: v.breadth } : {}),
    generatedAt,
    generatedBy: "web",
    model: v.model,
    contributor: contributor.login,
    contributorUrl: contributor.htmlUrl,
    nodes: bundle.nodes,
    edges: bundle.edges,
  };
  return JSON.stringify(sidecar, null, 2) + "\n";
}

function buildNarrativeFileBody(
  v: NarrativeInput,
  generatedAt: string,
  contributor: { login: string; htmlUrl: string },
): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`anchor: ${v.anchorId}`);
  lines.push(`audience: ${v.audience}`);
  lines.push(`length: ${v.length}`);
  lines.push(`voice: ${v.voice}`);
  lines.push(`bundle: ${v.bundle}`);
  if (v.breadth) lines.push(`breadth: ${v.breadth}`);
  lines.push(`generatedAt: ${generatedAt}`);
  lines.push(`generatedBy: web`);
  lines.push(`model: ${v.model}`);
  lines.push(`contributor: ${contributor.login}`);
  lines.push(`contributorUrl: ${contributor.htmlUrl}`);
  lines.push("---");
  lines.push("");
  lines.push(v.content.trimEnd());
  lines.push("");
  return lines.join("\n");
}

function buildNarrativePrBody(v: NarrativeInput, login: string): string {
  return [
    `Adds a community-composed narrative anchored at \`${v.anchorId}\`.`,
    "",
    "Generated via the on-site composer at `/narratives/generate`.",
    "",
    `- anchor: \`${v.anchorId}\``,
    `- audience: ${v.audience}`,
    `- length: ${v.length}`,
    `- voice: ${v.voice}`,
    `- bundle: ${v.bundle}${v.breadth ? ` (${v.breadth})` : ""}`,
    `- model: \`${v.model}\``,
    `- contributor: @${login}`,
    "",
    "Provenance is recorded in the file's YAML frontmatter.",
    "",
    "A `.bundle.json` sidecar is committed alongside the narrative — it snapshots the exact set of graph nodes and edges the model was given as context.",
  ].join("\n");
}

async function handleNarrative(
  parsed: ContributeBody,
  token: string,
  env: ReturnType<typeof readGithubEnv>,
): Promise<NextResponse> {
  const v = validateNarrative(parsed);
  if (isValidationError(v)) {
    return NextResponse.json(v.body, { status: v.status });
  }

  const viewer = await getViewer(token);

  const forkExists = await hasFork(token, viewer.login, env.repoName);
  if (!forkExists) {
    await createFork(token, env.repoOwner, env.repoName);
    await waitForFork(token, viewer.login, env.repoName);
  }

  const baseSha = await getBranchSha(
    token,
    viewer.login,
    env.repoName,
    env.baseBranch,
  );

  const shortId = crypto.randomBytes(4).toString("hex");
  const branch = `narrative/${v.anchorId}-${shortId}`;
  await createBranch(token, viewer.login, env.repoName, branch, baseSha);

  const generatedAt = new Date().toISOString();
  const contributorMeta = {
    login: viewer.login,
    htmlUrl: viewer.html_url,
  };

  const filePath = `narratives/${v.anchorId}-${shortId}.md`;
  const fileBody = buildNarrativeFileBody(v, generatedAt, contributorMeta);
  await putFile(
    token,
    viewer.login,
    env.repoName,
    filePath,
    branch,
    `add narrative for ${v.anchorId} (${v.audience}/${v.voice})`,
    fileBody,
  );

  const sidecarPath = `narratives/${v.anchorId}-${shortId}.bundle.json`;
  const sidecarBody = buildNarrativeSidecarJson(v, generatedAt, contributorMeta);
  if (sidecarBody) {
    await putFile(
      token,
      viewer.login,
      env.repoName,
      sidecarPath,
      branch,
      `add bundle sidecar for ${v.anchorId}`,
      sidecarBody,
    );
  }

  const compareUrl = buildCompareUrl({
    upstreamOwner: env.repoOwner,
    upstreamName: env.repoName,
    base: env.baseBranch,
    headLogin: viewer.login,
    headBranch: branch,
    title: `narrative · ${v.anchorId} · ${v.audience}/${v.voice}`,
    body: buildNarrativePrBody(v, viewer.login),
  });

  return NextResponse.json({
    compareUrl,
    shortId,
    filePath,
    sidecarPath: sidecarBody ? sidecarPath : undefined,
    branch,
  });
}

// ---------------------------------------------------------------------------
// Node branch — new in /contribute. Builds a graph/<type-dir>/<ID>.md file,
// optionally patches reciprocal edges on referenced Method nodes, opens a PR.
// ---------------------------------------------------------------------------

const NODE_TYPE_DIR: Record<NodeType, string> = {
  question: "questions",
  claim: "claims",
  evidence: "evidence",
  method: "methods",
  source: "sources",
  evidencepattern: "evidencepatterns",
  artifact: "artifacts",
};

const NODE_TYPE_PREFIX: Record<NodeType, string> = {
  question: "Q",
  claim: "C",
  evidence: "E",
  method: "M",
  source: "S",
  evidencepattern: "P",
  artifact: "A",
};

const ID_PREFIX_TO_TYPE: Record<string, NodeType> = {
  Q: "question",
  C: "claim",
  E: "evidence",
  M: "method",
  S: "source",
  P: "evidencepattern",
  A: "artifact",
};

/** Edge fields surfaced in the contribute UI, by node type. The
 * contribute route enforces (a) only these fields are allowed for the type
 * and (b) the referenced ID prefix matches the expected target type. */
const ALLOWED_EDGES_BY_TYPE: Record<NodeType, Partial<Record<EdgeType, NodeType>>> = {
  question: {},
  claim: {
    addresses: "question",
    supports: "claim",
    opposes: "claim",
    usesMethod: "method",
  },
  evidence: {
    supports: "claim",
    opposes: "claim",
    derivedFrom: "source",
  },
  method: {
    informs: "claim",
  },
  source: {},
  evidencepattern: {
    supports: "claim",
  },
  artifact: {},
};

const MAX_TITLE_LEN = 200;
const MAX_BODY_BYTES = 20_000;
const MIN_WORDS = 50;
const MAX_WORDS = 250;

interface NodeInput {
  type: NodeType;
  title: string;
  body: string;
  /** Normalized: only edge fields permitted for the node type, only valid
   * IDs that resolve to existing nodes of the correct target type. */
  edges: Partial<Record<EdgeType, string[]>>;
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function parseEdgeArray(raw: unknown): string[] | null {
  if (raw === undefined || raw === null) return [];
  if (Array.isArray(raw)) {
    const out: string[] = [];
    for (const v of raw) {
      if (typeof v !== "string") return null;
      const t = v.trim();
      if (!t) continue;
      out.push(t);
    }
    return out;
  }
  return null;
}

function validateNode(body: ContributeBody): NodeInput | ValidationError {
  if (typeof body.type !== "string" || !NODE_TYPES.includes(body.type as NodeType)) {
    return { status: 400, body: { error: "invalid_type" } };
  }
  const type = body.type as NodeType;

  if (typeof body.title !== "string") {
    return { status: 400, body: { error: "missing_title" } };
  }
  const title = body.title.trim();
  if (title.length === 0) {
    return { status: 400, body: { error: "missing_title" } };
  }
  if (title.length > MAX_TITLE_LEN || /[\r\n]/.test(title)) {
    return { status: 400, body: { error: "invalid_title" } };
  }

  if (typeof body.body !== "string" || body.body.trim().length === 0) {
    return { status: 400, body: { error: "missing_body" } };
  }
  if (Buffer.byteLength(body.body, "utf-8") > MAX_BODY_BYTES) {
    return { status: 413, body: { error: "body_too_large" } };
  }
  const words = countWords(body.body);
  if (words < MIN_WORDS || words > MAX_WORDS) {
    return {
      status: 400,
      body: {
        error: "invalid_body_length",
        detail: `body must be ${MIN_WORDS}-${MAX_WORDS} words (got ${words})`,
      },
    };
  }

  const allowed = ALLOWED_EDGES_BY_TYPE[type];
  const rawEdges = (body.edges ?? {}) as Record<string, unknown>;
  const edges: Partial<Record<EdgeType, string[]>> = {};
  for (const key of Object.keys(rawEdges)) {
    if (!EDGE_TYPES.includes(key as EdgeType)) {
      return { status: 400, body: { error: "unknown_edge_field", detail: key } };
    }
    if (!(key in allowed)) {
      return {
        status: 400,
        body: {
          error: "edge_not_allowed_for_type",
          detail: `${type} does not accept ${key}`,
        },
      };
    }
    const ids = parseEdgeArray(rawEdges[key]);
    if (ids === null) {
      return { status: 400, body: { error: "invalid_edge_array", detail: key } };
    }
    if (ids.length > 0) {
      edges[key as EdgeType] = ids;
    }
  }

  // Type-specific required edges, per SCHEMA.md.
  if (type === "claim") {
    if (!edges.addresses || edges.addresses.length === 0) {
      return {
        status: 400,
        body: {
          error: "missing_required_edge",
          detail: "Claim requires at least one `addresses` (Question ID).",
        },
      };
    }
  }
  if (type === "evidence") {
    const supportsCount = edges.supports?.length ?? 0;
    const opposesCount = edges.opposes?.length ?? 0;
    if (supportsCount + opposesCount === 0) {
      return {
        status: 400,
        body: {
          error: "missing_required_edge",
          detail: "Evidence requires at least one `supports` or `opposes` Claim.",
        },
      };
    }
    if (!edges.derivedFrom || edges.derivedFrom.length === 0) {
      return {
        status: 400,
        body: {
          error: "missing_required_edge",
          detail: "Evidence requires at least one `derivedFrom` (Source ID).",
        },
      };
    }
  }

  // Validate every referenced target ID resolves to an existing node of the
  // correct target type.
  const graph = loadGraphRuntime();
  for (const [edgeKey, ids] of Object.entries(edges) as Array<[
    EdgeType,
    string[],
  ]>) {
    const expectedTargetType = allowed[edgeKey];
    if (!expectedTargetType) continue;
    for (const id of ids) {
      if (!/^[A-Z]-\d+[a-z]?$/.test(id)) {
        return {
          status: 400,
          body: { error: "invalid_target_id", detail: `${edgeKey}: ${id}` },
        };
      }
      const target = graph.nodes.get(id);
      if (!target) {
        return {
          status: 404,
          body: { error: "target_not_in_graph", detail: `${edgeKey}: ${id}` },
        };
      }
      if (target.type !== expectedTargetType) {
        return {
          status: 400,
          body: {
            error: "target_wrong_type",
            detail: `${edgeKey}: ${id} is ${target.type}, expected ${expectedTargetType}`,
          },
        };
      }
    }
  }

  return { type, title, body: body.body, edges };
}

function nextSequentialId(type: NodeType): string {
  const graph = loadGraphRuntime();
  const prefix = NODE_TYPE_PREFIX[type];
  let max = 0;
  for (const id of graph.nodes.keys()) {
    if (!id.startsWith(`${prefix}-`)) continue;
    // Strip optional trailing letter (e.g., S-0025a).
    const m = /^[A-Z]-(\d+)(?:[a-z])?$/.exec(id);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  const next = max + 1;
  return `${prefix}-${String(next).padStart(4, "0")}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatYamlList(items: string[]): string {
  return `[${items.join(", ")}]`;
}

/**
 * Render the node file contents (YAML frontmatter + body). Net-new nodes
 * omit `source_section` per SCHEMA.md.
 */
function buildNodeFileBody(input: NodeInput, id: string, created: string): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`id: ${id}`);
  lines.push(`type: ${input.type}`);
  lines.push(`title: ${yamlInlineString(input.title)}`);
  lines.push(`status: draft`);
  lines.push(`created: ${created}`);

  // Always emit `edges:` when there is at least one entry. If no edges (Q/S
  // commonly), emit `edges: {}` for forward compatibility (matches existing
  // S-0001.md style).
  const allowed = ALLOWED_EDGES_BY_TYPE[input.type];
  const orderedKeys = Object.keys(allowed) as EdgeType[];
  const populated = orderedKeys.filter((k) => (input.edges[k]?.length ?? 0) > 0);
  if (populated.length === 0) {
    lines.push(`edges: {}`);
  } else {
    lines.push(`edges:`);
    for (const k of populated) {
      lines.push(`  ${k}: ${formatYamlList(input.edges[k]!)}`);
    }
  }

  lines.push("---");
  lines.push("");
  lines.push(input.body.trimEnd());
  lines.push("");
  return lines.join("\n");
}

/**
 * Quote a YAML scalar when it contains characters that would otherwise need
 * escaping. We use double quotes and only escape `"` and `\`.
 */
function yamlInlineString(s: string): string {
  if (
    /^[A-Za-z][A-Za-z0-9 _.,'/()&+-]*$/.test(s) &&
    !/^(true|false|null|yes|no|on|off)$/i.test(s) &&
    !/^[0-9]/.test(s)
  ) {
    return s;
  }
  const escaped = s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/**
 * Reciprocal edge plan: when this Claim usesMethod=[M-x], we should also
 * append the new claim's ID into M-x's `informs:` list. Returns one entry per
 * existing graph node that needs to be patched.
 */
interface ReciprocalPatch {
  targetId: string;
  edge: EdgeType;
  newSourceId: string;
}

function planReciprocalPatches(input: NodeInput, newId: string): ReciprocalPatch[] {
  const patches: ReciprocalPatch[] = [];
  // Claim.usesMethod=[M-…] → patch M-… with informs:[new claim]
  if (input.type === "claim" && input.edges.usesMethod) {
    for (const m of input.edges.usesMethod) {
      patches.push({ targetId: m, edge: "informs", newSourceId: newId });
    }
  }
  // Method.informs=[C-…] → patch C-… with usesMethod:[new method]
  if (input.type === "method" && input.edges.informs) {
    for (const c of input.edges.informs) {
      patches.push({ targetId: c, edge: "usesMethod", newSourceId: newId });
    }
  }
  return patches;
}

/**
 * Patch an existing graph file's frontmatter to append `newSourceId` into
 * `edge:` (creating the array if missing or if the file uses `edges: {}`).
 * Best-effort string-level patch — preserves the rest of the file verbatim.
 * Returns the new content, or null if the patch can't be applied
 * deterministically (caller skips the patch and notes it in the PR body).
 */
function patchFrontmatterEdge(
  fileContent: string,
  edge: EdgeType,
  newSourceId: string,
): string | null {
  const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fileContent);
  if (!fmMatch) return null;
  const fm = fmMatch[1];
  const fmStart = fmMatch.index;
  const fmEnd = fmStart + fmMatch[0].length;

  let newFm: string;

  // Case A: `edges: {}` — replace with multiline edges block containing edge.
  if (/^edges:\s*\{\s*\}\s*$/m.test(fm)) {
    newFm = fm.replace(
      /^edges:\s*\{\s*\}\s*$/m,
      `edges:\n  ${edge}: [${newSourceId}]`,
    );
  }
  // Case B: `edges:` block exists with at least one edge child.
  else if (/^edges:\s*$/m.test(fm)) {
    // Does the target edge already exist as a child?
    const childRe = new RegExp(`^(\\s+${edge}:\\s*)\\[(.*?)\\]\\s*$`, "m");
    const inlineMatch = childRe.exec(fm);
    if (inlineMatch) {
      // Inline list form: `  edge: [A, B]` → append id if missing.
      const existing = inlineMatch[2]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (existing.includes(newSourceId)) return fileContent; // no-op
      const merged = [...existing, newSourceId];
      newFm = fm.replace(
        childRe,
        `${inlineMatch[1]}[${merged.join(", ")}]`,
      );
    } else {
      // Edge field doesn't exist under the edges block — append it as the
      // first child line, immediately after `edges:`.
      newFm = fm.replace(
        /^(edges:\s*)$/m,
        `$1\n  ${edge}: [${newSourceId}]`,
      );
    }
  } else {
    // No `edges:` key at all — append one before the closing fence.
    newFm = `${fm.replace(/\s*$/, "")}\nedges:\n  ${edge}: [${newSourceId}]`;
  }

  return (
    fileContent.slice(0, fmStart) +
    `---\n${newFm}\n---` +
    fileContent.slice(fmEnd)
  );
}

function buildNodePrBody(input: NodeInput, newId: string, login: string): string {
  const lines: string[] = [
    `Adds a new ${input.type} node \`${newId}\` from the on-site contribute form.`,
    "",
    `**Title:** ${input.title}`,
    "",
    `- type: ${input.type}`,
    `- id: \`${newId}\``,
    `- contributor: @${login}`,
  ];
  const edgeList = Object.entries(input.edges)
    .filter((entry): entry is [EdgeType, string[]] => Array.isArray(entry[1]))
    .filter(([, v]) => v.length > 0);
  if (edgeList.length > 0) {
    lines.push("");
    lines.push("Edges:");
    for (const [k, ids] of edgeList) {
      lines.push(`- \`${k}\`: ${ids.map((id) => `\`${id}\``).join(", ")}`);
    }
  }
  lines.push("");
  lines.push("Submitted via `/contribute`. Status is `draft` — reviewers will validate edges and bump status during review.");
  return lines.join("\n");
}

async function handleNode(
  parsed: ContributeBody,
  token: string,
  env: ReturnType<typeof readGithubEnv>,
): Promise<NextResponse> {
  const v = validateNode(parsed);
  if (isValidationError(v)) {
    return NextResponse.json(v.body, { status: v.status });
  }

  const viewer = await getViewer(token);

  const forkExists = await hasFork(token, viewer.login, env.repoName);
  if (!forkExists) {
    await createFork(token, env.repoOwner, env.repoName);
    await waitForFork(token, viewer.login, env.repoName);
  }

  // We always branch from the upstream base SHA on the user's fork. After a
  // fresh fork that's identical to upstream main; for an old fork it's the
  // fork's own copy of base. PR review handles divergence.
  const baseSha = await getBranchSha(
    token,
    viewer.login,
    env.repoName,
    env.baseBranch,
  );

  const newId = nextSequentialId(v.type);
  const branch = `node/${newId.toLowerCase()}-${crypto.randomBytes(3).toString("hex")}`;
  await createBranch(token, viewer.login, env.repoName, branch, baseSha);

  const created = todayIso();
  const filePath = `graph/${NODE_TYPE_DIR[v.type]}/${newId}.md`;
  const fileContent = buildNodeFileBody(v, newId, created);

  await putFile(
    token,
    viewer.login,
    env.repoName,
    filePath,
    branch,
    `add ${v.type} ${newId}`,
    fileContent,
  );

  // Reciprocal-edge updates: for each existing graph node that needs a
  // pointer back to the new node, fetch it from the user's fork at the new
  // branch (which inherited from base), patch its frontmatter, and commit
  // back. Patches are best-effort; failures are recorded in the PR body
  // rather than failing the whole submit.
  const patches = planReciprocalPatches(v, newId);
  const patchNotes: string[] = [];
  for (const patch of patches) {
    const targetType = ID_PREFIX_TO_TYPE[patch.targetId.charAt(0)];
    if (!targetType) continue;
    const targetPath = `graph/${NODE_TYPE_DIR[targetType]}/${patch.targetId}.md`;
    let existing;
    try {
      existing = await getFile(
        token,
        viewer.login,
        env.repoName,
        targetPath,
        branch,
      );
    } catch (err) {
      if (err instanceof GithubApiError) {
        patchNotes.push(`- skipped reciprocal edge on \`${patch.targetId}\` (read failed: ${err.status})`);
        continue;
      }
      throw err;
    }
    if (!existing) {
      patchNotes.push(`- skipped reciprocal edge on \`${patch.targetId}\` (file not found in fork at ${branch})`);
      continue;
    }
    const patched = patchFrontmatterEdge(existing.content, patch.edge, patch.newSourceId);
    if (!patched || patched === existing.content) {
      if (!patched) {
        patchNotes.push(`- skipped reciprocal edge on \`${patch.targetId}\` (could not patch frontmatter)`);
      }
      continue;
    }
    try {
      await putFile(
        token,
        viewer.login,
        env.repoName,
        targetPath,
        branch,
        `update ${patch.targetId}: add ${patch.edge}=[${patch.newSourceId}]`,
        patched,
        existing.sha,
      );
      patchNotes.push(`- patched \`${patch.targetId}\` → added \`${patch.edge}: [${patch.newSourceId}]\``);
    } catch (err) {
      if (err instanceof GithubApiError) {
        patchNotes.push(`- failed to commit reciprocal edge on \`${patch.targetId}\` (${err.status})`);
      } else {
        throw err;
      }
    }
  }

  let prBody = buildNodePrBody(v, newId, viewer.login);
  if (patchNotes.length > 0) {
    prBody += "\n\nReciprocal edge updates:\n" + patchNotes.join("\n");
  }

  const compareUrl = buildCompareUrl({
    upstreamOwner: env.repoOwner,
    upstreamName: env.repoName,
    base: env.baseBranch,
    headLogin: viewer.login,
    headBranch: branch,
    title: `node · ${newId} · ${v.type}`,
    body: prBody,
  });

  return NextResponse.json({
    compareUrl,
    id: newId,
    filePath,
    branch,
  });
}

// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  let env;
  try {
    env = readGithubEnv();
  } catch (err) {
    if (err instanceof EnvMissingError) {
      return new Response(err.message, { status: 500 });
    }
    throw err;
  }

  const token = await readTokenCookie();
  if (!token) {
    return NextResponse.json({ error: "auth_expired" }, { status: 401 });
  }

  let parsed: ContributeBody;
  try {
    parsed = (await request.json()) as ContributeBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const kind = parsed.kind ?? "narrative";

  try {
    if (kind === "narrative") {
      return await handleNarrative(parsed, token, env);
    }
    if (kind === "node") {
      return await handleNode(parsed, token, env);
    }
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthExpiredError) {
      await clearTokenCookie();
      return NextResponse.json({ error: "auth_expired" }, { status: 401 });
    }
    if (err instanceof GithubApiError) {
      return NextResponse.json(
        { error: "github_api_error", detail: err.message, status: err.status },
        { status: 502 },
      );
    }
    throw err;
  }
}

function buildCompareUrl(p: {
  upstreamOwner: string;
  upstreamName: string;
  base: string;
  headLogin: string;
  headBranch: string;
  title: string;
  body: string;
}): string {
  const params = new URLSearchParams({
    quick_pull: "1",
    title: p.title,
    body: p.body,
  });
  return (
    `https://github.com/${p.upstreamOwner}/${p.upstreamName}` +
    `/compare/${encodeURIComponent(p.base)}` +
    `...${encodeURIComponent(p.headLogin)}:${encodeURIComponent(p.headBranch)}` +
    `?${params.toString()}`
  );
}
