-- IA: texto original + versão melhorada
alter table public.testimonials
  add column if not exists text_original text;

alter table public.testimonials
  add column if not exists text_improved text;

-- Backfill: original = texto atual quando ainda vazio
update public.testimonials
set text_original = text
where text_original is null or text_original = '';

comment on column public.testimonials.text is 'Texto publicado no mural/widgets';
comment on column public.testimonials.text_original is 'Texto enviado pelo cliente (imutável no sentido)';
comment on column public.testimonials.text_improved is 'Versão IA (gramática/clareza) — usuário escolhe ao aprovar';
