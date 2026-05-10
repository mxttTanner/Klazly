-- Program / track per class (Cambridge KET, PET, FCE, IELTS, TOEIC,
-- English Communication, Young Learners). The admin dashboard groups
-- classes by this so the owner sees how big each program is at a glance.
-- Optional. Run after schema.sql.

alter table public.classes
  add column if not exists program text;

create index if not exists classes_program_idx on public.classes(program);
