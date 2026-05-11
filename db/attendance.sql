-- Per-student attendance per lesson (present / absent / late). Added to
-- student_lesson_updates so it lives alongside behavior + homework. Optional;
-- null = teacher didn't mark it (older lessons / forgot). Run after
-- schema.sql.

alter table public.student_lesson_updates
  add column if not exists attendance text;

do $$
begin
  alter table public.student_lesson_updates
    add constraint student_lesson_updates_attendance_check
    check (
      attendance in ('present', 'absent', 'late')
      or attendance is null
    );
exception when duplicate_object then null;
end $$;
