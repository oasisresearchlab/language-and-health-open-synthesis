// Upload review PDFs to a PRIVATE Supabase Storage bucket (batch-only — just the
// papers under review). Run locally; needs the service-role key in the env so it
// never lives in the repo:
//
//   NEXT_PUBLIC_SUPABASE_URL=https://<proj>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service role key> \
//   node scripts/upload-review-pdfs.mjs @Allan_2022_impact_English @Karliner_2017_Convenient_Access
//
// (Service-role key: Supabase dashboard → Project Settings → API → service_role.)
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "review-pdfs";

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const citekeys = process.argv.slice(2);
if (citekeys.length === 0) {
  console.error("Pass one or more citekeys, e.g. @Allan_2022_impact_English");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  // create the private bucket (no-op if it already exists)
  const { error: bErr } = await admin.storage.createBucket(BUCKET, {
    public: false,
  });
  if (bErr && !/already exists/i.test(bErr.message)) {
    console.error("bucket:", bErr.message);
  } else {
    console.log(`bucket "${BUCKET}" ready (private)`);
  }

  for (const ck of citekeys) {
    const file = path.resolve(process.cwd(), "..", "data", "pdfs", `${ck}.pdf`);
    try {
      const buf = await readFile(file);
      const { error } = await admin.storage
        .from(BUCKET)
        .upload(`${ck}.pdf`, buf, {
          contentType: "application/pdf",
          upsert: true,
        });
      console.log(error ? `✗ ${ck}: ${error.message}` : `✓ ${ck} (${(buf.length / 1e6).toFixed(2)} MB)`);
    } catch (e) {
      console.log(`✗ ${ck}: ${e.message}`);
    }
  }
}

main();
