-- Phase 4: authenticated gym logging. Apply after schema.sql and phase2.sql.
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  muscle_group text,
  created_at timestamptz not null default now()
);
create index if not exists exercises_owner on public.exercises(user_id);
create unique index if not exists exercises_unique_name on public.exercises(user_id, lower(name));
alter table public.exercises enable row level security;
create policy "exercise read" on public.exercises for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy "exercise insert" on public.exercises for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "exercise update" on public.exercises for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "exercise delete" on public.exercises for delete to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);
create index if not exists workout_templates_owner on public.workout_templates(user_id);
alter table public.workout_templates enable row level security;
create policy "own templates" on public.workout_templates for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  sort_order int not null default 0,
  target_sets int check (target_sets between 1 and 20),
  target_reps int check (target_reps between 1 and 100)
);
create index if not exists workout_template_exercise_template on public.workout_template_exercises(template_id);
alter table public.workout_template_exercises enable row level security;
create policy "own template exercises read" on public.workout_template_exercises for select to authenticated
  using (exists (select 1 from public.workout_templates t where t.id = template_id and t.user_id = (select auth.uid())));
create policy "own template exercises insert" on public.workout_template_exercises for insert to authenticated
  with check (exists (select 1 from public.workout_templates t where t.id = template_id and t.user_id = (select auth.uid())));
create policy "own template exercises delete" on public.workout_template_exercises for delete to authenticated
  using (exists (select 1 from public.workout_templates t where t.id = template_id and t.user_id = (select auth.uid())));

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 100),
  notes text not null default '',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  check (finished_at is null or finished_at >= started_at)
);
create index if not exists workout_sessions_owner_recent on public.workout_sessions(user_id, started_at desc);
alter table public.workout_sessions enable row level security;
create policy "own sessions" on public.workout_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_name text not null check (char_length(trim(exercise_name)) between 1 and 100),
  set_number int not null check (set_number between 1 and 100),
  repetitions int not null check (repetitions between 1 and 100),
  weight_kg numeric(7,2) not null default 0 check (weight_kg between 0 and 10000),
  created_at timestamptz not null default now(),
  unique (session_id, exercise_name, set_number)
);
create index if not exists workout_sets_session on public.workout_sets(session_id);
create index if not exists workout_sets_owner_exercise on public.workout_sets(user_id, exercise_name);
alter table public.workout_sets enable row level security;
create policy "own sets read" on public.workout_sets for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own sets insert" on public.workout_sets for insert to authenticated
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = (select auth.uid()) and s.finished_at is null
    )
  );
create policy "own sets delete" on public.workout_sets for delete to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid()) and s.finished_at is null
  ));
