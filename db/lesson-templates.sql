-- Lesson templates: teachers save common lesson content (vocabulary, grammar,
-- etc.) as a template and pre-fill the lesson form on subsequent classes.
-- Per-center scope so any teacher in the center can use any template.
-- Run after schema.sql.

create table if not exists public.lesson_templates (
  id uuid primary key default uuid_generate_v4(),
  center_id uuid not null references public.centers(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  name text not null,
  vocabulary text,
  grammar_point text,
  speaking_activity text,
  homework text,
  general_note text,
  created_at timestamptz not null default now()
);

create index if not exists lesson_templates_center_idx
  on public.lesson_templates(center_id);

alter table public.lesson_templates enable row level security;

drop policy if exists "templates_select" on public.lesson_templates;
create policy "templates_select"
  on public.lesson_templates for select
  using (center_id = public.current_user_center_id());

drop policy if exists "templates_write" on public.lesson_templates;
create policy "templates_write"
  on public.lesson_templates for all
  using (
    center_id = public.current_user_center_id()
    and public.current_user_role() in ('admin', 'teacher')
  )
  with check (
    center_id = public.current_user_center_id()
    and public.current_user_role() in ('admin', 'teacher')
  );
