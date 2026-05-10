-- Per-center program / track catalog (KET, PET, IELTS, Communication, …).
-- Replaces the hardcoded list in src/lib/programs.ts so each center can
-- rename / add / delete their own program names. Run after schema.sql.
--
-- classes.program continues to be a free-form text column. It stores the
-- *label* of the program. When the admin renames a program we cascade-update
-- every class that uses the old label inside the same UPDATE transaction
-- (handled in the server action). When a program is deleted, classes that
-- referenced it have their `program` cleared.

create table if not exists public.center_programs (
  id uuid primary key default uuid_generate_v4(),
  center_id uuid not null references public.centers(id) on delete cascade,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (center_id, label)
);

create index if not exists center_programs_center_id_idx
  on public.center_programs(center_id);

alter table public.center_programs enable row level security;

-- Admin can manage their center's program catalog.
drop policy if exists "center_programs_admin_all" on public.center_programs;
create policy "center_programs_admin_all"
  on public.center_programs for all
  using (
    public.current_user_role() = 'admin'
    and center_id = public.current_user_center_id()
  )
  with check (
    public.current_user_role() = 'admin'
    and center_id = public.current_user_center_id()
  );

-- Teachers can read programs in their own center (used to render dropdowns
-- if/when teachers ever edit class-program inline).
drop policy if exists "center_programs_teacher_read" on public.center_programs;
create policy "center_programs_teacher_read"
  on public.center_programs for select
  using (
    public.current_user_role() in ('teacher', 'admin')
    and center_id = public.current_user_center_id()
  );
