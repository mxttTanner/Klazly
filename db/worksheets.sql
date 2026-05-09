-- Worksheet library: PDFs / images uploaded by a center, attachable to lessons.
-- Run after schema.sql.

-- Storage bucket (public read so parents can open the file by URL).
insert into storage.buckets (id, name, public)
values ('worksheets', 'worksheets', true)
on conflict (id) do nothing;

drop policy if exists "Public can read worksheets" on storage.objects;
create policy "Public can read worksheets"
  on storage.objects for select
  using (bucket_id = 'worksheets');

-- Library table.
create table if not exists public.worksheets (
  id uuid primary key default uuid_generate_v4(),
  center_id uuid not null references public.centers(id) on delete cascade,
  uploaded_by uuid references public.users(id) on delete set null,
  name text not null,
  storage_path text not null,
  public_url text not null,
  file_type text not null,
  size_bytes int not null,
  created_at timestamptz not null default now()
);

create index if not exists worksheets_center_idx on public.worksheets(center_id);

alter table public.worksheets enable row level security;

drop policy if exists "worksheets_select" on public.worksheets;
create policy "worksheets_select"
  on public.worksheets for select
  using (center_id = public.current_user_center_id());

drop policy if exists "worksheets_write" on public.worksheets;
create policy "worksheets_write"
  on public.worksheets for all
  using (
    center_id = public.current_user_center_id()
    and public.current_user_role() in ('admin', 'teacher')
  )
  with check (
    center_id = public.current_user_center_id()
    and public.current_user_role() in ('admin', 'teacher')
  );

-- Attach a worksheet to a lesson (single worksheet per lesson for now).
alter table public.lessons
  add column if not exists worksheet_id uuid
    references public.worksheets(id) on delete set null;
