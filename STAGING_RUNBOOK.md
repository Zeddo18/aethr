# AETHR Phase 20–21 — Staging integration runbook

## 1. Verified staging environment

### Supabase
- Project: `aethr-staging`
- Region: Singapore (`ap-southeast-1`)
- Project ref: `qdbcdgtdkalashttdagt`
- API origin: `https://qdbcdgtdkalashttdagt.supabase.co`
- Database: PostgreSQL 17
- Status at last check: active and healthy

This is the dedicated non-production AETHR project. Never use production accounts or personal health/location data for staging tests.

### Vercel
- Project: `aethr-staging`
- Team: `Flash Card for abby` (explicitly approved by the user)
- Repository: `Zeddo18/aethr`
- Canonical alias: `https://aethr-staging.vercel.app`
- Latest verified deployment: `READY`, main commit `ca98d9a1748a1855fab32ac2f6daa18f9d51ca4a`
- Vercel SSO protection is enabled for non-custom domains. Use only the authorized access path; do not disable or bypass protection.

The Vercel project has these two public client settings configured:
- `NEXT_PUBLIC_SUPABASE_URL` — points to the dedicated staging project.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — contains the staging project's public publishable key.

The project environment listing contained no service-role/secret key or OpenAI key. Do not add either to a `NEXT_PUBLIC_*` variable.

The user reported saving the Supabase Auth Site URL and callback redirect:
- Site URL: `https://aethr-staging.vercel.app`
- Redirect URL: `https://aethr-staging.vercel.app/auth/callback`

The available Supabase management integration cannot read back Auth URL Configuration, so this remains user-confirmed rather than independently verified.

## 2. Database schema and security already applied

Applied to the new, initially empty staging project in this order:

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

Do not replay these migrations blindly. Check migration history and schema first.

Verified previously:
- 13 public application tables exist with RLS enabled.
- Anonymous table and sequence privileges were revoked.
- Signup trigger execution and search path were hardened.
- The authenticated AI quota RPC derives the user from `auth.uid()` and is not executable by `anon`.
- The Phase 19 SQL write-isolation suite passed against this staging database using synthetic accounts; the synthetic fixtures were cleaned up.

## 3. Current Phase 21 account state

Latest read-only query:
- Auth users: 1
- Email-confirmed users: 1
- Users with a recorded sign-in: 0
- Profiles: 1
- Meal entries: 0

The existing account is **not confirmed to be a disposable test account**. Do not use it for integration testing until the user confirms it is safe to treat as disposable.

The read-only verifier needs two independent Auth accounts and a separate synthetic fixture in every one of its 13 required tables. Creating accounts alone is insufficient.

## 4. Protected GitHub environment requirements

The manual workflow is `.github/workflows/verify-staging.yml`. It runs only on explicit `workflow_dispatch` from `main`, uses the protected GitHub environment `aethr-staging`, and requires the exact project ref as an input.

Configure these environment variables in GitHub → Settings → Environments → `aethr-staging`:

- `AETHR_STAGING_APPROVED_PROJECT_REF=qdbcdgtdkalashttdagt`
- `AETHR_STAGING_SUPABASE_URL=https://qdbcdgtdkalashttdagt.supabase.co`
- `AETHR_STAGING_SUPABASE_PUBLISHABLE_KEY` — public publishable key for this staging project
- `AETHR_STAGING_APP_URL=https://aethr-staging.vercel.app`
- `AETHR_STAGING_APP_VERIFIED=I_CONFIRMED_THIS_APP_IS_NOT_PRODUCTION`
- `AETHR_PRODUCTION_APP_URL` — production origin, if one is known and independently verified

Also configure this **environment secret**:

- `VERCEL_AUTOMATION_BYPASS_SECRET` — a project-scoped Vercel Protection Bypass for Automation secret used only by the staging preflight's GET requests.

### Create the Vercel automation secret

