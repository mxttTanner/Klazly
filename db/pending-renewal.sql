-- subscription_status='pending_renewal' for the super-admin renewal
-- flow. Triggered automatically when a paid center's
-- subscription_ends_at passes — the lazy-expire pass on /super-admin
-- flips them from 'active' to 'pending_renewal' so the operator gets
-- a visible nudge to renew (manual ZaloPay / bank transfer collection
-- after a Zalo conversation — never auto-charged).
--
-- Distinct from:
--   'expired'  — trial ran out, lock screen shown to users
--   'past_due' — implies payment failure (we don't auto-charge, so
--                we don't write this status from the auto pass)
--   'canceled' — operator-initiated permanent archive
--
-- Idempotent.
alter type subscription_status add value if not exists 'pending_renewal';

notify pgrst, 'reload schema';
