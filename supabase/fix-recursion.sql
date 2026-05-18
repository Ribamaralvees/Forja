-- ===================================================================
-- FORJA — Correção do erro 42P17 (infinite recursion in policy)
-- ===================================================================
-- Execute este arquivo INTEIRO no SQL Editor do Supabase.
-- É seguro e idempotente: não apaga nenhum dado.
--
-- CAUSA DO BUG:
--   A policy usava auth.uid() diretamente. Em certas versões do
--   Supabase/PostgREST, auth.uid() é reavaliado para cada linha
--   processada, o que pode provocar uma recursão infinita (42P17).
--
-- SOLUÇÃO:
--   Trocar auth.uid() por (select auth.uid()). O subselect faz o
--   Postgres calcular o UID uma única vez por statement, quebrando
--   o ciclo de recursão.
-- ===================================================================

-- 1) Recria todas as policies com a forma segura (select auth.uid()) ─

-- profiles (chave primária = id, não user_id)
drop policy if exists "own_profile" on public.profiles;
create policy "own_profile" on public.profiles
  for all
  using     ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- routine
drop policy if exists "own_routine" on public.routine;
create policy "own_routine" on public.routine
  for all
  using     ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- workouts
drop policy if exists "own_workouts" on public.workouts;
create policy "own_workouts" on public.workouts
  for all
  using     ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- exercises
drop policy if exists "own_exercises" on public.exercises;
create policy "own_exercises" on public.exercises
  for all
  using     ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- sessions
drop policy if exists "own_sessions" on public.sessions;
create policy "own_sessions" on public.sessions
  for all
  using     ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- weight_logs
drop policy if exists "own_weight_logs" on public.weight_logs;
create policy "own_weight_logs" on public.weight_logs
  for all
  using     ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- diets
drop policy if exists "own_diets" on public.diets;
create policy "own_diets" on public.diets
  for all
  using     ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- meals
drop policy if exists "own_meals" on public.meals;
create policy "own_meals" on public.meals
  for all
  using     ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- meal_items
drop policy if exists "own_meal_items" on public.meal_items;
create policy "own_meal_items" on public.meal_items
  for all
  using     ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- recipes
drop policy if exists "own_recipes" on public.recipes;
create policy "own_recipes" on public.recipes
  for all
  using     ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- coach_messages
drop policy if exists "own_coach_messages" on public.coach_messages;
create policy "own_coach_messages" on public.coach_messages
  for all
  using     ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 2) Garante que o gatilho de novo usuário ainda está ativo ───────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id)  values (new.id) on conflict do nothing;
  insert into public.routine (user_id) values (new.id) on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Cria perfil/rotina para quem já tinha conta e não tem linha ──────
insert into public.profiles (id)
  select id from auth.users
  on conflict (id) do nothing;

insert into public.routine (user_id)
  select id from auth.users
  on conflict (user_id) do nothing;

-- 4) Garante permissões nas tabelas ───────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;
grant all   on all tables    in schema public to anon, authenticated, service_role;
grant all   on all sequences in schema public to anon, authenticated, service_role;
grant all   on all routines  in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines  to anon, authenticated, service_role;

-- ===================================================================
-- Pronto! Volte ao app e conclua o onboarding normalmente.
-- ===================================================================
