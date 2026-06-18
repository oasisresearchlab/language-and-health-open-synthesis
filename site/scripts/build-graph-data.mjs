// Walks ../graph/*.md, ../paper/whitepaper-v3.md, and ../narratives/ to
// produce site/lib/graph-data.generated.json — the runtime data source for
// the /api/generate route. The route can't reach files outside site/ at
// Vercel function runtime, so we bake everything into a JSON bundle at build.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(SITE_ROOT, "..");
const GRAPH_ROOT = path.join(REPO_ROOT, "graph");
const PAPER_PATH = path.join(REPO_ROOT, "paper", "whitepaper-v3.md");
const NARRATIVE_DIR = path.join(REPO_ROOT, "narratives");
const OUT_PATH = path.join(SITE_ROOT, "lib", "graph-data.generated.json");

const ISSUES_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? "jring-o/rdf";
const ISSUES_PER_PAGE = 100;
const ISSUES_REQUEST_TIMEOUT_MS = 15_000;
const NODE_LABEL_RE = /^node:([QCEMSPA]-\d{4}[a-z]?)$/;
// Title prefix `[Q-0008]` is set by the discussion issue template — reliable
// even when GitHub silently drops the URL `labels=` param (it only applies
// labels that already exist on the repo). Used as a fallback signal.
const NODE_TITLE_RE = /^\s*\[([QCEMSPA]-\d{4}[a-z]?)\]/;

const NODE_TYPES = [
  "question",
  "claim",
  "evidence",
  "method",
  "source",
  "evidencepattern",
  "artifact",
];
const TYPE_DIRS = {
  question: "questions",
  claim: "claims",
  evidence: "evidence",
  method: "methods",
  source: "sources",
  evidencepattern: "evidencepatterns",
  artifact: "artifacts",
};
const EDGE_TYPES = [
  "addresses",
  "supports",
  "opposes",
  "derivedFrom",
  "informs",
  "usesMethod",
  "usesArtifact",
];

function toStringMaybe(v) {
  if (v == null) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

async function readNodeFile(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = matter(raw);
  const fm = parsed.data ?? {};
  if (!fm.id || !fm.type) {
    console.warn(`[graph-data] missing id/type in ${filePath}`);
    return null;
  }
  const sourceSectionStr = toStringMaybe(fm.source_section) ?? "";
  const sections = sourceSectionStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const outgoing = [];
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
    // bibliographic fields (SRC) — needed to map EVD → citekey in the review app
    citekey: toStringMaybe(fm.citekey) || undefined,
    author: toStringMaybe(fm.author) || undefined,
    year: toStringMaybe(fm.year) || undefined,
    journal: toStringMaybe(fm.journal) || undefined,
    doi: toStringMaybe(fm.doi) || undefined,
    pubmedId: toStringMaybe(fm.pubmedId ?? fm.pubmed_id) || undefined,
    body: parsed.content.trim(),
    outgoing,
  };
}

async function readNodeDir(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  const out = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const node = await readNodeFile(path.join(dir, entry));
    if (node) out.push(node);
  }
  return out;
}

async function readPaper() {
  try {
    const raw = await fs.readFile(PAPER_PATH, "utf-8");
    return raw;
  } catch (err) {
    if (err.code === "ENOENT") return "";
    throw err;
  }
}

async function readNarratives() {
  let entries;
  try {
    entries = await fs.readdir(NARRATIVE_DIR);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  const out = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const m = /^([A-Z]-\d+[a-z]?)-([0-9a-f]{8})\.md$/.exec(entry);
    if (!m) continue;
    const raw = await fs.readFile(path.join(NARRATIVE_DIR, entry), "utf-8");
    out.push({ anchorId: m[1], shortId: m[2], raw });
  }
  out.sort((a, b) => {
    const cmp = a.anchorId.localeCompare(b.anchorId);
    if (cmp !== 0) return cmp;
    return a.shortId.localeCompare(b.shortId);
  });
  return out;
}

/** Fetch all issues (open + closed) for ISSUES_REPO and bucket by node label.
 *  Fails open: any error path returns {} so the build never breaks for lack
 *  of network/credentials. */
async function fetchNodeIssues() {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "rdf-build-graph-data",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const map = {};
  let page = 1;
  while (true) {
    const url = `https://api.github.com/repos/${ISSUES_REPO}/issues?state=all&per_page=${ISSUES_PER_PAGE}&page=${page}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ISSUES_REQUEST_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(url, { headers, signal: controller.signal });
    } catch (err) {
      console.warn(
        `[graph-data] github issues fetch failed (page ${page}): ${err?.message ?? err}. Continuing without issues.`,
      );
      return {};
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      const note =
        res.status === 403 && remaining === "0"
          ? " (rate-limited; set GITHUB_TOKEN or GH_TOKEN to authenticate)"
          : "";
      console.warn(
        `[graph-data] github issues fetch returned ${res.status}${note}. Continuing without issues.`,
      );
      return {};
    }
    let batch;
    try {
      batch = await res.json();
    } catch (err) {
      console.warn(
        `[graph-data] github issues parse failed (page ${page}): ${err?.message ?? err}. Continuing without issues.`,
      );
      return {};
    }
    if (!Array.isArray(batch)) {
      console.warn(
        `[graph-data] github issues response was not an array on page ${page}. Continuing without issues.`,
      );
      return {};
    }
    for (const issue of batch) {
      // The /issues endpoint also returns PRs; skip them.
      if (issue?.pull_request) continue;
      let nodeId = null;
      const labels = Array.isArray(issue?.labels) ? issue.labels : [];
      for (const label of labels) {
        const name = typeof label === "string" ? label : label?.name;
        if (typeof name !== "string") continue;
        const m = NODE_LABEL_RE.exec(name);
        if (m) {
          nodeId = m[1];
          break;
        }
      }
      if (!nodeId && typeof issue?.title === "string") {
        const m = NODE_TITLE_RE.exec(issue.title);
        if (m) nodeId = m[1];
      }
      if (!nodeId) continue;
      // Prefer open issues; otherwise keep the lowest-numbered match.
      const existing = map[nodeId];
      const candidate = {
        number: issue.number,
        url: issue.html_url,
        state: issue.state,
        count: typeof issue.comments === "number" ? issue.comments : 0,
      };
      if (
        !existing ||
        (existing.state !== "open" && candidate.state === "open") ||
        (existing.state === candidate.state && candidate.number < existing.number)
      ) {
        map[nodeId] = candidate;
      }
    }
    if (batch.length < ISSUES_PER_PAGE) break;
    page += 1;
    // Safety stop — 50 pages * 100 = 5000 issues is plenty.
    if (page > 50) break;
  }
  return map;
}

async function main() {
  const allNodes = [];
  for (const type of NODE_TYPES) {
    const nodes = await readNodeDir(path.join(GRAPH_ROOT, TYPE_DIRS[type]));
    allNodes.push(...nodes);
  }
  allNodes.sort((a, b) => a.id.localeCompare(b.id));

  const paper = await readPaper();
  const narratives = await readNarratives();
  const nodeIssues = await fetchNodeIssues();

  const data = {
    nodes: allNodes,
    paper,
    narratives,
    nodeIssues,
    generatedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(data));
  console.log(
    `[graph-data] wrote ${allNodes.length} nodes, paper ${paper.length} chars, ${narratives.length} narratives, ${Object.keys(nodeIssues).length} nodeIssues → ${path.relative(SITE_ROOT, OUT_PATH)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
