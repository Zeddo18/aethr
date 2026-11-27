# AETHR Phase 18–20 — Real staging integration runbook

## Current staging environment

A dedicated Supabase staging project has been created and its database schema installed.

- Project: `aethr-staging`
- Region: Singapore (`ap-southeast-1`)
- Project ref: `qdbcdgtdkalashttdagt`
- API URL: `https://qdbcdgtdkalashttdagt.supabase.co`
- Status: active and healthy
- Database: PostgreSQL 17
- Project creation quote: $0/month

This is a separate non-production project. Do not point the production AETHR website or real personal accounts at it.

## Applied SQL files

The following reviewed files were applied in order to the new, initially empty staging project:

1. `supabase/schema.sql`
2. `supabase/phase2.sql`
3. `supabase/phase4.sql`
4. `supabase/phase5.sql`
5. `supabase/phase6.sql`
6. `supabase/phase8.sql`
7. `supabase/phase9.sql`
8. `supabase/phase15.sql`
9. `supabase/phase16.sql`
10. `supabase/phase20.sql`

Never blindly replay these files against a different or non-empty project. Review its migration history and schema first.

## Verified database state

- 13 public AETHR tables exist, all with RLS enabled.
- All 18 Phase 18 readiness checks pass, including authenticated SELECT grants, Auth, private quota protection, quota RPC grants and account-deletion FK.
- Signup trigger function has an empty search path and is executable only by `supabase_auth_admin` (besides its owner); it is not callable by `anon`, `authenticated` or `service_role`.
- `consume_ai_quota(text)` is executable by authenticated users only, not anonymous users. Its SECURITY DEFINER behavior is intentional: it derives identity from `auth.uid()`, accepts no caller-supplied user ID, and uses an empty search path.
- A synthetic SQL transaction tested the signup profile trigger, account A's private meal read, cross-account UPDATE/DELETE denial, ownership-transfer denial, authenticated quota reservation and anonymous read denial. The transaction rolled back all synthetic users and records.
- The Supabase Security Advisor still reports an informational no-policy notice for the private quota table (intentional: no client grants or schema access) and an authenticated SECURITY DEFINER warning for the quota RPC (intentional and restricted as above).
- Performance Advisor may report unused indexes while the new staging tables are empty; this is expected before real workload.

These checks do not replace two real Supabase Auth sessions and Data API tests.

## Next: deploy a separate staging app

Create a Vercel project connected to `Zeddo18/aethr` in an explicitly approved team. The Vercel connection currently shows a team named `Flash Card for abby`, with no AETHR project. Confirm that this is the intended team before creating anything there.

Set only the following public client configuration for the staging deployment:

- `NEXT_PUBLIC_SUPABASE_URL=https://qdbcdgtdkalashttdagt.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or the modern publishable key for this staging project

Never put a Supabase service-role/secret key or `OPENAI_API_KEY` in any `NEXT_PUBLIC_*` variable, browser bundle, test log or GitHub issue. Do not configure account deletion or paid AI usage until their server-side safeguards and global provider budget are separately reviewed.

Configure the staging app's `/auth/callback` redirect URL in Supabase Auth. Use a dedicated staging domain/origin and ensure it is not the production AETHR origin.

## Protected GitHub environment

Create the GitHub environment `aethr-staging`, require reviewers and restrict deployments to `main`.

Environment variables:

- `AETHR_STAGING_APPROVED_PROJECT_REF=qdbcdgtdkalashttdagt`
- `AETHR_STAGING_SUPABASE_URL=https://qdbcdgtdkalashttdagt.supabase.co`
- `AETHR_STAGING_SUPABASE_PUBLISHABLE_KEY` — the staging project's publishable/anon key
- `AETHR_STAGING_APP_URL` — the separate HTTPS staging app origin
- `AETHR_STAGING_APP_VERIFIED=I_CONFIRMED_THIS_APP_IS_NOT_PRODUCTION`
- `AETHR_PRODUCTION_APP_URL` — production origin, if one exists

Environment secrets (two disposable staging-only accounts):

- `AETHR_TEST_A_EMAIL`
- `AETHR_TEST_A_PASSWORD`
- `AETHR_TEST_B_EMAIL`
- `AETHR_TEST_B_PASSWORD`

Never paste passwords or private keys into ChatGPT, source code, a PR, or a workflow input.

## Run the protected staging workflow

GitHub → Actions → Verify AETHR Staging (manual) → Run workflow. Select `main` and enter the approved project ref exactly.

The workflow performs signed-out app GET checks and read-only two-account Supabase Auth/Data API isolation checks over all 13 tables. It does not perform Data API INSERT/UPDATE/DELETE.

After that workflow passes, separately verify real authenticated write isolation with two disposable accounts. Never use production accounts or real health/location data as test fixtures.

## Physical iPhone QA and release gates

Use `IPHONE_QA.md` with a real iPhone and synthetic staging data. Test Safari, Add to Home Screen, accessibility, camera/microphone/location permission denial, network loss, GPS foreground behavior, account export/deletion and backup/restore. Public release remains blocked until these checks and the production project configuration are independently verified.
