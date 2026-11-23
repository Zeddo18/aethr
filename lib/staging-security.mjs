// Phase 14: Read-only staging Data API / RLS verification helpers.
// Never use a service-role key here. Run only against an explicitly confirmed
// staging project with two independent, pre-seeded test accounts.
export const REQUIRED_TABLES = Object.freeze([
  { name: "profiles", key: "id", owner: "id" },
  { name: "meal_entries", key: "id", owner: "user_id" },
  { name: "exercises", key: "id", owner: "user_id" },
  { name: "workout_templates", key: "id", owner: "user_id" },
  { name: "workout_template_exercises", key: "id", parent: "workout_templates" },
  { name: "workout_sessions", key: "id", owner: "user_id" },
  { name: "workout_sets", key: "id", owner: "user_id" },
  { name: "activities", key: "id", owner: "user_id" },
  { name: "activity_route_points", key: "id", owner: "user_id" },
  { name: "saved_foods", key: "id", owner: "user_id" },
  { name: "saved_recipes", key: "id", owner: "user_id" },
  { name: "wellness_logs", key: "id", owner: "user_id" },
  { name: "reminder_preferences", key: "user_id", owner: "user_id" },
]);

export const STAGING_CONFIRMATION = "I_HAVE_VERIFIED_THIS_IS_STAGING";

function isPublicKey(key) {
  if (key.startsWith("sb_publishable_")) return true;
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) return false;
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
    return payload.role === "anon";
  } catch {
    return false;
  }
}

export function readStagingConfig(env) {
  if (env.AETHR_STAGING_CONFIRM !== STAGING_CONFIRMATION) {
    throw Error("Set AETHR_STAGING_CONFIRM only after confirming this is a non-production AETHR staging project");
  }
  const ref = env.AETHR_STAGING_PROJECT_REF;
  if (!ref || !/^[a-z]{20}$/.test(ref)) throw Error("AETHR_STAGING_PROJECT_REF must be the verified 20-character staging project ref");
  let url;
  try { url = new URL(env.AETHR_STAGING_SUPABASE_URL); } catch {
    throw Error("Missing or invalid AETHR_STAGING_SUPABASE_URL");
  }
  if (url.protocol !== "https:" || url.hostname !== ref + ".supabase.co" ||
      url.pathname !== "/" || url.search || url.hash || url.username || url.password ||
      url.port) {
    throw Error("Staging URL must exactly match the confirmed project ref at https://<ref>.supabase.co");
  }
  const key = env.AETHR_STAGING_SUPABASE_PUBLISHABLE_KEY;
  if (!key || !isPublicKey(key)) throw Error("Use a Supabase publishable/anon key; secret and service-role keys are forbidden");
  const aEmail = env.AETHR_TEST_A_EMAIL;
  const bEmail = env.AETHR_TEST_B_EMAIL;
  const aPassword = env.AETHR_TEST_A_PASSWORD;
  const bPassword = env.AETHR_TEST_B_PASSWORD;
  if (!aEmail || !bEmail || !aPassword || !bPassword) {
    throw Error("Two existing staging-only test account emails and passwords are required");
  }
  if (aEmail.trim().toLowerCase() === bEmail.trim().toLowerCase()) {
    throw Error("Test A and Test B must be separate accounts");
  }
  return { url: url.origin, key, credentials: [
    { email: aEmail, password: aPassword }, { email: bEmail, password: bPassword },
  ] };
}

async function queryOne(client, table, column, filter, value, anonymous = false) {
  // Only SELECT requests are issued. No inserts, updates, or deletes.
  const response = await client.from(table).select(column).eq(filter, value).limit(1);
  if (response.error) {
    const code = response.error.code ?? "unknown";
    const status = response.status;
    if (anonymous && (code === "42501" || status === 401 || status === 403)) return [];
    throw Error(table + ": Data API SELECT rejected (code " + code + ")");
  }
  if (!Array.isArray(response.data)) throw Error(table + ": malformed Data API response");
  return response.data;
}

async function ownFixture(client, userId, spec, fixtures) {
  const filter = spec.parent ? "template_id" : spec.owner;
  const value = spec.parent ? fixtures[spec.parent] : userId;
  if (!value) throw Error(spec.name + ": parent fixture not found");
  const rows = await queryOne(client, spec.name, spec.key, filter, value);
  if (rows.length !== 1 || !rows[0][spec.key]) {
    throw Error(spec.name + ": missing own test fixture (INCONCLUSIVE; do not report as an RLS pass)");
  }
  return rows[0][spec.key];
}

export async function verifyStagingIsolation({ anonymous, clientA, clientB, idA, idB, onPass = () => {} }) {
  if (!idA || !idB || idA === idB) throw Error("Two distinct authenticated user IDs are required");
  const fixturesA = {}, fixturesB = {};
  for (const spec of REQUIRED_TABLES) {
    const [ownA, ownB] = await Promise.all([
      ownFixture(clientA, idA, spec, fixturesA),
      ownFixture(clientB, idB, spec, fixturesB),
    ]);
    if (ownA === ownB) throw Error(spec.name + ": both test users resolved to the same fixture");
    fixturesA[spec.name] = ownA;
    fixturesB[spec.name] = ownB;

    const [aSeesB, bSeesA, anonSeesA, anonSeesB] = await Promise.all([
      queryOne(clientA, spec.name, spec.key, spec.key, ownB),
      queryOne(clientB, spec.name, spec.key, spec.key, ownA),
      queryOne(anonymous, spec.name, spec.key, spec.key, ownA, true),
      queryOne(anonymous, spec.name, spec.key, spec.key, ownB, true),
    ]);
    if (aSeesB.length || bSeesA.length) throw Error(spec.name + ": CROSS-ACCOUNT READ EXPOSURE");
    if (anonSeesA.length || anonSeesB.length) throw Error(spec.name + ": ANONYMOUS READ EXPOSURE");
    onPass(spec.name);
  }
  return { passedTables: REQUIRED_TABLES.length };
}
