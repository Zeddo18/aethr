-- Phase 2: meal logging. Run in the Supabase SQL editor.
create table if not exists public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  eaten_on date not null default current_date,
  meal text not null check (meal in ('breakfast','lunch','dinner','snack')),
  name text not null check (char_length(name) between 1 and 120),
  amount_g numeric(7,1) check (amount_g > 0),
  calories numeric(7,1) not null check (calories >= 0 and calories < 10000),
  protein_g numeric(6,1) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6,1) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6,1) not null default 0 check (fat_g >= 0),
  created_at timestamptz not null default now()
);

create index if not exists meal_entries_user_day on public.meal_entries (user_id, eaten_on);

alter table public.meal_entries enable row level security;

create policy "own entries read" on public.meal_entries for select using (auth.uid() = user_id);
create policy "own entries insert" on public.meal_entries for insert with check (auth.uid() = user_id);
create policy "own entries update" on public.meal_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own entries delete" on public.meal_entries for delete using (auth.uid() = user_id);
