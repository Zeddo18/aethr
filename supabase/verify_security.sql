-- READ-ONLY catalog inventory for a verified AETHR Supabase project.
-- Run in the SQL editor ONLY after confirming the project; creates no objects
-- and reads NO personal records. RLS flags and policy counts alone are not a
-- substitute for actual two-account tests.
with required(table_name) as (
  values ('profiles'),('meal_entries'),('exercises'),
         ('workout_templates'),('workout_template_exercises'),
         ('workout_sessions'),('workout_sets'),('activities'),
         ('activity_route_points'),('saved_foods'),('saved_recipes'),
         ('wellness_logs'),('reminder_preferences')
)
select
  r.table_name,
  c.oid is not null as table_exists,
  coalesce(c.relrowsecurity, false) as rls_enabled,
  (select count(*) from pg_policies p
   where p.schemaname='public' and p.tablename=r.table_name) as policy_count,
  case when c.oid is null then null else
    has_table_privilege('authenticated', c.oid, 'SELECT') end as authenticated_select_granted,
  case when c.oid is null then null else
    has_table_privilege('authenticated', c.oid, 'INSERT') end as authenticated_insert_granted,
  case when c.oid is null then null else
    has_table_privilege('anon', c.oid, 'SELECT') end as anon_select_granted
from required r
left join pg_class c on c.relname = r.table_name
left join pg_namespace n on n.oid = c.relnamespace and n.nspname='public'
where c.oid is null or n.oid is not null
order by r.table_name;
