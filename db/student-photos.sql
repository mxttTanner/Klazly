-- Student photos — teachers photograph class moments and tag the students
-- in the shot; parents see (only) their own child's photos in the child's
-- timeline. One photo can be tagged to multiple students.
--
-- STORAGE STANCE (mirrors db/2026-07-02-worksheets-private.sql): the
-- `student-photos` bucket is born PRIVATE and gets NO storage.objects
-- policies at all — clients never talk to Storage directly. Uploads go
-- through the server action (service role, after requireRole + roster
-- validation) and reads happen via short-lived signed URLs minted by the
-- server ONLY for rows the caller could already read through table RLS
-- (src/lib/photo-url.ts). Guessing a storage path yields nothing without
-- a valid signature. Bucket-level file_size_limit / allowed_mime_types are
-- a hard backstop enforced by Supabase Storage itself, independent of app
-- code.

-- ==========================================================================
-- Bucket (private; 5MB cap; images only)
-- ==========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-photos',
  'student-photos',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ==========================================================================
-- Tables
-- ==========================================================================

create table if not exists public.student_photos (
  id uuid primary key default uuid_generate_v4(),
  center_id uuid not null references public.centers(id) on delete cascade,
  -- SET NULL like worksheets.uploaded_by: removing a teacher keeps the
  -- photos (parents keep the record); admins still manage them.
  uploaded_by uuid references public.users(id) on delete set null,
  -- Path convention: {center_id}/{photo_id}.{ext}. The CHECK pins every
  -- row's object path inside its own center's storage prefix — without it,
  -- a teacher hitting PostgREST directly could insert/update a row whose
  -- storage_path points into ANOTHER center's prefix and have the server
  -- sign it for them. A table constraint (not just a policy) so it also
  -- binds service-role writes.
  storage_path text not null
    check (storage_path like center_id::text || '/%'),
  caption text check (caption is null or char_length(caption) <= 200),
  -- Date the photo belongs to in the timeline (VN-local; set by the app).
  taken_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists student_photos_center_idx
  on public.student_photos (center_id);
create index if not exists student_photos_uploaded_by_idx
  on public.student_photos (uploaded_by);

-- One photo ↔ many students (group shots). Deleting a photo cascades its
-- tags; the storage object is removed by the delete server action.
create table if not exists public.student_photo_tags (
  photo_id uuid not null references public.student_photos(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, student_id)
);
create index if not exists student_photo_tags_student_idx
  on public.student_photo_tags (student_id);

-- ==========================================================================
-- RLS helper functions (SECURITY DEFINER to break policy recursion, same
-- rationale as db/fix-rls-recursion.sql)
-- ==========================================================================

create or replace function public.photo_center_id(p_photo_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select center_id from public.student_photos where id = p_photo_id
$$;

create or replace function public.photo_uploaded_by(p_photo_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select uploaded_by from public.student_photos where id = p_photo_id
$$;

-- Is the current user the parent of at least one student tagged on this
-- photo? THE rule that scopes parents to their own child's photos.
create or replace function public.is_parent_of_tagged_student(p_photo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.student_photo_tags t
    join public.students s on s.id = t.student_id
    where t.photo_id = p_photo_id
      and s.parent_user_id = auth.uid()
  )
$$;

-- Does the current user teach the class this student is in? (Same
-- teacher→class→student chain as students_select.)
create or replace function public.is_teacher_of_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    join public.classes c on c.id = s.class_id
    where s.id = p_student_id
      and c.teacher_id = auth.uid()
  )
$$;

create or replace function public.student_center_id(p_student_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select center_id from public.students where id = p_student_id
$$;

-- ==========================================================================
-- RLS: student_photos
--   admin   → all photos in their center
--   teacher → photos they uploaded, in their center
--   parent  → READ ONLY, and only photos tagged to their own child(ren)
-- (super-admin/platform ops use the service role, which bypasses RLS.)
-- ==========================================================================

alter table public.student_photos enable row level security;

drop policy if exists "student_photos_select" on public.student_photos;
create policy "student_photos_select"
  on public.student_photos for select
  using (
    (
      public.current_user_role() = 'admin'
      and center_id = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and uploaded_by = auth.uid()
      and center_id = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'parent'
      and center_id = public.current_user_center_id()
      and public.is_parent_of_tagged_student(id)
    )
  );

drop policy if exists "student_photos_insert" on public.student_photos;
create policy "student_photos_insert"
  on public.student_photos for insert
  with check (
    center_id = public.current_user_center_id()
    and uploaded_by = auth.uid()
    and public.current_user_role() in ('teacher', 'admin')
  );

drop policy if exists "student_photos_update" on public.student_photos;
create policy "student_photos_update"
  on public.student_photos for update
  using (
    (
      public.current_user_role() = 'admin'
      and center_id = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and uploaded_by = auth.uid()
      and center_id = public.current_user_center_id()
    )
  )
  -- WITH CHECK mirrors USING so the NEW row must still satisfy the same
  -- ownership rule — otherwise a teacher could reassign uploaded_by (handing
  -- delete rights to someone else / orphaning the photo to admin-only).
  with check (
    (
      public.current_user_role() = 'admin'
      and center_id = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and uploaded_by = auth.uid()
      and center_id = public.current_user_center_id()
    )
  );

drop policy if exists "student_photos_delete" on public.student_photos;
create policy "student_photos_delete"
  on public.student_photos for delete
  using (
    (
      public.current_user_role() = 'admin'
      and center_id = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and uploaded_by = auth.uid()
      and center_id = public.current_user_center_id()
    )
  );

-- No parent write policies exist → parents cannot insert/update/delete.

-- ==========================================================================
-- RLS: student_photo_tags
--   admin   → tags on photos in their center
--   teacher → tags on their own photos; may only tag students of classes
--             they teach (existing teacher→class→student scoping)
--   parent  → READ ONLY, only tag rows pointing at their own child
-- ==========================================================================

alter table public.student_photo_tags enable row level security;

drop policy if exists "student_photo_tags_select" on public.student_photo_tags;
create policy "student_photo_tags_select"
  on public.student_photo_tags for select
  using (
    (
      public.current_user_role() = 'admin'
      and public.photo_center_id(photo_id) = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and public.photo_uploaded_by(photo_id) = auth.uid()
      -- Center check too: a teacher moved to another center must not keep
      -- reading tag rows from photos they uploaded at the old center.
      and public.photo_center_id(photo_id) = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'parent'
      and public.is_parent_of_student(student_id)
    )
  );

drop policy if exists "student_photo_tags_insert" on public.student_photo_tags;
create policy "student_photo_tags_insert"
  on public.student_photo_tags for insert
  with check (
    -- The tagged student must live in the same center as the photo, and
    -- that center must be the caller's own.
    public.photo_center_id(photo_id) = public.current_user_center_id()
    and public.student_center_id(student_id) = public.current_user_center_id()
    and (
      public.current_user_role() = 'admin'
      or (
        public.current_user_role() = 'teacher'
        and public.photo_uploaded_by(photo_id) = auth.uid()
        and public.is_teacher_of_student(student_id)
      )
    )
  );

drop policy if exists "student_photo_tags_delete" on public.student_photo_tags;
create policy "student_photo_tags_delete"
  on public.student_photo_tags for delete
  using (
    public.photo_center_id(photo_id) = public.current_user_center_id()
    and (
      public.current_user_role() = 'admin'
      or (
        public.current_user_role() = 'teacher'
        and public.photo_uploaded_by(photo_id) = auth.uid()
      )
    )
  );
