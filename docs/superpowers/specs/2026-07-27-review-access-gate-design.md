# Review access gate — design

*2026-07-27 · branch `review-app-prototype` · precondition for merging the review app to `main`.*

## Problem

The review app is deployed but ungated. Today:

- PDFs are **not** committed (repo can be public) and are served only through
  `/api/pdf/[citekey]`, which mints a short-lived signed URL from a **private** Supabase
  Storage bucket using a server-only service-role key. The raw files stay private.
- **But** nothing authenticates a request to `/review/*` or to `/api/pdf/[citekey]`.
  On the preview deploy this is masked by Vercel Deployment Protection + shareable links.
  The moment the branch merges to `main` and gets a stable production URL, anyone who
  knows the URL can open `/review/accuracy`, pick a paper, and the app will stream them
  the copyrighted PDF — the endpoint has no auth check.
- Reviewer identity is a **roster name-picker** stored in `localStorage` (no password).
- Supabase RLS is **fully permissive** (open to the public anon key): anyone with the
  anon key (it ships in the client bundle) can read the roster and write `accuracy_reviews`.

The exposure that blocks the merge is the ungated PDF/review surface. This spec adds a
real per-user login in front of the review section so the app can go to `main`.

## Goals

1. Only authenticated, **invited** reviewers can reach `/review/*` and `/api/pdf/*`.
2. The main site (graph, nodes, narratives, about) stays **public** — it's an open synthesis.
3. Identity becomes the logged-in user (real attribution), replacing the name-picker.
4. Tighten RLS so the public anon key can no longer write judgment rows.

## Non-goals / explicitly deferred

- **In-handler auth recheck in `/api/pdf`** (belt-and-suspenders beyond middleware).
  Deferred to a fast-follow. Middleware guarding `/api/pdf/*` is the gate for this pass.
  *Rationale to revisit later:* Next.js middleware-only auth has a known bypass class
  (e.g. CVE-2025-29927); a server-side recheck in the route handler closes it. Acceptable
  risk for a trusted pilot on a low-value target; not acceptable long-term.
