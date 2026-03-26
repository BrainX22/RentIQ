-- watchlist_criteria table required by /api/watchlist-criteria and /api/daily-digest
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.watchlist_criteria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  city text,
  max_price numeric(12,2),
  min_target_return numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watchlist_city_len check (city is null or char_length(city) <= 120),
  constraint watchlist_max_price_non_negative check (max_price is null or max_price >= 0),
  constraint watchlist_min_target_return_non_negative check (
    min_target_return is null or min_target_return >= 0
  )
);

-- Each user has exactly one set of watchlist criteria (required by ON CONFLICT upsert)
alter table public.watchlist_criteria
  drop constraint if exists watchlist_criteria_user_id_key;
alter table public.watchlist_criteria
  add constraint watchlist_criteria_user_id_key unique (user_id);

create index if not exists watchlist_criteria_user_id_idx
  on public.watchlist_criteria(user_id);

drop trigger if exists trg_watchlist_criteria_updated_at on public.watchlist_criteria;
create trigger trg_watchlist_criteria_updated_at
before update on public.watchlist_criteria
for each row execute function public.set_updated_at();

alter table public.watchlist_criteria enable row level security;

drop policy if exists "watchlist_select_own" on public.watchlist_criteria;
create policy "watchlist_select_own" on public.watchlist_criteria
for select using (auth.uid() = user_id);

drop policy if exists "watchlist_insert_own" on public.watchlist_criteria;
create policy "watchlist_insert_own" on public.watchlist_criteria
for insert with check (auth.uid() = user_id);

drop policy if exists "watchlist_update_own" on public.watchlist_criteria;
create policy "watchlist_update_own" on public.watchlist_criteria
for update using (auth.uid() = user_id);

drop policy if exists "watchlist_delete_own" on public.watchlist_criteria;
create policy "watchlist_delete_own" on public.watchlist_criteria
for delete using (auth.uid() = user_id);
