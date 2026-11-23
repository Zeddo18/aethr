#!/usr/bin/env node
/**
 * Phase 17 — local production-build HTTP smoke checks.
 * No real Supabase accounts or API keys are used. This verifies routing,
 * authentication boundaries, install metadata, response headers, and icons.
 * It is NOT a replacement for actual iPhone Safari or staging Auth testing.
 */
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

const base = new URL(process.env.AETHR_SMOKE_BASE_URL ?? "http://127.0.0.1:3187");
if (!["127.0.0.1", "localhost"].includes(base.hostname) || base.protocol !== "http:") {
  throw Error("Smoke checks may connect only to a local, disposable test server");
}
const passes = [];

async function ready() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const res = await fetch(new URL("/login", base), {
        redirect: "manual",
        signal: AbortSignal.timeout(2_500),
      });
      if (res.status === 200) return;
      throw Error("App returned unexpected login status: " + res.status);
    } catch (error) {
      if (attempt === 39) throw error;
      await delay(400);
    }
  }
}

function check(name, passed, detail = "") {
  assert.ok(passed, name + (detail ? ": " + detail : ""));
  passes.push(name);
  console.log("PASS " + name);
}

function safeLocation(location) {
  if (!location) return "";
  return new URL(location, base).pathname;
}

async function request(path, options = {}) {
  const res = await fetch(new URL(path, base), {
    redirect: "manual",
    signal: AbortSignal.timeout(9_000),
    ...options,
  });
  return res;
}

async function main() {
  await ready();

  const login = await request("/login");
  const loginHtml = await login.text();
  check("Login screen loads", login.status === 200 && loginHtml.includes("Sign in"));
  check("iPhone viewport is configured", /name="viewport"/.test(loginHtml) &&
    /viewport-fit=cover/.test(loginHtml));
  const appleMeta = /apple-mobile-web-app-capable/.test(loginHtml);
  const modernMeta = /mobile-web-app-capable/.test(loginHtml);
  const manifestLink = /rel="manifest"/.test(loginHtml);
  console.log("Mobile metadata presence:", JSON.stringify({
    appleMeta, modernMeta, manifestLink,
  }));
  check("iPhone web app capability tag exists", appleMeta || modernMeta);
  check("PWA manifest linked from login HTML", manifestLink);

  const register = await request("/register");
  check("Registration screen loads", register.status === 200 &&
    (await register.text()).includes("Create your account"));

  for (const path of [
    "/", "/dashboard", "/nutrition", "/nutrition/library", "/gym",
    "/run", "/assistant", "/progress", "/recovery", "/profile", "/settings",
  ]) {
    const res = await request(path);
    check("Protected " + path + " redirects to login",
      [301, 302, 303, 307, 308].includes(res.status) &&
      safeLocation(res.headers.get("location")) === "/login");
  }

  const manifestResponse = await request("/manifest.webmanifest");
  check("Manifest publicly accessible", manifestResponse.status === 200);
  const manifest = await manifestResponse.json();
  check("Manifest describes installable AETHR", manifest.name?.includes("AETHR") &&
    manifest.display === "standalone" &&
    manifest.scope === "/" && manifest.start_url === "/dashboard");
  check("Install icons are declared", Array.isArray(manifest.icons) &&
    manifest.icons.some(i => i.src === "/icon.png") &&
    manifest.icons.some(i => i.src === "/apple-icon.png"));
  for (const path of ["/icon.png", "/apple-icon.png"]) {
    const response = await request(path);
    const bytes = await response.arrayBuffer();
    check("Public install icon " + path, response.status === 200 &&
      response.headers.get("content-type")?.includes("image/png") && bytes.byteLength > 100);
  }

  // No requests below carry cookies; they must NEVER redirect to an HTML login
  // page or accidentally invoke a paid AI provider.
  const endpoints = [
    { path: "/api/foods/search?q=rice", method: "GET" },
    { path: "/api/foods/barcode?code=12345678", method: "GET" },
    { path: "/api/nutrition/library", method: "GET" },
    { path: "/api/activities", method: "POST" },
    { path: "/api/wellness", method: "POST" },
    { path: "/api/reminders", method: "POST" },
    { path: "/api/ai/parse", method: "POST" },
    { path: "/api/ai/transcribe", method: "POST" },
    { path: "/api/ai/confirm", method: "POST" },
    { path: "/api/nutrition/log-saved", method: "POST" },
    { path: "/api/account/export", method: "POST" },
    { path: "/api/account/delete", method: "POST" },
  ];
  for (const { path, method } of endpoints) {
    const res = await request(path, {
      method,
      headers: {
        Origin: base.origin,
        Accept: "application/json",
      },
    });
    check("Logged-out " + method + " " + path + " denies access", res.status === 401);
    check("API denial is JSON and never cached " + path,
      res.headers.get("content-type")?.includes("application/json") &&
      res.headers.get("cache-control")?.includes("no-store"));
    const data = await res.json();
    check("No private data returned from " + path,
      typeof data.error === "string" &&
      Object.keys(data).length === 1);
  }

  check("Security response headers", login.headers.get("x-frame-options") === "DENY" &&
    login.headers.get("x-content-type-options") === "nosniff" &&
    login.headers.has("referrer-policy") &&
    login.headers.has("permissions-policy"));

  const serviceLeak = /SUPABASE_SERVICE_ROLE_KEY|sb_secret_[A-Za-z0-9_-]{12,}|OPENAI_API_KEY/;
  check("No server-only key names in public HTML", !serviceLeak.test(loginHtml));

  console.log("\n" + passes.length + " checks passed. Real Supabase/Auth and physical iPhone QA remain pending.");
}

main().catch(error => {
  console.error("Smoke verification failed: " + (error?.message ?? "unknown"));
  process.exitCode = 1;
});
