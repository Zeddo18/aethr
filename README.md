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
## Phase 10 — Launch readiness

This review branch introduces baseline response security headers, updates GitHub CI to Node.js 22, and adds informational production dependency auditing. See [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) for detailed release blockers and staging verification steps.

**Not ready for production yet.** Phases 4–9 are separate review PRs; they must be integrated and tested together before a public launch. Supabase RLS, AI per-user rate limits and billing controls, user data export/deletion, real iPhone testing, security advisories and privacy disclosures require completion. Do not infer production readiness from a green CI build alone.
