import { promises as fs } from "node:fs";
import path from "node:path";

// Streams a source PDF from the local (gitignored) data/pdfs/ for the review prototype.
// Local-only: on a deploy without data/ this 404s, which the review UI handles gracefully.
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ citekey: string }> },
) {
  const { citekey } = await params;
  const ck = decodeURIComponent(citekey);
  if (!/^@[\w.@-]+$/.test(ck)) {
    return new Response("bad citekey", { status: 400 });
  }
  const file = path.resolve(process.cwd(), "..", "data", "pdfs", `${ck}.pdf`);
  try {
    const buf = await fs.readFile(file);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${ck}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("PDF not available (local-only review data)", {
      status: 404,
    });
  }
}
