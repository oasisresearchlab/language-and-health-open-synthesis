import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const PAPER_PATH = path.resolve(process.cwd(), "..", "paper", "whitepaper-v3.md");
// Composed narratives live at <repo>/narratives, sibling of paper/ and graph/.
const NARRATIVE_DIR = path.resolve(process.cwd(), "..", "narratives");

export interface PaperSection {
  /** "§1.2" style label */
  label: string;
  /** Slugified anchor for href fragments */
  slug: string;
  title: string;
  /** Markdown content of just this section (heading included) */
  content: string;
  /** Heading depth (h2 vs h3 etc.) */
  level: number;
}

export interface Paper {
  raw: string;
  sections: PaperSection[];
}

export interface NarrativeFrontmatter {
  anchor?: string;
  audience?: string;
  length?: string;
  voice?: string;
  /** "1-hop" | "2-hop" | "semantic" — how the bundle was assembled. */
  bundle?: string;
  /** "tight" | "balanced" | "wide" — q-overlap threshold. Only set when bundle === "semantic". */
  breadth?: string;
  /** Legacy field; pre-bundle narratives recorded depth instead. */
  depth?: number;
  generatedAt?: string;
  generatedBy?: string;
  model?: string;
  contributor?: string;
  contributorUrl?: string;
  canonical?: boolean;
}

export interface NarrativeBundleSidecarNode {
  id: string;
  type: string;
  title: string;
  isAnchor: boolean;
  depth: number;
}

export interface NarrativeBundleSidecarEdge {
  from: string;
  to: string;
  edge: string;
}

export interface NarrativeBundleSidecar {
  anchor: string;
  bundle?: string;
  breadth?: string;
  generatedAt?: string;
  generatedBy?: string;
  model?: string;
  contributor?: string;
  contributorUrl?: string;
  nodes: NarrativeBundleSidecarNode[];
  edges: NarrativeBundleSidecarEdge[];
}

export interface Narrative {
  /** Anchor node ID, e.g. "Q-0003" */
  anchorId: string;
  /** 8-char hex variant ID, e.g. "4101288a" */
  shortId: string;
  /** Full file basename without extension, e.g. "Q-0003-4101288a" */
  slug: string;
  filePath: string;
  /** Markdown body with frontmatter stripped */
  body: string;
  /** Original raw file contents (frontmatter included) */
  raw: string;
  frontmatter: NarrativeFrontmatter;
  /** Sidecar bundle data when {anchor}-{shortId}.bundle.json exists. */
  sidecar?: NarrativeBundleSidecar;
}

let paperCache: Paper | null = null;
let narrativeCache: Narrative[] | null = null;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Split the whitepaper into sections by top-level headings. Recognises both
 * "## §1.2 Title" / "## §1 — Title" and bare "## Title" forms.
 */
export async function loadPaper(): Promise<Paper> {
  if (paperCache) return paperCache;
  let raw: string;
  try {
    raw = await fs.readFile(PAPER_PATH, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      paperCache = { raw: "", sections: [] };
      return paperCache;
    }
    throw err;
  }

  const lines = raw.split(/\r?\n/);
  const sections: PaperSection[] = [];
  let current: { label: string; slug: string; title: string; level: number; lines: string[] } | null = null;

  const headingRe = /^(#{2,4})\s+(.*)$/;
  const sectionLabelRe = /^(§[\d.]+(?:\s*[—–-]\s*[\d.]+)?)\s*[—–-]?\s*(.*)$/;

  for (const line of lines) {
    const m = headingRe.exec(line);
    if (m) {
      if (current) {
        sections.push({
          label: current.label,
          slug: current.slug,
          title: current.title,
          level: current.level,
          content: current.lines.join("\n").trim(),
        });
      }
      const level = m[1].length;
      const body = m[2].trim();
      const sm = sectionLabelRe.exec(body);
      let label: string;
      let title: string;
      if (sm) {
        label = sm[1].trim();
        title = sm[2].trim() || body;
      } else {
        label = body;
        title = body;
      }
      const slug = slugify(label || title);
      current = { label, slug, title, level, lines: [line] };
    } else {
      if (current) current.lines.push(line);
    }
  }
  if (current) {
    sections.push({
      label: current.label,
      slug: current.slug,
      title: current.title,
      level: current.level,
      content: current.lines.join("\n").trim(),
    });
  }

  paperCache = { raw, sections };
  return paperCache;
}

function toStringMaybe(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

function parseNarrativeFrontmatter(
  data: Record<string, unknown>,
): NarrativeFrontmatter {
  const depth = data.depth;
  return {
    anchor: toStringMaybe(data.anchor),
    audience: toStringMaybe(data.audience),
    length: toStringMaybe(data.length),
    voice: toStringMaybe(data.voice),
    bundle: toStringMaybe(data.bundle),
    breadth: toStringMaybe(data.breadth),
    depth: typeof depth === "number" ? depth : undefined,
    generatedAt: toStringMaybe(data.generatedAt),
    generatedBy: toStringMaybe(data.generatedBy),
    model: toStringMaybe(data.model),
    contributor: toStringMaybe(data.contributor),
    contributorUrl: toStringMaybe(data.contributorUrl),
    canonical: data.canonical === true,
  };
}

/**
 * List all composed narratives. Each file is a markdown narrative with YAML
 * frontmatter, named `{anchorId}-{shortId}.md` where shortId is 8 hex chars.
 * Multiple narratives per anchor coexist; the page picks a canonical one
 * (frontmatter `canonical: true`, else lex-first by shortId).
 */
export async function listNarratives(): Promise<Narrative[]> {
  if (narrativeCache) return narrativeCache;
  let entries: string[];
  try {
    entries = await fs.readdir(NARRATIVE_DIR);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      narrativeCache = [];
      return narrativeCache;
    }
    throw err;
  }
  const out: Narrative[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const m = /^([A-Z]-\d+[a-z]?)-([0-9a-f]{8})\.md$/.exec(entry);
    if (!m) continue;
    const filePath = path.join(NARRATIVE_DIR, entry);
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = matter(raw);
    const frontmatter = parseNarrativeFrontmatter(
      parsed.data as Record<string, unknown>,
    );
    const sidecarPath = path.join(NARRATIVE_DIR, `${m[1]}-${m[2]}.bundle.json`);
    let sidecar: NarrativeBundleSidecar | undefined;
    try {
      const sidecarRaw = await fs.readFile(sidecarPath, "utf-8");
      sidecar = JSON.parse(sidecarRaw) as NarrativeBundleSidecar;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    out.push({
      anchorId: m[1],
      shortId: m[2],
      slug: `${m[1]}-${m[2]}`,
      filePath,
      body: parsed.content.trim(),
      raw,
      frontmatter,
      sidecar,
    });
  }
  out.sort((a, b) => {
    const cmp = a.anchorId.localeCompare(b.anchorId);
    if (cmp !== 0) return cmp;
    return a.shortId.localeCompare(b.shortId);
  });
  narrativeCache = out;
  return narrativeCache;
}

/**
 * Pick the canonical narrative for an anchor. Prefers `canonical: true` in
 * frontmatter, falls back to the lex-first shortId.
 */
export function pickPrimary(narratives: Narrative[]): Narrative | undefined {
  if (narratives.length === 0) return undefined;
  return narratives.find((n) => n.frontmatter.canonical) ?? narratives[0];
}