The staging Vercel project has SSO protection enabled. GitHub Actions cannot complete the unauthenticated HTTP preflight through that protection unless it presents an approved automation bypass. Keep SSO protection enabled; do not make the staging site public.

1. In Vercel, open the `aethr-staging` project → Settings → Deployment Protection.
2. Under **Protection Bypass for Automation**, create a secret with a note such as `AETHR staging GitHub Actions preflight`.
3. Copy the generated secret once and add it to GitHub → Settings → Environments → `aethr-staging` as the `VERCEL_AUTOMATION_BYPASS_SECRET` environment secret.
4. Do not paste it into ChatGPT, a PR, source code, workflow inputs or logs.
5. Revoke it in Vercel and remove the GitHub environment secret when automated preflight access is no longer needed. Rotate it if exposed.

This token can bypass deployment protection across the Vercel project until revoked. Because this is a dedicated staging project, scope the token to this project only and store it only in the protected GitHub environment. The preflight sends it as the `x-vercel-protection-bypass` HTTP header to the validated staging origin; it is not added to URLs or logged.

Configure these **environment secrets** using two disposable staging-only accounts:

- `AETHR_TEST_A_EMAIL`
- `AETHR_TEST_A_PASSWORD`
- `AETHR_TEST_B_EMAIL`
- `AETHR_TEST_B_PASSWORD`

Use GitHub's secret input UI. Never paste passwords, private keys or service-role keys into ChatGPT, source code, workflow inputs, PRs or logs. Require environment reviewers if available. The GitHub environment settings could not be inspected through the connected GitHub tools; do not assume these values or secrets already exist.

## 5. Prepare synthetic fixtures

After confirming the two accounts are disposable staging-only accounts, create separate synthetic records for both accounts in every table listed in `lib/staging-security.mjs`:

- `profiles`
- `meal_entries`
- `exercises`
- `workout_templates`
- `workout_template_exercises`
- `workout_sessions`
- `workout_sets`
- `activities`
- `activity_route_points`
- `saved_foods`
- `saved_recipes`
- `wellness_logs`
- `reminder_preferences`

Use clearly synthetic values only. Respect foreign-key relationships: template exercises must reference each user's own template and exercise; workout sets must reference each user's own session; route points must reference each user's own GPS activity. Never copy real user data.

## 6. Run the read-only Auth/Data API verifier

1. Open GitHub → Actions → **Verify AETHR Staging (manual)**.
2. Choose branch `main`.
3. Enter project ref exactly: `qdbcdgtdkalashttdagt`.
4. Run only after the protected environment variables/secrets and both test accounts are configured.

The workflow:
- Validates explicit staging identity, HTTPS app origin, public key and separate test accounts.
- Performs staging app GET checks.
- Signs in both accounts with password authentication and independently calls `getUser()`.
- Checks that each account sees its own fixture, cannot see the other account's fixture, and anonymous clients cannot see either account's fixture across all 13 tables.
- Signs out the two temporary local sessions in a `finally` block.
- Does **not** insert, update or delete application rows.

A missing fixture is an inconclusive failure, not an RLS pass.

## 7. Separate write-policy and privacy checks

The read-only Data API workflow does not test INSERT/UPDATE/DELETE. Phase 19's disposable PostgreSQL suite and the Phase 20 staging SQL execution already exercised database write isolation, but real Authenticated Data API write behavior remains a separate Phase 21 gate.

Run any real Data API write tests only with disposable staging users and synthetic fixtures. Verify denied attempts and re-read the unaffected owner's records. Account deletion is destructive: use only a separately created disposable staging account and verify cleanup. Never run deletion or destructive tests against production or a user's real account.

## 8. Physical iPhone QA and release gates

Use `IPHONE_QA.md` with a physical iPhone and synthetic staging data. Test Safari, Add to Home Screen, accessibility, camera/microphone/location permission denial, network loss, foreground-only GPS, export/deletion and backup/restore.

Public release remains blocked until Phase 21, physical iPhone QA, AI provider global budgets, privacy review and production configuration review are complete.
