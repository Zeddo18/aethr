-- Phase 20 — staging-only security and query-plan hardening.
-- Apply after phase16.sql on a verified AETHR database.
-- Tightens the signup trigger function ACL/search_path, uses initPlan-friendly
-- auth.uid() expressions for profile and meal policies, and indexes two FKs.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;
grant execute on function public.handle_new_user() to supabase_auth_admin;

drop policy "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
drop policy "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
drop policy "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy "own entries read" on public.meal_entries;
create policy "own entries read" on public.meal_entries
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy "own entries insert" on public.meal_entries;
create policy "own entries insert" on public.meal_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy "own entries update" on public.meal_entries;
create policy "own entries update" on public.meal_entries
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy "own entries delete" on public.meal_entries;
create policy "own entries delete" on public.meal_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

create index if not exists activity_route_points_user_id_idx
  on public.activity_route_points(user_id);
create index if not exists workout_template_exercises_exercise_id_idx
  on public.workout_template_exercises(exercise_id);
