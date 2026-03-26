-- FHFA ZIP3 HPI reference table.
-- Stores the most recent 1-year house price appreciation % per 3-digit ZIP prefix.
-- Seeded once via scripts/seed-fhfa-data.ts and re-seeded annually.
-- Queried by src/lib/neighborhood/fhfa.ts via service-role key.

CREATE TABLE IF NOT EXISTS public.fhfa_zip3_hpi (
  zip3       char(3)        PRIMARY KEY,
  hpi_1yr_pct_chg numeric(6,3) NOT NULL,
  period     text           NOT NULL,   -- e.g. "2025Q4"
  seeded_at  timestamptz    NOT NULL DEFAULT now()
);

-- RLS enabled: no user-facing SELECT policy.
-- Service role bypasses RLS; anon/authenticated keys cannot read this table.
ALTER TABLE public.fhfa_zip3_hpi ENABLE ROW LEVEL SECURITY;
