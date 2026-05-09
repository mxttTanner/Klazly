-- Storage setup. Run once after the main schema.sql in the Supabase SQL editor.

-- Public bucket for center logos. We make it public so <img> tags can load
-- the logo without signed URLs. Uploads go through the server (service role),
-- so we don't need any insert/update policies for the anon role.

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

drop policy if exists "Public can read logos" on storage.objects;
create policy "Public can read logos"
  on storage.objects for select
  using (bucket_id = 'logos');
