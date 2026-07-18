-- Garante bucket de vídeos + policies para upload público (coleta) e leitura assinada

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos',
  'videos',
  false,
  104857600,
  array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "videos_authenticated_read" on storage.objects;
create policy "videos_authenticated_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'videos');

drop policy if exists "videos_anon_insert" on storage.objects;
create policy "videos_anon_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'videos');

-- upsert / reenvio no mesmo path
drop policy if exists "videos_anon_update" on storage.objects;
create policy "videos_anon_update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'videos')
  with check (bucket_id = 'videos');
