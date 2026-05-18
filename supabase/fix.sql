-- ===================================================================
-- FORJA — Correção / migração segura do banco.
-- Rode este arquivo INTEIRO no SQL Editor do Supabase.
-- Pode ser executado várias vezes sem risco (é idempotente) e NÃO apaga
-- nenhum dado. Use-o quando o onboarding não salvar o perfil.
-- ===================================================================

-- 0) Permissões do schema public ─────────────────────────────────────
-- Corrige o erro "permission denied for schema public". Devolve aos
-- papéis do Supabase o acesso ao schema. O RLS continua protegendo
-- linha a linha — isto libera apenas o acesso a nível de schema/tabela.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines  in schema public to anon, authenticated, service_role;

-- Mesma permissão para tabelas/sequências criadas no futuro.
alter default privileges in schema public
  grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines  to anon, authenticated, service_role;

-- 1) Garante que a tabela profiles exista com todas as colunas ────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade
);
alter table public.profiles add column if not exists name          text;
alter table public.profiles add column if not exists sex           text;
alter table public.profiles add column if not exists age           int;
alter table public.profiles add column if not exists height_cm     numeric;
alter table public.profiles add column if not exists weight_kg     numeric;
alter table public.profiles add column if not exists biotype       text;
alter table public.profiles add column if not exists goal          text;
alter table public.profiles add column if not exists experience    text;
alter table public.profiles add column if not exists activity      text;
alter table public.profiles add column if not exists days_per_week int default 4;
alter table public.profiles add column if not exists restrictions  text default '';
alter table public.profiles add column if not exists created_at    timestamptz default now();
alter table public.profiles add column if not exists updated_at    timestamptz default now();

-- 2) Garante que a tabela routine exista com todas as colunas ─────────
create table if not exists public.routine (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.routine add column if not exists works             boolean default false;
alter table public.routine add column if not exists work_start        time;
alter table public.routine add column if not exists work_end          time;
alter table public.routine add column if not exists work_days         int[] default '{2,3,4,5,6}';
alter table public.routine add column if not exists wake_time         time default '06:30';
alter table public.routine add column if not exists sleep_time        time default '23:00';
alter table public.routine add column if not exists training_time     time default '18:00';
alter table public.routine add column if not exists training_duration int default 60;
alter table public.routine add column if not exists meal_times        jsonb default '[]'::jsonb;
alter table public.routine add column if not exists notes             text default '';
alter table public.routine add column if not exists updated_at        timestamptz default now();

-- 3) Reaplica as políticas de Row Level Security ─────────────────────
-- CORREÇÃO 42P17: (select auth.uid()) evita recursão infinita.
--   auth.uid() direto → avaliado por row → loop.
--   (select auth.uid()) → avaliado uma vez por statement → seguro.
alter table public.profiles enable row level security;
alter table public.routine  enable row level security;

drop policy if exists "own_profile" on public.profiles;
create policy "own_profile" on public.profiles
  for all using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "own_routine" on public.routine;
create policy "own_routine" on public.routine
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 4) Recria o gatilho que cria perfil + rotina em cada novo cadastro ──
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.routine (user_id) values (new.id) on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Cria perfil + rotina para usuários que se cadastraram ANTES ──────
--    (ex.: você criou a conta antes de rodar o schema).
insert into public.profiles (id)
  select id from auth.users
  on conflict (id) do nothing;

insert into public.routine (user_id)
  select id from auth.users
  on conflict (user_id) do nothing;

-- 6) Reaplica as permissões agora que todas as tabelas existem ────────
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines  in schema public to anon, authenticated, service_role;

-- Pronto. Recarregue o app e finalize o onboarding.
