# Review Access Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a per-user Supabase Auth login (invite-only, email OTP) in front of `/review/*` and `/api/pdf/*` so the review app can merge to `main` without exposing copyrighted PDFs, while preserving the 209 existing review judgments.

**Architecture:** Add `@supabase/ssr` for cookie-based sessions. A root `middleware.ts` checks the session and gates the review surface (redirect pages to `/login`, 401 the PDF API); the public main site is untouched. Identity becomes the logged-in user, resolved to an existing `reviewers` row by email (then a stamped `auth_user_id`). RLS is tightened so the anon key can no longer write judgments.

**Tech Stack:** Next.js 16 (App Router), `@supabase/ssr` + `@supabase/supabase-js`, Supabase Auth (email OTP), Postgres RLS, Vitest (jsdom).

## Global Constraints

- App root for all `site/` paths is `/Users/joelchan/Projects/language-and-health-open-synthesis/site`. Run all `pnpm`/`node`/`vitest` commands from `site/`.
- **Preserve the null-fallback:** when `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` are absent, `supabase` is `null` and the review UI falls back to local behavior. Never call a Supabase client factory unconditionally at import — always guard on the env vars. This keeps the existing Vitest suite (which runs with no env) green.
- **Gate scope is exactly** `/review/*` (pages) and `/api/pdf/*` (API). The main site (`/`, `/node/*`, narratives, about) stays public — never add it to the middleware matcher.
- **Never mint a duplicate `reviewers` row and never rewrite `reviewer_id` on existing `accuracy_reviews` rows.** The migration only *adds* columns/emails to existing rows. New reviewers get a new row deliberately (insert + invite), which is fine.
- **Continuity gate (hard, pre-merge):** after the email backfill, logging in as Defne / Joel / William must still show their judgment tallies of **145 / 59 / 5** (reference export `~/Downloads/review-queue-all.json`).
- Session policy: **persistent, no timeout** — leave Supabase "time-box user sessions" and "inactivity timeout" OFF.
- Deferred (do NOT build here): in-`/api/pdf` server-side auth recheck (middleware is the gate for this pass); per-row-ownership RLS.
- Commit after every task. Branch is `review-app-prototype` (not `main`) — do not merge in this plan.

---

### Task 1: Add `@supabase/ssr` and session-aware Supabase clients

**Files:**
- Modify: `site/package.json` (add dependency)
- Modify: `site/lib/supabase.ts`
- Create: `site/lib/supabase-server.ts`

**Interfaces:**
- Produces: `supabase` (browser client, `SupabaseClient | null`) and `supabaseConfigured: boolean` from `lib/supabase.ts` (same names as today). `createSupabaseServerClient(): Promise<SupabaseClient>` from `lib/supabase-server.ts`.

- [ ] **Step 1: Install the dependency**

Run (from `site/`): `pnpm add @supabase/ssr`
Expected: `package.json` gains `"@supabase/ssr": "^0.x"`; lockfile updates.

- [ ] **Step 2: Convert the browser client to `createBrowserClient`**

Replace the entire contents of `site/lib/supabase.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";
import { type SupabaseClient } from "@supabase/supabase-js";

// Session-aware browser client. Reads the auth cookie and attaches the user's
// JWT to every request (so tightened RLS passes once logged in). Optional: if
// env vars are absent (a plain clone / the test env) the review UI falls back
// to local behavior.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && key ? createBrowserClient(url, key) : null;

export const supabaseConfigured = supabase !== null;
```

- [ ] **Step 3: Add the server client factory**

Create `site/lib/supabase-server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type SupabaseClient } from "@supabase/supabase-js";

// Server-side (Server Component / Route Handler) Supabase client bound to the
// request cookies. Used by the login flow and any server code needing the session.
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // called from a Server Component (read-only cookies) — safe to ignore;
          // middleware refreshes the session cookie.
        }
      },
    },
  });
}
```

- [ ] **Step 4: Verify build + existing tests still pass**

Run (from `site/`): `pnpm test`
Expected: PASS — all existing suites green (they run with no env, so `supabase` is `null`).

