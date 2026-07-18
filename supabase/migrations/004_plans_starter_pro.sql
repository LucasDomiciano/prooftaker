-- Planos: Free | Starter | Pro
alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('Free', 'Starter', 'Pro'));
