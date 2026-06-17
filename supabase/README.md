# Review app — Supabase setup (≈5 min)

The accuracy pass writes review judgments to a central Postgres so you can collect
everyone's work in one place. Identity is a **preset roster** (reviewers pick their
name) — no passwords. If Supabase env vars are absent the app falls back to
localStorage, so you can test the UX before wiring this up.

## 1. Create a project
- [supabase.com](https://supabase.com) → New project (free tier is fine). Note the
  project URL and the **anon public** key (Project Settings → API).

## 2. Create the schema
- SQL Editor → paste `supabase/schema.sql` → Run.
- Edit the seed-roster block at the bottom with your reviewers' names, re-run it.

## 3. Wire the site
Create `site/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

On Vercel: add the same two vars under Project → Settings → Environment Variables,
then redeploy.

## 4. Collect results
Each judgment is one row in `accuracy_reviews` (`reviewer_name`, `citekey`,
`node_id`, `dimension`, `verdict`, `proposed`, `note`, `time_spent_ms`). Export from
the Table Editor (CSV) or SQL. Example rollup:

```sql
select reviewer_name, citekey, dimension, verdict, count(*)
from accuracy_reviews
group by 1,2,3,4 order by 1,2,3;
```

## Security note
RLS policies are permissive (open to the anon key) for the pilot. The anon key ships
in the client bundle — fine for a closed test, **not** for public exposure. Tighten
policies or switch to magic-link auth before opening it up.
