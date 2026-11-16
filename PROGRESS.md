# AETHR development progress

- Phase 1: Foundation/authentication implemented; real login verification remains necessary.
- Phase 2: Nutrition logging and safety fixes merged. Database migrations must be applied in Supabase.
- Phase 3: AI food parsing, photo/voice input, and confirmation flow merged. Conversational history and rate limiting remain outstanding.
- Phase 4: Gym tracker PR #3 is open, with passing automated checks as of November 16. Not merged; apply phase4.sql only when reviewing.
- Phase 5 (current PR): Manual run/walk/treadmill logging, opt-in foreground GPS tracking, private route storage, pace/distance/duration, activity history and delete. Apply supabase/phase5.sql.
- Phase 6: Advanced nutrition not started.

Next: Validate Phase 5 CI and manually test GPS on iPhone Safari over HTTPS, database policies, and route privacy. GPS does not work reliably in iOS Safari while backgrounded or locked. Map display, offline logs and background tracking are not implemented.
