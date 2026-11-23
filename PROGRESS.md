# AETHR Development Progress

Updated November 23, 2026. This file summarizes GitHub implementation; it is **not** a live-production certification.

## Implemented and merged — Phases 1–16

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
- Phase 14: Opt-in staging Supabase Auth/Data API verification tool.
- Phase 15: Database-backed AI request quotas and fail-closed spending protection.

## Phase 16 — Account privacy controls (merged)

- Download an account-owned JSON data export covering all 13 app data tables, including private GPS and workout template details. Queries are scoped to the signed-in user, paginated, and error if incomplete.
- Delete an account only with current-password re-verification, an exact confirmation phrase, a same-origin request and a server-only Supabase Admin key.
- Correct the Phase 4 workout-template foreign key using `supabase/phase16.sql` so deleting a user does not leave exercise references that block account removal.
- Verify the database ON DELETE CASCADE behavior with two synthetic users in disposable PostgreSQL CI.
- See `ACCOUNT_PRIVACY.md` for setup, limits and requirements. Live account deletion is **not enabled** until the correct deployment and privileged key are verified.

## Phase 17 — Live integration and iPhone readiness

- Add a production-server HTTP smoke check to GitHub CI after the build: login/register, protected page redirects, JSON 401/no-store API responses, mobile viewport metadata, PWA manifest/icons and security headers.
- Correct middleware so the public install manifest loads without signing in and logged-out APIs return JSON errors rather than HTML redirects.
- Add `IPHONE_QA.md` with clear staging, permissions, GPS, accessibility and real-iPhone acceptance steps. **Actual physical iPhone tests remain pending** until a staging deployment is available.
- Do not configure secrets, apply migrations, or deploy to unverified Supabase projects. The GitHub CI server uses placeholder environment variables.

## Still required before public launch

1. Identify the correct AETHR Supabase staging/production project; do not use unrelated connected projects.
2. Apply/review missing migrations to staging, then verify real Auth, RLS and Data API isolation with two test accounts.
3. Configure `supabase/phase15.sql` for AI quota enforcement and separate global OpenAI budgets/abuse controls.
4. Validate the personal export and deletion UI with **disposable staging accounts only** and document backup/provider retention.
5. Complete iPhone Safari, accessibility, privacy, recovery and backup/restore testing.

**GitHub CI passing and code being merged do not mean that live databases or production deployment are configured.**
