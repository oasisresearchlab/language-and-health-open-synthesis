// Build the Pagefind search index using its NodeJS Indexing API. This
// replaces the previous "pagefind --site out" CLI step, which required a
// fully static export to crawl. We now read the same JSON bundle the
// /api/generate route uses and emit a custom record per node, paper section,
// and narrative — no HTML crawl needed.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as pagefind from "pagefind";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(SITE_ROOT, "lib", "graph-data.generated.json");
const OUT_DIR = path.join(SITE_ROOT, "public", "pagefind");

const NODE_TYPE_LABEL = {
  question: "Question",
  claim: "Claim",
  evidence: "Evidence",
  method: "Method",
  source: "Source",
};

function stripDuplicateTitle(body, id) {
  const lines = body.split(/\r?\n/);
  const firstNonEmpty = lines.findIndex((l) => l.trim().length > 0);
  if (firstNonEmpty === -1) return body;
  const first = lines[firstNonEmpty];
  if (first.startsWith("# ") && first.includes(id)) {
    return lines.slice(firstNonEmpty + 1).join("\n").trim();
  }
  return body;
}

function splitPaperSections(raw) {
  const lines = raw.split(/\r?\n/);
  const sections = [];
  const headingRe = /^(#{2,4})\s+(.*)$/;
  const sectionLabelRe = /^(§[\d.]+(?:\s*[—–-]\s*[\d.]+)?)\s*[—–-]?\s*(.*)$/;
  let current = null;
  for (const line of lines) {
    const m = headingRe.exec(line);
    if (m) {
      if (current) sections.push(current);
      const body = m[2].trim();
      const sm = sectionLabelRe.exec(body);
      const label = sm ? sm[1].trim() : body;
      const title = sm ? (sm[2].trim() || body) : body;
      const slug = label
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
      current = { label, title, slug, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

async function main() {
  const raw = await fs.readFile(DATA_PATH, "utf-8");
  const data = JSON.parse(raw);

  await fs.rm(OUT_DIR, { recursive: true, force: true });

  const { index } = await pagefind.createIndex();

  // Graph nodes → /node/[id]
  for (const node of data.nodes) {
    const body = stripDuplicateTitle(node.body || "", node.id);
    const content = `${node.title}\n\n${body}`.trim();
    if (!content) continue;
    await index.addCustomRecord({
      url: `/node/${node.id}/`,
      content,
      language: "en",
      meta: {
        title: `${node.id} — ${node.title}`,
        type: NODE_TYPE_LABEL[node.type] || node.type,
      },
    });
  }

  // Paper sections → /narratives/#slug
  if (data.paper) {
    const sections = splitPaperSections(data.paper);
    for (const s of sections) {
      const content = s.lines.join("\n").trim();
      if (!content) continue;
      await index.addCustomRecord({
        url: `/narratives/#${s.slug}`,
        content,
        language: "en",
        meta: {
          title: `${s.label} ${s.title}`.trim(),
          type: "Whitepaper section",
        },
      });
    }
  }

  // Composed narratives → /narratives/[anchorId]
  for (const n of data.narratives) {
    const content = (n.raw || "").trim();
    if (!content) continue;
    await index.addCustomRecord({
      url: `/narratives/${n.anchorId}/`,
      content,
      language: "en",
      meta: {
        title: `Narrative · ${n.anchorId}`,
        type: "Narrative",
      },
    });
  }

  await index.writeFiles({ outputPath: OUT_DIR });
  await pagefind.close();

  console.log(
    `[pagefind] wrote index to ${path.relative(SITE_ROOT, OUT_DIR)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
