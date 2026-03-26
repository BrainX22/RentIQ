-- Persist scheduled Stripe cancellations while keeping access active until period end.
-- Safe to run multiple times.

alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;

update public.subscriptions
set cancel_at_period_end = false
where cancel_at_period_end is null;
