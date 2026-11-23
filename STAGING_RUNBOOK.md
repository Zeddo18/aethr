# Phase 18 — Real staging integration runbook

## What is actually ready

AETHR now has a protected, **manual-only GitHub Actions workflow** which can verify a real deployed **staging** app and two real **staging-only** Supabase Auth accounts without creating, updating, exporting or deleting app data. Run it only after identifying an AETHR non-production database, applying/reviewing the expected migrations, deploying a separate staging app, and seeding *synthetic* records.

**Current blocker (checked November 23, 2026):** The connected active Supabase project has `decks`, `notes`, and `profiles` tables and no recorded migrations—not AETHR's 13-table schema. The other connected project is inactive and its AETHR identity is unverified. No Vercel project named AETHR was found in the connected Vercel account. **Do not guess a project or apply AETHR SQL to those existing databases.**

No live account, service credential, Supabase project or deployment was created or modified as part of this phase.

## Step 1 — Confirm a dedicated staging environment

1. Select or create a **non-production** AETHR Supabase project after reviewing its ownership, purpose and any costs. Record its exact 20-character project reference privately.
2. Inspect the *existing* database/migration history and backup strategy. Only in that verified staging project, review and apply **missing** migration files in this order: `schema.sql`, `phase2.sql`, `phase4.sql`, `phase5.sql`, `phase6.sql`, `phase8.sql`, `phase9.sql`, `phase15.sql`, `phase16.sql`. Do not blindly replay SQL against real data.
3. Run the read-only `supabase/verify_security.sql` and `supabase/verify_staging_readiness.sql` in the confirmed project's SQL editor. The Phase 18 report must show **18 ready = true** checks: 13 public AETHR tables with RLS and authenticated SELECT; Auth; private AI quotas and RPC grants; and the corrected account-deletion foreign key. Address failures before accepting any account test.
4. Use Supabase Security Advisor to inspect exposed tables and policies. SQL metadata checks do not replace testing two real sessions or database access control.
5. Prepare **two distinct staging-only Auth accounts** with synthetic non-sensitive data: one owned fixture in each of the 13 AETHR tables, including a workout template exercise and an activity GPS route point. Do not use production personal health/location data.

## Step 2 — Deploy an isolated staging app

Deploy a **non-production AETHR** app from the reviewed GitHub branch. Match its server environment `NEXT_PUBLIC_SUPABASE_URL` and publishable/`anon` key to the **same verified staging project**. Configure the staging app's `/auth/callback` redirect URL in Supabase Auth settings.

Never put Supabase service-role/secret keys or `OPENAI_API_KEY` into `NEXT_PUBLIC_*` variables, client code, test logs or GitHub issues. **Do not configure account deletion or paid OpenAI usage** until their own production safeguards have been verified. Use HTTPS and protect access to the staging app if it contains data; the smoke test must be able to access the staging login screen.

## Step 3 — Configure a protected GitHub environment

In GitHub repository settings, create the environment **`aethr-staging`**. Enable required reviewers and restrict deployment branches to `main` before adding test credentials.

Set these **environment variables** (not secrets):
- `AETHR_STAGING_APPROVED_PROJECT_REF` — project reference independently confirmed in Step 1
- `AETHR_STAGING_SUPABASE_URL` — `https://<approved-ref>.supabase.co`
- `AETHR_STAGING_SUPABASE_PUBLISHABLE_KEY` — only a Supabase publishable or legacy `anon` key; never a service-role key
- `AETHR_STAGING_APP_URL` — the separate deployed HTTPS staging app origin, without a path
- `AETHR_STAGING_APP_VERIFIED` — the exact text `I_CONFIRMED_THIS_APP_IS_NOT_PRODUCTION`
- `AETHR_PRODUCTION_APP_URL` — the production HTTPS app origin if one exists; the workflow rejects using that origin as staging

Set these four **environment secrets** (all data must belong to disposable staging users):
- `AETHR_TEST_A_EMAIL`
- `AETHR_TEST_A_PASSWORD`
- `AETHR_TEST_B_EMAIL`
- `AETHR_TEST_B_PASSWORD`

Never paste passwords or private API keys into ChatGPT, source code, a PR, or a GitHub Actions manual input.

## Step 4 — Run staging verification (manual only)

Open GitHub → **Actions → Verify AETHR Staging (manual) → Run workflow**. Select `main` and enter the same **approved staging project ref**. The project input must exactly match the independent `aethr-staging` environment variable. The job refuses to proceed if the app is not separately confirmed as non-production, the Supabase project differs, the URL is not HTTPS, or a service-role key is supplied.

It then performs only:

1. **Preflight:** read-only GET checks against deployed staging `/login`, protected `/dashboard`, `/manifest.webmanifest` and a signed-out API endpoint. No cookies or secrets are transmitted to the deployed app.
2. **Auth/Data API:** sign in two test accounts through the Supabase **public** key; query their existing owned fixtures, check both directions of cross-account read isolation and anonymous access in all 13 tables, then sign out. No app-table INSERT/UPDATE/DELETE is performed.

The workflow is **NOT** triggered by PRs or main pushes, and does not run without a protected environment and its test credentials. CI's normal PostgreSQL tests still use an isolated disposable local database, not your actual project.

## Step 5 — What remains manual

- Real authenticated app workflows on iPhone Safari and Add to Home Screen
- Two-account Data API **write** permissions (create/update/delete), including failed cross-account attempts
- Verified, deliberately disposable staging account-deletion tests; backup/restore checks
- Camera/microphone/GPS permission denial, network loss, accessibility
- AI provider budget/monitoring and privacy/retention review

See `IPHONE_QA.md`, `STAGING_SECURITY.md`, `ACCOUNT_PRIVACY.md` and `RELEASE_CHECKLIST.md`.

**Passing simulated GitHub CI is not evidence the app has actually connected to Supabase. Passing the opt-in staging workflow will verify read-only Auth and API isolation only, not a public-launch signoff.**


## Phase 19 — CI write-isolation coverage

Before any live test environment is available, GitHub CI now runs an additional synthetic PostgreSQL suite that checks cross-account UPDATE/DELETE denial and owner/parent reassignment across all 13 AETHR data tables. This catches regressions in the SQL policy definitions without touching a connected Supabase project.

This is **not** a substitute for real Supabase Data API write tests. The manual staging workflow introduced in Phase 18 currently checks read isolation only. Do not describe Phase 19's CI results as proof that live INSERT/UPDATE/DELETE behavior has been verified.
