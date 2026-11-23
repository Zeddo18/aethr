-- Phase 18: read-only catalog checks for a CONFIRMED AETHR staging project.
-- This script reads ONLY PostgreSQL metadata. It never views personal rows,
-- creates users, applies migrations, grants access or deletes anything.
-- Output: category | check_name | ready | requirement.
-- ready = false means STOP and inspect migrations / permissions before testing.
with required(table_name) as (
  values
    ('profiles'), ('meal_entries'), ('exercises'),
    ('workout_templates'), ('workout_template_exercises'),
    ('workout_sessions'), ('workout_sets'),
    ('activities'), ('activity_route_points'),
    ('saved_foods'), ('saved_recipes'),
    ('wellness_logs'), ('reminder_preferences')
),
tables as (
  select
    r.table_name,
    c.oid,
    coalesce(c.relrowsecurity, false) as rls_enabled
  from required r
  left join pg_class c
    on c.relname = r.table_name
   and c.relnamespace = 'public'::regnamespace
   and c.relkind in ('r', 'p')
),
checks as (
  select 'table'::text as category,
    'public.' || table_name as check_name,
    (oid is not null and rls_enabled and
      coalesce(has_table_privilege('authenticated', oid, 'SELECT'),false)) as ready,
    'Table exists, RLS enabled, authenticated SELECT granted'::text as requirement
  from tables

  union all select 'auth', 'auth.users',
    to_regclass('auth.users') is not null,
    'Supabase Auth users table exists'

  union all select 'quota', 'aethr_private.ai_request_quota',
    coalesce((select c.relrowsecurity
      from pg_class c where c.oid=to_regclass('aethr_private.ai_request_quota')),false)
    and coalesce((select not has_table_privilege('authenticated',c.oid,'SELECT')
      from pg_class c where c.oid=to_regclass('aethr_private.ai_request_quota')),false),
    'AI counters in a protected table with RLS and no authenticated SELECT'

  union all select 'quota', 'aethr_private schema access',
    coalesce((select not has_schema_privilege('authenticated',n.oid,'USAGE')
      from pg_namespace n where n.nspname='aethr_private'),false),
    'Authenticated users cannot directly access the internal quota schema'

  union all select 'quota', 'public.consume_ai_quota(text)',
    coalesce(
      to_regprocedure('public.consume_ai_quota(text)') is not null and
      has_function_privilege('authenticated',to_regprocedure('public.consume_ai_quota(text)'),'EXECUTE') and
      not has_function_privilege('anon',to_regprocedure('public.consume_ai_quota(text)'),'EXECUTE'),
    false),
    'AI quota RPC executable only by authenticated, not anon'

  union all select 'deletion', 'workout template exercise FK',
    exists (
      select 1 from pg_constraint c
      where c.conrelid=to_regclass('public.workout_template_exercises')
        and c.confrelid=to_regclass('public.exercises')
        and c.conname='workout_template_exercises_exercise_id_fkey'
        and c.contype='f' and c.confdeltype='c'
    ),
    'Exercise-to-template foreign key cascades on account deletion'
)
select category, check_name, coalesce(ready,false) as ready, requirement
from checks
order by category, check_name;
