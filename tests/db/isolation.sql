-- Execute ONLY on a disposable PostgreSQL fixture seeded by tests/db/seed.sql.
-- Fails with an exception if actual PostgreSQL RLS allows cross-account access.
-- This checks real SQL policies, not just string patterns.

do $$
declare
  table_name text;
  rls_on boolean;
  policies integer;
begin
  foreach table_name in array array[
    'profiles','meal_entries','exercises','workout_templates',
    'workout_template_exercises','workout_sessions','workout_sets',
    'activities','activity_route_points','saved_foods','saved_recipes',
    'wellness_logs','reminder_preferences'
  ] loop
    select c.relrowsecurity into rls_on
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = table_name and c.relkind in ('r','p');

    if rls_on is distinct from true then
      raise exception 'RLS missing or table absent: public.%', table_name;
    end if;
    select count(*) into policies from pg_policies
      where schemaname = 'public' and tablename = table_name;
    if policies < 1 then
      raise exception 'No RLS policies on public.%', table_name;
    end if;
  end loop;
end $$;

-- No JWT: even granting anon SELECT on every table must not expose records.
begin;
set local role anon;
do $$
declare
  table_name text;
  count_rows bigint;
begin
  foreach table_name in array array[
    'profiles','meal_entries','exercises','workout_templates',
    'workout_template_exercises','workout_sessions','workout_sets',
    'activities','activity_route_points','saved_foods','saved_recipes',
    'wellness_logs','reminder_preferences'
  ] loop
    execute format('select count(*) from public.%I', table_name) into count_rows;
    if count_rows <> 0 then
      raise exception 'Anonymous access leaked % row(s) from %', count_rows, table_name;
    end if;
  end loop;
end $$;
rollback;

-- Test user A: one own record from each category, and one shared exercise.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare
  table_name text;
  count_rows bigint;
  expected bigint;
  count_changed integer;
begin
  if (select auth.uid()) is distinct from '11111111-1111-4111-8111-111111111111'::uuid then
    raise exception 'JWT simulation does not match test account A';
  end if;

  foreach table_name in array array[
    'profiles','meal_entries','exercises','workout_templates',
    'workout_template_exercises','workout_sessions','workout_sets',
    'activities','activity_route_points','saved_foods','saved_recipes',
    'wellness_logs','reminder_preferences'
  ] loop
    execute format('select count(*) from public.%I', table_name) into count_rows;
    expected := case when table_name = 'exercises' then 2 else 1 end;
    if count_rows <> expected then
      raise exception 'User A sees % rows in % (expected %)', count_rows, table_name, expected;
    end if;
  end loop;

  update public.meal_entries set name = 'Modified A meal'
    where user_id = '22222222-2222-4222-8222-222222222222';
  get diagnostics count_changed = row_count;
  if count_changed <> 0 then
    raise exception 'User A updated user B meal!';
  end if;

  delete from public.wellness_logs where user_id =
    '22222222-2222-4222-8222-222222222222';
  get diagnostics count_changed = row_count;
  if count_changed <> 0 then
    raise exception 'User A deleted user B recovery data!';
  end if;

  delete from public.saved_foods where user_id =
    '22222222-2222-4222-8222-222222222222';
  get diagnostics count_changed = row_count;
  if count_changed <> 0 then
    raise exception 'User A deleted user B saved food!';
  end if;

  -- INSERT: forged owner user_id cannot impersonate account B.
  begin
    insert into public.saved_foods
      (user_id,name,calories_100g,protein_100g,carbs_100g,fat_100g)
    values ('22222222-2222-4222-8222-222222222222','Forged',1,1,1,1);
    raise exception 'RLS BYPASS: owner spoofing saved_foods succeeded';
  exception when sqlstate '42501' then null;
  end;

  -- UPDATE: row reassignment of own entry to B is forbidden.
  begin
    update public.meal_entries
      set user_id = '22222222-2222-4222-8222-222222222222'
      where user_id = '11111111-1111-4111-8111-111111111111';
    raise exception 'RLS BYPASS: ownership reassignment succeeded';
  exception when sqlstate '42501' then null;
  end;

  -- Parent ownership: referencing account B's private exercise is forbidden.
  begin
    insert into public.workout_template_exercises(template_id,exercise_id)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    raise exception 'RLS BYPASS: cross-owner template exercise succeeded';
  exception when sqlstate '42501' then null;
  end;

  -- Parent ownership: a set cannot be attached to B's session.
  begin
    insert into public.workout_sets(user_id,session_id,exercise_name,set_number,repetitions)
    values ('11111111-1111-4111-8111-111111111111',
            '00000000-0000-4000-8000-000000000002','Forged',2,8);
    raise exception 'RLS BYPASS: cross-owner workout set succeeded';
  exception when sqlstate '42501' then null;
  end;

  -- GPS privacy: a route point cannot refer to B's activity.
  begin
    insert into public.activity_route_points
      (activity_id,user_id,sequence_number,latitude,longitude,recorded_at)
    values ('44444444-4444-4444-8444-444444444444',
            '11111111-1111-4111-8111-111111111111',1,0,0,now());
    raise exception 'RLS BYPASS: cross-owner GPS point succeeded';
  exception when sqlstate '42501' then null;
  end;
end $$;
rollback;

-- Test user B: A's private records must remain hidden in the opposite direction.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
declare
  visible_meals bigint;
  visible_routes bigint;
  visible_recovery bigint;
begin
  select count(*) into visible_meals from public.meal_entries
    where name = 'Meal A';
  select count(*) into visible_routes from public.activity_route_points
    where activity_id = '33333333-3333-4333-8333-333333333333';
  select count(*) into visible_recovery from public.wellness_logs
    where notes = 'A private note';

  if visible_meals <> 0 or visible_routes <> 0 or visible_recovery <> 0 then
    raise exception 'Account B can access account A private records';
  end if;
end $$;
rollback;
