-- Phase 5: optional location and manual running/walking log.
-- Apply after the core Supabase schema. Each record is private to its owner.
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('run','walk','treadmill')),
  started_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds between 1 and 86400),
  distance_km numeric(8,3) not null check (distance_km between 0 and 1000),
  notes text not null default '' check (char_length(notes) <= 1000),
  source text not null check (source in ('manual','gps')),
  created_at timestamptz not null default now()
);
create index if not exists activities_user_recent on public.activities(user_id, started_at desc);
alter table public.activities enable row level security;
create policy "own activities read" on public.activities for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own activities insert" on public.activities for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own activities update" on public.activities for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own activities delete" on public.activities for delete to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.activity_route_points (
  id bigint generated always as identity primary key,
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sequence_number integer not null check (sequence_number between 0 and 2999),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  recorded_at timestamptz not null,
  unique(activity_id,sequence_number)
);
create index if not exists activity_route_points_activity on public.activity_route_points(activity_id,sequence_number);
alter table public.activity_route_points enable row level security;
create policy "own route read" on public.activity_route_points for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own route insert" on public.activity_route_points for insert to authenticated
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.activities a where a.id = activity_id
      and a.user_id = (select auth.uid()) and a.source = 'gps'
    )
  );
create policy "own route delete" on public.activity_route_points for delete to authenticated
  using (user_id = (select auth.uid()));

-- Production note: activity + points are inserted in separate requests in the application.
-- A failed route insertion leaves a GPS activity without a route; the user is notified.
