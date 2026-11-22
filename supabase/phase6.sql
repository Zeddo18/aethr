-- Phase 6: private reusable foods and recipes.
-- Apply after supabase/schema.sql and supabase/phase2.sql.
create table if not exists public.saved_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  source text not null default 'user-entered' check (char_length(source) between 1 and 120),
  barcode text check (barcode ~ '^[0-9]{8,14}$'),
  calories_100g numeric(8,2) not null check (calories_100g between 0 and 9999),
  protein_100g numeric(7,2) not null check (protein_100g between 0 and 999),
  carbs_100g numeric(7,2) not null check (carbs_100g between 0 and 999),
  fat_100g numeric(7,2) not null check (fat_100g between 0 and 999),
  created_at timestamptz not null default now()
);
create index if not exists saved_foods_user_name on public.saved_foods(user_id, name);
alter table public.saved_foods enable row level security;
create policy "saved foods read" on public.saved_foods for select to authenticated
  using (user_id = (select auth.uid()));
create policy "saved foods insert" on public.saved_foods for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "saved foods delete" on public.saved_foods for delete to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  ingredients jsonb not null check (jsonb_typeof(ingredients) = 'array' and jsonb_array_length(ingredients) between 1 and 20),
  created_at timestamptz not null default now()
);
create index if not exists saved_recipes_user_name on public.saved_recipes(user_id, name);
alter table public.saved_recipes enable row level security;
create policy "saved recipes read" on public.saved_recipes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "saved recipes insert" on public.saved_recipes for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "saved recipes delete" on public.saved_recipes for delete to authenticated
  using (user_id = (select auth.uid()));
