CREATE TABLE IF NOT EXISTS public.deal_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  property_name text NOT NULL,
  property_price numeric(12,2) NOT NULL,
  est_monthly_cash_flow numeric(10,2) NOT NULL,
  est_cash_on_cash_return numeric(5,2),
  deal_score_value smallint NOT NULL CHECK (deal_score_value BETWEEN 0 AND 100),
  deal_grade text NOT NULL CHECK (deal_grade IN ('A','B','C','D')),
  matched_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,
  UNIQUE(user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_matches_user_id ON public.deal_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_matches_matched_at ON public.deal_matches(matched_at DESC);

-- Note: No INSERT policy — all inserts are performed by the cron job via service-role key (bypasses RLS)
-- Note: No DELETE policy — soft-delete via dismissed_at column only

ALTER TABLE public.deal_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_matches_select_own"
  ON public.deal_matches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "deal_matches_update_own"
  ON public.deal_matches FOR UPDATE
  USING (auth.uid() = user_id);
