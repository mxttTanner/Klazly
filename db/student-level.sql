-- Per-student "overall level" so teachers and admins can see at a
-- glance how each student is doing overall, without needing to
-- read every lesson note. Three values: good / okay / needs_attention.
-- Run after schema.sql.

alter table public.students
  add column if not exists overall_level text;

-- Constrain values (skip silently if already constrained).
do $$
begin
  alter table public.students
    add constraint students_overall_level_check
    check (
      overall_level in ('good', 'okay', 'needs_attention')
      or overall_level is null
    );
exception when duplicate_object then null;
end $$;
