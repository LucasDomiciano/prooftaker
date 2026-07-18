-- DepoBR · schema inicial para Lovable Cloud / Supabase

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  company text not null default '',
  avatar_url text not null default '',
  plan text not null default 'Free' check (plan in ('Free', 'Starter', 'Pro')),
  notify_new boolean not null default true,
  notify_weekly boolean not null default true,
  notify_product boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text not null default '',
  color text not null,
  logo_url text not null default '',
  created_at date not null default current_date
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  role text not null default '',
  company text not null default '',
  avatar_url text,
  text text not null,
  rating int not null check (rating between 1 and 5),
  has_video boolean not null default false,
  video_path text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  tags text[] not null default '{}',
  created_at date not null default current_date
);

create index if not exists projects_owner_id_idx on public.projects (owner_id);
create index if not exists projects_slug_idx on public.projects (slug);
create index if not exists testimonials_project_id_idx on public.testimonials (project_id);
create index if not exists testimonials_status_idx on public.testimonials (status);

-- Auto-cria perfil no signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, company)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'company', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.testimonials enable row level security;

drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "projects_own" on public.projects;
create policy "projects_own" on public.projects
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "projects_public_read" on public.projects;
create policy "projects_public_read" on public.projects
  for select using (true);

drop policy if exists "testimonials_owner" on public.testimonials;
create policy "testimonials_owner" on public.testimonials
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "testimonials_public_insert" on public.testimonials;
create policy "testimonials_public_insert" on public.testimonials
  for insert with check (true);

drop policy if exists "testimonials_public_approved_read" on public.testimonials;
create policy "testimonials_public_approved_read" on public.testimonials
  for select using (
    status = 'aprovado'
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

drop policy if exists "videos_authenticated_read" on storage.objects;
create policy "videos_authenticated_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'videos');

drop policy if exists "videos_anon_insert" on storage.objects;
create policy "videos_anon_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'videos');

drop policy if exists "videos_service_all" on storage.objects;
-- service role bypasses RLS; policies above cover app clients

-- Quota da coleta pública (anon não lê profiles/pending via RLS)
create or replace function public.get_collect_quota(p_slug text)
returns table (
  plan text,
  used int,
  project_id uuid,
  project_name text,
  owner_id uuid,
  owner_name text,
  notify_new boolean
)
language sql
security definer
set search_path = public
as $$
  select
    pr.plan,
    (
      select count(*)::int
      from public.testimonials t
      join public.projects p2 on p2.id = t.project_id
      where p2.owner_id = pr.id and t.status <> 'recusado'
    ) as used,
    p.id as project_id,
    p.name as project_name,
    pr.id as owner_id,
    pr.name as owner_name,
    pr.notify_new
  from public.projects p
  join public.profiles pr on pr.id = p.owner_id
  where p.slug = p_slug
  limit 1;
$$;

grant execute on function public.get_collect_quota(text) to anon, authenticated;
