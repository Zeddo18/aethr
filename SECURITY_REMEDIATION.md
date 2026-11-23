# Dependency security remediation — Phase 11

## What this change fixes

AETHR's initial release CI reported **two production dependency vulnerabilities (one moderate, one high)**. Its resolved Next.js **15.5.29** includes a pinned nested copy of PostCSS **8.4.31**, while the root PostCSS package is already **8.5.33**.

The change in this branch adds an npm override specifically for `next > postcss` and updates the committed lockfile to install **8.5.33**, a version newer than the PostCSS advisory fixes from 2026. It intentionally does **not** force a major Next.js upgrade.

The production-dependency CI audit now fails for high/critical advisories: `npm audit --omit=dev --audit-level=high`. A full dependency report is also displayed for outstanding development/build-time advisories, but remains informational. Do not treat the full audit as clean until those findings are addressed.

## Required evidence before merge

- [ ] `npm ci` reproduces the updated lockfile in clean GitHub Actions.
- [ ] `npm audit --omit=dev --audit-level=high` succeeds without `|| true`.
- [ ] `npm test`, `npx tsc --noEmit`, and `npm run build` succeed.
- [ ] Inspect the full audit report, including development dependencies, and plan separate remediation.
- [ ] Test all user-facing functionality with staging Supabase and on iPhone.

## Remaining production-launch blockers

This is a **targeted dependency fix only**. It does not resolve vulnerabilities in all dev/build dependencies, provision Supabase, configure persistent AI request limits, implement account export/deletion, or prove device and RLS safety. Consult `RELEASE_CHECKLIST.md` before any public rollout.

The override should be removed and the lockfile regenerated once Next.js itself ships a patched, compatible PostCSS dependency.
