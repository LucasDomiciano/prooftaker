-- Magic links + integrações (Slack / webhooks Zapier)

create table if not exists public.collect_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  token text not null unique,
  label text not null default '',
  max_uses int,
  used_count int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists collect_links_project_id_idx on public.collect_links (project_id);
create index if not exists collect_links_token_idx on public.collect_links (token);

alter table public.collect_links enable row level security;

drop policy if exists "collect_links_owner" on public.collect_links;
create policy "collect_links_owner" on public.collect_links
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

-- leitura pública por token (coleta)
drop policy if exists "collect_links_public_read" on public.collect_links;
create policy "collect_links_public_read" on public.collect_links
  for select using (true);

alter table public.profiles
  add column if not exists slack_webhook_url text not null default '';

alter table public.profiles
  add column if not exists outbound_webhooks jsonb not null default '[]'::jsonb;

-- Incrementa uso do magic link (anon na coleta)
create or replace function public.consume_collect_link(p_token text)
returns table (
  ok boolean,
  project_slug text,
  error text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  link public.collect_links%rowtype;
  proj public.projects%rowtype;
begin
  select * into link from public.collect_links where token = p_token for update;
  if not found then
    return query select false, null::text, 'Link inválido ou expirado.'::text;
    return;
  end if;

  if link.expires_at is not null and link.expires_at < now() then
    return query select false, null::text, 'Este link expirou.'::text;
    return;
  end if;

  if link.max_uses is not null and link.used_count >= link.max_uses then
    return query select false, null::text, 'Este link já foi usado o máximo de vezes.'::text;
    return;
  end if;

  select * into proj from public.projects where id = link.project_id;
  if not found then
    return query select false, null::text, 'Projeto não encontrado.'::text;
    return;
  end if;

  update public.collect_links
    set used_count = used_count + 1
    where id = link.id;

  return query select true, proj.slug, null::text;
end;
$$;

grant execute on function public.consume_collect_link(text) to anon, authenticated;
