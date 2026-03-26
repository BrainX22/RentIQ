ALTER TABLE public.watchlist_criteria
  ADD COLUMN IF NOT EXISTS email_digest boolean NOT NULL DEFAULT false;
