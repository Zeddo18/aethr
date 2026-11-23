-- Phase 19: exhaustive cross-account UPDATE/DELETE and ownership-transfer tests.
-- DISPOSABLE PostgreSQL CI FIXTURES ONLY. Never run against Supabase or real data.
-- Every transaction is rolled back; synthetic users A/B come from seed.sql.
--
-- These tests exercise actual PostgreSQL RLS with explicit table privileges.
-- A zero-row mutation is the expected safe result when the target belongs to B.
-- Any successful cross-account mutation raises an exception and fails CI.

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);

do $$
declare
  spec record;
  changed integer;
begin
  -- Check cross-account UPDATE and DELETE for every table with a direct owner
  -- column. Profiles use id as their owner key.
  for spec in
    select * from (values
      ('profiles','id'),
      ('meal_entries','user_id'),
      ('exercises','user_id'),
      ('workout_templates','user_id'),
      ('workout_sessions','user_id'),
      ('workout_sets','user_id'),
      ('activities','user_id'),
      ('activity_route_points','user_id'),
      ('saved_foods','user_id'),
      ('saved_recipes','user_id'),
      ('wellness_logs','user_id'),
      ('reminder_preferences','user_id')
    ) as owned(table_name, owner_column)
  loop
    execute format(
      'update public.%I set %I = %I where %I = $1',
      spec.table_name, spec.owner_column, spec.owner_column, spec.owner_column
    ) using '22222222-2222-4222-8222-222222222222'::uuid;
    get diagnostics changed = row_count;
    if changed <> 0 then
      raise exception 'RLS BYPASS: user A updated user B row(s) in public.%', spec.table_name;
    end if;

    execute format(
      'delete from public.%I where %I = $1',
      spec.table_name, spec.owner_column
    ) using '22222222-2222-4222-8222-222222222222'::uuid;
    get diagnostics changed = row_count;
    if changed <> 0 then
      raise exception 'RLS BYPASS: user A deleted user B row(s) in public.%', spec.table_name;
    end if;
  end loop;

  -- workout_template_exercises inherits ownership from its template rather
  -- than carrying a user_id column. Both mutation paths must honor that parent.
  update public.workout_template_exercises
    set sort_order = sort_order
    where template_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then
    raise exception 'RLS BYPASS: user A updated user B template exercise';
  end if;

  delete from public.workout_template_exercises
    where template_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then
    raise exception 'RLS BYPASS: user A deleted user B template exercise';
  end if;
end $$;
rollback;

-- RLS WITH CHECK must stop account A transferring its own records to B.
-- Policies that intentionally do not permit UPDATE must return zero rows.
-- Policies that permit UPDATE but reject a new owner raise SQLSTATE 42501.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);

do $$
declare
  table_name text;
  changed integer;
begin
  foreach table_name in array array[
    'meal_entries','exercises','workout_templates','workout_sessions',
    'workout_sets','activities','activity_route_points','saved_foods',
    'saved_recipes','wellness_logs','reminder_preferences'
  ] loop
    begin
      execute format(
        'update public.%I set user_id = $1 where user_id = $2',
        table_name
      ) using
        '22222222-2222-4222-8222-222222222222'::uuid,
        '11111111-1111-4111-8111-111111111111'::uuid;
      get diagnostics changed = row_count;
      if changed <> 0 then
        raise exception 'RLS BYPASS: user A transferred ownership in public.%', table_name;
      end if;
    exception when insufficient_privilege then
      -- Expected when WITH CHECK rejects the attempted ownership transfer.
      null;
    end;
  end loop;

  -- Child rows must not be reassigned to another user's parent even if a
  -- future migration introduces UPDATE policies for these currently
  -- insert/delete-only relationships.
  begin
    update public.workout_template_exercises
      set template_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
      where template_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid;
    get diagnostics changed = row_count;
    if changed <> 0 then
      raise exception 'RLS BYPASS: user A moved a template exercise to B template';
    end if;
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.workout_template_exercises
      set exercise_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid
      where template_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid;
    get diagnostics changed = row_count;
    if changed <> 0 then
      raise exception 'RLS BYPASS: user A linked a template to B private exercise';
    end if;
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.workout_sets
      set session_id = '00000000-0000-4000-8000-000000000002'::uuid
      where session_id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid
        and user_id = '11111111-1111-4111-8111-111111111111'::uuid;
    get diagnostics changed = row_count;
    if changed <> 0 then
      raise exception 'RLS BYPASS: user A moved a workout set to B session';
    end if;
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.activity_route_points
      set activity_id = '44444444-4444-4444-8444-444444444444'::uuid
      where activity_id = '33333333-3333-4333-8333-333333333333'::uuid
        and user_id = '11111111-1111-4111-8111-111111111111'::uuid;
    get diagnostics changed = row_count;
    if changed <> 0 then
      raise exception 'RLS BYPASS: user A moved a GPS point to B activity';
    end if;
  exception when insufficient_privilege then
    null;
  end;
end $$;
rollback;

-- Confirm the failed cross-account operations above did not remove or reassign
-- any synthetic fixtures. The tests remain isolated and leave the seed intact.
do $$
begin
  if not exists (select 1 from public.meal_entries
    where user_id='22222222-2222-4222-8222-222222222222'::uuid and name='Meal B') then
    raise exception 'User B meal fixture changed during write-isolation tests';
  end if;
  if not exists (select 1 from public.workout_template_exercises
    where template_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid) then
    raise exception 'User B template fixture changed during write-isolation tests';
  end if;
  if not exists (select 1 from public.activity_route_points
    where activity_id='44444444-4444-4444-8444-444444444444'::uuid) then
    raise exception 'User B GPS fixture changed during write-isolation tests';
  end if;
end $$;
