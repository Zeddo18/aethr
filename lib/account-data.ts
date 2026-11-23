import type { SupabaseClient } from "@supabase/supabase-js";

// User-owned data only. The shared exercise catalog (user_id IS NULL)
// is intentionally excluded, because it is not personal account data.
export const OWNED_TABLES = [
  { table: "profiles", owner: "id", key: "id" },
  { table: "meal_entries", owner: "user_id", key: "id" },
  { table: "exercises", owner: "user_id", key: "id" },
  { table: "workout_templates", owner: "user_id", key: "id" },
  { table: "workout_sessions", owner: "user_id", key: "id" },
  { table: "workout_sets", owner: "user_id", key: "id" },
  { table: "activities", owner: "user_id", key: "id" },
  { table: "activity_route_points", owner: "user_id", key: "id" },
  { table: "saved_foods", owner: "user_id", key: "id" },
  { table: "saved_recipes", owner: "user_id", key: "id" },
  { table: "wellness_logs", owner: "user_id", key: "id" },
  { table: "reminder_preferences", owner: "user_id", key: "user_id" },
] as const;

// workout_template_exercises has no user_id column, so it MUST be
// filtered to the user's template IDs before querying.
export const CHILD_TABLE = "workout_template_exercises";
export const ACCOUNT_DATA_TABLES = [
  ...OWNED_TABLES.map(t => t.table),
  CHILD_TABLE,
] as const;

export const PAGE_SIZE = 500;
export const MAX_ROWS_PER_TABLE = 50_000;
export const MAX_EXPORT_BYTES = 12 * 1024 * 1024;

export class AccountExportError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: 413 | 503,
  ) {
    super(message);
  }
}

type Row = Record<string, unknown>;
type AccountTables = Record<string, Row[]>;

async function selectPages(
  db: SupabaseClient,
  table: string,
  column: string,
  key: string,
  value: string | string[],
  maxRows = MAX_ROWS_PER_TABLE,
): Promise<Row[]> {
  const output: Row[] = [];
  if (Array.isArray(value) && value.length === 0) return output;

  for (let offset = 0; offset < maxRows; offset += PAGE_SIZE) {
    const base = db.from(table).select("*");
    const scoped = Array.isArray(value)
      ? base.in(column, value)
      : base.eq(column, value);
    const { data, error } = await scoped.order(key, { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    // An unavailable table or a failed query must NEVER produce a partial
    // export labelled "complete".
    if (error || !Array.isArray(data)) {
      throw new AccountExportError(
        "Your full data export is temporarily unavailable. Please try again later.",
        503,
      );
    }
    output.push(...(data as Row[]));
    if (output.length > maxRows) {
      throw new AccountExportError("This export is too large for a single download.", 413);
    }
    if (data.length < PAGE_SIZE) return output;
  }
  // If exactly maxRows are present, another page may exist; fail closed.
  throw new AccountExportError("This export is too large for a single download.", 413);
}

export async function collectAccountData(
  db: SupabaseClient,
  user: { id: string; email?: string | null },
) {
  const tables: AccountTables = {};
  for (const spec of OWNED_TABLES) {
    tables[spec.table] = await selectPages(db, spec.table, spec.owner, spec.key, user.id);
  }

  const templateIds = tables.workout_templates.map(row => row.id)
    .filter((id): id is string => typeof id === "string");
  const children: Row[] = [];
  for (let i = 0; i < templateIds.length; i += 50) {
    const chunk = await selectPages(db, CHILD_TABLE, "template_id", "id", templateIds.slice(i, i + 50));
    children.push(...chunk);
    if (children.length > MAX_ROWS_PER_TABLE) {
      throw new AccountExportError("This export is too large for a single download.", 413);
    }
  }
  tables[CHILD_TABLE] = children;

  const exportData = {
    format: "aethr-account-data-v1",
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email ?? null },
    note: "AETHR account tables only. Provider logs, backups and third-party data are not included.",
    tables,
  };
  const json = JSON.stringify(exportData, null, 2);
  if (Buffer.byteLength(json, "utf8") > MAX_EXPORT_BYTES) {
    throw new AccountExportError("This export is too large for a single download.", 413);
  }
  return json;
}
