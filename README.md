# AETHR — Phase 1

1. `npm install`
2. Create a Supabase project, run `supabase/schema.sql` in the SQL editor.
3. `cp .env.example .env.local` and fill in the URL + anon key.
4. In Supabase → Auth → URL Configuration, add `http://localhost:3000/auth/callback` as a redirect URL.
5. `npm run dev` (open on your iPhone via your LAN IP) · `npm test` · `npm run build`
