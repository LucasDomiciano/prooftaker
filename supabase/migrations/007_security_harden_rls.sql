-- Hardening: RLS coleta pública, magic links, storage de vídeo

-- ── 0) Slots de upload (criado antes da função de insert) ───────────
create table if not exists public.video_upload_slots (
  path text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index if not exists video_upload_slots_expires_idx
  on public.video_upload_slots (expires_at)
  where consumed_at is null;

alter table public.video_upload_slots enable row level security;
-- Sem policies para anon/authenticated = negado (só service role / security definer)

-- ── 1) Testimonials: sem INSERT público direto (só via RPC) ─────────
drop policy if exists "testimonials_public_insert" on public.testimonials;
-- Owners continuam com testimonials_owner; anon só entra pela RPC abaixo.

-- Insert centralizado com quota (protege REST direto com anon key)
create or replace function public.insert_pending_testimonial(
  p_slug text,
  p_name text,
  p_role text default '',
  p_company text default '',
  p_text text default '',
  p_rating int default 5,
  p_video_path text default null,
  p_text_original text default null,
  p_text_improved text default null,
  p_id uuid default null
)
returns table (
  ok boolean,
  testimonial_id uuid,
  error text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  q record;
  new_id uuid;
  lim int;
  v_text text;
  has_ai_cols boolean;
  updated int;
begin
  v_text := trim(coalesce(p_text, ''));
  if length(trim(coalesce(p_name, ''))) < 2 then
    return query select false, null::uuid, 'Nome inválido.'::text;
    return;
  end if;
  if length(v_text) < 10 then
    return query select false, null::uuid, 'Depoimento muito curto.'::text;
    return;
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return query select false, null::uuid, 'Avaliação inválida.'::text;
    return;
  end if;

  select * into q from public.get_collect_quota(p_slug) limit 1;
  if q.project_id is null then
    return query select false, null::uuid, 'Projeto não encontrado.'::text;
    return;
  end if;

  -- Limites alinhados ao app (Free = 15; Starter/Pro = ilimitado)
  lim := case when q.plan = 'Free' then 15 else null end;
  if lim is not null and q.used >= lim then
    return query select false, null::uuid,
      'Este projeto atingiu o limite de depoimentos do plano atual.'::text;
    return;
  end if;

  -- video_path: se informado, deve ser um slot válido não consumido
  if p_video_path is not null and length(trim(p_video_path)) > 0 then
    if p_video_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|webm|mov|m4v)$' then
      return query select false, null::uuid, 'Caminho de vídeo inválido.'::text;
      return;
    end if;
    update public.video_upload_slots
      set consumed_at = now()
      where path = p_video_path
        and consumed_at is null
        and expires_at > now();
    get diagnostics updated = row_count;
    if updated = 0 then
      return query select false, null::uuid, 'Upload de vídeo inválido ou expirado.'::text;
      return;
    end if;
  end if;

  new_id := coalesce(p_id, gen_random_uuid());

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'testimonials'
      and column_name = 'text_original'
  ) into has_ai_cols;

  if has_ai_cols then
    insert into public.testimonials (
      id, project_id, name, role, company, text,
      text_original, text_improved, rating, has_video, video_path, status, tags
    ) values (
      new_id,
      q.project_id,
      trim(p_name),
      coalesce(trim(p_role), ''),
      coalesce(trim(p_company), ''),
      v_text,
      coalesce(nullif(trim(p_text_original), ''), v_text),
      nullif(trim(p_text_improved), ''),
      p_rating,
      (p_video_path is not null and length(trim(p_video_path)) > 0),
      nullif(trim(p_video_path), ''),
      'pendente',
      '{}'
    );
  else
    insert into public.testimonials (
      id, project_id, name, role, company, text,
      rating, has_video, video_path, status, tags
    ) values (
      new_id,
      q.project_id,
      trim(p_name),
      coalesce(trim(p_role), ''),
      coalesce(trim(p_company), ''),
      v_text,
      p_rating,
      (p_video_path is not null and length(trim(p_video_path)) > 0),
      nullif(trim(p_video_path), ''),
      'pendente',
      '{}'
    );
  end if;

  return query select true, new_id, null::text;
end;
$$;

grant execute on function public.insert_pending_testimonial(
  text, text, text, text, text, int, text, text, text, uuid
) to anon, authenticated;

-- ── 2) Magic links: sem SELECT público; resolve só por RPC ──────────
drop policy if exists "collect_links_public_read" on public.collect_links;

create or replace function public.resolve_collect_link(p_token text)
returns table (
  ok boolean,
  project_id uuid,
  project_slug text,
  project_name text,
  color text,
  logo_url text,
  description text,
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
  if p_token is null or length(trim(p_token)) < 8 then
    return query select false, null::uuid, null::text, null::text, null::text, null::text, null::text,
      'Link inválido ou expirado.'::text;
    return;
  end if;

  select * into link from public.collect_links where token = p_token;
  if not found then
    return query select false, null::uuid, null::text, null::text, null::text, null::text, null::text,
      'Link inválido ou expirado.'::text;
    return;
  end if;

  if link.expires_at is not null and link.expires_at < now() then
    return query select false, null::uuid, null::text, null::text, null::text, null::text, null::text,
      'Este link expirou.'::text;
    return;
  end if;

  if link.max_uses is not null and link.used_count >= link.max_uses then
    return query select false, null::uuid, null::text, null::text, null::text, null::text, null::text,
      'Este link já foi usado o máximo de vezes.'::text;
    return;
  end if;

  select * into proj from public.projects where id = link.project_id;
  if not found then
    return query select false, null::uuid, null::text, null::text, null::text, null::text, null::text,
      'Projeto não encontrado.'::text;
    return;
  end if;

  return query select
    true,
    proj.id,
    proj.slug,
    proj.name,
    proj.color,
    coalesce(proj.logo_url, ''),
    proj.description,
    null::text;
end;
$$;

grant execute on function public.resolve_collect_link(text) to anon, authenticated;

-- ── 3) Storage: só upload assinado (sem insert/update anon) ─────────
drop policy if exists "videos_anon_insert" on storage.objects;
drop policy if exists "videos_anon_update" on storage.objects;
