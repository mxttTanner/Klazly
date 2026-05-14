-- Subscription lifecycle tracking columns.
--
-- The earlier migration (subscription-plan.sql + trial.sql) added
--   subscription_status text  -- 'trial' | 'active' | 'past_due' | 'canceled'
--   subscription_plan text    -- 'monthly' | 'six_months' | 'annual'
--   trial_ends_at timestamptz
--
-- This migration completes the picture:
--   • 'expired' added as a distinct status (different from 'canceled' —
--     canceled = user opted out; expired = trial/sub period ran out)
--   • subscription_started_at / subscription_ends_at — paid window
--   • last_payment_at / next_billing_at — billing trail
--   • CHECK constraint on subscription_status so a stray UPDATE can't
--     write a bogus value
--   • Index to make the lazy-expire query (find trials past their end
--     date) cheap on a list of all centers
--
-- Idempotent.

alter table public.centers
  add column if not exists subscription_started_at timestamptz,
  add column if not exists subscription_ends_at timestamptz,
  add column if not exists last_payment_at timestamptz,
  add column if not exists next_billing_at timestamptz;

-- Tighten the status column to a known set. Includes 'expired' for
-- trials that ran out and 'canceled' for opt-outs. We don't include
-- 'trial_ending_soon' here — that's a *derived* status computed in app
-- code from trial_ends_at, not persisted.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'centers_subscription_status_check'
  ) then
    alter table public.centers
      add constraint centers_subscription_status_check
      check (
        subscription_status in (
          'trial', 'active', 'past_due', 'canceled', 'expired'
        )
      );
  end if;
end $$;

-- Lazy-expire index: the super-admin page does
--   select id, trial_ends_at from centers
--    where subscription_status = 'trial' and trial_ends_at < now()
-- on every render, then issues an UPDATE for any rows it finds. This
-- partial index keeps that lookup constant-time as the centers table
-- grows.
create index if not exists centers_trial_expiry_idx
  on public.centers (trial_ends_at)
  where subscription_status = 'trial';
