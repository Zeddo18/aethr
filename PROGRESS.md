# AETHR Development Progress

Updated November 28, 2026. This file summarizes verified repository and staging state; it is **not** a live-production certification.

## Implemented and merged — Phases 1–20

- Phase 1: App foundation and Supabase authentication.
- Phase 2: Food diary and nutrition logging.
- Phase 3: AI-assisted food logging with confirmation.
- Phase 4: Gym Tracker — sessions, exercise sets, templates and history.
- Phase 5: Run/walk/treadmill logging, optional foreground GPS.
- Phase 6: Saved foods, recipes and barcode lookup.
- Phase 7: Progress analytics.
- Phase 8: Recovery and wellness journal.
- Phase 9: App settings, optional reminders and installation experience.
- Phase 10: Launch-readiness checklist and automated checks.
- Phase 11: Production dependency security remediation.
- Phase 12: Development dependency audits and toolchain upgrade.
- Phase 13: PostgreSQL migrations and two-account RLS tests in CI.
- Phase 14: Opt-in staging Supabase Auth/Data API read-only verification.
- Phase 15: Database-backed AI request quotas and fail-closed spending protection.
- Phase 16: Account privacy controls, private data export and password-confirmed deletion.
- Phase 17: HTTP smoke verification and iPhone QA readiness.
- Phase 18: Protected, manual-only real-staging readiness workflow.
- Phase 19: Exhaustive disposable-PostgreSQL cross-account UPDATE/DELETE and ownership-transfer regression tests.
- Phase 20: Dedicated staging Supabase project, security hardening, separate Vercel staging project and deployment.

## Phase 20 — dedicated staging environment (provisioned)

### Supabase
- Dedicated project: `aethr-staging`, Singapore (`ap-southeast-1`), project ref `qdbcdgtdkalashttdagt`.
- Project is active and healthy; database is PostgreSQL 17.
- Applied the reviewed base schema and phase migrations in order: `schema.sql`, `phase2.sql`, `phase4.sql`, `phase5.sql`, `phase6.sql`, `phase8.sql`, `phase9.sql`, `phase15.sql`, `phase16.sql`, and `phase20.sql`.
- All 13 public application tables have RLS enabled. Anonymous table and sequence privileges were revoked.
- The signup trigger function has an empty search path and restricted execution grants. The authenticated AI quota RPC is restricted to authenticated users and derives identity from `auth.uid()`.
- The Phase 19 SQL write-isolation suite was run against this staging database with synthetic accounts; cross-account write and ownership/parent reassignment checks passed. Synthetic users and records were cleaned up.
- No production or unrelated Supabase project was modified.

### Vercel
- Separate project: `aethr-staging`, in the user-approved `Flash Card for abby` team.
- Connected repository: `Zeddo18/aethr`.
- Canonical alias: `https://aethr-staging.vercel.app`.
- Latest verified deployment: `READY`, built from main commit `ca98d9a1748a1855fab32ac2f6daa18f9d51ca4a`.
- Vercel SSO protection is enabled for non-custom domains. Do not bypass or disable it for testing.
- The Vercel project has only the staging Supabase URL and public publishable key configured as `NEXT_PUBLIC_*` variables. No service-role key or OpenAI key was found in the listed project environment variables.
- The staging Supabase Auth Site URL and `/auth/callback` redirect were saved by the user; this setting has not been independently read back through the available Supabase management interface.

## Phase 21 — real Auth/Data API integration (in progress)

### Phase 21 — protected staging preflight code (merged)

- PR #21 merged to main as `563c5acffd4ec563b1abc04617aadf5f8307d0d9`.
- GitHub Actions now passes the project-scoped Vercel automation bypass secret as the `x-vercel-protection-bypass` header to the validated staging origin for GET-only app checks. The token is not placed in URLs or logs.
- Vercel SSO protection remains enabled; no deployment protection settings were weakened.
- Regression tests cover header-only token delivery, normal query strings, missing token behavior and malformed header values.
- PR CI passed: SQL policy tests, dependency audits, 82 unit tests, TypeScript, production build and mobile/server smoke checks.
- The post-merge main deployment on the dedicated staging Vercel project reached `READY`.
- This is implementation readiness only. The Vercel token and four disposable-account GitHub secrets still need to be configured by the project owner, and two disposable accounts plus synthetic fixtures across all 13 tables are still required before real Auth/Data API verification.

### Latest read-only staging check
- `auth.users`: 1 account; 1 email-confirmed account; 0 accounts with a recorded successful sign-in.
- `public.profiles`: 1 profile.
- `public.meal_entries`: 0 rows.
- The existing account has not been verified as a disposable test account. Do not sign in as it, modify it, or treat it as Account A until its owner confirms it is safe for testing.
- Deployed app checks: `/login` returned HTTP 200; `/manifest.webmanifest` returned HTTP 200; the dashboard request resolved to the sign-in page in the available fetch check. The protected staging app is not a substitute for the manual GitHub preflight.

### Remaining gates
1. Confirm or create **two disposable staging-only Auth accounts**. Do not use real personal accounts or personal health data.
2. Configure the protected GitHub environment `aethr-staging` with the non-secret staging identity variables, the Vercel automation bypass secret, and four account credential secrets listed in `STAGING_RUNBOOK.md`. The GitHub environment's current settings could not be inspected with the available integration, so they remain unverified. Keep Vercel SSO protection enabled.
3. Seed separate synthetic fixtures for both users in all 13 application tables. The current Auth count alone is not enough for the read-only verifier to pass.
4. Run the manual `Verify AETHR Staging (manual)` workflow on `main` with the exact approved project ref. It signs in both accounts, independently verifies both sessions, checks own/cross-account/anonymous SELECT visibility and signs out locally. It does not mutate application rows.
5. Separately complete real Data API write-policy verification using disposable fixtures. Do not run destructive tests on real or production accounts.
6. Complete physical iPhone Safari, Add to Home Screen, permissions, accessibility, recovery and backup/restore QA.

**Current blocker:** two confirmed disposable test accounts, their protected GitHub secrets, and per-table synthetic fixtures are not yet available/verified. No credentials should be sent in chat.

## Still required before public launch

- Complete Phase 21 real Auth/Data API and write-isolation checks.
- Complete physical iPhone QA and accessibility/permission testing.
- Review global AI provider budgets, privacy notice, export/deletion and backup/restore.
- Independently verify production configuration and release checklist.

**Passing GitHub CI and staging SQL checks do not certify the live website or production.**
