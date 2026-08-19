-- Review app — accuracy pass backend.
-- Run this in the Supabase SQL editor once. Edit the seed roster at the bottom.
-- Identity is invite-only email OTP (Supabase Auth): a signed-in user is matched
-- to their roster row by email, then stamps auth_user_id on that row. See
-- supabase/README.md for the invite flow (disable signups → backfill emails →
-- invite → login).

-- ── Roster ──────────────────────────────────────────────────────────────────
create table if not exists reviewers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text,
  auth_user_id  uuid,
  role          text not null default 'clinician',  -- clinician | ra | maintainer
  created_at    timestamptz not null default now()
);

create unique index if not exists reviewers_email_uniq on reviewers (lower(email));

-- ── Per-dimension accuracy judgments ─────────────────────────────────────────
-- One row per (reviewer, node, dimension). dimension ∈
--   verbatim | grounding | polarity | quant | methods   (the checklist)
--   _node | _paper                                        (catch-all notes)
create table if not exists accuracy_reviews (
  id             uuid primary key default gen_random_uuid(),
  reviewer_id    uuid not null references reviewers(id) on delete cascade,
  reviewer_name  text,                       -- denormalized for easy CSV export
  citekey        text not null,
  node_id        text not null,              -- EVD id, e.g. E-0061  (or "_paper")
  dimension      text not null,
  verdict        text,                       -- ok | edit | wrong | na
  proposed       text,                       -- the corrected value / proposed diff
  note           text,
  time_spent_ms  integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists accuracy_reviews_uniq
  on accuracy_reviews (reviewer_id, node_id, dimension);

-- ── Row-level security (authenticated-only) ───────────────────────────────────
-- The anon key is public in the client bundle, so access is gated behind
-- Supabase Auth (invite-only email OTP) rather than left open to anon.
alter table reviewers        enable row level security;
alter table accuracy_reviews enable row level security;

drop policy if exists anon_reviewers_read on reviewers;
drop policy if exists auth_reviewers_read on reviewers;
create policy auth_reviewers_read on reviewers
  for select to authenticated using (true);

-- Let a signed-in user stamp auth_user_id on their OWN row (matched by email claim).
drop policy if exists auth_reviewers_self_update on reviewers;
create policy auth_reviewers_self_update on reviewers
  for update to authenticated
  using (lower(email) = lower(auth.email()))
  with check (lower(email) = lower(auth.email()));

drop policy if exists anon_accuracy_all on accuracy_reviews;
drop policy if exists auth_accuracy_all on accuracy_reviews;
create policy auth_accuracy_all on accuracy_reviews
  for all to authenticated using (true) with check (true);

-- ── Seed roster — EDIT THESE NAMES, then re-run just this block ──────────────
-- Idempotent: only inserts names not already present (no unique constraint on name,
-- so `on conflict` wouldn't dedupe). Safe to re-run as the roster grows.
-- Emails: fill in as reviewers are invited (must match the invited address exactly
-- for the self-update RLS policy above to let them claim their row). Leave null
-- for names not yet onboarding.
insert into reviewers (name, role, email)
select v.name, v.role, v.email
from (values
  ('Joel Chan',        'maintainer',       'joelchan@umd.edu'),
  ('Rachel Murphy',    'project manager',  null),
  ('Gezzer Ortega',    'clinician',        null),
  ('Ibne Faruk',       'RA',               null),
  ('Miles Francisque', 'RA',               null),
  ('Emily Wiit',       'fellow',           null),
  ('Chuma Eruchalu',   'fellow',           null),
  ('Jeslyn Rodriguez', 'fellow',           null),
  ('Carly Amon',       'fellow',           null),
  ('Defne Altan',      'fellow',           null),
  ('William Rivers',   'researcher',       null),
  ('Richard Ortega',   'researcher',       null),
  ('Andrew Schwieter', 'clinician',        null)
) as v(name, role, email)
where not exists (select 1 from reviewers r where r.name = v.name);
