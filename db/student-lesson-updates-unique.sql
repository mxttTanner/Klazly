-- Race fix: two concurrent updateLesson calls would each do a delete +
-- insert. The second caller's delete blew away rows the first had just
-- inserted, and either both succeeded with duplicates or one failed.
--
-- Fix has two parts:
--   1. Dedupe any existing duplicates, keeping the newest row by
--      created_at per (lesson_id, student_id). Older row loses.
--   2. Add a UNIQUE constraint so future inserts can use upsert with
--      onConflict, which the app code now does. Concurrent updates
--      serialise on the constraint instead of clobbering each other.
--
-- Idempotent: safe to re-run.

-- 1) Dedupe
delete from public.student_lesson_updates a
using public.student_lesson_updates b
where a.id <> b.id
  and a.lesson_id = b.lesson_id
  and a.student_id = b.student_id
  and a.created_at < b.created_at;

-- 2) Unique constraint
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_lesson_updates_lesson_student_unique'
  ) then
    alter table public.student_lesson_updates
      add constraint student_lesson_updates_lesson_student_unique
      unique (lesson_id, student_id);
  end if;
end $$;
