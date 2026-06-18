-- Review app — accuracy pass backend (prototype).
-- Run this in the Supabase SQL editor once. Edit the seed roster at the bottom.
-- Identity is a preset roster (pick-your-name), not auth — fine for a trusted pilot.

-- ── Roster ──────────────────────────────────────────────────────────────────
create table if not exists reviewers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  role        text not null default 'clinician',  -- clinician | ra | maintainer
  created_at  timestamptz not null default now()
);

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

-- ── Row-level security (prototype: open to the anon key) ─────────────────────
-- The anon key is public in the client bundle, so these policies are permissive.
-- Acceptable for a closed pilot; tighten (or move to magic-link auth) before any
-- public exposure.
alter table reviewers        enable row level security;
alter table accuracy_reviews enable row level security;

drop policy if exists anon_reviewers_read on reviewers;
create policy anon_reviewers_read on reviewers for select using (true);

drop policy if exists anon_accuracy_all on accuracy_reviews;
create policy anon_accuracy_all on accuracy_reviews for all using (true) with check (true);

-- ── Seed roster — EDIT THESE NAMES, then re-run just this block ──────────────
-- Idempotent: only inserts names not already present (no unique constraint on name,
-- so `on conflict` wouldn't dedupe). Safe to re-run as the roster grows.
insert into reviewers (name, role)
select v.name, v.role
from (values
  ('Joel Chan',        'maintainer'),
  ('Rachel Murphy',    'project manager'),
  ('Gezzer Ortega',    'clinician'),
  ('Ibne Faruk',       'RA'),
  ('Miles Francisque', 'RA'),
  ('Emily Wiit',       'fellow'),
  ('Chuma Eruchalu',   'fellow'),
  ('Jeslyn Rodriguez', 'fellow'),
  ('Carly Amon',       'fellow'),
  ('Defne Altan',      'fellow'),
  ('William Rivers',   'researcher'),
  ('Richard Ortega',   'researcher'),
  ('Andrew Schwieter', 'clinician')
) as v(name, role)
where not exists (select 1 from reviewers r where r.name = v.name);
