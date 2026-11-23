# AETHR Phase 17 — iPhone and Staging Acceptance Checklist

**Status: Automated browser smoke tests are implemented. Physical iPhone Safari testing and live Supabase verification are NOT completed.**

AETHR is an iPhone-first fitness and wellness journal. This checklist is for a real iPhone (or a genuine iOS Safari test environment), using **only synthetic data in a verified, non-production staging Supabase project**.

## 1. Identify the staging project before using real accounts

- [ ] Verify AETHR's exact Supabase project reference and URL in its dashboard. Do **not** assume either currently connected project is AETHR.
- [ ] Review existing SQL migration history and take a staging backup. Apply missing files only to the confirmed staging project: `schema.sql`, `phase2.sql`, `phase4.sql`, `phase5.sql`, `phase6.sql`, `phase8.sql`, `phase9.sql`, `phase15.sql`, and `phase16.sql` in order.
- [ ] Review `supabase/verify_security.sql` and Supabase Security Advisor. Fix privilege/RLS warnings.
- [ ] Create two separate disposable staging accounts (A and B) with non-sensitive test records in each data table.
- [ ] Run the staging Auth/Data API verifier described in `STAGING_SECURITY.md`. This must pass **with real Auth sessions**, not only CI's simulated users.
- [ ] Explicitly verify account A cannot insert, view, change or delete B's records, and vice versa. Test meal entries, gym templates, recovery notes, GPS points and saved recipes.
- [ ] Confirm the Phase 15 request quotas: 12 meal analyses and 4 voice transcriptions per UTC hour per account. Configure an independent **global provider budget**; user quotas alone are not a spend ceiling.
- [ ] Test the Phase 16 data export with synthetic records, then test deletion with a deliberately disposable staging account. Never run destructive tests against production users.

## 2. iPhone Safari — navigation and install

Test on a physical iPhone using Safari, including ordinary browser and Add to Home Screen modes:

- [ ] Visit the staging URL **signed out**. Login and registration load; Dashboard, Food, Gym, Run, AI, Progress, Recovery, Profile and Settings redirect to login.
- [ ] The PWA manifest and app icons can load even while logged out. Browser Share → **Add to Home Screen** displays AETHR as an installed shortcut.
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
- [ ] **Reminders:** enable a reminder and verify its in-app behavior **only while the page is open and visible**. These are not push notifications.
- [ ] **AI:** test short text, photo and audio parsing; deny camera/microphone permission, disconnect from the network and reach the usage limit. Manual logging remains available.
- [ ] **Account privacy:** export JSON with synthetic meal and route records; verify privacy. Test password confirmation and account deletion **only on a disposable staging account**.

## 4. Permissions and connection failure

- [ ] Reject camera permission; the app still accepts manual barcode or food entry.
- [ ] Reject microphone permission; manual typing remains available.
- [ ] Reject or revoke location permission; manual activity logging still works.
- [ ] Disable network/Wi-Fi during a save and verify errors are understandable. **Offline logging is not implemented.**
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

`npm run verify:smoke` starts only a **local built Next.js test server**. The checks cover login/registration HTML, mobile viewport and installation metadata, public manifest/icons, logged-out redirects, logged-out API HTTP 401 JSON, no-store responses, and security headers. They use placeholder Supabase values and do **not** authenticate real users or contact the intended live AETHR project. Passing GitHub CI cannot be described as completion of actual iPhone testing.
