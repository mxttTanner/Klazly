-- ==========================================================================
-- 2026-07-02 security & correctness audit fixes
-- Apply in the Supabase SQL editor AFTER all prior migrations.
-- Idempotent: safe to run more than once.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- C1 (CRITICAL) — restore center scoping on lessons / student_lesson_updates.
--
-- fix-rls-recursion.sql reduced the ADMIN branch of these four policies to a
-- bare role check with no center scoping (and, unlike classes/students, there
-- is no outer center_id wrapper). Because the anon key + Supabase URL ship in
-- the client bundle, any authenticated admin could read/write EVERY center's
-- lessons and per-student notes via direct PostgREST calls; any teacher could
-- INSERT lessons into any center's class (WITH CHECK only verified teacher_id).
--
-- lessons / student_lesson_updates have no center_id column — they reach it
-- through class_id -> classes. We add a SECURITY DEFINER helper that resolves
-- a class's center_id (bypassing RLS, no recursion) and re-scope the admin
-- branch to it. The teacher branch uses is_teacher_of_class (already tied to
-- classes.teacher_id = auth.uid(), so implicitly single-center) and the parent
-- branch is unchanged.
-- --------------------------------------------------------------------------

create or replace function public.class_center_id(p_class_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select center_id from public.classes where id = p_class_id
$$;

drop policy if exists "lessons_select" on public.lessons;
create policy "lessons_select"
  on public.lessons for select
  using (
    (
      public.current_user_role() = 'admin'
      and public.class_center_id(class_id) = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and public.is_teacher_of_class(class_id)
    )
    or (
      public.current_user_role() = 'parent'
      and public.is_parent_of_student_in_class(class_id)
    )
  );

drop policy if exists "lessons_teacher_write" on public.lessons;
create policy "lessons_teacher_write"
  on public.lessons for all
  using (
    (
      public.current_user_role() = 'admin'
      and public.class_center_id(class_id) = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and public.is_teacher_of_class(class_id)
    )
  )
  with check (
    (
      public.current_user_role() = 'admin'
      and public.class_center_id(class_id) = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and public.is_teacher_of_class(class_id)
    )
  );

drop policy if exists "slu_select" on public.student_lesson_updates;
create policy "slu_select"
  on public.student_lesson_updates for select
  using (
    (
      public.current_user_role() = 'admin'
      and public.class_center_id(public.lesson_class_id(lesson_id))
            = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and public.is_teacher_of_class(public.lesson_class_id(lesson_id))
    )
    or (
      public.current_user_role() = 'parent'
      and public.is_parent_of_student(student_id)
    )
  );

drop policy if exists "slu_teacher_write" on public.student_lesson_updates;
create policy "slu_teacher_write"
  on public.student_lesson_updates for all
  using (
    (
      public.current_user_role() = 'admin'
      and public.class_center_id(public.lesson_class_id(lesson_id))
            = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and public.is_teacher_of_class(public.lesson_class_id(lesson_id))
    )
  )
  with check (
    (
      public.current_user_role() = 'admin'
      and public.class_center_id(public.lesson_class_id(lesson_id))
            = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and public.is_teacher_of_class(public.lesson_class_id(lesson_id))
    )
  );

-- --------------------------------------------------------------------------
-- H5 (HIGH) — parent/teacher could rewrite ANY message body via the broad
-- ptm_update_read UPDATE policy (no WITH CHECK, no column restriction).
--
-- Postgres RLS can't restrict which columns an UPDATE touches, so we drop the
-- broad policy and move "mark as read" to a SECURITY DEFINER function that
-- only ever writes read_at, and only for messages the caller may see and did
-- not send. The admin FOR ALL policy (ptm_admin_all, center-scoped) is kept —
-- center operators manage their own center's data.
-- --------------------------------------------------------------------------

drop policy if exists "ptm_update_read" on public.parent_teacher_messages;

create or replace function public.mark_messages_read(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.parent_teacher_messages m
  set read_at = now()
  where m.student_id = p_student_id
    and m.read_at is null
    and m.sender_user_id <> auth.uid()   -- only mark messages you RECEIVED
    and (
      (
        public.current_user_role() = 'parent'
        and exists (
          select 1 from public.students s
          where s.id = m.student_id and s.parent_user_id = auth.uid()
        )
      )
      or (
        public.current_user_role() = 'teacher'
        and exists (
          select 1 from public.students s
          join public.classes c on c.id = s.class_id
          where s.id = m.student_id and c.teacher_id = auth.uid()
        )
      )
      or (
        public.current_user_role() = 'admin'
        and m.center_id = public.current_user_center_id()
      )
    );
end;
$$;

revoke all on function public.mark_messages_read(uuid) from public;
grant execute on function public.mark_messages_read(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- L3 (LOW) — worksheets_write was FOR ALL to any admin/teacher in the center,
-- so the app-layer "teachers can only delete their own uploads" check was
-- bypassable via direct PostgREST. Split into granular policies that enforce
-- upload-ownership for teachers at the RLS layer.
-- --------------------------------------------------------------------------

drop policy if exists "worksheets_write" on public.worksheets;

create policy "worksheets_insert"
  on public.worksheets for insert
  with check (
    center_id = public.current_user_center_id()
    and public.current_user_role() in ('admin', 'teacher')
  );

create policy "worksheets_update"
  on public.worksheets for update
  using (
    center_id = public.current_user_center_id()
    and (
      public.current_user_role() = 'admin'
      or (public.current_user_role() = 'teacher' and uploaded_by = auth.uid())
    )
  )
  with check (center_id = public.current_user_center_id());

create policy "worksheets_delete"
  on public.worksheets for delete
  using (
    center_id = public.current_user_center_id()
    and (
      public.current_user_role() = 'admin'
      or (public.current_user_role() = 'teacher' and uploaded_by = auth.uid())
    )
  );

-- --------------------------------------------------------------------------
-- M8 (MEDIUM) — no idempotency on lesson creation. A network retry / double
-- submit / two tabs creates duplicate lessons that double-count homework and
-- attendance on the parent report. Enforce one lesson per class per date.
--
-- If real historical data already violates this (two legit lessons same day),
-- this index creation will fail — in that case switch the model to an
-- app-generated idempotency key instead. Dedupe defensively first.
-- --------------------------------------------------------------------------

with ranked as (
  select id,
         row_number() over (
           partition by class_id, lesson_date
           order by created_at asc
         ) as rn
  from public.lessons
)
delete from public.student_lesson_updates
where lesson_id in (select id from ranked where rn > 1);

with ranked as (
  select id,
         row_number() over (
           partition by class_id, lesson_date
           order by created_at asc
         ) as rn
  from public.lessons
)
delete from public.lessons
where id in (select id from ranked where rn > 1);

create unique index if not exists lessons_class_date_uniq
  on public.lessons (class_id, lesson_date);

-- --------------------------------------------------------------------------
-- M2 (MEDIUM) — CSV-imported accounts get an auto-generated temp password
-- that was never force-rotated, leaving a permanent standing credential
-- (often relayed over Zalo/paper). Add a flag so the app can require a
-- password change on first login. Set true only for generated passwords;
-- cleared when the user sets their own password on /reset-password.
-- --------------------------------------------------------------------------

alter table public.users
  add column if not exists must_change_password boolean not null default false;

