import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACCOUNT_DATA_TABLES, AccountExportError, collectAccountData, OWNED_TABLES,
} from "../lib/account-data";
import {
  DELETE_CONFIRMATION, isSameOriginRequest, isServerOnlyAdminKey, validDeletionPayload,
} from "../lib/account-security";

const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";

type Row = Record<string, unknown>;

function fixtures(): Record<string, Row[]> {
  const tables: Record<string, Row[]> = {};
  for (const spec of OWNED_TABLES) {
    tables[spec.table] = [a, b].map((user, i) => ({
      [spec.key]: spec.key === "user_id" ? user : spec.table + "-" + (i ? "B" : "A"),
      [spec.owner]: user,
      name: "data-" + (i ? "B" : "A"),
    }));
    if (spec.table === "profiles") tables[spec.table] = [
      { id: a, display_name: "A" },
      { id: b, display_name: "B" },
    ];
  }
  tables.workout_template_exercises = [
    { id: "child-A", template_id: "workout_templates-A" },
    { id: "child-B", template_id: "workout_templates-B" },
  ];
  return tables;
}

function fakeDb(data: Record<string, Row[]>, failTable?: string) {
  const filters: Array<{ table: string; column: string; value: string | string[] }> = [];
  const db = {
    from(table: string) {
      let field = "", value: string | string[] = "";
      const chain = {
        select(_columns: string) { return chain; },
        eq(column: string, scope: string) {
          field = column; value = scope;
          filters.push({ table, column, value: scope });
          return chain;
        },
        in(column: string, scope: string[]) {
          field = column; value = scope;
          filters.push({ table, column, value: scope });
          return chain;
        },
        order(_column: string) { return chain; },
        async range(start: number, end: number) {
          if (table === failTable) return { data: null, error: { code: "42P01" } };
          const matches = (data[table] ?? []).filter(row =>
            Array.isArray(value) ? value.includes(String(row[field])) : row[field] === value
          );
          return { data: matches.slice(start, end + 1), error: null };
        },
      };
      return chain;
    },
  };
  return { client: db as unknown as SupabaseClient, filters };
}

describe("Phase 16 account export", () => {
  it("exports exactly the 13 expected private table types", async () => {
    const { client, filters } = fakeDb(fixtures());
    const json = await collectAccountData(client, { id: a, email: "test-a@example.invalid" });
    const result = JSON.parse(json);
    expect(result.format).toBe("aethr-account-data-v1");
    expect(Object.keys(result.tables).sort()).toEqual([...ACCOUNT_DATA_TABLES].sort());
    for (const name of ACCOUNT_DATA_TABLES) {
      expect(result.tables[name]).toHaveLength(1);
      expect(JSON.stringify(result.tables[name])).not.toContain("data-B");
    }
    expect(result.tables.workout_template_exercises[0].id).toBe("child-A");
    expect(filters.filter(x => x.table !== "workout_template_exercises")
      .every(x => x.value === a)).toBe(true);
    expect(filters.find(x => x.table === "workout_template_exercises")?.value)
      .toEqual(["workout_templates-A"]);
  });

  it("pages through more than one API result page without losing entries", async () => {
    const data = fixtures();
    data.meal_entries = Array.from({ length: 505 }, (_, i) => ({
      id: "meal-" + i, user_id: a, meal: "lunch",
    }));
    const { client } = fakeDb(data);
    const result = JSON.parse(await collectAccountData(client, { id: a }));
    expect(result.tables.meal_entries).toHaveLength(505);
    expect(result.tables.meal_entries[504].id).toBe("meal-504");
  });

  it("fails rather than returning a partial export if any table is unavailable", async () => {
    const { client } = fakeDb(fixtures(), "saved_foods");
    await expect(collectAccountData(client, { id: a }))
      .rejects.toMatchObject({ httpStatus: 503 });
  });
});

describe("Phase 16 deletion security", () => {
  const same = (origin?: string, url = "https://app.example.test/api/account/delete") =>
    new Request(url, { method: "POST", headers: origin ? { Origin: origin } : {} });

  it("rejects missing and cross-site POST origins", () => {
    expect(isSameOriginRequest(same())).toBe(false);
    expect(isSameOriginRequest(same("https://evil.example.test"))).toBe(false);
    expect(isSameOriginRequest(same("null"))).toBe(false);
    expect(isSameOriginRequest(same("https://app.example.test"))).toBe(true);
  });

  it("requires both exact phrase and nonempty current password", () => {
    expect(validDeletionPayload({ confirmation: DELETE_CONFIRMATION, password: "valid" })).toBe(true);
    expect(validDeletionPayload({ confirmation: "delete account", password: "valid" })).toBe(false);
    expect(validDeletionPayload({ confirmation: DELETE_CONFIRMATION, password: "" })).toBe(false);
    expect(validDeletionPayload({ confirmation: DELETE_CONFIRMATION, password: "x".repeat(257) })).toBe(false);
  });

  it("rejects publishable and anon keys for privileged Auth deletion", () => {
    expect(isServerOnlyAdminKey("sb_publishable_" + "x".repeat(40))).toBe(false);
    expect(isServerOnlyAdminKey("sb_secret_" + "x".repeat(40))).toBe(true);
    const jwt = (role: string) =>
      "e30." + Buffer.from(JSON.stringify({ role })).toString("base64url") + ".signature";
    expect(isServerOnlyAdminKey(jwt("anon"))).toBe(false);
    expect(isServerOnlyAdminKey(jwt("service_role"))).toBe(true);
  });

  it("keeps privileged Auth deletion on the server and scoped to getUser identity", () => {
    const file = readFileSync(join(process.cwd(), "app/api/account/delete/route.ts"), "utf8");
    expect(file).toContain("await db.auth.getUser()");
    expect(file).toContain("validDeletionPayload(input)");
    expect(file).toContain("signInWithPassword");
    expect(file).toContain("data.user?.id === user.id");
    expect(file).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(file).toContain("admin.auth.admin.deleteUser(user.id, false)");
    expect(file).toContain("isSameOriginRequest(request)");
    const ui = readFileSync(join(process.cwd(), "components/account-privacy-settings.tsx"), "utf8");
    expect(ui).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