Run (from `site/`): `pnpm exec tsc --noEmit`
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add site/package.json site/pnpm-lock.yaml site/lib/supabase.ts site/lib/supabase-server.ts
git commit -m "feat(review-auth): add @supabase/ssr + session-aware browser/server clients"
```

---

### Task 2: Gate-decision helper (pure, TDD)

**Files:**
- Create: `site/lib/gate.ts`
- Test: `site/test/gate.test.ts`

**Interfaces:**
- Produces: `type GateDecision = "allow" | "redirect-login" | "unauthorized"` and `gateDecision(pathname: string, hasUser: boolean): GateDecision`. Consumed by `middleware.ts` (Task 4).

- [ ] **Step 1: Write the failing test**

Create `site/test/gate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { gateDecision } from "@/lib/gate";

describe("gateDecision", () => {
  it("allows any path when a user is present", () => {
    expect(gateDecision("/review/accuracy", true)).toBe("allow");
    expect(gateDecision("/api/pdf/@Allan_2022", true)).toBe("allow");
  });
  it("401s the pdf API when logged out", () => {
    expect(gateDecision("/api/pdf/@Allan_2022", false)).toBe("unauthorized");
  });
  it("redirects review pages to login when logged out", () => {
    expect(gateDecision("/review", false)).toBe("redirect-login");
    expect(gateDecision("/review/accuracy", false)).toBe("redirect-login");
  });
  it("allows non-gated paths (defensive default)", () => {
    expect(gateDecision("/login", false)).toBe("allow");
    expect(gateDecision("/node/E-1", false)).toBe("allow");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `site/`): `pnpm exec vitest run test/gate.test.ts`
Expected: FAIL — cannot resolve `@/lib/gate`.

- [ ] **Step 3: Write the implementation**

Create `site/lib/gate.ts`:

```ts
export type GateDecision = "allow" | "redirect-login" | "unauthorized";

// Pure gating rule for the review surface. The middleware matcher already limits
// this to /review/* and /api/pdf/*; the default "allow" is defensive.
export function gateDecision(pathname: string, hasUser: boolean): GateDecision {
  if (hasUser) return "allow";
  if (pathname.startsWith("/api/pdf")) return "unauthorized";
  if (pathname.startsWith("/review")) return "redirect-login";
  return "allow";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `site/`): `pnpm exec vitest run test/gate.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add site/lib/gate.ts site/test/gate.test.ts
git commit -m "feat(review-auth): pure gate-decision helper + tests"
```

---

### Task 3: `/login` page (email OTP request → verify)

**Files:**
- Create: `site/app/login/page.tsx`

**Interfaces:**
- Consumes: `supabase` from `lib/supabase.ts` (Task 1).
- Produces: a client page at `/login` that establishes a session cookie on success and redirects to the `next` query param (default `/review/accuracy`).

- [ ] **Step 1: Write the login page**

Create `site/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/review/accuracy";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    // shouldCreateUser:false → invite-only. Unknown emails get no code (Supabase
    // returns success without sending, to prevent email enumeration).
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setStage("code");
    setMsg("If your email is on the reviewer roster, a 6-digit code is on its way.");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    router.replace(next);
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center px-4">
      <h1 className="font-heading text-2xl font-semibold">Reviewer sign-in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your invited email. No code arriving? Ask the maintainer to add you.
      </p>

      {stage === "email" ? (
        <form onSubmit={requestCode} className="mt-6 space-y-3">
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@institution.edu"
            className="w-full rounded-lg border border-border px-3 py-2"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg border border-border bg-accent/50 px-3 py-2 font-medium disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-6 space-y-3">
          <input
            inputMode="numeric"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            className="w-full rounded-lg border border-border px-3 py-2 font-mono tracking-widest"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg border border-border bg-accent/50 px-3 py-2 font-medium disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Verify & enter"}
          </button>
          <button
            type="button"
            onClick={() => setStage("email")}
            className="w-full text-xs text-muted-foreground underline"
          >
            use a different email
          </button>
        </form>
      )}

      {msg && <p className="mt-4 text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks and builds**

Run (from `site/`): `pnpm exec tsc --noEmit`
Expected: no type errors.

*(Full functional verification of OTP happens after Task 6 configures Supabase; the page cannot mint a code until invites + the email template exist.)*

- [ ] **Step 3: Commit**

```bash
git add site/app/login/page.tsx
git commit -m "feat(review-auth): /login page (email OTP request + verify)"
```

---

### Task 4: `middleware.ts` — session gate for the review surface

**Files:**
- Create: `site/middleware.ts`

**Interfaces:**
- Consumes: `gateDecision` from `lib/gate.ts` (Task 2); `createServerClient` from `@supabase/ssr`.

- [ ] **Step 1: Write the middleware**

Create `site/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { gateDecision } from "@/lib/gate";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Auth not configured (local/dev without env) → don't gate.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes the session cookie and tells us if a user is signed in.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const decision = gateDecision(request.nextUrl.pathname, !!user);
  if (decision === "unauthorized") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (decision === "redirect-login") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return response;
}

export const config = {
  matcher: ["/review", "/review/:path*", "/api/pdf/:path*"],
};
```

- [ ] **Step 2: Verify build**

Run (from `site/`): `pnpm exec tsc --noEmit`
Expected: no type errors.

Run (from `site/`): `pnpm build`
Expected: exits 0; `/login` and `/review/*` routes present in the build output.

- [ ] **Step 3: Manual smoke (logged-out, requires local env)**

With `site/.env.local` holding `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`, run `pnpm dev`. In a logged-out browser:
- Visit `/review/accuracy` → expect a redirect to `/login?next=/review/accuracy`.
- Run `curl -i http://localhost:3000/api/pdf/@Allan_2022_impact_English` → expect `HTTP/1.1 401`.
- Visit `/` and `/node/...` → expect normal 200 (not gated).

- [ ] **Step 4: Commit**

```bash
git add site/middleware.ts
git commit -m "feat(review-auth): middleware gate for /review/* + /api/pdf/*"
```

---

### Task 5: Reviewer-resolution helper (pure, TDD)

**Files:**
- Create: `site/lib/reviewer-identity.ts`
- Test: `site/test/reviewer-identity.test.ts`

**Interfaces:**
- Produces: `type ReviewerRow = { id: string; name: string; role: string; email: string | null; auth_user_id: string | null }`; `normalizeEmail(email): string`; `resolveReviewer(authUserId, email, roster): ReviewerRow | null`. Consumed by `identity.tsx` (Task 7).

- [ ] **Step 1: Write the failing test**

Create `site/test/reviewer-identity.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  resolveReviewer,
  type ReviewerRow,
} from "@/lib/reviewer-identity";

const roster: ReviewerRow[] = [
  { id: "r-defne", name: "Defne Altan", role: "fellow", email: "defne@umd.edu", auth_user_id: null },
  { id: "r-joel", name: "Joel Chan", role: "maintainer", email: "joelchan@umd.edu", auth_user_id: "auth-joel" },
];

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Joel@UMD.edu ")).toBe("joel@umd.edu");
  });
  it("handles null/undefined", () => {
    expect(normalizeEmail(null)).toBe("");
    expect(normalizeEmail(undefined)).toBe("");
  });
});

describe("resolveReviewer", () => {
  it("prefers a stamped auth_user_id match", () => {
    expect(resolveReviewer("auth-joel", "someone-else@x.com", roster)?.id).toBe("r-joel");
  });
  it("falls back to case-insensitive email match", () => {
    expect(resolveReviewer(null, "DEFNE@umd.edu", roster)?.id).toBe("r-defne");
  });
  it("returns null when the email is not on the roster", () => {
    expect(resolveReviewer("unknown-auth", "stranger@x.com", roster)).toBeNull();
  });
  it("returns null for an empty email with no id match", () => {
    expect(resolveReviewer(null, "", roster)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `site/`): `pnpm exec vitest run test/reviewer-identity.test.ts`
Expected: FAIL — cannot resolve `@/lib/reviewer-identity`.

- [ ] **Step 3: Write the implementation**

Create `site/lib/reviewer-identity.ts`:

```ts
export type ReviewerRow = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  auth_user_id: string | null;
};

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

// Resolve the logged-in user to a roster row: prefer a stamped auth_user_id,
// else a case-insensitive email match. Null when the user is not on the roster.
export function resolveReviewer(
  authUserId: string | null,
  email: string | null,
  roster: ReviewerRow[],
): ReviewerRow | null {
  if (authUserId) {
    const byId = roster.find((r) => r.auth_user_id === authUserId);
    if (byId) return byId;
  }
  const e = normalizeEmail(email);
  if (!e) return null;
  return roster.find((r) => normalizeEmail(r.email) === e) ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `site/`): `pnpm exec vitest run test/reviewer-identity.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add site/lib/reviewer-identity.ts site/test/reviewer-identity.test.ts
git commit -m "feat(review-auth): reviewer-resolution helper + tests"
```

---

### Task 6: Schema migration + Supabase configuration (live DB)

**Files:**
- Create: `supabase/migrations/2026-07-27-access-gate.sql`
- Modify: `supabase/schema.sql` (keep it the canonical setup script)
- Modify: `supabase/README.md` and `plans/review-app/deploying-to-vercel.md` (document invite flow)

**Interfaces:**
- Produces: `reviewers.auth_user_id` column, unique `lower(email)` index, backfilled emails on existing rows, `authenticated`-only RLS policies.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/2026-07-27-access-gate.sql`:

```sql
-- Access gate — additive, safe to run once on the live DB. Preserves all
-- existing accuracy_reviews rows (only adds columns/emails to reviewers).

-- 1. Identity link column + unique email.
alter table reviewers add column if not exists auth_user_id uuid;
create unique index if not exists reviewers_email_uniq on reviewers (lower(email));

-- 2. Backfill emails onto EXISTING rows (never create new rows here).
--    REPLACE the placeholders with real invited addresses. These three carry the
--    209 existing judgments (Defne 145 / Joel 59 / William 5) — match exactly.
update reviewers set email = 'REPLACE_defne@umd.edu'   where name = 'Defne Altan'    and email is null;
update reviewers set email = 'joelchan@umd.edu'        where name = 'Joel Chan'      and email is null;
update reviewers set email = 'REPLACE_william@umd.edu' where name = 'William Rivers'  and email is null;
--   ...add the remaining roster members who will review, one line each...

-- 3. Tighten RLS: authenticated-only (was permissive to the public anon key).
drop policy if exists anon_reviewers_read on reviewers;
create policy auth_reviewers_read on reviewers
  for select to authenticated using (true);

-- Let a signed-in user stamp auth_user_id on their OWN row (matched by email claim).
drop policy if exists auth_reviewers_self_update on reviewers;
create policy auth_reviewers_self_update on reviewers
  for update to authenticated
  using (lower(email) = lower(auth.email()))
  with check (lower(email) = lower(auth.email()));

drop policy if exists anon_accuracy_all on accuracy_reviews;
create policy auth_accuracy_all on accuracy_reviews
  for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: Fill in the real emails, then run the migration**

Edit the `REPLACE_*` addresses to the reviewers' real invited emails (Defne, Joel, William, plus any others onboarding). Then in the Supabase dashboard → SQL Editor → paste the migration → Run.
Expected: no errors; `select name, email, auth_user_id from reviewers order by name;` shows emails on the backfilled rows.

- [ ] **Step 3: Configure Supabase Auth (dashboard)**

- Authentication → **Providers → Email**: disable "Allow new users to sign up" (invite-only).
- Authentication → **Email Templates → Magic Link**: ensure the body includes the code token `{{ .Token }}` (this is what makes `signInWithOtp` deliver a 6-digit code rather than only a link).
- Authentication → **Sessions**: leave "time-box user sessions" and "inactivity timeout" **off** (persistent sessions).
- Authentication → **Users → Invite user**: invite each backfilled email (must match the roster email exactly).

- [ ] **Step 4: Fold the same changes into `schema.sql` and document**

- In `supabase/schema.sql`: add the `auth_user_id` column + unique email index to the `reviewers` table definition, add `email` to the seed-roster values where known, and replace the permissive policies with the three `authenticated` policies above (so a fresh setup matches the migrated DB).
- In `supabase/README.md` and `plans/review-app/deploying-to-vercel.md`: replace the "identity is a preset roster, no auth" notes with the invite-only OTP flow (disable signups → backfill emails → invite → login).

- [ ] **Step 5: Verify continuity + anon lockout (manual)**

- Continuity: with the app running against the live DB (identity still uses the old picker until Task 7), open `/review/queue` and confirm the tallies still show Defne 145 / Joel 59 / William 5. The migration touched no `accuracy_reviews` rows, so counts must be unchanged.
- Anon lockout: run this (anon key, no session) and expect **zero rows written**:
  ```bash
  cd site && NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon> node -e "import('@supabase/supabase-js').then(async({createClient})=>{const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);const{error}=await s.from('accuracy_reviews').insert({reviewer_id:'00000000-0000-0000-0000-000000000000',citekey:'@x',node_id:'x',dimension:'x'});console.log('insert error (expected RLS):', error?.message)})"
  ```
  Expected: an RLS violation error (the write is rejected).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/2026-07-27-access-gate.sql supabase/schema.sql supabase/README.md plans/review-app/deploying-to-vercel.md
git commit -m "feat(review-auth): schema migration (auth_user_id, unique email, authed RLS) + invite runbook"
```

---

### Task 7: Rewire identity to the session (logout, no picker) + final verification

**Files:**
- Modify: `site/lib/accuracy-store.ts` (add `fetchRosterFull`; re-export `ReviewerRow`)
- Modify: `site/components/review/identity.tsx`
- Modify: `site/components/review/accuracy-pane.tsx` (lines 89, 174, 257)

**Interfaces:**
- Consumes: `resolveReviewer`, `ReviewerRow` (Task 5); `supabase` (Task 1).
- Produces: `useReviewer()` returning `{ reviewer: ReviewerRow | null, notOnRoster: boolean, ready: boolean, signOut: () => Promise<void> }`; a `NotOnRosterGate` component.

- [ ] **Step 1: Add `fetchRosterFull` to the store**

In `site/lib/accuracy-store.ts`, add (near `fetchRoster`), and re-export the shared type:

```ts
import { type ReviewerRow } from "./reviewer-identity";
export type { ReviewerRow };

// Full roster rows incl. email + auth_user_id (for session→identity resolution).
export async function fetchRosterFull(): Promise<ReviewerRow[]> {
  if (!supabase) {
    return FALLBACK_ROSTER.map((r) => ({ ...r, email: null, auth_user_id: null }));
  }
  const { data, error } = await supabase
    .from("reviewers")
    .select("id,name,role,email,auth_user_id")
    .order("name");
  if (error || !data || data.length === 0) {
    return FALLBACK_ROSTER.map((r) => ({ ...r, email: null, auth_user_id: null }));
  }
  return data as ReviewerRow[];
}
```

- [ ] **Step 2: Rewrite `identity.tsx` to session-derived identity + logout**

Replace `useReviewer` and the `IdentityGate` export in `site/components/review/identity.tsx`. Replace the whole `useReviewer` function and the `IdentityGate` component with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { UserCircle2, LogOut } from "lucide-react";

import { ReviewButton } from "@/components/review/controls";
import { supabase } from "@/lib/supabase";
import { fetchRosterFull, type ReviewerRow } from "@/lib/accuracy-store";
import { resolveReviewer } from "@/lib/reviewer-identity";

export function useReviewer() {
  const [reviewer, setReviewer] = useState<ReviewerRow | null>(null);
  const [notOnRoster, setNotOnRoster] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const roster = await fetchRosterFull();
      if (!active) return;

      if (!supabase) {
        // No backend (local UX) — first fallback reviewer, no gate.
        setReviewer(roster[0] ?? null);
        setReady(true);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const resolved = resolveReviewer(
        user?.id ?? null,
        user?.email ?? null,
        roster,
      );
      if (!active) return;

      if (resolved) {
        setReviewer(resolved);
        setNotOnRoster(false);
        // Stamp auth_user_id on first login (self-update policy allows own row).
        if (user && !resolved.auth_user_id) {
          await supabase
            .from("reviewers")
            .update({ auth_user_id: user.id })
            .eq("id", resolved.id);
        }
      } else {
        setReviewer(null);
        setNotOnRoster(!!user);
      }
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return { reviewer, notOnRoster, ready, signOut };
}

/** Shown when a signed-in user has no matching reviewer row. */
export function NotOnRosterGate({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="mx-auto flex min-h-0 max-w-md flex-1 flex-col items-center px-4 py-10 text-center">
      <UserCircle2 className="h-10 w-10 shrink-0 text-muted-foreground" />
      <h2 className="mt-4 font-heading text-xl font-semibold">
        You&apos;re signed in, but not on the reviewer roster
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ask the maintainer to add your email to the roster, then sign in again.
      </p>
      <ReviewButton
        onClick={onSignOut}
        className="mt-6 rounded-lg border border-border px-4 py-2 hover:bg-accent/50"
      >
        Sign out
      </ReviewButton>
    </div>
  );
}
```

Then update `IdentityBar` in the same file to log out (replace the "switch" affordance):

```tsx
/** Compact "reviewing as X · log out" bar for the page header. */
export function IdentityBar({
  reviewer,
  onSignOut,
}: {
  reviewer: ReviewerRow;
  onSignOut: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <UserCircle2 className="h-3.5 w-3.5" />
      <span className="text-foreground">{reviewer.name}</span>
      <ReviewButton
        onClick={onSignOut}
        className="inline-flex items-center gap-1 rounded-sm px-0.5 underline hover:text-foreground"
      >
        <LogOut className="h-3 w-3" /> log out
      </ReviewButton>
    </span>
  );
}
```

Keep the existing `StorageBadge` export as-is. Remove the now-unused `RKEY`, `Reviewer` import, `Database`/`HardDrive` imports only if they become unused (StorageBadge still uses `Database`/`HardDrive` — keep those).

- [ ] **Step 3: Update `accuracy-pane.tsx` consumers**

In `site/components/review/accuracy-pane.tsx`:

- Line 33 import: change to
  ```tsx
  import { useReviewer, NotOnRosterGate, IdentityBar } from "@/components/review/identity";
  ```
- Line 89: change to
  ```tsx
  const { reviewer, notOnRoster, ready, signOut } = useReviewer();
  ```
- Line 174 (the gate): change to
  ```tsx
  if (!ready) return null;
  if (notOnRoster) return <NotOnRosterGate onSignOut={signOut} />;
  if (!reviewer) return null;
  ```
- Line 257 (the bar): change to
  ```tsx
  <IdentityBar reviewer={reviewer} onSignOut={signOut} />
  ```

- [ ] **Step 4: Verify types, lint, and existing tests**

Run (from `site/`): `pnpm exec tsc --noEmit`
Expected: no type errors (`Reviewer` vs `ReviewerRow`: `saveReview` accepts a `Reviewer` = `{id,name,role}`; `ReviewerRow` is a superset, so passing a `ReviewerRow` is assignable — no change needed).

Run (from `site/`): `pnpm test`
Expected: PASS — all suites, including the new `gate` and `reviewer-identity` tests. (`accuracy-store.test.ts`/`accuracy-pane.test.tsx` run with no env → fallback path unaffected.)

- [ ] **Step 5: Full end-to-end verification (live env)**

With `pnpm dev` and Supabase configured (Task 6 done):
- Logged out → `/review/accuracy` redirects to `/login`.
- Enter an invited email → receive a 6-digit code → verify → land in `/review/accuracy`; the header bar shows your name with a **log out** control.
- **Continuity gate:** log in as Defne / Joel / William in turn → `/review/queue` still tallies **145 / 59 / 5**; each person's prior judgments render as theirs.
- Enter a non-invited email → no code (message shown), no access.
- Sign an invited email in that has no roster row (temporarily) → the **NotOnRosterGate** appears; no write occurs.
- Make a judgment → it upserts to `accuracy_reviews` under your resolved `reviewer_id`.
- Log out → `/review/*` bounces back to `/login`.

- [ ] **Step 6: Commit**

```bash
git add site/lib/accuracy-store.ts site/components/review/identity.tsx site/components/review/accuracy-pane.tsx
git commit -m "feat(review-auth): session-derived reviewer identity + logout (drop name-picker)"
```

---

## Post-plan: merge sequencing (not part of a task)

Only after Task 7's end-to-end + continuity gate pass on the deployed branch: merge `review-app-prototype` → `main`. Do not merge earlier — that would expose `/review/*` on a stable production URL before the gate lands.

## Self-review notes (author)

- Spec coverage: gate scope (Task 4) · invite-only OTP (Tasks 3, 6) · persistent session (Task 6 dashboard) · identity reconciliation w/ auth_user_id (Tasks 5, 7) · name-picker removal + logout (Task 7) · RLS tightening (Task 6) · data migration/continuity (Task 6, verified Task 7) · deferred items excluded (no `/api/pdf` recheck, no per-row RLS). All covered.
- Type consistency: `ReviewerRow` defined in Task 5, re-exported from the store (Task 7), consumed by `identity.tsx`/`accuracy-pane.tsx`; `gateDecision` signature identical in Tasks 2 and 4; `resolveReviewer(authUserId, email, roster)` identical in Tasks 5 and 7.
