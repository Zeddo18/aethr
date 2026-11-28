# AETHR Phase 17 / 21 — iPhone and Staging Acceptance Checklist

**Status:** Automated local browser smoke checks are implemented. The dedicated staging database and Vercel app are provisioned. Real two-account Auth/Data API verification and physical iPhone Safari testing are **not completed**.

AETHR is an iPhone-first fitness and wellness journal. Use **only synthetic data** in the verified non-production staging project. Never use production accounts or real health/location data.

## 1. Verified staging project and test-account preparation

The current dedicated staging targets are:
- Supabase project ref: `qdbcdgtdkalashttdagt` (Singapore).
- Vercel project: `aethr-staging`.
- Staging URL: `https://aethr-staging.vercel.app`.
- Latest verified deployment at this checklist update: `READY`, main commit `ca98d9a1748a1855fab32ac2f6daa18f9d51ca4a`.

The staging schema and migrations through `supabase/phase20.sql` have already been applied. **Do not replay migrations** against this existing database. Check current migration history before any future schema changes. All 13 public application tables have RLS enabled; anonymous table and sequence privileges were revoked.

Before real integration testing:
- [ ] Confirm/create two disposable staging Auth accounts A and B. The existing single confirmed account has not been verified as disposable; do not use it without confirmation.
- [ ] Configure the protected GitHub `aethr-staging` environment variables and secrets from `STAGING_RUNBOOK.md`.
- [ ] Create separate synthetic fixture records for both users in all 13 required tables, preserving foreign-key ownership.
- [ ] Run the manual GitHub **Verify AETHR Staging (manual)** workflow and retain its pass/fail result.
- [ ] Complete separate real Data API write-policy checks with disposable users only.
- [ ] Review Supabase backup/recovery options before any destructive account-deletion test.

## 2. iPhone Safari — navigation and install

Test on a physical iPhone using Safari, including ordinary browser and Add to Home Screen modes:

- [ ] Visit the staging URL signed out. Login and registration load; Dashboard, Food, Gym, Run, AI, Progress, Recovery, Profile and Settings redirect to login.
- [ ] The PWA manifest and app icons load while logged out. Browser Share → **Add to Home Screen** displays AETHR as an installed shortcut.
- [ ] Open from the home screen; verify safe-area spacing at the top and bottom and the five main navigation tabs.
- [ ] Rotate the phone; confirm form fields and bottom tabs do not overlap, crop or hide important content.
- [ ] At increased iOS text sizes, key controls remain readable, keyboard focus is visible and inputs do not cause accidental zoom.
- [ ] Verify page navigation, back/forward, session expiry and sign-out. Check that the login page is accessible after logout.
- [ ] Use VoiceOver and keyboard/switch controls where available; buttons and inputs have useful names and focus order.

## 3. Real staging feature flows

- [ ] **Profile:** sign up, verify email, log in, edit profile, log out and log in again. Verify recovery/reset flows separately.
- [ ] **Food:** add/edit meal, search foods, save custom foods and recipes. AI suggestions require review; manual entry still works if AI is unavailable.
- [ ] **Gym:** start session, log sets and exercises, save template, confirm history persists after refresh.
- [ ] **Run/walk:** log a manual activity; opt in to foreground GPS and confirm the route belongs only to the signed-in account. Do not claim tracking continues with Safari backgrounded or phone locked.
- [ ] **Recovery:** save a wellness check-in, reload it and delete it. Confirm account B cannot see it.
- [ ] **Progress:** verify summaries reflect synthetic saved sessions; no other account's results appear.
- [ ] **Reminders:** enable a reminder and verify its in-app behavior only while the page is open and visible. These are not push notifications.
- [ ] **AI:** test short text, photo and audio parsing; deny camera/microphone permission, disconnect from the network and reach the usage limit. Manual logging remains available.
- [ ] **Account privacy:** export JSON with synthetic meal and route records; verify privacy. Test password confirmation and account deletion only on a disposable staging account.

## 4. Permissions and connection failure

- [ ] Reject camera permission; the app still accepts manual barcode or food entry.
- [ ] Reject microphone permission; manual typing remains available.
- [ ] Reject or revoke location permission; manual activity logging still works.
- [ ] Disable network/Wi-Fi during a save and verify errors are understandable. Offline logging is not implemented.
- [ ] Check foreground-only GPS claims and private route visibility.
- [ ] Confirm server responses are JSON HTTP 401 for signed-out API requests, not HTML login redirects, and that the PWA manifest remains public.

## 5. Acceptance and release evidence

Record actual device model, iOS/Safari version, test account labels (never passwords), testing date, staging URL's non-secret project ref, screenshots with all personal data removed, and any failing steps.

- [ ] All critical iPhone checks completed on real hardware.
- [ ] No unresolved cross-account data leaks or privilege errors.
- [ ] Account export and deletion work in staging, with required secrets limited to server configuration.
- [ ] Backup/restore, global AI budgets, and privacy notice reviewed.
- [ ] Only after all above pass, review public release readiness with `RELEASE_CHECKLIST.md`.

## What GitHub Actions actually verifies

`npm run verify:smoke` starts only a local built Next.js test server. It checks login/registration HTML, mobile viewport and installation metadata, public manifest/icons, logged-out redirects, logged-out API HTTP 401 JSON, no-store responses, and security headers. It uses placeholder Supabase values and does **not** authenticate real users or contact the intended live AETHR project. The manual Phase 21 staging workflow performs real Auth and read-only Data API checks only after its protected credentials and synthetic fixtures are configured. Passing GitHub CI is not completion of actual iPhone testing.
