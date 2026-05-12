-- Add subscription_plan to centers so the super-admin can see (and set)
-- which paid tier each center is on. Values match the landing page's
-- three-tier pricing: "monthly" (1 month), "six_months", "annual" (12).
-- Optional: a center on trial usually has plan = null until they convert.
--
-- Idempotent: safe to re-run.

alter table public.centers
  add column if not exists subscription_plan text;

-- Optional sanity constraint. Drop+recreate to make it idempotent.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'centers_subscription_plan_check'
  ) then
    alter table public.centers
      add constraint centers_subscription_plan_check
      check (
        subscription_plan is null
        or subscription_plan in ('monthly', 'six_months', 'annual')
      );
  end if;
end $$;
