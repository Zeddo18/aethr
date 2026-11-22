-- Phase 9: private optional in-app reminder preferences.
-- Requires the base Supabase schema. App-open reminders only, not push delivery.
create table if not exists public.reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  reminder_time time without time zone not null default '20:00',
  reminder_kind text not null default 'check_in' check (reminder_kind in ('check_in', 'rest')),
  updated_at timestamptz not null default now()
);
alter table public.reminder_preferences enable row level security;
create policy "reminders read own" on public.reminder_preferences for select to authenticated
 using (user_id = (select auth.uid()));
create policy "reminders insert own" on public.reminder_preferences for insert to authenticated
 with check (user_id = (select auth.uid()));
create policy "reminders update own" on public.reminder_preferences for update to authenticated
 using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reminders delete own" on public.reminder_preferences for delete to authenticated
 using (user_id = (select auth.uid()));
