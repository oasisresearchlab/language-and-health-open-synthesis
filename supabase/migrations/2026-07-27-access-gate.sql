-- ============================================================================
-- ⚠️ BEFORE RUNNING: edit the REPLACE_…@… placeholders below to each
-- reviewer's REAL invited email address. If you run this with the
-- placeholders left in place, Defne and William get bogus emails (e.g.
-- literally "REPLACE_defne@umd.edu") — their real invited address then
-- matches no roster row, so they land on the "not on the roster" screen at
-- login and cannot review at all. Also see the migration-ordering warning in
-- plans/review-app/deploying-to-vercel.md before running this on the live DB.
-- ============================================================================
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
