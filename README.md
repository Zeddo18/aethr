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

## Phase 8 — Recovery & Wellness (draft)

Run `supabase/phase8.sql` after the initial schema to create a private `wellness_logs` table with row-level policies.

Visit `/recovery` from the Today dashboard or the desktop sidebar. Choose a date and optionally record bedtime, wake time, energy, subjective rest, preferred activity/rest, and notes. Time inputs use the device's local timezone. The app calculates recorded sleep duration from the entered times, supports overnight intervals, and lets users edit or delete their check-ins. No mandatory daily entries, readiness score, medical diagnosis or personalized treatment advice are generated.

Security: every database operation is scoped to the authenticated user's ID, with Supabase RLS as a second protection layer. Do not expose this journal in public dashboards or AI requests without separate informed consent.

Run `npm ci && npm test && npx tsc --noEmit && npm run build`. Manually verify authenticated create/update/delete, ownership isolation, local/overnight times, and iPhone Safari before merging.

Phase 4 (#3), 5 (#4), 6 (#5) and 7 (#6) remain separate draft pull requests. Phase 8 is independent of their migrations.
