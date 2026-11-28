// Phase 18: Staging-only configuration guard for real Auth/Data API tests.
// This module never contacts Supabase and never logs credentials.
import { readStagingConfig } from "./staging-security.mjs";

export const APP_STAGING_CONFIRMATION = "I_CONFIRMED_THIS_APP_IS_NOT_PRODUCTION";

function parseOrigin(raw, label) {
  if (!raw) throw Error(label + " is required for real staging verification");
  let url;
  try { url = new URL(raw); } catch { throw Error(label + " must be a valid absolute HTTPS URL"); }
  if (url.protocol !== "https:" || !url.hostname || url.username ||
      url.password || url.port || url.pathname !== "/" ||
      url.search || url.hash) {
    throw Error(label + " must be exactly an HTTPS origin without path, credentials or parameters");
  }
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".supabase.co")) {
    throw Error(label + " must point to a deployed staging app, not localhost or Supabase");
  }
  return url.origin;
}

export function verifyStagingReadiness(env) {
  // Validate the verified Supabase project, a strictly public API key, and
  // two separate synthetic Auth accounts using the Phase 14 safeguards.
  const config = readStagingConfig(env);
  const expectedRef = env.AETHR_STAGING_APPROVED_PROJECT_REF;
  if (!expectedRef || expectedRef !== env.AETHR_STAGING_PROJECT_REF) {
    throw Error("Staging project ref does not match the separately approved environment project ref");
  }
  if (env.AETHR_STAGING_APP_VERIFIED !== APP_STAGING_CONFIRMATION) {
    throw Error("Confirm the app URL is a non-production staging deployment before running integration checks");
  }
  const appUrl = parseOrigin(env.AETHR_STAGING_APP_URL, "AETHR_STAGING_APP_URL");
  if (env.AETHR_PRODUCTION_APP_URL) {
    const prodUrl = parseOrigin(env.AETHR_PRODUCTION_APP_URL, "AETHR_PRODUCTION_APP_URL");
    if (prodUrl === appUrl) throw Error("Staging app URL must not match the production app URL");
  }
  if (env.NEXT_PUBLIC_SUPABASE_URL &&
      new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin !== config.url) {
    throw Error("The app's public Supabase URL does not match the approved staging project");
  }

  // Important: never return private passwords or public keys in diagnostics.
  return { appUrl, projectRef: expectedRef, supabaseUrl: config.url };
}

export async function checkStagingApp(appUrl, fetchImpl = fetch, options = {}) {
  const base = new URL(appUrl);
  const bypassSecret = options.protectionBypassSecret ?? "";
  if (bypassSecret && (typeof bypassSecret !== "string" || /[\\r\\n]/.test(bypassSecret))) {
    throw Error("Invalid Vercel automation bypass secret configuration");
  }
  const get = async (path) => {
    const headers = { Accept: "application/json,text/html" };
    // The secret is sent only as a header to this explicitly validated staging
    // origin. Never put it in a URL, request body, console output, or error.
    if (bypassSecret) headers["x-vercel-protection-bypass"] = bypassSecret;
    const res = await fetchImpl(new URL(path, base), {
      method: "GET", redirect: "manual", signal: AbortSignal.timeout(10_000),
      headers,
    });
    return res;
  };
  const login = await get("/login");
  if (login.status !== 200) throw Error("Staging login page is unavailable");
  const html = await login.text();
  if (!html.includes("Sign in") || !html.includes('name="viewport"')) {
    throw Error("Staging login page is missing expected iPhone metadata");
  }
  const protectedPage = await get("/dashboard");
  if (![301,302,303,307,308].includes(protectedPage.status) ||
      !protectedPage.headers.get("location") ||
      new URL(protectedPage.headers.get("location"), base).pathname !== "/login") {
    throw Error("Staging dashboard did not redirect an unauthenticated visitor to login");
  }
  const manifestResponse = await get("/manifest.webmanifest");
  if (manifestResponse.status !== 200) throw Error("Staging PWA manifest is unavailable");
  const manifest = await manifestResponse.json();
  if (!manifest.name?.includes("AETHR") || manifest.display !== "standalone") {
    throw Error("Staging install manifest does not match AETHR");
  }
  const denied = await get("/api/foods/search?q=rice");
  if (denied.status !== 401 ||
      !denied.headers.get("content-type")?.includes("application/json") ||
      !denied.headers.get("cache-control")?.includes("no-store")) {
    throw Error("Staging API did not deny signed-out requests with non-cacheable JSON");
  }
  return { passed: 4 };
}
