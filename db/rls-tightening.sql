-- ==========================================================================
-- RLS tightening — 2026-07-12 audit follow-ups F1 + F2.
-- Run in the Supabase SQL editor AFTER db/2026-07-02-audit-fixes.sql and
-- db/student-photos.sql (uses their helper functions).
-- Idempotent: safe to run more than once.
--
-- F1 — student_lesson_updates never validated student_id:
--   The WITH CHECK verified the LESSON belongs to the teacher's class /
--   admin's center, but nothing checked the STUDENT. Via direct PostgREST a
--   teacher could attach behavior notes to any student in the center (or,
--   with a leaked UUID, any student anywhere), and because the parent
--   branch of slu_select had no center check, the victim's parent could
--   read the forged row. Both branches now require the student to live in
--   the same center as the lesson's class.
--
-- F2 — parent/teacher message INSERTs took center_id verbatim from the
--   client row. A crafted insert could file a message about one's own
--   student under ANOTHER center's id, making it readable/manageable by
--   that center's admin (cross-tenant content injection) while hiding it
--   from the sender's own admin. WITH CHECK now pins center_id.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- F1a: slu_teacher_write — add student-center = lesson-class-center check.
-- --------------------------------------------------------------------------

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
    public.student_center_id(student_id)
      = public.class_center_id(public.lesson_class_id(lesson_id))
    and (
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
  );

-- --------------------------------------------------------------------------
-- F1b: slu_select — parent branch also requires the lesson to be in the
-- parent's own center, so a forged cross-center row (or one created before
-- this fix) is not readable through the parent API.
-- --------------------------------------------------------------------------

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
      and public.class_center_id(public.lesson_class_id(lesson_id))
            = public.current_user_center_id()
    )
  );

-- --------------------------------------------------------------------------
-- F2: pin center_id on message INSERTs.
-- --------------------------------------------------------------------------

drop policy if exists "ptm_parent_write" on public.parent_teacher_messages;
create policy "ptm_parent_write"
  on public.parent_teacher_messages for insert
  with check (
    public.current_user_role() = 'parent'
    and sender_user_id = auth.uid()
    and center_id = public.current_user_center_id()
    and exists (
      select 1 from public.students s
      where s.id = parent_teacher_messages.student_id
        and s.parent_user_id = auth.uid()
    )
  );

drop policy if exists "ptm_teacher_write" on public.parent_teacher_messages;
create policy "ptm_teacher_write"
  on public.parent_teacher_messages for insert
  with check (
    public.current_user_role() = 'teacher'
    and sender_user_id = auth.uid()
    and center_id = public.current_user_center_id()
    and exists (
      select 1 from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = parent_teacher_messages.student_id
        and c.teacher_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------------
-- Verification — both rows must be true.
-- --------------------------------------------------------------------------

select 'slu_teacher_write WITH CHECK validates student center' as check, exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'student_lesson_updates'
    and policyname = 'slu_teacher_write'
    and with_check like '%student_center_id%'
) as ok
union all
select 'ptm write policies pin center_id', (
  select count(*) = 2 from pg_policies
  where schemaname = 'public' and tablename = 'parent_teacher_messages'
    and policyname in ('ptm_parent_write', 'ptm_teacher_write')
    and with_check like '%current_user_center_id%'
);
