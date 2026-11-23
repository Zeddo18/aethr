# AETHR launch readiness — release gates

**Current state: NOT CLEARED FOR PUBLIC LAUNCH.**
A successful GitHub Actions build is one gate, not proof of secure, functioning, end-to-end production behavior.

## 1. Merge and migration plan

- [x] Phase 4 Gym PR #3 merged into main (live Supabase testing remains outstanding).
- [x] Phase 5 Run/Walk PR #4 merged into main (GPS permission and privacy tests remain outstanding).
- [x] Phase 6 Advanced Nutrition PR #5 merged into main (nutrition accuracy checks remain outstanding).
- [x] Phase 7 Progress PR #6 merged into main (live-data summaries remain unverified).
- [x] Phase 8 Recovery PR #7 merged into main (database migration and check-in testing remain outstanding).
- [x] Phase 9 App Experience PR #8 merged into main (installation and reminder tests remain outstanding).
- [x] Resolve feature-branch conflicts through Phase 9 and preserve overlapping navigation and README sections.
- [ ] Apply the SQL files **once**, in feature order: schema.sql, phase2.sql, phase4.sql, phase5.sql, phase6.sql, phase8.sql, phase9.sql, verifying tables and policy names against your existing database.
- [ ] Verify migrations on a non-production Supabase project and save a rollback/backup plan before production migration.
- [ ] Re-run full CI after all merged features are combined in main.

## 2. Authentication and data isolation

- [ ] Confirm sign up, email verification, login, logout, password reset and redirect flows.
- [ ] Test all API endpoints logged out: deny access without leaking personal data.
- [ ] With **two test accounts**, verify each cannot read, edit, overwrite, or delete the other's profiles, meals, exercises, sessions, GPS routes, recipes, progress, recovery journals, or reminder settings.
- [ ] Review RLS and database grants for every public table using the Supabase Security Advisor.
- [ ] Verify service-role credentials do not appear in client bundles, repository files, console output, or HTTP responses.
- [ ] Establish a secure, documented process for user data export and account/data deletion before public launch.

## 3. AI safety and spending

- [ ] Configure OPENAI_API_KEY as a **server-only secret** in the deployment environment.
- [ ] Set per-user persistent API request quotas / distributed rate limiting for AI parsing and transcription **before** opening registration publicly.
- [ ] Set OpenAI project budgets/alerts; verify upstream timeouts and request-size ceilings.
- [ ] Test English and Taglish meal parsing, AI failure, uncertain portions, photo permissions, and transcription denial.
- [ ] Confirm every AI nutrition entry requires user review and explicit save.
- [ ] Do not calculate restrictive calorie targets for minors or treat estimates as medical advice.
- [ ] Ensure AI processing and data-retention practices are accurately explained in your privacy notice.

## 4. iPhone / browser manual QA

- [ ] Test iPhone Safari: sign in, profile, food logging, recipes, gym session, rest timer, run/walk activity, recovery and optional reminders.
- [ ] Test 320px, 375px, 390px, and 430px mobile viewports and accessibility text-size enlargement.
- [ ] Test "Add to Home Screen" manifest, icons, viewport safe areas, and back navigation.
- [ ] Test camera, microphone and GPS permissions denied, revoked, and unavailable.
- [ ] Confirm geolocation does not claim background accuracy while Safari is locked or backgrounded.
- [ ] Verify touch controls, keyboard focus, text contrast and VoiceOver labels.
- [ ] Check no personal or GPS location data is publicly visible or included in shared analytics.

## 5. Reliability and operations

- [ ] Run `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run build` and review security audit output.
- [ ] Investigate and remediate **all applicable high/critical npm dependency advisories**; do not run blind forced upgrades.
- [ ] Configure HTTPS, environment variables, redirects and Supabase Auth production URLs.
- [ ] Enable deployment error monitoring with private-data scrubbing and a tested incident response plan.
- [ ] Test backup, restore, and data-export workflows before enabling real users.
- [ ] Test network outage/failure handling; offline food, gym and GPS logging must not be claimed until implemented.
- [ ] Prepare a privacy notice, contact channel and clear feature limitations.
- [ ] Run staging tests with test accounts and non-sensitive demonstration records.

## 6. Release sign-off

Production launch remains blocked until: **all Phase 10 checks pass**, database migrations and owner isolation are verified, high/critical security advisories are addressed, AI rate limiting is implemented, data deletion/export workflows exist, and iPhone end-to-end tests pass.

This checklist is an operational artifact, not an assertion that items have been completed.

## 7. Phase 13 — Supabase integration and tenant isolation

- [ ] Require the disposable PostgreSQL RLS test job to pass on the final `main` commit. It covers all 13 data tables, anonymous reads, ownership spoofing, cross-account mutations, and GPS/workout parent references.
- [ ] Identify the **correct AETHR Supabase project** before any schema changes. Multiple connected projects exist; do not guess the target.
- [ ] Apply/verify missing SQL migrations in a staging project after backup review.
- [ ] Run `supabase/verify_security.sql` in the confirmed project as a **read-only** RLS/grants inventory.
- [ ] Validate real Auth/Data API behavior using two independent authenticated test accounts and one logged-out request.
- [ ] Re-run Supabase Security Advisor; investigate any warnings, then test iPhone Safari end to end.

The CI PostgreSQL JWT context is simulated. Passing those tests does **not** prove live Supabase Auth, Data API grants, or the project-specific migration state is correct. See `tests/db/README.md`.

## 8. Phase 14 — Real Supabase Auth/Data API staging validation

- [x] Add a fail-closed, read-only Auth/Data API verifier and automated mock regression tests.
- [ ] Identify **the correct AETHR staging Supabase project ref**; the currently active connected project has unrelated `decks` and `notes` tables, and the other project is inactive.
- [ ] Audit the confirmed project's actual schema, RLS and grants using `supabase/verify_security.sql` and Supabase Security Advisor.
- [ ] Confirm that the two test accounts have complete, separate synthetic fixture records in all 13 AETHR data tables.
- [ ] Run `node --env-file=.env.staging.local scripts/verify-supabase-staging.mjs` against that verified staging target. A missing table or fixture is **not a pass**.
- [ ] Manually verify cross-account INSERT, UPDATE and DELETE restrictions through actual Auth/Data API sessions, and test iPhone Safari login, data privacy, and permissions.

**Automated CI does not contact the user's Supabase project.** See `STAGING_SECURITY.md`. No live database has been migrated by this phase.

## 9. Phase 15 — AI request spending guard

- [x] Add persistent per-user AI usage limits (12 meal analyses, 4 transcriptions per UTC hour), atomic database counters and fail-closed HTTP responses.
- [x] Add disposable PostgreSQL permission/quota tests and AI endpoint regression tests to CI.
- [ ] Confirm the target AETHR **staging** project and apply `supabase/phase15.sql` in the correct database after the full schema migration review.
- [ ] Validate the quota RPC and HTTP 429/503 behavior through two real staging accounts, including simultaneous requests.
- [ ] Audit the intentional `SECURITY DEFINER` public RPC and confirm `anon` has no EXECUTE privilege and private counters are inaccessible.
- [ ] Configure independent OpenAI spending limits, monitoring, and rate limits at the account/network level; per-user quotas do not protect against mass signup abuse.
- [ ] Test AI provider failure, network loss and manual-food-entry fallback on iPhone Safari.

**The code will fail closed until its database migration is installed. A passing GitHub build does not mean the live AI feature is operational.**
