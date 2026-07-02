-- Fix infinite-recursion in RLS for students / classes / lessons /
-- student_lesson_updates. Original policies cross-referenced each other
-- through `exists (select 1 from <other_table> ...)` which retriggered the
-- other table's RLS, causing recursion. Solution: wrap the cross-table
-- checks in SECURITY DEFINER helper functions that bypass RLS.

-- ==========================================================================
-- Helper functions
-- ==========================================================================

create or replace function public.is_teacher_of_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.classes
    where id = p_class_id and teacher_id = auth.uid()
  )
$$;

create or replace function public.is_parent_of_student_in_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.students
    where class_id = p_class_id and parent_user_id = auth.uid()
  )
$$;

create or replace function public.is_parent_of_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.students
    where id = p_student_id and parent_user_id = auth.uid()
  )
$$;

create or replace function public.lesson_class_id(p_lesson_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select class_id from public.lessons where id = p_lesson_id
$$;

-- The center a class belongs to. Used to keep the ADMIN branch of the
-- lessons / student_lesson_updates policies scoped to the admin's own
-- center. lessons and student_lesson_updates have no center_id column of
-- their own (they inherit it through the class), so without this an
-- "admin" check alone is GLOBAL — every admin would see/modify every
-- center's lessons and per-student notes. security definer so evaluating
-- it inside a policy doesn't retrigger classes' RLS (the recursion this
-- file exists to avoid).
create or replace function public.class_center_id(p_class_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select center_id from public.classes where id = p_class_id
$$;

-- ==========================================================================
-- Replace circular policies
-- ==========================================================================

drop policy if exists "classes_select" on public.classes;
create policy "classes_select"
  on public.classes for select
  using (
    center_id = public.current_user_center_id()
    and (
      public.current_user_role() = 'admin'
      or (public.current_user_role() = 'teacher' and teacher_id = auth.uid())
      or (
        public.current_user_role() = 'parent'
        and public.is_parent_of_student_in_class(id)
      )
    )
  );

drop policy if exists "students_select" on public.students;
create policy "students_select"
  on public.students for select
  using (
    center_id = public.current_user_center_id()
    and (
      public.current_user_role() = 'admin'
      or (
        public.current_user_role() = 'teacher'
        and public.is_teacher_of_class(class_id)
      )
      or (
        public.current_user_role() = 'parent'
        and parent_user_id = auth.uid()
      )
    )
  );

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
    or teacher_id = auth.uid()
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
