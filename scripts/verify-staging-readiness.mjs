#!/usr/bin/env node
// Phase 18: preflight + non-mutating staging website probes.
// No secrets, passwords, account IDs or Supabase rows are logged.
import { verifyStagingReadiness, checkStagingApp } from "../lib/staging-readiness.mjs";

async function main() {
  const { appUrl } = verifyStagingReadiness(process.env);
  console.log("PASS Verified protected staging configuration");
  const protectionBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!protectionBypassSecret) {
    throw Error("The protected staging preflight requires VERCEL_AUTOMATION_BYPASS_SECRET");
  }
  console.log("Checking staging app routes with GET requests only; no account writes.");
  const outcome = await checkStagingApp(appUrl, fetch, { protectionBypassSecret });
  console.log("PASS " + outcome.passed + " deployed staging checks.");
  console.log("NEXT: Run the read-only real two-account Supabase verifier.");
  console.log("NOTE: Physical iPhone and destructive account-deletion tests remain manual staging checks.");
}

main().catch(() => {
  // Avoid including URLs, credentials, user data, or provider errors in logs.
  console.error("STAGING PREFLIGHT FAILED: Review the approved project ref, deployed staging URL, login protection and PWA manifest.");
  process.exitCode = 1;
});
