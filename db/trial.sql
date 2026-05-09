-- Trial expiry tracking. Run once after schema.sql.

alter table public.centers
  add column if not exists trial_ends_at timestamptz;

-- Backfill: if a center has subscription_status = 'trial' and no trial_ends_at,
-- set it to 14 days from creation (so existing demo data isn't already expired).
update public.centers
   set trial_ends_at = created_at + interval '14 days'
 where subscription_status = 'trial'
   and trial_ends_at is null;
