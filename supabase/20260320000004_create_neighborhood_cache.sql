-- Migration: create neighborhood_cache table
-- Phase 6D — Neighborhood Scoring (Max tier)

create table if not exists neighborhood_cache (
  id             bigint generated always as identity primary key,
  zip_code       text        not null unique,
  safety_score   text,                    -- CrimeGrade letter grade (e.g. "B+")
  school_rating  numeric,                 -- Census median income score 0-100 (column name kept for backward compat)
  growth_score   numeric,                 -- FHFA raw pct (e.g. 3.0 for 3%)
  raw_json       jsonb,                   -- Authoritative numeric 0-100 scores: {safetyScore, incomeScore, growthScore}
  fetched_at     timestamptz not null default now(),
  expires_at     timestamptz not null
);

-- Fast expiry check + zip_code lookup
create index if not exists idx_neighborhood_cache_zip_expires
  on neighborhood_cache (zip_code, expires_at);

-- RLS: service-role only (admin client writes; reads go through lookupNeighborhood server-side)
alter table neighborhood_cache enable row level security;

-- No user-facing RLS policy — all access via service role key
-- (createAdminClient bypasses RLS for writes; createClient server-side reads are trusted)
