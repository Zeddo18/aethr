# Phase 16 — Personal data export and account deletion

## What users get

Open **Settings → Account and privacy**.

- **Download my data**: exports a JSON file containing the current signed-in user's profile, meals, personal exercises, workout templates and their exercises, workout sessions and sets, activities and private GPS route points, saved foods and recipes, wellness journal, and reminder preferences.
- **Delete my account**: after typing `DELETE MY ACCOUNT` and confirming the current password, AETHR verifies the account identity again and requests permanent Supabase Auth deletion. The auth-user foreign keys cascade the deletion to the AETHR data tables.
- Both features require a valid Supabase session. The export has `Cache-Control: private, no-store`, and both POST endpoints check same-origin requests.

The export uses a maximum of 50,000 rows per table and a 12 MiB total JSON size limit to avoid server overload. **If any table is missing, a query fails, or the export is too large, no file is presented as complete.** The app shows an error instead; manual support for larger exports must be arranged before public launch. AETHR does not silently truncate records.

The export includes **13 public AETHR account data tables**. It excludes the shared exercise catalog, internal AI quota counters, Supabase Auth credential internals, third-party AI provider logs, and infrastructure backups. Do not promise that a downloaded file contains every record held by every external provider. Take care with the resulting JSON file: it may contain sensitive health entries and precise GPS coordinates.

## Deletion security and configuration

The privileged deletion operation is **server-side only** in `app/api/account/delete/route.ts`.

1. Require an authenticated user from `auth.getUser()`.
2. Reject cross-origin requests and any request without the exact confirmation phrase.
3. Require the current account password, checked by a separate ephemeral Supabase Auth client using `signInWithPassword`.
4. Verify the password corresponds to **the same user ID** as the existing signed-in session.
5. Invoke `auth.admin.deleteUser(user.id, false)` with a server-only Supabase service-role/secret key. The requested user ID is **never accepted from the browser**.
6. If the password is wrong, the privileged key is missing, or the admin deletion fails, do not claim success. After success, attempt to clear the user's session.

Only configure the following environment variable in a **trusted server deployment environment**, never in `NEXT_PUBLIC_*` variables, client code, or a Git commit:

```dotenv
SUPABASE_SERVICE_ROLE_KEY=<server-side privileged Supabase key; keep secret>
```

The server must also have the correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for that **same confirmed AETHR project**. Do not configure the deletion key until the deployment's Supabase target has been verified. The account-deletion route returns HTTP 503 without a valid server-only key, leaving all account data untouched.

**Never send the privileged key to the browser**, include it in `.env.example` with a real value, place it in public app settings, or log it. Do not use an `anon`/publishable key in place of the server key. Configure deployment key access and incident response separately.

## What deletion does and does not cover

**Required Phase 16 schema fix:** Apply `supabase/phase16.sql` to the verified staging project after Phase 4. Its foreign-key change makes `workout_template_exercises.exercise_id` cascade when a personal exercise is deleted; without it, PostgreSQL may reject full account deletion. This issue was caught by the Phase 16 disposable PostgreSQL test before merging. Verify the change and full rollback/backup plan before configuring the server deletion key.

Deleting `auth.users` removes AETHR's data rows that reference that user with `ON DELETE CASCADE`. GitHub CI verifies this behavior on a **disposable PostgreSQL database with synthetic users** and also verifies another user's records are untouched.

Account deletion **does not prove immediate removal** of platform logs, Supabase backups, external service records, files in any future Storage buckets, or backups beyond AETHR's database. Document retention and contact procedures in a real privacy notice before launch. Access tokens may remain valid until their expiry even after deletion; app data no longer exists under the deleted account ID.

This implementation supports **email-and-password users**. If additional authentication methods are introduced, add an equally secure re-verification and deletion path for them before offering those methods. The UI does not accept a different account's ID.

## Pre-launch manual verification

- [ ] Identify the correct AETHR Supabase staging project, and confirm every migration is present.
- [ ] Confirm the staging deployment's deletion secret is server-side and cannot be downloaded or inspected from the browser.
- [ ] With two real disposable staging users, verify export contains all owned entries and GPS routes and **never** the other user's data.
- [ ] Test export failure with a missing migration, failed query, and an export beyond the size cap.
- [ ] Verify logged-out/cross-origin requests are rejected for both endpoints.
- [ ] Test wrong password, missing service key, and correct password + explicit confirmation.
- [ ] **Only with deliberately disposable staging accounts**, test successful deletion and confirm every owned table is emptied while the other account is preserved; then verify re-login fails.
- [ ] Verify backup/log retention, data-subject contact handling, and non-password account flows.
- [ ] Test settings download, file handling, VoiceOver, mobile layout and iPhone Safari permissions.

**No live AETHR database, account, or deployment was modified to build Phase 16.** This is production-code preparation, not an assertion of verified live data deletion.
