import { describe, expect, it } from "vitest";
import {
  verifyStagingReadiness, checkStagingApp, APP_STAGING_CONFIRMATION,
} from "../lib/staging-readiness.mjs";
import { STAGING_CONFIRMATION } from "../lib/staging-security.mjs";

const ref = "abcdefghijklmnopqrst";
const valid = () => ({
  AETHR_STAGING_CONFIRM: STAGING_CONFIRMATION,
  AETHR_STAGING_PROJECT_REF: ref,
  AETHR_STAGING_APPROVED_PROJECT_REF: ref,
  AETHR_STAGING_SUPABASE_URL: "https://" + ref + ".supabase.co",
  AETHR_STAGING_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  AETHR_TEST_A_EMAIL: "a@example.test",
  AETHR_TEST_B_EMAIL: "b@example.test",
  AETHR_TEST_A_PASSWORD: "fake-a-password",
  AETHR_TEST_B_PASSWORD: "fake-b-password",
  AETHR_STAGING_APP_VERIFIED: APP_STAGING_CONFIRMATION,
  AETHR_STAGING_APP_URL: "https://staging.example.test",
  AETHR_PRODUCTION_APP_URL: "https://production.example.test",
});

function mockResponses(changes = {}) {
  const responses = {
    "/login": new Response('<html><meta name="viewport" content="width=device-width"/>Sign in</html>',
      { status: 200, headers: { "content-type": "text/html" } }),
    "/dashboard": new Response(null, {
      status: 307, headers: { Location: "https://staging.example.test/login" },
    }),
    "/manifest.webmanifest": new Response(
      JSON.stringify({ name: "AETHR — Personal Wellness Journal", display: "standalone" }),
      { status: 200, headers: { "content-type": "application/manifest+json" } },
    ),
    "/api/foods/search": new Response(JSON.stringify({ error: "Sign in required." }), {
      status: 401, headers: {
        "content-type": "application/json",
        "cache-control": "private, no-store",
      },
    }),
    ...changes,
  };
  const calls = [];
  const fetchImpl = async (url, options) => {
    const parsed = new URL(url);
    calls.push({ url: parsed, options });
    const response = responses[parsed.pathname];
    if (!response) throw Error("unexpected path");
    return response;
  };
  return { fetchImpl, calls };
}

describe("Phase 18 staging project and deployment identity", () => {
  it("accepts a separately approved staging ref, public key and HTTPS app", () => {
    const result = verifyStagingReadiness(valid());
    expect(result.projectRef).toBe(ref);
    expect(result.appUrl).toBe("https://staging.example.test");
    expect(JSON.stringify(result)).not.toContain("fake-a-password");
  });

  it("rejects mismatched or missing project approval", () => {
    expect(() => verifyStagingReadiness({
      ...valid(), AETHR_STAGING_APPROVED_PROJECT_REF: undefined,
    })).toThrow(/approved/);
    expect(() => verifyStagingReadiness({
      ...valid(), AETHR_STAGING_APPROVED_PROJECT_REF: "zzzzzzzzzzzzzzzzzzzz",
    })).toThrow(/approved/);
  });

  it("rejects an app not confirmed to be non-production", () => {
    expect(() => verifyStagingReadiness({
      ...valid(), AETHR_STAGING_APP_VERIFIED: "no",
    })).toThrow(/non-production/);
  });

  it("rejects insecure, local, or unrelated app destinations", () => {
    for (const app of [
      "http://staging.example.test", "http://127.0.0.1:3000",
      "https://localhost", "https://abc.supabase.co",
      "https://staging.example.test/secret",
      "https://staging.example.test?token=abc",
    ]) {
      expect(() => verifyStagingReadiness({
        ...valid(), AETHR_STAGING_APP_URL: app,
      }), app).toThrow();
    }
  });

  it("rejects a staging URL that matches the production app URL", () => {
    expect(() => verifyStagingReadiness({
      ...valid(), AETHR_PRODUCTION_APP_URL: "https://staging.example.test",
    })).toThrow(/must not match/);
  });

  it("rejects a mismatched public Supabase URL", () => {
    expect(() => verifyStagingReadiness({
      ...valid(), NEXT_PUBLIC_SUPABASE_URL: "https://different.supabase.co",
    })).toThrow(/does not match/);
  });

  it("rejects a secret/service-role Supabase key", () => {
    expect(() => verifyStagingReadiness({
      ...valid(), AETHR_STAGING_SUPABASE_PUBLISHABLE_KEY: "sb_secret_not_allowed",
    })).toThrow(/publishable/);
  });
});

describe("Phase 18 non-mutating deployed app smoke checks", () => {
  it("verifies the staging login, private redirect, manifest and anonymous API", async () => {
    const { fetchImpl, calls } = mockResponses();
    const result = await checkStagingApp("https://staging.example.test", fetchImpl);
    expect(result.passed).toBe(4);
    expect(calls).toHaveLength(4);
    expect(calls.every(c => c.options.method === "GET")).toBe(true);
    expect(calls.every(c => c.options.redirect === "manual")).toBe(true);
    expect(calls.every(c => c.url.origin === "https://staging.example.test")).toBe(true);
  });

  it("fails when private dashboard data is exposed while logged out", async () => {
    const { fetchImpl } = mockResponses({ "/dashboard": new Response("Dashboard", { status: 200 }) });
    await expect(checkStagingApp("https://staging.example.test", fetchImpl))
      .rejects.toThrow(/did not redirect/);
  });

  it("fails when the logged-out API redirects to login or caches errors", async () => {
    const { fetchImpl } = mockResponses({
      "/api/foods/search": new Response(null, { status: 307, headers: { Location: "/login" } }),
    });
    await expect(checkStagingApp("https://staging.example.test", fetchImpl))
      .rejects.toThrow(/did not deny/);
  });

  it("fails when a non-AETHR manifest is deployed", async () => {
    const { fetchImpl } = mockResponses({
      "/manifest.webmanifest": new Response(JSON.stringify({ name: "Other App", display: "standalone" })),
    });
    await expect(checkStagingApp("https://staging.example.test", fetchImpl))
      .rejects.toThrow(/does not match/);
  });
});
