-- Internal notes per center. Visible only to the super-admin; used to
-- capture sales/support context ("paid via BIDV 2026-04", "wants Excel
-- export", "referred by ...").
--
-- Idempotent: safe to re-run.

alter table public.centers
  add column if not exists notes text;
