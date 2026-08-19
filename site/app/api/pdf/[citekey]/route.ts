import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Serves a source PDF for the review pane. In dev, the local data/pdfs/ file wins.
// In production the PDF lives in a PRIVATE Supabase Storage bucket; we mint a
// short-lived signed URL with the service-role key and stream the bytes back
// (same-origin, so no CORS / no exposed bucket). Batch-only: upload just the
// papers under review via scripts/upload-review-pdfs.mjs.
export const dynamic = "force-dynamic";

const BUCKET = "review-pdfs";
const PDF_HEADERS = {
  "Content-Type": "application/pdf",
  "Cache-Control": "private, max-age=300",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ citekey: string }> },
) {
  const { citekey } = await params;
  const ck = decodeURIComponent(citekey);
  if (!/^@[\w.@-]+$/.test(ck)) {
    return new Response("bad citekey", { status: 400 });
  }

  // 1) local file (dev)
  const local = path.resolve(process.cwd(), "..", "data", "pdfs", `${ck}.pdf`);
  try {
    const buf = await fs.readFile(local);
    return new Response(new Uint8Array(buf), { headers: PDF_HEADERS });
  } catch {
    /* fall through to storage */
  }

  // 2) private Supabase Storage (prod)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return new Response("PDF not available", { status: 404 });
  }
  try {
    const admin = createClient(url, serviceKey);
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(`${ck}.pdf`, 120);
    if (error || !data?.signedUrl) {
      return new Response("PDF not available", { status: 404 });
    }
    const r = await fetch(data.signedUrl);
    if (!r.ok) return new Response("PDF not available", { status: 404 });
    return new Response(new Uint8Array(await r.arrayBuffer()), {
      headers: PDF_HEADERS,
    });
  } catch {
    return new Response("PDF not available", { status: 404 });
  }
}
