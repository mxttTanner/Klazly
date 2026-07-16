-- Remove the Founding Center program from the database layer.
--
-- The Founding Center program (a hand-picked pilot cohort at a locked
-- discounted lifetime rate, tracked with a per-center slot number and a
-- "N of 5 spots filled" cap) has been retired. This migration removes the
-- founding-exclusive schema: the founding_center_number and
-- founding_locked_price_vnd columns, the founding-slot unique index, and
-- the founding_center_cap app_settings row.
--
-- What is intentionally KEPT (still in use elsewhere):
--   * plan_tier column + enum — 'design_partner' still uses it, and
--     'standard' is the default for everyone.
--   * signup_source / referral_note — generic center onboarding metadata.
--   * public.app_settings — generic super-admin key/value store.
--
-- Note on the enum: the plan_tier enum value 'founding' is intentionally
-- left DORMANT. Postgres can't easily drop an enum value in place, so the
-- value remains defined but unused — after this migration runs, the
-- backfill below converts every founding center to 'standard', so no rows
-- reference 'founding' anymore.
--
-- Idempotent and safe to run on a live prod DB.

-- ---------------------------------------------------------------------------
-- a0. Snapshot each Founding center's discounted locked price + slot into
--     audit_log BEFORE we drop the columns. Retiring the program ends the
--     discounted rate, so this preserves a permanent record of what each
--     center was promised (the app bills manually over Zalo, so there is no
--     automatic overcharge, but the operator keeps the history).
-- ---------------------------------------------------------------------------
do $$ begin
  insert into public.audit_log
    (user_id, center_id, action, entity_type, entity_id, metadata)
  select
    null, id, 'founding_program_retired', 'center', id,
    jsonb_build_object(
      'prior_plan_tier', 'founding',
      'prior_founding_center_number', founding_center_number,
      'prior_founding_locked_price_vnd', founding_locked_price_vnd,
      'migrated_to_plan', coalesce(subscription_plan, 'monthly')
    )
  from public.centers
  where plan_tier = 'founding';
exception
  when undefined_column then null;   -- founding columns / plan_tier not present
  when undefined_table then null;    -- audit_log not present
  when invalid_text_representation then null;  -- 'founding' not a valid enum value
end $$;

-- ---------------------------------------------------------------------------
-- a. Migrate any existing Founding centers off the founding tier so they keep
--    access after the program is retired. NOTE: the discounted founding rate
--    ENDS — these centers resolve to the standard monthly price. Their prior
--    locked price is recorded in audit_log (step a0) but no longer billed.
--    Guarded so it doesn't error if the plan_tier column or the 'founding'
--    enum value doesn't exist in this database.
-- ---------------------------------------------------------------------------
do $$ begin
  update public.centers
  set plan_tier = 'standard',
      subscription_plan = coalesce(subscription_plan, 'monthly')
  where plan_tier = 'founding';
exception
  when undefined_column then null;   -- plan_tier / subscription_plan not present
  when invalid_text_representation then null;  -- 'founding' not a valid enum value
end $$;

-- ---------------------------------------------------------------------------
-- b. Drop the founding-exclusive columns if present.
-- ---------------------------------------------------------------------------
alter table public.centers drop column if exists founding_center_number;
alter table public.centers drop column if exists founding_locked_price_vnd;

-- ---------------------------------------------------------------------------
-- c. Drop the founding slot unique index if present.
-- ---------------------------------------------------------------------------
drop index if exists centers_founding_slot_uniq;

-- ---------------------------------------------------------------------------
-- d. Remove the founding cap setting.
-- ---------------------------------------------------------------------------
delete from public.app_settings where key = 'founding_center_cap';
