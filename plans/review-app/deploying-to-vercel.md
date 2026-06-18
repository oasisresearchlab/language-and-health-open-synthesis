# Deploying the review app to Vercel

Runbook for putting the review app (and main site) on Vercel. Written 2026-06-18,
on branch `review-app-prototype`. The deploy-prep code is committed (`767bfea`); the
remaining work is the Vercel/Supabase account steps below.

## Why it works on Vercel now (what the prep solved)

The review routes are `force-dynamic` and originally read `../graph` and `../data`
at request time — files Vercel's serverless runtime doesn't include (they're outside
`site/`, and `data/` is gitignored). The fix made everything self-contained in `site/`:

- **Graph** — review loaders call `loadGeneratedGraph()` (in `site/lib/graph.ts`),
  which builds the graph from the bundled `site/lib/graph-data.generated.json`
  (rebuilt by `data:graph` at build) instead of fs-reading `../graph`.
  `build-graph-data.mjs` now also emits source `citekey` + biblio fields so EVD→citekey
  resolves.
- **Review JSON** — anchors / `accuracy_pages.json` / `quote_regions.json` are
  precomputed into a **committed** `site/review-data/` (the precompute scripts and the
  loaders both point there). Present at build *and* runtime.
- **Figure crops** — already committed in `site/public/attachments/`.
- **PDFs** — NOT committed (copyright; repo is public). Served by `/api/pdf/[citekey]`:
  local file in dev, else a short-lived **signed URL from a private Supabase Storage
  bucket** (`review-pdfs`), streamed back same-origin. `hasPdf` is `true` in production
  (the pane shows a graceful error if a paper hasn't been uploaded).

Verified: `next build` exits 0 with all review routes present; 21 JS + 7 py tests green.

## Prerequisites

- Supabase project already set up (`rzoiqhfplbxrnoakovsb`), schema loaded, roster seeded
  (see `supabase/README.md`). Accuracy reviews already write to it.
- Service-role key: Supabase dashboard → Project Settings → API → `service_role` (secret).

## Step 1 — Upload the pilot PDFs to private Storage (local, one-time per batch)

```bash
cd site
NEXT_PUBLIC_SUPABASE_URL=https://rzoiqhfplbxrnoakovsb.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
node scripts/upload-review-pdfs.mjs @Allan_2022_impact_English @Karliner_2017_Convenient_Access \
  @Lindholm_2012_Professional_language @Wallbrecht_2014_difference_emergency @Greenky_2019_Reversed_Trend
```

Creates the private `review-pdfs` bucket (no-op if it exists) and uploads the PDFs
from `../data/pdfs/`. These 5 are the current `ACCURACY_BATCH` (LOS + readmission
clusters). Batch-only — re-run with new citekeys as papers enter review.
(Storage cost is negligible; the whole 706-PDF corpus is ~473 MB, within the free tier.)

**Deployed + verified (2026-06-18):** all 5 papers render, PDFs stream from the
private bucket via signed URLs, judgments write to the central store, and the
curated set shows 8 EVDs (Allan 2 · Karliner 2 · Lindholm 2 · Wallbrecht 1 ·
Greenky 1).

## Step 2 — Push the branch

```bash
git push -u origin review-app-prototype
```

## Step 3 — Connect Vercel

vercel.com → Add New → Project → import `oasisresearchlab/language-and-health-open-synthesis`:

- **Root Directory: `site`** ← critical (the Next app lives there).
- Framework: Next.js (auto). Build command: default `pnpm build` (chains `data:graph`,
  `data:pagefind`, `pdf:worker`, then `next build`).
- **Environment variables:**

  | Name | Value | Scope |
  |---|---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | `https://rzoiqhfplbxrnoakovsb.supabase.co` | public |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (anon key) | public |
  | `SUPABASE_SERVICE_ROLE_KEY` | (service-role key) | **server-only — never NEXT_PUBLIC** |

  (Optional, for the contribute/narrative features: `GITHUB_*`, `OPENROUTER_API_KEY`.)
- Branch: `review-app-prototype` isn't `main`. Either set it as the Production Branch
  (Settings → Git) or let the push create a Preview deployment (same result, preview URL).
- If the repo is **already connected** to Vercel: skip the import — just add the 3 env
  vars and redeploy the branch.

## Step 4 — Verify the deployed app

- Main site (graph / nodes / narratives / about): should be unchanged.
- `/review/accuracy` → pick a paper → PDF renders (signed URL), quote/figure anchors
  highlight, judgments write to Supabase, header badge shows **central**.
- `/review/queue` → judgments appear; disagreement + export work.

## Sharing the deploy with reviewers (interim access gate)

Preview deployments are protected by **Vercel Deployment Protection** — anyone without
a Vercel login on the project gets a 401 (confirmed: unauthenticated `curl` of any
`/review/*` route returns 401, while a logged-in browser works). Clinicians won't have
Vercel accounts, so before handing out the URL:

- **Recommended — Vercel Shareable Link:** Deployments → the deployment → ⋯ → Share
  (or Settings → Deployment Protection → Protection Bypass / shareable links). Generates
  a URL that bypasses login; gated to whoever you send it to, no Vercel account needed.
  This *is* the interim access gate. PDFs stay private (signed URLs) regardless.
- Or disable preview protection (openly reachable — only if acceptable).
- Or merge to `main` for a stable production URL later.

A real per-user access gate (token/login in front of `/review/*`) is still TODO; the
shareable link covers the pilot.

## Gotchas / notes

- `SUPABASE_SERVICE_ROLE_KEY` is full-access. It's used only server-side in `/api/pdf`
  to mint signed URLs; the key and the signed URL never reach the browser.
- `site/lib/graph-data.generated.json` and `public/pdf.worker.min.mjs` are gitignored and
  regenerated at build — don't commit them.
- The build fetches GitHub issues for node annotations but degrades gracefully on 403, so
  no token is required.
- Access gating (token/login in front of `/review/*`) is still TODO — until then the
  review UI is reachable by URL, though PDFs stay private (signed URLs only).

## Deferred (picked up after deploy)

- Clean the 7 orphan template-stub EVDs (E-0001..E-0007) from the graph/vault (currently
  filtered out of the review app, but still render as broken EVDs on the main site).
- Update the **completeness pass** PDF pane + anchors to match the accuracy pass
  (pdf.js pane, exact overlays, viewport-locked layout).
- Whole-figure bbox highlight (issue #6); access gate; instrumentation/benchmark join.
