
# AETHR — Phase 1

1. `npm install`
2. Create a Supabase project, run `supabase/schema.sql` in the SQL editor.
3. `cp .env.example .env.local` and fill in the URL + anon key.
4. In Supabase → Auth → URL Configuration, add `http://localhost:3000/auth/callback` as a redirect URL.
5. `npm run dev` (open on your iPhone via your LAN IP) · `npm test` · `npm run build`

## Phase 3: AI-assisted food logging (review branch)

1. Add `OPENAI_API_KEY` to your local `.env.local` (never commit it).
2. Optional: set `OPENAI_MODEL` to a compatible multimodal OpenAI model.
3. Run `npm ci && npm test && npx tsc --noEmit && npm run build`.
4. Visit `/assistant` while signed in. Describe ingredients or photograph a meal.
5. Select a matching food, verify its weight and nutrition values, then tap **Confirm and save**.
6. Voice input records a short clip and sends it to the configured transcription API. Microphone permission and HTTPS/localhost are required.

**Current limits:** The assistant provides meal parsing, photo ingredient identification, voice transcription and confirmation-based food logging. It does not yet offer general conversational history or persistent AI chat. Food label matches are from community-maintained Open Food Facts; confirm brand and raw/cooked preparation. Meal time is displayed for review but the current database only stores the date. No AI request automatically writes meal data.

**Security:** Keep OpenAI keys server-side. Enable cost limits/rate limiting and run authenticated end-to-end tests before public production use.

## Phase 5: Running and walking (review branch)

1. Apply `supabase/phase5.sql` in the Supabase SQL Editor.
2. Sign in and open `/run`. Log runs, walks, or treadmill activity with distance (km), duration, start date/time and optional notes.
3. Outdoor GPS is **optional**. Use Safari with HTTPS and allow geolocation. Keep the app in the foreground while recording.
4. Tap Stop, review the measurements, and explicitly save the activity and route. Routes are stored under user-specific RLS.
5. GPS routes can be deleted with their activity. The full map/route viewer, background GPS, offline queues and third-party integrations remain future work.

Run `npm test && npx tsc --noEmit && npm run build`. Test permissions, route privacy and database migrations manually before production use. Never publish a user's exact GPS route.

## Phase 6 — Advanced Nutrition (draft PR)

Apply `supabase/phase6.sql` after earlier `schema.sql` and `phase2.sql` in the Supabase SQL editor. Open **Food → Saved foods, recipes & barcode lookup** (`/nutrition/library`).

- Search packaged products by manually typing an 8–14 digit barcode. A camera scanner is optional and depends on BarcodeDetector support, camera permission, and HTTPS; manual entry remains available.
- Check name, brand, and nutrition data against the actual packaging. Open Food Facts data is community-maintained and may be inaccurate or incomplete. Missing macros are not silently replaced with zero.
- Save your own foods with complete per-100g calorie/protein/carb/fat figures from a trusted label or source.
- Assemble up to 20 saved-food ingredients into a reusable recipe by entering exact gram weights. Recipe totals are computed from saved ingredient values, not estimated by AI.
- Confirm the portion in grams and select a meal to log a saved food or recipe to your existing diary.
- Common Filipino ingredient search words (kanin, itlog, tokwa, patis, bangus and others) now map to Open Food Facts searches. This is **not** an independently verified Filipino nutrition database.
- Saved records are private under Supabase RLS. Deleting a saved item does not retroactively change diary records.

**Caveats:** Recipe portions use summed ingredient weights; cooking water loss/gain can alter actual cooked weight and must be verified. No offline barcode cache or dedicated nutrition provenance database is included. A camera barcode scan is not guaranteed on iPhone Safari.

Run `npm ci && npm test && npx tsc --noEmit && npm run build`, then test the database schema and RLS manually before merging.

## Phase 7 — Progress Analytics (review branch)

Sign in and open `/progress` or use the **Your 28-day progress** link from the Today dashboard.

- Displays food-logging days and variety of distinct food names.
- Displays completed gym sessions (only sessions with `finished_at`).
- Displays running, walking and treadmill activity counts, total logged distance and time.
- Shows four weeks of accessible bar charts and a day-by-day log, using `Asia/Manila` for session dates.
- No weight-loss goals, performance rankings, calorie-deficit advice or mandatory streaks.
- Reports missing data categories when Phase 4 or Phase 5 tables are not yet installed.
- Only queries the current user's records, with Supabase RLS providing an additional layer of protection.

**Dependencies:** Phase 2 food logging is already in `main`; gym figures require applying `supabase/phase4.sql`, and movement figures require `supabase/phase5.sql` in your own project. These earlier phases have separate open pull requests and are not merged automatically.

**Data limitations:** Each category currently reads at most 1,000 rows for the 28-day period, and the page displays a partial-data notice if that boundary is reached. For larger datasets, implement server-side aggregation and pagination. Workout history is based on session start dates; exercise-level performance analytics are a separate future feature.

Run `npm ci && npm test && npx tsc --noEmit && npm run build`. Real Supabase, RLS, and iPhone Safari verification remain necessary before release.

## Phase 8 — Recovery & Wellness (draft)

