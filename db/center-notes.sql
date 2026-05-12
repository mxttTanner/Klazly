-- Internal notes per center. Visible only to the super-admin; used to
-- capture sales/support context ("paid via BIDV 2026-04", "wants Excel
-- export", "referred by ...").
--
-- Privacy: row-level security on `centers` lets a center admin SELECT
-- their own row, so a column-scoped revoke is needed to keep the notes
-- column private. Without this, an admin could fetch the super-admin's
-- private notes about them via the REST API.
--
-- Idempotent: safe to re-run.

alter table public.centers
  add column if not exists notes text;

-- Only the service-role client (used by the super-admin server actions)
-- may read the notes column. anon/authenticated lose access. RLS still
-- applies, but a SELECT that asks for `notes` from a normal client will
-- now fail with "permission denied for column notes" — which is what we
-- want.
revoke select (notes) on public.centers from anon, authenticated;
grant select (notes) on public.centers to service_role;
grant update (notes) on public.centers to service_role;
