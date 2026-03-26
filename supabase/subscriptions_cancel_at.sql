-- Persist the exact scheduled Stripe cancellation timestamp.
-- Safe to run multiple times.

alter table public.subscriptions
  add column if not exists cancel_at timestamptz;
