# Phase 14 — Live Supabase staging validation

## Current status

Phase 13 verified PostgreSQL policies in an isolated CI database. Phase 14 adds a **separate opt-in, read-only Data API and Auth verification** for a **confirmed staging project** using two real staging-only test accounts.

The connected account contains multiple Supabase projects. The currently active project was inspected **read-only** and has tables named `decks`, `notes`, and `profiles`, not the 13-table AETHR schema. Another project is paused. Neither has been conclusively linked to AETHR. **Do not apply migrations to either project based on the project name or creation date.** No database migration or live-data modification is performed by this phase.

## Prerequisites — verify the target FIRST

1. In the dashboard for the intended **non-production** AETHR project, confirm its project ref and URL. Do not resume or upgrade paused projects without reviewing their cost and purpose.
2. Use `supabase/verify_security.sql` **only in the verified staging project** for a read-only inventory of tables, RLS flags, policies and grants.
3. Apply any missing AETHR migrations to staging only after inspecting existing schema/history, backing up, and confirming the target. The expected files are `schema.sql`, `phase2.sql`, `phase4.sql`, `phase5.sql`, `phase6.sql`, `phase8.sql` and `phase9.sql`; do not blindly replay these against a populated database.
4. Create **two separate staging-only Auth users** (prefer verified emails) and give each its own synthetic, non-sensitive test record in **each of the 13 AETHR data tables**. Include one template with a template exercise per account, a workout session with a set, and a GPS activity with a route point. Seed using authenticated sessions, not someone else's data or a service-role key inside the application.
5. Obtain a Supabase **publishable key** (or legacy `anon` key), not a secret or service-role key.

## Run locally (Node.js 22+)

Create a local `.env.staging.local` file (already ignored by Git), with these entries **filled in privately**:

```dotenv
AETHR_STAGING_CONFIRM=I_HAVE_VERIFIED_THIS_IS_STAGING
AETHR_STAGING_PROJECT_REF=<the confirmed project ref>
AETHR_STAGING_SUPABASE_URL=https://<the confirmed project ref>.supabase.co
AETHR_STAGING_SUPABASE_PUBLISHABLE_KEY=<publishable key>
AETHR_TEST_A_EMAIL=<staging test A email>
AETHR_TEST_A_PASSWORD=<staging test A password>
AETHR_TEST_B_EMAIL=<staging test B email>
AETHR_TEST_B_PASSWORD=<staging test B password>
```

**Do not commit or paste this file, any key, or any password into a pull request, issue, or chat.** On a local Node.js 22 installation:

```bash
npm ci
node --env-file=.env.staging.local scripts/verify-supabase-staging.mjs
```

Or use `npm run verify:staging` if your shell supplies the environment variables securely.

### What the tool verifies

- Confirmed project-ref / URL matching and a publishable or `anon` key (it rejects secret/service-role keys).
- Authentication as two independent staging users, with identities checked via `auth.getUser()`.
- For every table: a **real readable fixture for each user**, private row invisible to the other user in **both directions**, and no anonymous read access to those records.
- Private child-table policy checks for template exercise records, workout sets and GPS route points, using their actual seeded IDs.
- No application-table `INSERT`, `UPDATE`, or `DELETE` requests. Authentication creates and then signs out test sessions.
- Failure on missing tables, missing Data API access, missing fixture records, unauthenticated exposure or cross-account exposure. A missing fixture is reported **INCONCLUSIVE** and does not qualify as a pass.
- Output lists table names and pass/fail status only, not profile data, route coordinates, personal records, tokens or passwords.

### Limitations and launch blockers

This is a **read-only** verifier. It does **not** prove UPDATE/DELETE/INSERT ownership policies work through the actual Data API, confirm migrations against all earlier Supabase snapshots, test mobile sign-up/verification/password reset, or replace the Supabase Security Advisor. Phase 13's disposable PostgreSQL tests provide write-policy coverage without real user data.

Before public release, stage an end-to-end test with two accounts for create/update/delete denial, check RLS grants through the SQL inventory and Security Advisor, and verify login/logout, GPS permission failure, camera/microphone permissions and app installation on iPhone Safari. Review AI cost limits, data export and deletion, and privacy requirements in `RELEASE_CHECKLIST.md`.

**Never run `tests/db/bootstrap.sql`, `tests/db/seed.sql`, or `tests/db/isolation.sql` on a live Supabase project.** They are for disposable CI PostgreSQL only.

## Phase 15 staging prerequisite

If Phase 15 code is deployed without `supabase/phase15.sql` on the **correct** project, AI meal parsing and voice transcription intentionally respond with HTTP 503 (and manual meal logging remains available). Use only a verified AETHR staging project, inspect existing migrations, then run the Phase 15 SQL. Test two-account quotas and the absence of anonymous RPC privileges before using an OpenAI key in public production.