Run `supabase/phase8.sql` after the initial schema to create a private `wellness_logs` table with row-level policies.

Visit `/recovery` from the Today dashboard or the desktop sidebar. Choose a date and optionally record bedtime, wake time, energy, subjective rest, preferred activity/rest, and notes. Time inputs use the device's local timezone. The app calculates recorded sleep duration from the entered times, supports overnight intervals, and lets users edit or delete their check-ins. No mandatory daily entries, readiness score, medical diagnosis or personalized treatment advice are generated.

Security: every database operation is scoped to the authenticated user's ID, with Supabase RLS as a second protection layer. Do not expose this journal in public dashboards or AI requests without separate informed consent.

Run `npm ci && npm test && npx tsc --noEmit && npm run build`. Manually verify authenticated create/update/delete, ownership isolation, local/overnight times, and iPhone Safari before merging.

Phase 4 (#3), 5 (#4), 6 (#5) and 7 (#6) remain separate draft pull requests. Phase 8 is independent of their migrations.

## Phase 9 — App experience (draft)

Install AETHR through Safari's **Share → Add to Home Screen**, or the browser's install action where available. AETHR includes a Next.js web app manifest and uses existing app icons. It is **online-only**: offline caching and background sync are not implemented.

Visit `/settings` from the Today dashboard or desktop sidebar. All reminders are **off by default**. Optionally choose a daily in-app reminder time (Philippine time) and a gentle check-in or rest message. The message appears only while the Settings page is open in a visible tab, at most once per tab-session and local day. **There are no push notifications, background timers, email messages or scheduled deliveries.**

Run `supabase/phase9.sql` after the core schema to store private reminder preferences behind authenticated RLS policies. You can turn reminders off whenever you wish.

Run `npm ci && npm test && npx tsc --noEmit && npm run build`. Test user authorization, settings persistence, manifest installation and iPhone Safari. Do not merge without manual validation.

## Phase 10 — Launch readiness

This review branch introduces baseline response security headers, updates GitHub CI to Node.js 22, and adds informational production dependency auditing. See [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) for detailed release blockers and staging verification steps.

**Not ready for production yet.** Phases 4–9 are merged into main; database migrations and end-to-end testing are still required before a public launch. Supabase RLS, AI per-user rate limits and billing controls, user data export/deletion, real iPhone testing, security advisories and privacy disclosures require completion. Do not infer production readiness from a green CI build alone.

## Phase 14 — Live Supabase staging verification

After Phases 11–13 security CI, AETHR adds an **opt-in read-only staging Auth/Data API verifier** at `scripts/verify-supabase-staging.mjs` with synthetic two-account test fixtures. It refuses unconfirmed project refs and non-public keys, fails closed when private fixture records or Data API grants are missing, and does not mutate application tables.

**Do not run it against production or guess which connected Supabase project belongs to AETHR.** Review `STAGING_SECURITY.md` for staged prerequisites and `RELEASE_CHECKLIST.md` for remaining blockers. The production database, real two-account tests, and iPhone permissions remain unverified.

## Phase 15 — AI usage protection (database migration required)

AI meal descriptions/photos and voice transcription now reserve a **per-account token in the database before calling OpenAI**. The default allowance is **12 meal analyses and 4 voice transcriptions per UTC hour** per signed-in user. Concurrent requests share one atomic PostgreSQL counter, including across separate server instances.

- When the allowance is exhausted, the app returns **HTTP 429**. The user can continue logging food manually.
- If Supabase's quota RPC is unavailable or `supabase/phase15.sql` has **not** been applied, AI endpoints return **HTTP 503** instead of risking unmetered charges. Normal meal logging is unaffected.
- Requests are counted when sent, even if the downstream AI provider fails. This intentionally prevents unlimited paid retries.
- Apply `supabase/phase15.sql` **only after confirming the real AETHR staging project** and reviewing migration history. The connected project with `decks` and `notes` is not confirmed as AETHR.
- Database counters live in a non-exposed schema. The `public.consume_ai_quota` function intentionally runs with elevated SQL privileges but takes no user ID, reads `auth.uid()`, performs only bounded counter writes and has execution granted only to authenticated users.
- A per-account limit is **not** a global spending limit. Configure OpenAI organization/project budgets and additional anti-abuse controls before a public launch.

See `PROGRESS.md` for phase status and `RELEASE_CHECKLIST.md` for deployment gates.

## Phase 16 — Account privacy and data controls

Open **Settings → Account and privacy** to download a JSON copy of your owned AETHR records or permanently delete your account after entering the correct password and the exact confirmation phrase.

Data exports cover 13 user-owned tables, including personal GPS route coordinates, and **fail rather than silently omit records** when a query fails or the download exceeds safety limits. Treat downloaded files as private. Account deletion is performed by a server-only Supabase Admin client after password reauthentication, and uses database cascade rules to remove owned app rows.

**Deletion remains disabled (HTTP 503) unless the verified server deployment has a private `SUPABASE_SERVICE_ROLE_KEY`.** Do not expose that key publicly or configure it against an unverified Supabase project. Backups, third-party provider logs and other retention controls still need separate documentation. See `ACCOUNT_PRIVACY.md` for full details, limitations and staging-only verification requirements.
