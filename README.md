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
