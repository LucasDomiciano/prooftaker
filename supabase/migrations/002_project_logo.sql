-- Logo do projeto + bucket público

alter table public.projects
  add column if not exists logo_url text not null default '';

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "logos_public_read" on storage.objects;
create policy "logos_public_read" on storage.objects
  for select using (bucket_id = 'logos');

drop policy if exists "logos_auth_write" on storage.objects;
create policy "logos_auth_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos');

drop policy if exists "logos_auth_update" on storage.objects;
create policy "logos_auth_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos');

drop policy if exists "logos_auth_delete" on storage.objects;
create policy "logos_auth_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos');

-- service role / admin uploads also work (bypass RLS)
