-- Pause + Cancel for the super-admin operations bar.
--
--   subscription_status='paused'  : reversible — center loses access
--                                   until reactivated. Billing stops.
--   subscription_status='canceled': permanent archive. cancelled_at
--                                   timestamps when the cancel ran so
--                                   reporting + support can answer
--                                   "when did this center leave?".
--
-- 'canceled' (American spelling) already exists in the enum; we use it
-- as-is rather than introducing a 'cancelled' alias. cancelled_at is
-- the new column.
--
-- Idempotent — safe to re-run.

-- 'paused' enum value. Postgres requires this to run outside a
-- transaction in older versions; Supabase's SQL editor handles that
-- automatically.
alter type subscription_status add value if not exists 'paused';

-- Stamp the moment a center is permanently cancelled. Null for
-- everyone else; nullable to keep the column add safe.
alter table public.centers
  add column if not exists cancelled_at timestamptz;

-- Force PostgREST to reload its schema cache so the new column is
-- visible immediately. Without this, the server actions can take a
-- minute or two to notice cancelled_at exists and would fall through
-- their tolerant-strip retries unnecessarily.
notify pgrst, 'reload schema';
