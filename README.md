
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
