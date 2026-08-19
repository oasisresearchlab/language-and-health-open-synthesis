// Self-host the pdf.js worker: copy it from the installed pdfjs-dist into public/
// so it's served from our own origin (no CDN dependency — works on locked-down
// networks, offline, and keeps the version matched to the package). Gitignored;
// regenerated on dev/build. See components/review/pdf-pane.tsx.
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

async function main() {
  // Resolve pdfjs-dist *as react-pdf sees it* — react-pdf pins a specific version
  // and the worker MUST match its API version, or the PDF fails to load.
  const reactPdfDir = path.dirname(require.resolve("react-pdf/package.json"));
  const pkg = path.dirname(
    require.resolve("pdfjs-dist/package.json", { paths: [reactPdfDir] }),
  );
  const { version } = require(path.join(pkg, "package.json"));
  const src = path.join(pkg, "build", "pdf.worker.min.mjs");
  console.log(`[pdf-worker] pdfjs version ${version}`);
  const destDir = path.resolve(process.cwd(), "public");
  const dest = path.join(destDir, "pdf.worker.min.mjs");
  await mkdir(destDir, { recursive: true });
  await copyFile(src, dest);
  console.log(`[pdf-worker] copied → public/pdf.worker.min.mjs`);
}

main().catch((e) => {
  console.error("[pdf-worker] failed:", e.message);
  process.exit(1);
});
