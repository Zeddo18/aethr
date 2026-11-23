import { describe, it, expect } from "vitest";
import {
  REQUIRED_TABLES, STAGING_CONFIRMATION, readStagingConfig, verifyStagingIsolation,
} from "../lib/staging-security.mjs";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

function records() {
  const rows = {};
  for (const spec of REQUIRED_TABLES) {
    rows[spec.name] = [A, B].map((user, i) => {
      const record = { _actor: i === 0 ? "A" : "B" };
      record[spec.key] = spec.key === "user_id" || (spec.name === "profiles")
        ? user : (i === 0 ? "A-" : "B-") + spec.name;
      if (spec.owner) record[spec.owner] = user;
      if (spec.parent) record.template_id = (i === 0 ? "A-" : "B-") + spec.parent;
      return record;
    });
  }
  return rows;
}

function fakeClient(actor, data, options = {}) {
  return {
    from(table) {
      return {
        select(key) {
          return {
            eq(filter, value) {
              return {
                async limit() {
                  const matches = (data[table] ?? []).filter((row) => row[filter] === value);
                  const visible = matches.filter((row) => {
                    if (actor === "anonymous") return options.anonymousLeak === table;
                    return row._actor === actor ||
                      (options.crossAccountLeak === table && actor === "A");
                  });
                  if (actor === "anonymous" && options.anonymousPermissionDenied) {
                    return { data: null, error: { code: "42501" }, status: 403 };
                  }
                  return { data: visible.map((row) => ({ [key]: row[key] })), error: null, status: 200 };
                },
              };
            },
          };
        },
      };
    },
  };
}

function verifierOptions(data, options = {}) {
  return {
    anonymous: fakeClient("anonymous", data, options),
    clientA: fakeClient("A", data, options),
    clientB: fakeClient("B", data, options),
    idA: A,
    idB: B,
  };
}

describe("Phase 14 live staging security verification (mock API)", () => {
  it("requires explicit project identity, public key and independent accounts", () => {
    const env = {
      AETHR_STAGING_CONFIRM: STAGING_CONFIRMATION,
      AETHR_STAGING_PROJECT_REF: "abcdefghijklmnopqrst",
      AETHR_STAGING_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
      AETHR_STAGING_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      AETHR_TEST_A_EMAIL: "a@example.test",
      AETHR_TEST_A_PASSWORD: "a-test-secret",
      AETHR_TEST_B_EMAIL: "b@example.test",
      AETHR_TEST_B_PASSWORD: "b-test-secret",
    };
    expect(readStagingConfig(env).url).toBe(env.AETHR_STAGING_SUPABASE_URL);
    expect(() => readStagingConfig({ ...env, AETHR_STAGING_CONFIRM: "yes" })).toThrow();
    expect(() => readStagingConfig({ ...env, AETHR_STAGING_PROJECT_REF: "otherprojectrefabcde" })).toThrow();
    expect(() => readStagingConfig({ ...env, AETHR_STAGING_SUPABASE_PUBLISHABLE_KEY: "sb_secret_unsafe" })).toThrow();
    expect(() => readStagingConfig({ ...env, AETHR_TEST_B_EMAIL: "A@EXAMPLE.TEST" })).toThrow();
    const serviceJwt = "e30." + Buffer.from(JSON.stringify({role:"service_role"})).toString("base64url") + ".sig";
    expect(() => readStagingConfig({ ...env, AETHR_STAGING_SUPABASE_PUBLISHABLE_KEY: serviceJwt })).toThrow();
    const anonJwt = "e30." + Buffer.from(JSON.stringify({role:"anon"})).toString("base64url") + ".sig";
    expect(readStagingConfig({ ...env, AETHR_STAGING_SUPABASE_PUBLISHABLE_KEY: anonJwt }).key).toBe(anonJwt);
  });

  it("passes only if both accounts have private fixtures in every table and no cross-access", async () => {
    const passed = [];
    const result = await verifyStagingIsolation({
      ...verifierOptions(records()), onPass: (table) => passed.push(table),
    });
    expect(result.passedTables).toBe(13);
    expect(passed).toHaveLength(13);
    expect(passed).toContain("activity_route_points");
    expect(passed).toContain("wellness_logs");
  });

  it("accepts anonymous permission denial instead of requiring anonymous table grants", async () => {
    const result = await verifyStagingIsolation(verifierOptions(records(), {anonymousPermissionDenied:true}));
    expect(result.passedTables).toBe(13);
  });

  it("fails closed if a real staging fixture is missing", async () => {
    const data = records();
    data.meal_entries.pop();
    await expect(verifyStagingIsolation(verifierOptions(data))).rejects.toThrow(/INCONCLUSIVE/);
  });

  it("detects even one exposed cross-account row", async () => {
    await expect(verifyStagingIsolation(verifierOptions(records(), {
      crossAccountLeak: "wellness_logs",
    }))).rejects.toThrow(/CROSS-ACCOUNT READ EXPOSURE/);
  });

  it("detects anonymous data exposure", async () => {
    await expect(verifyStagingIsolation(verifierOptions(records(), {
      anonymousLeak: "profiles",
    }))).rejects.toThrow(/ANONYMOUS READ EXPOSURE/);
  });

  it("never accepts the same identity for both testers", async () => {
    await expect(verifyStagingIsolation({...verifierOptions(records()),idB:A})).rejects.toThrow(/distinct/);
  });
});
