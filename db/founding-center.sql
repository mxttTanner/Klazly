-- Founding Center program: internal-only tier tracking for hand-picked
-- pilot customers (locked discounted rate, deeper feedback expected)
-- and the rare "Design Partner" relationship (free-forever in exchange
-- for ongoing product input).
--
-- The plan_tier column lives alongside subscription_status and
-- subscription_plan:
--   subscription_status  → 'trial' | 'active' | 'expired' | …
--   subscription_plan    → 'monthly' | 'six_months' | 'annual'  (paying tier)
--   plan_tier            → 'standard' | 'founding' | 'design_partner'  (this file)
--
-- The composite that the super-admin form actually picks decomposes
-- to (status, plan, plan_tier, trial_ends_at) — see createCenter for
-- the mapping.
--
-- Idempotent.

do $$ begin
  create type plan_tier as enum ('standard', 'founding', 'design_partner');
exception when duplicate_object then null; end $$;

alter table public.centers
  add column if not exists plan_tier plan_tier not null default 'standard';

-- Onboarding source — internal funnel attribution. Optional. Free
-- text rather than enum so a one-off ad campaign can be tracked
-- without a schema change.
alter table public.centers
  add column if not exists signup_source text;
alter table public.centers
  add column if not exists referral_note text;

create index if not exists centers_plan_tier_idx on public.centers (plan_tier)
  where plan_tier != 'standard';

-- Tiny key/value store for app-wide settings the super-admin needs
-- to tweak without a migration. First user: founding_center_cap
-- (the "5 of N spots filled" target on the overview widget).
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
-- No public select / write policies — service role only. The super-
-- admin reads + writes through server actions in /super-admin.

insert into public.app_settings (key, value)
values ('founding_center_cap', to_jsonb(5))
on conflict (key) do nothing;
