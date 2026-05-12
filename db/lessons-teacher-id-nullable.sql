-- lessons.teacher_id was originally NOT NULL with ON DELETE RESTRICT.
-- That made it impossible to ever delete a teacher who'd logged a
-- lesson — the admin "remove teacher" action silently failed, and the
-- super-admin "delete center" action did even worse (it destroyed
-- auth.users while leaving the center, because the cascade hit RESTRICT
-- and the JS code didn't check the error).
--
-- The right pattern for audit data is SET NULL: when a teacher is
-- removed, their historical lessons stay (preserving the parent-facing
-- record) but the attribution becomes null. The UI shows "—" for
-- those rows.
--
-- This migration is idempotent.

-- 1. Drop NOT NULL so SET NULL can actually fire.
alter table public.lessons
  alter column teacher_id drop not null;

-- 2. Replace the FK with the SET NULL variant. Postgres lets you drop
--    and re-add inside the same transaction without losing data.
alter table public.lessons
  drop constraint if exists lessons_teacher_id_fkey;

alter table public.lessons
  add constraint lessons_teacher_id_fkey
  foreign key (teacher_id) references public.users(id)
  on delete set null;
