-- Phase 16 deletion verification: disposable PostgreSQL CI database ONLY.
-- Tests the same auth.users ON DELETE CASCADE chain used by Supabase Auth
-- admin.deleteUser. The transaction ROLLS BACK to preserve synthetic fixtures.

begin;

delete from auth.users
where id = '11111111-1111-4111-8111-111111111111';

do $$
declare
  table_name text;
  own_count bigint;
  other_count bigint;
  owner_key text;
begin
  foreach table_name in array array[
    'profiles','meal_entries','exercises','workout_templates',
    'workout_sessions','workout_sets','activities','activity_route_points',
    'saved_foods','saved_recipes','wellness_logs','reminder_preferences'
  ] loop
    owner_key := case when table_name = 'profiles' then 'id' else 'user_id' end;
    execute format('select count(*) from public.%I where %I = $1', table_name, owner_key)
      into own_count using '11111111-1111-4111-8111-111111111111'::uuid;
    execute format('select count(*) from public.%I where %I = $1', table_name, owner_key)
      into other_count using '22222222-2222-4222-8222-222222222222'::uuid;

    if own_count <> 0 then
      raise exception 'Account deletion left private rows in %', table_name;
    end if;
    if other_count < 1 then
      raise exception 'Account deletion affected a different user in %', table_name;
    end if;
  end loop;

  if exists (select 1 from public.workout_template_exercises
    where template_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) then
    raise exception 'Deleting account failed to remove child template exercises';
  end if;
  if not exists (select 1 from public.workout_template_exercises
    where template_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid) then
    raise exception 'Deleting account damaged another account template';
  end if;

  if exists (select 1 from aethr_private.ai_request_quota
    where user_id = '11111111-1111-4111-8111-111111111111'::uuid) then
    raise exception 'Private AI quota was not deleted';
  end if;

  if not exists (select 1 from auth.users
    where id = '22222222-2222-4222-8222-222222222222'::uuid) then
    raise exception 'Account deletion removed an unrelated Auth user';
  end if;
end $$;

rollback;
