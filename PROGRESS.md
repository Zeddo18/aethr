# AETHR Development Progress

Updated November 27, 2026. This file summarizes GitHub implementation and staging setup; it is **not** a live-production certification.

## Implemented and merged — Phases 1–19

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
- Phase 16: Account privacy controls, private data export and password-confirmed deletion.
- Phase 17: HTTP smoke verification and iPhone QA readiness.
- Phase 18: Protected, manual-only real-staging readiness workflow.
- Phase 19: Exhaustive disposable-PostgreSQL cross-account UPDATE/DELETE and ownership-transfer regression tests.

## Phase 20 — Dedicated AETHR staging environment (in progress)

- Created a separate Supabase project named `aethr-staging` in Singapore (`ap-southeast-1`), project ref `qdbcdgtdkalashttdagt`. The project is active and healthy. The quoted project creation cost was $0/month.
- Applied the nine reviewed application SQL files in order: base schema, phases 2, 4, 5, 6, 8, 9, 15 and 16. No existing production or unrelated Supabase project was modified.
- Applied `supabase/phase20.sql`: restricted the signup trigger function to Supabase Auth's internal role, fixed its search path, optimized profile/meal RLS expressions, indexed two foreign keys, and revoked anonymous table/sequence access.
- Verified all 13 public application tables have RLS enabled and authenticated SELECT grants; the 18 Phase 18 readiness checks all pass.
- Ran the repository's Phase 19 cross-account write-isolation SQL suite against the actual staging database using two synthetic accounts. Cross-account UPDATE/DELETE and ownership-transfer attempts across the 13 application tables passed; all test users and rows were removed. A separate rolled-back test verified signup profile trigger, private reads, authenticated quota RPC and anonymous denial.
- Remaining: Vercel team/project confirmation, staging deployment and URL, two disposable real Auth accounts, protected GitHub environment variables/secrets, real Data API tests and physical iPhone QA.
- Verified `anon` has no SELECT privilege on any public AETHR table. The security advisor's remaining authenticated SECURITY DEFINER warning is for `public.consume_ai_quota(text)`, intentionally callable by authenticated users only; it has an empty search path, derives the user from `auth.uid()`, accepts no user ID, and is not executable by `anon`. The private quota table's no-policy notice is intentional because it has no client grants or schema access.

## Still required before public launch

1. Complete the separate staging website deployment and confirm its origin is not production.
2. Create two disposable staging Auth accounts and synthetic fixtures in all 13 tables.
3. Run the protected real Auth/Data API staging workflow and separately verify live write isolation.
4. Configure AI provider budgets/abuse controls and verify account export/deletion with disposable staging users.
5. Complete physical iPhone Safari, accessibility, permissions, recovery and backup/restore testing.

**Passing GitHub CI and staging SQL checks do not certify the live website or production.**
