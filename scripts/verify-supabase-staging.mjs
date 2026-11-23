#!/usr/bin/env node
// Phase 14: Opt-in LIVE staging Auth/Data API read-only verification.
// Uses only a public Supabase key and two pre-seeded staging-only users.
// Authentication creates short-lived test sessions, but this script makes NO
// application-table writes and never logs credentials or private records.
import { createClient } from "@supabase/supabase-js";
import { readStagingConfig, verifyStagingIsolation } from "../lib/staging-security.mjs";

const options = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};
const client = (config) => createClient(config.url, config.key, options);

async function verifiedSignIn(supabase, credentials, label) {
  const result = await supabase.auth.signInWithPassword(credentials);
  if (result.error || !result.data?.session?.access_token) {
    throw Error(label + ": staging authentication failed; check the account and project configuration");
  }
  const checked = await supabase.auth.getUser();
  if (checked.error || !checked.data?.user?.id) {
    throw Error(label + ": session could not be independently verified");
  }
  if (checked.data.user.id !== result.data.user?.id) {
    throw Error(label + ": authenticated identity changed unexpectedly");
  }
  return checked.data.user.id;
}

async function main() {
  const config = readStagingConfig(process.env);
  const anonymous = client(config);
  const userA = client(config);
  const userB = client(config);

  console.log("AETHR staging check: Auth + public-key Data API; no app table mutations");
  try {
    const idA = await verifiedSignIn(userA, config.credentials[0], "Account A");
    const idB = await verifiedSignIn(userB, config.credentials[1], "Account B");
    const report = await verifyStagingIsolation({
      anonymous,
      clientA: userA,
      clientB: userB,
      idA,
      idB,
      onPass(table) { console.log("PASS " + table + ": self, cross-account, and anonymous SELECT"); },
    });
    console.log("PASS " + report.passedTables + " AETHR tables. Read-only staging SELECT verification complete.");
    console.log("NOTE: Write-policy enforcement, user deletion, browser flows and real-device permissions require separate staging tests.");
  } finally {
    // Local scope revokes only the two temporary test sessions.
    await Promise.allSettled([
      userA.auth.signOut({ scope: "local" }),
      userB.auth.signOut({ scope: "local" }),
    ]);
  }
}

main().catch((err) => {
  // Never print tokens, usernames, password values, row identifiers, or API bodies.
  console.error("STAGING VALIDATION FAILED: " + (err instanceof Error ? err.message : "unknown error"));
  process.exitCode = 1;
});
