-- ===================================================================
-- FORJA — Schema do banco de dados (Supabase / PostgreSQL)
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- ===================================================================

-- ─────────────────────────── Helpers ──────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ─────────────────────────── profiles ─────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text,
  sex          text check (sex in ('M','F')),
  age          int,
  height_cm    numeric,
  weight_kg    numeric,
  biotype      text check (biotype in ('ecto','meso','endo')),
  goal         text check (goal in ('cutting','manutencao','hipertrofia')),
  experience   text check (experience in ('iniciante','intermediario','avancado')),
  activity     text check (activity in ('sedentario','leve','moderado','intenso','atleta')),
  days_per_week int default 4,
  restrictions text default '',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─────────────────────────── routine ──────────────────────────────
-- Rotina do usuario: trabalho, sono, treino e janelas de refeicao.
create table if not exists public.routine (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  works              boolean default false,
  work_start         time,
  work_end           time,
  work_days          int[] default '{2,3,4,5,6}',   -- 1=Dom ... 7=Sab
  wake_time          time default '06:30',
  sleep_time         time default '23:00',
  training_time      time default '18:00',
  training_duration  int  default 60,               -- minutos
  meal_times         jsonb default '[]'::jsonb,      -- [{ "label": "Almoço", "time": "12:30" }]
  notes              text default '',
  updated_at         timestamptz default now()
);
create trigger trg_routine_updated before update on public.routine
  for each row execute function public.set_updated_at();

-- ─────────────────────────── workouts ─────────────────────────────
create table if not exists public.workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  focus      text default '',
  position   int  default 0,
  created_at timestamptz default now()
);
create index if not exists idx_workouts_user on public.workouts(user_id);

create table if not exists public.exercises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  workout_id  uuid not null references public.workouts(id) on delete cascade,
  name        text not null,
  sets        int  default 3,
  reps        text default '10-12',
  rest        text default '60s',
  target_load numeric,
  position    int  default 0
);
create index if not exists idx_exercises_workout on public.exercises(workout_id);

-- ─────────────────────────── sessions ─────────────────────────────
create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  workout_id   uuid references public.workouts(id) on delete set null,
  workout_name text,
  date         date default current_date,
  duration_sec int default 0,
  sets_done    int default 0,
  total_volume numeric default 0,
  details      jsonb default '[]'::jsonb,
  created_at   timestamptz default now()
);
create index if not exists idx_sessions_user on public.sessions(user_id, date desc);

-- ─────────────────────────── weight_logs ──────────────────────────
create table if not exists public.weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null default current_date,
  weight_kg  numeric not null,
  unique (user_id, date)
);
create index if not exists idx_weight_user on public.weight_logs(user_id, date);

-- ─────────────────────────── diets ────────────────────────────────
create table if not exists public.diets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  generated_at   date default current_date,
  target_kcal    int,
  target_protein int,
  target_carbs   int,
  target_fat     int,
  tips           jsonb default '[]'::jsonb,
  is_active      boolean default true,
  created_at     timestamptz default now()
);
create index if not exists idx_diets_user on public.diets(user_id, is_active);

create table if not exists public.meals (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  diet_id   uuid not null references public.diets(id) on delete cascade,
  name      text not null,
  time      text default '',
  position  int  default 0,
  done      boolean default false
);
create index if not exists idx_meals_diet on public.meals(diet_id);

create table if not exists public.meal_items (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  meal_id   uuid not null references public.meals(id) on delete cascade,
  food      text not null,
  grams     int default 0,
  measure   text default '',
  kcal      int default 0,
  protein   numeric default 0,
  carbs     numeric default 0,
  fat       numeric default 0,
  position  int default 0
);
create index if not exists idx_mealitems_meal on public.meal_items(meal_id);

create table if not exists public.recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  meal_id     uuid not null references public.meals(id) on delete cascade unique,
  emoji       text default '🍽️',
  title       text not null,
  prep_time   text default '',
  difficulty  text default '',
  portions    text default '1 porção',
  ingredients jsonb default '[]'::jsonb,
  steps       jsonb default '[]'::jsonb,
  tip         text default '',
  video_id    text,
  video_title text,
  video_url   text,
  created_at  timestamptz default now()
);

-- ─────────────────────────── coach_messages ───────────────────────
create table if not exists public.coach_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz default now()
);
create index if not exists idx_coach_user on public.coach_messages(user_id, created_at);

-- ===================================================================
-- ROW LEVEL SECURITY — cada usuario so acessa os proprios dados.
-- ===================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','routine','workouts','exercises','sessions',
    'weight_logs','diets','meals','meal_items','recipes','coach_messages'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- profiles usa a coluna id; as demais usam user_id.
-- NOTA: (select auth.uid()) evita recursão infinita (bug 42P17 do Supabase).
--       O subselect faz o Postgres avaliar auth.uid() uma só vez por statement.
drop policy if exists "own_profile" on public.profiles;
create policy "own_profile" on public.profiles
  for all using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

do $$
declare t text;
begin
  foreach t in array array[
    'routine','workouts','exercises','sessions',
    'weight_logs','diets','meals','meal_items','recipes','coach_messages'
  ] loop
    execute format('drop policy if exists "own_%1$s" on public.%1$s;', t);
    execute format(
      'create policy "own_%1$s" on public.%1$s for all
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id);', t);
  end loop;
end $$;

-- ===================================================================
-- Ao criar um usuario, cria automaticamente profile + routine vazios.
-- ===================================================================
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

-- ===================================================================
-- Permissões do schema public para os papéis do Supabase.
-- O RLS (acima) continua restringindo o acesso linha a linha.
-- ===================================================================
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines  in schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
