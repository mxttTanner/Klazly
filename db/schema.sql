-- Parent Portal — Postgres schema with Row Level Security.
-- Run once in Supabase SQL editor for a fresh project.

-- ==========================================================================
-- Extensions and enums
-- ==========================================================================

create extension if not exists "uuid-ossp";

do $$ begin
  create type user_role as enum ('admin', 'teacher', 'parent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type behavior_rating as enum ('great', 'good', 'okay', 'needs_attention');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('trial', 'active', 'past_due', 'canceled');
exception when duplicate_object then null; end $$;

-- ==========================================================================
-- Tables
-- ==========================================================================

create table if not exists public.centers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  contact_email text,
  contact_phone text,
  subscription_status subscription_status not null default 'trial',
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  -- email or phone (or both) — at least one required. Phone-only
  -- accounts exist so Vietnamese parents without email can still log
  -- in. See db/users-phone.sql for the synthetic-email workaround on
  -- the Supabase Auth side.
  email text,
  phone text,
  full_name text not null,
  role user_role not null,
  center_id uuid not null references public.centers(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint users_email_or_phone_required
    check (email is not null or phone is not null)
);
create index if not exists users_center_id_idx on public.users(center_id);
create index if not exists users_role_idx on public.users(role);
create unique index if not exists users_center_email_uniq
  on public.users (center_id, lower(email))
  where email is not null;
create unique index if not exists users_center_phone_uniq
  on public.users (center_id, phone)
  where phone is not null;
create index if not exists users_phone_idx
  on public.users (phone)
  where phone is not null;

create table if not exists public.classes (
  id uuid primary key default uuid_generate_v4(),
  center_id uuid not null references public.centers(id) on delete cascade,
  name text not null,
  teacher_id uuid references public.users(id) on delete set null,
  schedule_text text,
  created_at timestamptz not null default now()
);
create index if not exists classes_center_id_idx on public.classes(center_id);
create index if not exists classes_teacher_id_idx on public.classes(teacher_id);

create table if not exists public.students (
  id uuid primary key default uuid_generate_v4(),
  center_id uuid not null references public.centers(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  full_name text not null,
  age int check (age is null or (age >= 0 and age <= 30)),
  parent_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists students_center_id_idx on public.students(center_id);
create index if not exists students_class_id_idx on public.students(class_id);
create index if not exists students_parent_user_id_idx on public.students(parent_user_id);

create table if not exists public.lessons (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid not null references public.classes(id) on delete cascade,
  -- teacher_id is nullable + SET NULL so a teacher who logged lessons can
  -- still be removed; their historical lessons stay (parents need the
  -- record) and the attribution becomes "—". See lessons-teacher-id-nullable.sql.
  teacher_id uuid references public.users(id) on delete set null,
  lesson_date date not null,
  vocabulary text,
  grammar_point text,
  speaking_activity text,
  homework text,
  general_note text,
  created_at timestamptz not null default now()
);
create index if not exists lessons_class_id_idx on public.lessons(class_id);
create index if not exists lessons_class_date_idx on public.lessons(class_id, lesson_date desc);

create table if not exists public.student_lesson_updates (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  behavior_rating behavior_rating,
  individual_note text,
  homework_completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (lesson_id, student_id)
);
create index if not exists slu_lesson_idx on public.student_lesson_updates(lesson_id);
create index if not exists slu_student_idx on public.student_lesson_updates(student_id);

-- Subscription lifecycle columns (also added incrementally via
-- db/subscription-plan.sql, trial.sql, subscription-lifecycle.sql).
-- Listed here so a fresh deploy from schema.sql alone gets the full
-- shape. The trial_ends_at column on centers is set when a trial
-- begins; subscription_started_at/ends_at + last_payment_at +
-- next_billing_at track the paid window once the center converts.
create table if not exists public.audit_log (
  id bigserial primary key,
  user_id uuid references public.users(id) on delete set null,
  center_id uuid references public.centers(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_center_idx on public.audit_log(center_id, created_at desc);
-- Index used by the lazy-expire query in /super-admin (see
-- src/lib/subscription.ts):
--   centers where subscription_status='trial' and trial_ends_at<now()
create index if not exists centers_trial_expiry_idx
  on public.centers (trial_ends_at)
  where subscription_status = 'trial';

-- ==========================================================================
-- Helper functions used by RLS policies.
-- SECURITY DEFINER lets these read public.users without re-triggering RLS,
-- which would cause infinite recursion in the policies that call them.
-- ==========================================================================

create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.current_user_center_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select center_id from public.users where id = auth.uid()
$$;

-- ==========================================================================
-- Enable RLS on every table.
-- ==========================================================================

alter table public.centers                enable row level security;
alter table public.users                  enable row level security;
alter table public.classes                enable row level security;
alter table public.students               enable row level security;
alter table public.lessons                enable row level security;
alter table public.student_lesson_updates enable row level security;
alter table public.audit_log              enable row level security;

-- ==========================================================================
-- Policies: centers
-- A user can see their own center. Only service role mutates centers.
-- ==========================================================================

drop policy if exists "centers_select_own" on public.centers;
create policy "centers_select_own"
  on public.centers for select
  using (id = public.current_user_center_id());

-- ==========================================================================
-- Policies: users (profiles)
-- Anyone in the same center can read user profiles (needed for "Teacher: Anh Tu" labels etc).
-- Mutations go through admin endpoints with service role.
-- ==========================================================================

drop policy if exists "users_select_same_center" on public.users;
create policy "users_select_same_center"
  on public.users for select
  using (center_id = public.current_user_center_id());

-- ==========================================================================
-- Policies: classes
-- Admin: any class in their center.
-- Teacher: classes they teach.
-- Parent: classes containing their child(ren).
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
        and exists (
          select 1 from public.students s
          where s.class_id = classes.id and s.parent_user_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "classes_admin_write" on public.classes;
create policy "classes_admin_write"
  on public.classes for all
  using (
    center_id = public.current_user_center_id()
    and public.current_user_role() = 'admin'
  )
  with check (
    center_id = public.current_user_center_id()
    and public.current_user_role() = 'admin'
  );

-- ==========================================================================
-- Policies: students
-- Admin: any student in their center.
-- Teacher: students in classes they teach.
-- Parent: only their own child.
-- ==========================================================================

drop policy if exists "students_select" on public.students;
create policy "students_select"
  on public.students for select
  using (
    center_id = public.current_user_center_id()
    and (
      public.current_user_role() = 'admin'
      or (
        public.current_user_role() = 'teacher'
        and exists (
          select 1 from public.classes c
          where c.id = students.class_id and c.teacher_id = auth.uid()
        )
      )
      or (
        public.current_user_role() = 'parent'
        and parent_user_id = auth.uid()
      )
    )
  );

drop policy if exists "students_admin_write" on public.students;
create policy "students_admin_write"
  on public.students for all
  using (
    center_id = public.current_user_center_id()
    and public.current_user_role() = 'admin'
  )
  with check (
    center_id = public.current_user_center_id()
    and public.current_user_role() = 'admin'
  );

-- ==========================================================================
-- Policies: lessons
-- Admin: any lesson in their center.
-- Teacher: lessons in their classes (read + write).
-- Parent: lessons in their child's class (read only).
-- ==========================================================================

drop policy if exists "lessons_select" on public.lessons;
create policy "lessons_select"
  on public.lessons for select
  using (
    exists (
      select 1 from public.classes c
      where c.id = lessons.class_id
        and c.center_id = public.current_user_center_id()
        and (
          public.current_user_role() = 'admin'
          or (public.current_user_role() = 'teacher' and c.teacher_id = auth.uid())
          or (
            public.current_user_role() = 'parent'
            and exists (
              select 1 from public.students s
              where s.class_id = c.id and s.parent_user_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists "lessons_teacher_write" on public.lessons;
create policy "lessons_teacher_write"
  on public.lessons for all
  using (
    exists (
      select 1 from public.classes c
      where c.id = lessons.class_id
        and c.center_id = public.current_user_center_id()
        and (
          public.current_user_role() = 'admin'
          or (public.current_user_role() = 'teacher' and c.teacher_id = auth.uid())
        )
    )
  )
  with check (
    teacher_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

-- ==========================================================================
-- Policies: student_lesson_updates
-- Admin: all in their center.
-- Teacher: rows for lessons in their classes.
-- Parent: rows for their own child only.
-- ==========================================================================

drop policy if exists "slu_select" on public.student_lesson_updates;
create policy "slu_select"
  on public.student_lesson_updates for select
  using (
    exists (
      select 1
      from public.lessons l
      join public.classes c on c.id = l.class_id
      where l.id = student_lesson_updates.lesson_id
        and c.center_id = public.current_user_center_id()
        and (
          public.current_user_role() = 'admin'
          or (public.current_user_role() = 'teacher' and c.teacher_id = auth.uid())
          or (
            public.current_user_role() = 'parent'
            and exists (
              select 1 from public.students s
              where s.id = student_lesson_updates.student_id
                and s.parent_user_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists "slu_teacher_write" on public.student_lesson_updates;
create policy "slu_teacher_write"
  on public.student_lesson_updates for all
  using (
    exists (
      select 1
      from public.lessons l
      join public.classes c on c.id = l.class_id
      where l.id = student_lesson_updates.lesson_id
        and c.center_id = public.current_user_center_id()
        and (
          public.current_user_role() = 'admin'
          or (public.current_user_role() = 'teacher' and c.teacher_id = auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1
      from public.lessons l
      join public.classes c on c.id = l.class_id
      where l.id = student_lesson_updates.lesson_id
        and c.center_id = public.current_user_center_id()
        and (
          public.current_user_role() = 'admin'
          or (public.current_user_role() = 'teacher' and c.teacher_id = auth.uid())
        )
    )
  );

-- ==========================================================================
-- Policies: audit_log
-- Admins read their center's log; writes happen via service role only.
-- ==========================================================================

drop policy if exists "audit_admin_select" on public.audit_log;
create policy "audit_admin_select"
  on public.audit_log for select
  using (
    center_id = public.current_user_center_id()
    and public.current_user_role() = 'admin'
  );
