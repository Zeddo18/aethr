-- Run ONLY inside the disposable GitHub Actions PostgreSQL service.
-- All existing AETHR SQL schema files must have been applied first.
-- Two synthetic users are seeded solely to verify RLS, never real health data.

insert into auth.users(id, raw_user_meta_data) values
('11111111-1111-4111-8111-111111111111', '{"display_name":"Test A"}'::jsonb),
('22222222-2222-4222-8222-222222222222', '{"display_name":"Test B"}'::jsonb);

insert into public.meal_entries(user_id,meal,name,calories) values
('11111111-1111-4111-8111-111111111111','lunch','Meal A',100),
('22222222-2222-4222-8222-222222222222','lunch','Meal B',100);

insert into public.exercises(id,user_id,name) values
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111','Exercise A'),
('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222','Exercise B'),
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',null,'Shared Example');

insert into public.workout_templates(id,user_id,name) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Template A'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','Template B');

insert into public.workout_template_exercises(template_id, exercise_id) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','dddddddd-dddd-4ddd-8ddd-dddddddddddd');

insert into public.workout_sessions(id,user_id,title) values
('ffffffff-ffff-4fff-8fff-ffffffffffff','11111111-1111-4111-8111-111111111111','Session A'),
('00000000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','Session B');

insert into public.workout_sets(user_id,session_id,exercise_name,set_number,repetitions) values
('11111111-1111-4111-8111-111111111111','ffffffff-ffff-4fff-8fff-ffffffffffff','Exercise A',1,8),
('22222222-2222-4222-8222-222222222222','00000000-0000-4000-8000-000000000002','Exercise B',1,8);

insert into public.activities(id,user_id,activity_type,started_at,duration_seconds,distance_km,source) values
('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','walk',now(),120,0.3,'gps'),
('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','walk',now(),120,0.3,'gps');

insert into public.activity_route_points(activity_id,user_id,sequence_number,latitude,longitude,recorded_at) values
('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',0,0,0,now()),
('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222',0,0,0,now());

insert into public.saved_foods(user_id,name,calories_100g,protein_100g,carbs_100g,fat_100g) values
('11111111-1111-4111-8111-111111111111','Food A',100,5,10,1),
('22222222-2222-4222-8222-222222222222','Food B',100,5,10,1);

insert into public.saved_recipes(user_id,name,ingredients) values
('11111111-1111-4111-8111-111111111111','Recipe A','[{"name":"Food A","grams":100}]'),
('22222222-2222-4222-8222-222222222222','Recipe B','[{"name":"Food B","grams":100}]');

insert into public.wellness_logs(user_id,log_date,notes) values
('11111111-1111-4111-8111-111111111111','2026-11-23','A private note'),
('22222222-2222-4222-8222-222222222222','2026-11-23','B private note');

insert into public.reminder_preferences(user_id,enabled,reminder_kind) values
('11111111-1111-4111-8111-111111111111',true,'check_in'),
('22222222-2222-4222-8222-222222222222',true,'rest');

-- The test roles have explicit table privileges: RLS, not missing grants, must
-- be responsible for preventing cross-account access.
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
