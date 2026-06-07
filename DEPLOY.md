# Deploying the site

The site (`site/`) is a Next.js app hosted on **Vercel**. Vercel watches the
GitHub repo: every push to `main` auto-builds and publishes; pull requests get
their own preview URLs.

## How the data gets in

The site renders from `graph/` — a one-way RDF-schema export produced from the
canonical `Discourse Graph/` vault by **`utils/export_rdf.py` (Python)**.

Vercel's build runs **Node, not Python**, so it cannot regenerate `graph/`.
Therefore `graph/` and `site/public/attachments/` are **committed build
artifacts**. After any extraction/editing run, regenerate and commit them:

```bash
python3 utils/export_rdf.py     # Discourse Graph/ → graph/  (+ copies figure images)
git add graph site/public/attachments
git commit -m "Regenerate graph export"
git push                        # Vercel rebuilds automatically
```

The build itself then runs `pnpm build`, which regenerates
`site/lib/graph-data.generated.json` and the pagefind search index (both
git-ignored) from the committed `graph/`.

## First-time setup (once)

1. **vercel.com** → Sign Up → **Continue with GitHub** → authorize.
2. Dashboard → **Add New… → Project** → import
   `oasisresearchlab/language-and-health-open-synthesis`.
3. ⚠️ **Set Root Directory = `site`.** The Next app is in a subdirectory; this
   is the make-or-break setting. Everything else auto-detects:
   - Framework: Next.js · Build: `pnpm build` · Install: `pnpm install`
   - Leave these auto-detected; don't override. (Ignore the "multiple
     lockfiles" warning.)
4. **Deploy.** No env vars are needed for the read-only site — the build
   succeeds without them. You'll get a `https://<project>.vercel.app` URL.

## Enabling the interactive features (after first deploy)

The read-only site (graph, nodes, narratives, about, search) needs nothing.
Two features need secrets — set them in **Project → Settings → Environment
Variables** (see `site/.env.example` for the full annotated list), then redeploy:

- **Contribute** (GitHub OAuth + PR creation): create an OAuth App at
  <https://github.com/settings/developers> with callback
  `https://<your-domain>/api/github/callback`, then set `GITHUB_CLIENT_ID`,
  `GITHUB_CLIENT_SECRET`, `GITHUB_OAUTH_REDIRECT_URI`, `GITHUB_REPO_OWNER`,
  `GITHUB_REPO_NAME`, `GITHUB_REPO_BASE_BRANCH`.
- **Generate a narrative on demand** (LLM): `OPENROUTER_API_KEY` from
  <https://openrouter.ai/keys>.

Also update `SITE_URL` in `site/app/layout.tsx` (marked with a `TODO`) to the
real domain so OpenGraph/social-preview URLs resolve, then commit + push.

## Local development

```bash
cd site
pnpm install
pnpm dev            # http://localhost:3000  (runs `pnpm data:graph` first)
```

Copy `site/.env.example` to `site/.env.local` to test the interactive features
locally.

## Verifying a production build before pushing

```bash
cd site && pnpm build     # mirrors what Vercel runs; catches build failures early
```
