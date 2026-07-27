# Review app — Supabase setup (≈5 min)

The accuracy pass writes review judgments to a central Postgres so you can collect
everyone's work in one place. Identity is **invite-only email OTP** (Supabase Auth):
a reviewer signs in with a one-time code sent to their invited email, which the app
matches to their roster row. If Supabase env vars are absent the app falls back to
localStorage, so you can test the UX before wiring this up.

## 1. Create a project
- [supabase.com](https://supabase.com) → New project (free tier is fine). Note the
  project URL and the **anon public** key (Project Settings → API).

## 2. Create the schema
- SQL Editor → paste `supabase/schema.sql` → Run.
- Edit the seed-roster block at the bottom with your reviewers' names (and emails,
  where known), re-run it.

## 3. Set up the invite-only login flow
- **Disable public signups:** Authentication → Providers → Email → turn off "Allow
  new users to sign up". Only invited users can ever get in.
- **Backfill reviewer emails:** if reviewers were seeded without an email (or a
  migration added the column to an existing table), update `reviewers.email` for
  each person who will review — see `supabase/migrations/2026-07-27-access-gate.sql`
  for the pattern (backfill `where email is null`, never touch existing
  `accuracy_reviews` rows).
- **Check the OTP email template:** Authentication → Email Templates → Magic Link →
  confirm the body includes `{{ .Token }}` (this is what makes `signInWithOtp`
  deliver a 6-digit code instead of only a link).
- **Invite each reviewer:** Authentication → Users → Invite user, one per backfilled
  email (must match exactly). The reviewer signs in at `/login` with that email and
  the code they receive.

## 4. Wire the site
Create `site/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

On Vercel: add the same two vars under Project → Settings → Environment Variables,
then redeploy.

## 5. Collect results
Each judgment is one row in `accuracy_reviews` (`reviewer_name`, `citekey`,
`node_id`, `dimension`, `verdict`, `proposed`, `note`, `time_spent_ms`). Export from
the Table Editor (CSV) or SQL. Example rollup:

```sql
select reviewer_name, citekey, dimension, verdict, count(*)
from accuracy_reviews
group by 1,2,3,4 order by 1,2,3;
```

## ⚠️ Migration ordering

`supabase/migrations/2026-07-27-access-gate.sql` tightens RLS to authenticated-only.
Run it **together with** deploying this branch's code — never against the old
name-picker deployment, or judgment writes silently fail (anon `saveReview` upsert is
RLS-rejected but the error isn't checked). See the "⚠️ Ordering" note in
`plans/review-app/deploying-to-vercel.md` for the full explanation.

## Security note
RLS policies are **authenticated-only**: `reviewers` is readable by any signed-in
user and self-updatable only on the row matching their own email (so a user can
stamp `auth_user_id` onto their roster row); `accuracy_reviews` is fully open to
signed-in users. The anon key ships in the client bundle, but with signups disabled
and no session, anon requests are rejected by RLS — only invited, logged-in
reviewers can read or write.
