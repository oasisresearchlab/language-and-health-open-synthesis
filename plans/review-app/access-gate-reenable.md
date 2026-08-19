# Re-enabling the review access gate

**Current state (2026-07-30):** the per-user access gate (invite-only Supabase Auth email-OTP in
front of `/review/*` and `/api/pdf/*`) is **fully built, reviewed, and committed** on
`review-app-prototype`, but **DISABLED in the live deploy** by commit **`910ef08`** so reviewers
could use the enlarged 50-paper queue with the current ungated **name-picker** access while the
Supabase auth config is still pending.

`910ef08` removed `site/middleware.ts` and restored the pre-gate name-picker
(`identity.tsx` / `accuracy-pane.tsx`). The rest of the gate is present as **dormant dead code**:
`site/app/login/page.tsx`, `site/lib/gate.ts`, `site/lib/reviewer-identity.ts`,
`site/lib/supabase-server.ts`, the session-aware `site/lib/supabase.ts`, and the tests.

- Design/spec: `docs/superpowers/specs/2026-07-27-review-access-gate-design.md`
- Implementation plan: `docs/superpowers/plans/2026-07-27-review-access-gate.md`
- Migration SQL: `supabase/migrations/2026-07-27-access-gate.sql`

Decisions already locked: invite-only, **email OTP** (6-digit code, not link), **persistent sessions**
(no timeout), identity = logged-in user mapped to the existing `reviewers` row by email → stamped
`auth_user_id`, RLS tightened to authenticated-only, name-picker removed + logout added.

---

## Step 1 — Supabase config (do this FIRST, before re-enabling the middleware)

1. **Fill real reviewer emails** into `supabase/migrations/2026-07-27-access-gate.sql` — the
   `REPLACE_…@…` placeholders, especially **Defne Altan** and **William Rivers** (Joel's is set).
   They MUST match the existing `reviewers` rows **by name** so the 209 existing verdicts stay
   attributed (the migration only *adds* email/`auth_user_id` to existing rows — never mint duplicates).
2. Supabase dashboard → **Authentication → Providers → Email** → turn **OFF** "Allow new users to
   sign up" (invite-only).
3. **Authentication → Email Templates → Magic Link** → ensure the body includes **`{{ .Token }}`**
   (this is what makes `signInWithOtp` deliver a **6-digit code** instead of only a link).
4. **Authentication → Sessions** → leave "time-box user sessions" and "inactivity timeout" **OFF**
   (persistent sessions).
5. **Authentication → Users → Invite user** → invite each reviewer's email (must match the
   backfilled roster email exactly).

*(These dashboard steps do not affect the currently-live ungated app — nobody is logging in yet.)*

## Step 2 — Re-enable the gate code

```
git revert 910ef08
```

This single revert restores `site/middleware.ts` + the session-derived `identity.tsx` /
`accuracy-pane.tsx` (and its test) exactly as built and reviewed. Verify `pnpm exec tsc --noEmit`
and `pnpm test` are green in `site/`.

## Step 3 — Coordinated deploy + migration (ORDERING MATTERS)

The migration **tightens RLS to authenticated-only**. Running it while the *current* ungated
name-picker app is live would break its anon-key writes. So run the migration **as the gated build
goes live**, not before:

1. Push `review-app-prototype` (with the revert) → Vercel deploys the gated build. Its
   `createBrowserClient` carries the user's JWT, so writes pass the tightened RLS **once users log in**.
2. Run `supabase/migrations/2026-07-27-access-gate.sql` in the Supabase SQL editor right around the
   deploy going live.
3. The narrow window between "migration run" and "gated build serving + users logged in" has **no
   valid writers** (reviewers are redirected to `/login`), so no verdict is lost.

## Step 4 — Verify (the hard gate before trusting it)

- Logged-out: `/review/accuracy` → redirects to `/login`.
- `curl -i <deploy>/api/pdf/@Allan_2022_impact_English` → **HTTP 401**.
- Log in (invited email → 6-digit code) as **Defne / Joel / William** → `/review/queue` still tallies
  **145 / 59 / 5** and each person's prior verdicts render as theirs (the **continuity gate**).
- Non-invited email → no code arrives (invite-only).
- Main site (`/`, `/node/*`, narratives, about) → still **public** (200), never gated.

---

## Notes

- **E-id stability:** the AI-translation extraction shifted **0** E-ids, so **no re-key SQL is
  needed** — the 209 verdicts stay aligned. (This is why re-enabling is safe now.)
- To disable the gate again later: `git revert` the Step-2 revert commit.
- The `reviewers` table already has the (nullable) `email` column; Step 1.1 backfills it, and the
  migration adds `auth_user_id` + a unique `lower(email)` index + the self-update RLS policy.
- Deferred hardening (documented in the plan, not required to turn the gate on): the in-`/api/pdf`
  server-side auth recheck, and per-row-ownership RLS. The `middleware.ts`→`proxy.ts` rename (Next 16
  deprecation) is a cosmetic fast-follow.
