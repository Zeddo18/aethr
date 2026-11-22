-- Phase 8: optional personal sleep and recovery journal.
-- Apply after the core schema. No diagnoses or readiness scores are calculated.
create table if not exists public.wellness_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  sleep_start timestamptz,
  sleep_end timestamptz,
  energy text check (energy in ('low', 'okay', 'high')),
  rest_feeling text check (rest_feeling in ('rested', 'neutral', 'tired')),
  activity_feeling text check (activity_feeling in ('ready', 'unsure', 'rest')),
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date),
  check ((sleep_start is null and sleep_end is null) or
         (sleep_start is not null and sleep_end is not null
          and sleep_end > sleep_start and sleep_end <= sleep_start + interval '24 hours'))
);
create index if not exists wellness_logs_owner_day on public.wellness_logs(user_id, log_date desc);
alter table public.wellness_logs enable row level security;

create policy "wellness read own" on public.wellness_logs for select to authenticated
 using (user_id = (select auth.uid()));
create policy "wellness insert own" on public.wellness_logs for insert to authenticated
 with check (user_id = (select auth.uid()));
create policy "wellness update own" on public.wellness_logs for update to authenticated
 using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "wellness delete own" on public.wellness_logs for delete to authenticated
 using (user_id = (select auth.uid()));
