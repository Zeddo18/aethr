# AETHR Development Progress

Updated November 23, 2026.

## Completed and merged into main

- Phase 1 — Foundation and Supabase authentication: implemented (live sign-in still needs staging/device testing).
- Phase 2 — Meal diary and food logging: merged.
- Phase 3 — AI-assisted food interpretation with explicit confirmation: merged.
- Phase 4 — Gym workout sets, templates, timers and history: merged.
- Phase 5 — Running, walking and treadmill logs; optional foreground-only GPS: merged.
- Phase 6 — Saved foods, recipes and barcode lookup: merged.
- Phase 7 — Progress analytics: merged.
- Phase 8 — Recovery and wellness journal: merged.
- Phase 9 — Installable app experience and in-app reminders: merged.
- Phase 10 — Launch-readiness checklist and CI gates: merged.
- Phase 11 — Patched nested PostCSS and enforced production dependency audit: merged.
- Phase 12 — Upgraded Vitest/Vite/esbuild and enforced the full dependency audit: merged.
- Phase 13 — Disposable PostgreSQL migration and row-level security tests: merged.
- Phase 14 — Opt-in, read-only staging Auth/Data API verification tool: merged.

## Phase 15 — AI usage protection

- Protect AI meal interpretation and voice transcription with **atomic per-user database quotas**.
- Default limits: **12 meal analyses and 4 voice transcriptions per UTC hour per signed-in account**.
- Return HTTP 429 when the limit is reached, and HTTP 503 when the protection is unavailable.
- Manual food logging remains available; never contact paid OpenAI services when quota verification fails.
- The private counter schema and RPC are defined in `supabase/phase15.sql`.
- Verify the migration, cross-account independence, table privileges and limits in disposable PostgreSQL CI before merging.
- **Live AETHR Supabase project remains unidentified. The Phase 15 SQL migration has NOT been applied to a live project.**

## Next release blockers

1. Identify and prepare the correct AETHR staging Supabase project; never apply schema migrations to an unrelated connected project.
2. Apply and validate the existing AETHR SQL setup files, plus Phase 15 after it merges.
3. Run the live two-account Auth/Data API verification and check real read/write isolation.
4. Add global AI spend caps/abuse protection; per-user quotas alone do not prevent abuse across many accounts.
5. Implement secure data export/deletion, test real iPhone Safari permissions and app flows, and complete `RELEASE_CHECKLIST.md`.

**Passing automated checks and merging GitHub code is not production deployment or live database verification.**
