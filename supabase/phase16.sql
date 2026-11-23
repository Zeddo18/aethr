-- Phase 16 — Make account deletion preserve referential integrity.
-- Apply ONLY to the verified AETHR staging database after reviewing migrations.
-- The original Phase 4 FK used the default NO ACTION and blocked deletion of
-- auth.users when a user's personal exercise was referenced by a template.
-- ON DELETE CASCADE removes dependent template links when that exercise goes
-- away, including during a full user-account cascade.
--
-- Atomic DDL: if the new FK fails validation, the previous FK is restored.
begin;

alter table public.workout_template_exercises
  drop constraint if exists workout_template_exercises_exercise_id_fkey;

alter table public.workout_template_exercises
  add constraint workout_template_exercises_exercise_id_fkey
  foreign key (exercise_id)
  references public.exercises(id)
  on delete cascade;

commit;
