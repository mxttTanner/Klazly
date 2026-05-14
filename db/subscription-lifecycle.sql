-- Subscription lifecycle tracking columns.
--
-- The earlier migration (subscription-plan.sql + trial.sql) added
--   subscription_status subscription_status  -- enum: trial|active|past_due|canceled
--   subscription_plan text                   -- 'monthly' | 'six_months' | 'annual'
--   trial_ends_at timestamptz
--
-- This migration completes the picture:
--   • 'expired' added to the subscription_status enum (different from
--     'canceled': canceled = user opted out; expired = trial/sub
--     period ran out)
--   • subscription_started_at / subscription_ends_at — paid window
--   • last_payment_at / next_billing_at — billing trail
--   • Index to make the lazy-expire query (find trials past their end
--     date) cheap on a list of all centers
--
-- Idempotent.

-- Add 'expired' to the existing subscription_status enum. ALTER TYPE
-- ... ADD VALUE IF NOT EXISTS is itself idempotent and ignored when
-- the value already exists. Must run as a standalone statement (not
-- inside a DO block) because ADD VALUE can't run inside a
-- transaction in older Postgres versions.
alter type subscription_status add value if not exists 'expired';

alter table public.centers
  add column if not exists subscription_started_at timestamptz,
  add column if not exists subscription_ends_at timestamptz,
  add column if not exists last_payment_at timestamptz,
  add column if not exists next_billing_at timestamptz;

-- Lazy-expire index: the super-admin page does
--   select id, trial_ends_at from centers
--    where subscription_status = 'trial' and trial_ends_at < now()
-- on every render, then issues an UPDATE for any rows it finds. This
-- partial index keeps that lookup constant-time as the centers table
-- grows.
create index if not exists centers_trial_expiry_idx
  on public.centers (trial_ends_at)
  where subscription_status = 'trial';

-- NOTE: A previous version of this file added a CHECK constraint on
-- subscription_status. That constraint was redundant with the enum
-- and is removed here so DBs that already have it don't carry dead
-- code. Safe to no-op if it was never created.
alter table public.centers
  drop constraint if exists centers_subscription_status_check;
