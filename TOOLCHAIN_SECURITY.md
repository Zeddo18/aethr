# Phase 12 — Development toolchain security

This change upgrades AETHR's testing toolchain without changing the app's Next.js runtime:
- Vitest from 2.1.9 to **5.1.1**
- Vite from 5.x to **7.3.8** (now a direct dev dependency and required peer of Vitest 5)
- esbuild transitively resolved to **0.28.2**
- Preserves the Phase 11 PostCSS override **8.5.33**

## Compatibility and verification

Vitest 5 requires **Node.js 22.12+** and Vite 6.4 or newer. AETHR CI uses Node.js 22. Use an up-to-date Node.js 22 or newer LTS locally.

The package-lock.json was generated using GitHub Actions `npm install --package-lock-only --ignore-scripts`, then committed. Final CI runs **without lockfile regeneration**, using `npm ci` to validate reproducibility. Both the production-only security audit and **full dependency audit** block CI on their configured severity thresholds.

Run locally:

```bash
npm ci
npm audit --omit=dev --audit-level=high
npm audit --audit-level=moderate
npm test
npx tsc --noEmit
npm run build
```

## Boundaries

- This PR is stacked on the Phase 11 security PR #10; **merge Phase 11 first** after approval, then update this PR's base to `main` and validate final CI.
- No database migrations, deployments, service credentials, or production configuration changes are made.
- Passing an npm advisory scan is not a guarantee of security; remaining production launch checks include live Supabase RLS validation, AI usage limits, data export/deletion, and iPhone testing.
