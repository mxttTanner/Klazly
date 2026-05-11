-- Private parent ↔ teacher message thread, per student. Replaces the
-- shared-Zalo-group dynamic where one upset parent can spread mood to the
-- whole class. Each thread is scoped to one student: the parent(s) linked
-- to that student and the teacher who owns the student's class can
-- exchange messages; nobody else sees them.

create table if not exists public.parent_teacher_messages (
  id uuid primary key default uuid_generate_v4(),
  center_id uuid not null references public.centers(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  sender_user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint ptm_body_len check (
    char_length(body) > 0 and char_length(body) <= 2000
  )
);

create index if not exists ptm_student_id_idx
  on public.parent_teacher_messages(student_id, created_at desc);
create index if not exists ptm_center_id_idx
  on public.parent_teacher_messages(center_id);
create index if not exists ptm_sender_idx
  on public.parent_teacher_messages(sender_user_id);

alter table public.parent_teacher_messages enable row level security;

-- Parents: can read messages about their own children.
drop policy if exists "ptm_parent_read" on public.parent_teacher_messages;
create policy "ptm_parent_read"
  on public.parent_teacher_messages for select
  using (
    public.current_user_role() = 'parent'
    and exists (
      select 1 from public.students s
      where s.id = parent_teacher_messages.student_id
        and s.parent_user_id = auth.uid()
    )
  );

-- Parents: can send a message about their own child. The sender_user_id
-- must be themselves.
drop policy if exists "ptm_parent_write" on public.parent_teacher_messages;
create policy "ptm_parent_write"
  on public.parent_teacher_messages for insert
  with check (
    public.current_user_role() = 'parent'
    and sender_user_id = auth.uid()
    and exists (
      select 1 from public.students s
      where s.id = parent_teacher_messages.student_id
        and s.parent_user_id = auth.uid()
    )
  );

-- Teachers: can read messages about students in classes they teach.
drop policy if exists "ptm_teacher_read" on public.parent_teacher_messages;
create policy "ptm_teacher_read"
  on public.parent_teacher_messages for select
  using (
    public.current_user_role() = 'teacher'
    and exists (
      select 1 from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = parent_teacher_messages.student_id
        and c.teacher_id = auth.uid()
    )
  );

-- Teachers: can send a message about a student in a class they teach.
drop policy if exists "ptm_teacher_write" on public.parent_teacher_messages;
create policy "ptm_teacher_write"
  on public.parent_teacher_messages for insert
  with check (
    public.current_user_role() = 'teacher'
    and sender_user_id = auth.uid()
    and exists (
      select 1 from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = parent_teacher_messages.student_id
        and c.teacher_id = auth.uid()
    )
  );

-- Admin: full read/write within their center.
drop policy if exists "ptm_admin_all" on public.parent_teacher_messages;
create policy "ptm_admin_all"
  on public.parent_teacher_messages for all
  using (
    public.current_user_role() = 'admin'
    and center_id = public.current_user_center_id()
  )
  with check (
    public.current_user_role() = 'admin'
    and center_id = public.current_user_center_id()
  );

-- Allow either party to mark messages they can see as read (sets read_at).
drop policy if exists "ptm_update_read" on public.parent_teacher_messages;
create policy "ptm_update_read"
  on public.parent_teacher_messages for update
  using (
    (
      public.current_user_role() = 'parent'
      and exists (
        select 1 from public.students s
        where s.id = parent_teacher_messages.student_id
          and s.parent_user_id = auth.uid()
      )
    )
    or (
      public.current_user_role() = 'teacher'
      and exists (
        select 1 from public.students s
        join public.classes c on c.id = s.class_id
        where s.id = parent_teacher_messages.student_id
          and c.teacher_id = auth.uid()
      )
    )
    or (
      public.current_user_role() = 'admin'
      and center_id = public.current_user_center_id()
    )
  );
