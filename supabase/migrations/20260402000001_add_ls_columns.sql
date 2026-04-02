-- Add LemonSqueezy columns to subscriptions table.
-- Stripe columns are kept for safe rollback.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS ls_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS ls_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS ls_order_id TEXT;

-- Index for webhook fallback lookup (resolveUserId DB path).
CREATE INDEX IF NOT EXISTS idx_subscriptions_ls_subscription_id
  ON subscriptions(ls_subscription_id);