- Session inactivity timeout — sessions are **persistent** (see §6). No auto-expiry.
- Any gating of the public main site.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Gate scope | `/review/*` pages + `/api/pdf/*` + review-write path only; main site public |
| Auth provider | Supabase Auth (already the project's backend) |
| Authorization model | **Invite-only** — public signup disabled; maintainer invites emails in the Supabase dashboard |
| Login UX | **Email OTP** (6-digit code), not magic link — robust against wrong-browser / institutional link-rewriting |
| Session | **Persistent, no timeout**; ends only on explicit logout / cookie clear |
| Identity | Logged-in user, mapped to a `reviewers` row by email; name-picker/switch **removed**; add **logout** |
| RLS | **Tightened** this pass — writes require an authenticated session |

## Architecture

### Sessions: `@supabase/ssr` (new dependency)

The current `lib/supabase.ts` is a plain anon-key `createClient` singleton with no session
awareness — it can't drive cookie-based auth or attach a user's JWT to requests. Add
`@supabase/ssr` and introduce three clients:

- **Browser client** (`createBrowserClient`) — replaces the singleton in `lib/supabase.ts`.
  Reads the session cookie and **automatically attaches the user's JWT** to every request,
  so the existing `accuracy-store.ts` writes will satisfy tightened RLS with no call-site
  changes. Preserves the `supabase === null` fallback when env vars are absent (local UX
  testing without a backend).
- **Server client** (`createServerClient`) — for the `/login` server action / route and any
  server component that needs the session.
- **Middleware client** — reads/refreshes the session cookie inside `middleware.ts`.

Env vars are unchanged (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`).

### `middleware.ts` (new — none exists today)

Matcher covers `/review/:path*` and `/api/pdf/:path*` (and the review-write API path if it
becomes a route; today writes go direct to Supabase from the browser client, gated by RLS).

- No/invalid session → `/review/*` **redirects** to `/login?next=<path>`; `/api/pdf/*`
  returns **401**.
- Valid session → refresh the cookie, continue.
- Middleware must **not** match main-site routes.

### `/login` page

- Email field → `signInWithOtp({ email })` → "enter the 6-digit code" step →
  `verifyOtp` → session cookie set → redirect to `next` (default `/review/accuracy`).
- Invite-only means non-invited emails simply never receive a code. Copy on the page sets
  the expectation: *"Enter your invited email. No code arriving? Ask the maintainer to add you."*
- No public signup UI.

### Identity reconciliation

- On authenticated load, resolve `session.user.email` → a `reviewers` row. **First login:**
  match by **lowercased email** and **stamp `auth_user_id`** (new column) on that row.
  **Thereafter:** join on `auth_user_id` (stable, not email-string-fragile). That row supplies
  `id`, `name`, `role` for attribution and the header. Judgment writes keep using
  `reviewer_id` / `reviewer_name` exactly as today — the export path is unchanged.
- **Remove** the `IdentityGate` name-picker and the "switch" affordance in `identity.tsx`.
  Replace `useReviewer()`'s localStorage logic with "derive the reviewer from the session."
- **Add** a logout control (replaces "switch") in `IdentityBar` → `supabase.auth.signOut()`
  → back to `/login`.
- Edge case: an authenticated email with **no matching `reviewers` row** → treat as
  not-yet-provisioned ("you're logged in but not on the reviewer roster — ask the
  maintainer"). Prevents a foreign-key failure on the first write.

### Provisioning (invite-only) — maintainer runbook

1. Backfill `email` on existing `reviewers` rows (add to the seed block in `schema.sql`).
2. Supabase dashboard → Authentication → **disable public signups**.
3. For each reviewer: Authentication → **Invite user** (email) — must match the roster email.
4. Reviewer visits `/review`, redirected to `/login`, enters email → code → in.

### Data migration — existing reviews (real work, must not orphan)

As of 2026-07-27 the central store holds **209 real judgments** across 10 papers from three
reviewers: **Defne Altan (145), Joel Chan (59), William Rivers (5)**. Each reviewer picked
their name under the old model, so each maps to exactly **one existing `reviewers` row**, and
all 209 `accuracy_reviews` rows already FK to those ids.

**Invariant: never mint new reviewer rows for auth users, and never rewrite `reviewer_id`.**
The migration only *adds* `email` (and later `auth_user_id`) to the **existing** rows:

1. Add columns: `alter table reviewers add column if not exists auth_user_id uuid;`
   `create unique index if not exists reviewers_email_uniq on reviewers (lower(email));`
2. Backfill `email` onto the exact existing rows, verified by name — **Defne, Joel, William
   first**, then everyone else who will review. (These three are the continuity-critical rows.)
3. Invite exactly those emails. On first login each stamps `auth_user_id` on their own row.

Because identity resolves to the *same* row id, all 209 judgments stay attributed and continuous;
the maintainer queue, disagreement view, and CSV export (which key on `reviewer_id`/`reviewer_name`)
are unaffected. The `accuracy_reviews` table is not touched.

**Verification gate (before merge):** after backfill, log in as each of the three and confirm the
queue still tallies **145 / 59 / 5**. Reference export: `review-queue-all.json` (exported
2026-07-27T15:28Z).

### RLS tightening (`supabase/schema.sql`)

Replace the permissive anon policies:

- `reviewers` — `select` allowed to `authenticated` (was `anon` `using (true)`).
- `accuracy_reviews` — all ops require `authenticated`; keep the app's existing
  `reviewer_id` attribution. Start with "any authenticated user" (only invited users are
  authenticated). The `auth_user_id` column added for identity (§ Data migration) makes a
  per-row-ownership policy (`reviewer_id`'s row `auth_user_id = auth.uid()`) a trivial
  follow-up if write-integrity per person is later wanted.
- The service-role path (`/api/pdf`, upload script) bypasses RLS as before.

*Verify before relying on it:* after tightening, confirm the browser client's writes carry
the JWT (they do via `createBrowserClient`) and still succeed while an anon-key-only request
is rejected.

## Affected files

| File | Change |
|---|---|
| `site/package.json` | add `@supabase/ssr` |
| `site/lib/supabase.ts` | browser client via `createBrowserClient` (keep null-fallback) |
| `site/lib/supabase-server.ts` | **new** — server + middleware client factories |
| `site/middleware.ts` | **new** — session gate for `/review/*` + `/api/pdf/*` |
| `site/app/login/page.tsx` | **new** — email → OTP → session |
| `site/app/api/auth/*` (if needed) | callback/signout route(s) per `@supabase/ssr` pattern |
| `site/components/review/identity.tsx` | drop name-picker/switch; session-derived identity; add logout |
| `site/app/review/*` | consume session identity instead of the picker gate |
| `supabase/schema.sql` | add `auth_user_id` col + unique email index; backfill emails onto existing rows; tighten RLS policies |
| `supabase/README.md`, `plans/review-app/deploying-to-vercel.md` | document invite flow + gate |

## Testing / verification

- **Unauthenticated** `curl` of `/api/pdf/@<citekey>` → **401** (currently streams the PDF).
- **Unauthenticated** browser hit on `/review/accuracy` → redirect to `/login`.
- Main-site routes (`/`, `/node/*`, narratives, about) → **200**, unchanged.
- Invited email → code → lands in `/review`, identity shows the roster name, a judgment
  write lands in `accuracy_reviews`.
- Non-invited email → no code; logged-in-but-unrostered email → the "not on roster" screen,
  no write.
- Logout → session cleared → `/review` bounces to `/login`.
- Anon-key-only write to `accuracy_reviews` (no session) → rejected by RLS.
- **Continuity gate:** after email backfill, log in as Defne / Joel / William → the maintainer
  queue still tallies **145 / 59 / 5** and prior judgments render as theirs.
- Existing Vitest suites still green (`accuracy-store`, `accuracy-pane`, `review-accuracy`).

## Merge sequencing

Build + verify the gate **on this branch**, confirm the unauthenticated `/review` redirect
and `/api/pdf` 401, **then** merge to `main`. Do not merge first — that would briefly expose
`/review/*` on a stable production URL with no gate.

## Out of scope (this spec) — Track B

The methods writeup (extraction approach + surgery-cluster sampling, abstract + full methods)
is an independent writing deliverable, handled separately from this feature.
