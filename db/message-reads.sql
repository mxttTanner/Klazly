-- ==========================================================================
-- Per-user message read tracking (fixes shared read_at corruption).
--
-- parent_teacher_messages.read_at is ONE column shared by up to three
-- participants (parent, teacher, admin). mark_messages_read stamped it for
-- whoever opened the thread first — so an admin monitoring a thread killed
-- the parent's unread badge and showed the teacher a false "read" receipt
-- before the parent ever saw the message.
--
-- This migration adds a message_reads table (one row per reader per
-- message), rewrites mark_messages_read to record the caller's own read,
-- and adds unread_message_counts() so badge queries count "messages I
-- have not read" instead of the shared flag. read_at is kept and still
-- stamped for backward compatibility but is no longer read by the app.
--
-- Idempotent: safe to run more than once.
-- ==========================================================================

create table if not exists public.message_reads (
  message_id uuid not null
    references public.parent_teacher_messages(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  -- Denormalized so read receipts don't need a cross-role join on users:
  -- a staff-sent message is "read" when the PARENT read it; a parent-sent
  -- message is "read" when a STAFF member (teacher/admin) read it.
  reader_role text not null check (reader_role in ('parent', 'teacher', 'admin')),
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists message_reads_user_idx
  on public.message_reads(user_id);

alter table public.message_reads enable row level security;

-- Readers see their own read rows (for their unread state); senders see
-- read rows on messages they sent (for read receipts). Nobody else.
-- No insert/update/delete policies: all writes go through the
-- mark_messages_read SECURITY DEFINER function below.
drop policy if exists "mr_select" on public.message_reads;
create policy "mr_select"
  on public.message_reads for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.parent_teacher_messages m
      where m.id = message_reads.message_id
        and m.sender_user_id = auth.uid()
    )
  );

-- Rewritten: records the caller's own read rows. Still stamps the legacy
-- read_at column so anything not yet migrated keeps working; the app no
-- longer reads it.
create or replace function public.mark_messages_read(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.current_user_role();
  v_allowed boolean;
begin
  v_allowed :=
    (
      v_role = 'parent'
      and exists (
        select 1 from public.students s
        where s.id = p_student_id and s.parent_user_id = auth.uid()
      )
    )
    or (
      v_role = 'teacher'
      and exists (
        select 1 from public.students s
        join public.classes c on c.id = s.class_id
        where s.id = p_student_id and c.teacher_id = auth.uid()
      )
    )
    or (
      v_role = 'admin'
      and exists (
        select 1 from public.students s
        where s.id = p_student_id
          and s.center_id = public.current_user_center_id()
      )
    );
  if not v_allowed then
    return;
  end if;

  insert into public.message_reads (message_id, user_id, reader_role)
  select m.id, auth.uid(), v_role
  from public.parent_teacher_messages m
  where m.student_id = p_student_id
    and m.sender_user_id <> auth.uid()   -- only messages you RECEIVED
  on conflict do nothing;

  -- Legacy stamp, kept for backward compatibility only.
  update public.parent_teacher_messages m
  set read_at = now()
  where m.student_id = p_student_id
    and m.read_at is null
    and m.sender_user_id <> auth.uid();
end;
$$;

revoke all on function public.mark_messages_read(uuid) from public;
grant execute on function public.mark_messages_read(uuid) to authenticated;

-- Per-student unread counts for the CALLER: messages in the student's
-- thread that the caller may see, did not send, and has no read row for.
-- Replaces the app-side "read_at is null" count queries.
create or replace function public.unread_message_counts(p_student_ids uuid[])
returns table (student_id uuid, unread bigint)
language sql
stable
security definer
set search_path = public
as $$
  select m.student_id, count(*)::bigint as unread
  from public.parent_teacher_messages m
  where m.student_id = any(p_student_ids)
    and m.sender_user_id <> auth.uid()
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
    )
    and not exists (
      select 1 from public.message_reads r
      where r.message_id = m.id and r.user_id = auth.uid()
    )
  group by m.student_id
$$;

revoke all on function public.unread_message_counts(uuid[]) from public;
grant execute on function public.unread_message_counts(uuid[]) to authenticated;

-- --------------------------------------------------------------------------
-- Backfill: without this, every historical message becomes "unread" for
-- everyone on deploy (badge explosion). The old model can't tell us WHO
-- read a message, so credit the natural recipient(s) of each already-read
-- message. Idempotent via ON CONFLICT DO NOTHING.
-- --------------------------------------------------------------------------

-- Staff-sent read messages -> credit the student's parent.
insert into public.message_reads (message_id, user_id, reader_role, read_at)
select m.id, s.parent_user_id, 'parent', m.read_at
from public.parent_teacher_messages m
join public.users sender on sender.id = m.sender_user_id
join public.students s on s.id = m.student_id
where m.read_at is not null
  and sender.role in ('teacher', 'admin')
  and s.parent_user_id is not null
on conflict do nothing;

-- Parent-sent read messages -> credit the student's current class teacher.
insert into public.message_reads (message_id, user_id, reader_role, read_at)
select m.id, c.teacher_id, 'teacher', m.read_at
from public.parent_teacher_messages m
join public.users sender on sender.id = m.sender_user_id
join public.students s on s.id = m.student_id
join public.classes c on c.id = s.class_id
where m.read_at is not null
  and sender.role = 'parent'
  and c.teacher_id is not null
on conflict do nothing;

-- Credit center admins for every already-read message they didn't send,
-- so the admin inbox doesn't light up with years of old threads.
insert into public.message_reads (message_id, user_id, reader_role, read_at)
select m.id, u.id, 'admin', m.read_at
from public.parent_teacher_messages m
join public.users u
  on u.center_id = m.center_id and u.role = 'admin'
where m.read_at is not null
  and u.id <> m.sender_user_id
on conflict do nothing;
