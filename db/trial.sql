-- Trial expiry tracking. Run once after schema.sql.

alter table public.centers
  add column if not exists trial_ends_at timestamptz;

-- Backfill: if a center has subscription_status = 'trial' and no trial_ends_at,
-- set it to 180 days from creation (so existing demo data isn't already
-- expired). 180 days = the app's canonical 6-month trial length.
update public.centers
   set trial_ends_at = created_at + interval '180 days'
 where subscription_status = 'trial'
   and trial_ends_at is null;
