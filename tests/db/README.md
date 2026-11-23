# Phase 13 — Supabase Security Integration

This directory contains **disposable PostgreSQL tests** for the exact SQL migrations currently in the AETHR repo. It does not require live user health information, paid Supabase compute, project secrets, or a Supabase service-role key.

## Automated in GitHub Actions

The `Verify AETHR` job starts a clean PostgreSQL 16 service, then:
1. Creates a minimal synthetic `auth.users` table and a fake `auth.uid()` function driven by PostgreSQL JWT-context settings.
2. Applies AETHR SQL files in their intended order: `schema.sql`, `phase2.sql`, `phase4.sql`, `phase5.sql`, `phase6.sql`, `phase8.sql`, `phase9.sql`.
3. Creates two fake user accounts and one owned record each in all 13 AETHR data tables (plus a shared public exercise).
4. Grants SELECT access to test roles so an anonymous query is blocked by **RLS itself**, not merely by missing privileges.
5. Asserts that RLS is enabled and policies exist, anonymous reads are empty, each user sees only allowed rows, and malicious cross-owner inserts, updates, and deletes are rejected. This includes workout template references, workout sets, and precise GPS route points.
6. Runs the existing npm security audit, tests, TypeScript validation, and production build.

The CI fixture is **not a full Supabase emulator**. In particular, it uses a simulated JWT rather than the real Auth HTTP gateway. It does not test remote project-specific grants, Data API configuration, migrations already applied in the live project, or mobile browser behavior.

## Live Supabase verification remains separate

The connected Supabase account contains multiple projects, and the GitHub repository does not identify the correct AETHR project ref. Do **not** apply migrations to an arbitrary project.

After explicitly identifying the AETHR staging database:

- Confirm the intended schema is present; use `supabase/verify_security.sql` as a **read-only** security inventory in the verified project's SQL editor.
- Apply missing migrations only after a backup/change review, to a **staging database**, and confirm actual RLS grants and policies in the Supabase Security Advisor.
- Use two real test accounts through the **publishable key and authenticated sessions**, not the service-role key; verify each cannot query or mutate the other's meals, workouts, saved foods, GPS routes, sleep/recovery notes, or reminder preferences.
- Verify logged-out requests are denied, Auth sign-up/login/logout/reset flows work, and the Supabase Data API exposes only intended tables.
- Use iPhone Safari to test denial/revocation of GPS, camera, and microphone access.

**Never execute** `tests/db/bootstrap.sql`, `tests/db/seed.sql`, or `tests/db/isolation.sql` on a real Supabase project. They create disposable roles and synthetic accounts and belong only in isolated CI databases.

Production launch remains blocked until real staging or production RLS/permissions verification is completed.
