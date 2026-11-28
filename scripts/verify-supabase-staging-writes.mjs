#!/usr/bin/env node
// Phase 21C: authenticated Supabase Data API write-policy verification.
// Uses only a public/publishable key and two dedicated staging-only accounts.
// Creates disposable synthetic rows, verifies RLS, then removes those rows.
// Never uses a service-role key, SQL connection, production account, or real data.
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { readStagingConfig } from "../lib/staging-security.mjs";
import {
  assertNoVisibleMutation,
  assertRlsDenial,
  assertSingleRow,
} from "../lib/staging-write-security.mjs";

const authOptions = {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
};
const createSupabase = (config) => createClient(config.url, config.key, authOptions);

async function signIn(client, credentials, label) {
  const signed = await client.auth.signInWithPassword(credentials);
  if (signed.error || !signed.data?.session?.access_token) {
    throw Error(label + ": staging sign-in failed; verify the protected test-account secrets");
  }
  const checked = await client.auth.getUser();
  if (checked.error || !checked.data?.user?.id || checked.data.user.id !== signed.data.user?.id) {
    throw Error(label + ": authenticated identity could not be independently verified");
  }
  return checked.data.user.id;
}

function failOnError(response, label) {
  if (response.error) {
    throw Error(label + ": Data API request failed (code " + (response.error.code ?? "unknown") + ")");
  }
  return response;
}

async function insertRow(client, table, payload, key = "id") {
  const response = await client.from(table).insert(payload).select(key).single();
  assertSingleRow(response, table + " owner INSERT");
  return response.data[key];
}

function registerCleanup(cleanups, client, table, key, id, fallbackClient = null) {
  cleanups.push(async () => {
    let response = await client.from(table).delete().eq(key, id).select(key).maybeSingle();
    if (!response.error && !response.data && fallbackClient) {
      response = await fallbackClient.from(table).delete().eq(key, id).select(key).maybeSingle();
    }
    assertSingleRow(response, table + " synthetic-row cleanup");
  });
}

async function selectOwn(client, table, key, value, columns = key) {
  const response = failOnError(
    await client.from(table).select(columns).eq(key, value).maybeSingle(),
    table + " owner SELECT",
  );
  if (!response.data) throw Error(table + ": required staging account fixture is missing (INCONCLUSIVE)");
  return response.data;
}

async function expectCrossAccountNoOp(clientA, table, key, idB, patch, label) {
  const update = await clientA.from(table).update(patch).eq(key, idB).select(key).maybeSingle();
  assertNoVisibleMutation(update, label + " cross-account UPDATE");
  const remove = await clientA.from(table).delete().eq(key, idB).select(key).maybeSingle();
  assertNoVisibleMutation(remove, label + " cross-account DELETE");
}

async function expectSpoofedInsertDenied(client, table, payload, label, cleanupClient, key = "id") {
  const response = await client.from(table).insert(payload).select(key).maybeSingle();
  try {
    assertRlsDenial(response, label + " forged INSERT");
  } catch (error) {
    // If a regression allowed the row, immediately ask its resulting owner to
    // remove the synthetic row before surfacing the failure.
    if (!response.error && response.data?.[key] !== undefined) {
      const cleanup = await cleanupClient.from(table).delete().eq(key, response.data[key]).select(key).maybeSingle();
      if (cleanup.error || !cleanup.data) {
        throw Error(label + ": RLS BYPASS and synthetic row cleanup also failed");
      }
    }
    throw error;
  }
}

async function uniqueWellnessDate(client, userId) {
  const response = failOnError(
    await client.from("wellness_logs").select("log_date").eq("user_id", userId),
    "wellness_logs existing dates",
  );
  const occupied = new Set((response.data ?? []).map((row) => row.log_date));
  const base = Date.UTC(2100, 0, 1);
  const start = Math.floor(Math.random() * 30000);
  for (let offset = 0; offset < 40000; offset += 1) {
    const candidate = new Date(base + ((start + offset) % 40000) * 86400000).toISOString().slice(0, 10);
    if (!occupied.has(candidate)) return candidate;
  }
  throw Error("Could not reserve a unique synthetic wellness date");
}

async function createFixtures(client, userId, label, cleanups) {
  const suffix = randomUUID().slice(0, 12);
  const f = {};

  f.meal_entries = await insertRow(client, "meal_entries", {
    user_id: userId, meal: "snack", name: "AETHR staging " + label + " " + suffix,
    amount_g: 1, calories: 1, protein_g: 0, carbs_g: 0, fat_g: 0,
  });
  registerCleanup(cleanups, client, "meal_entries", "id", f.meal_entries);

  f.exercises = await insertRow(client, "exercises", {
    id: randomUUID(), user_id: userId, name: "AETHR " + label + " " + suffix,
    muscle_group: "staging",
  });
  registerCleanup(cleanups, client, "exercises", "id", f.exercises);

  f.workout_templates = await insertRow(client, "workout_templates", {
    id: randomUUID(), user_id: userId, name: "AETHR " + label + " " + suffix,
  });
  registerCleanup(cleanups, client, "workout_templates", "id", f.workout_templates);

  f.workout_template_exercises = await insertRow(client, "workout_template_exercises", {
    id: randomUUID(), template_id: f.workout_templates, exercise_id: f.exercises,
    sort_order: 0, target_sets: 1, target_reps: 1,
  });
  registerCleanup(cleanups, client, "workout_template_exercises", "id", f.workout_template_exercises);

  f.workout_sessions = await insertRow(client, "workout_sessions", {
    id: randomUUID(), user_id: userId, title: "AETHR staging " + label,
    notes: "Synthetic Phase 21C test record",
  });
  registerCleanup(cleanups, client, "workout_sessions", "id", f.workout_sessions);

  f.workout_sets = await insertRow(client, "workout_sets", {
    id: randomUUID(), user_id: userId, session_id: f.workout_sessions,
    exercise_name: "Staging movement " + suffix, set_number: 1, repetitions: 1, weight_kg: 0,
  });
  registerCleanup(cleanups, client, "workout_sets", "id", f.workout_sets);

  f.activities = await insertRow(client, "activities", {
    id: randomUUID(), user_id: userId, activity_type: "walk",
    started_at: new Date().toISOString(), duration_seconds: 60, distance_km: 0.01,
    notes: "Synthetic staging record", source: "gps",
  });
  registerCleanup(cleanups, client, "activities", "id", f.activities);

  f.activity_route_points = await insertRow(client, "activity_route_points", {
    activity_id: f.activities, user_id: userId, sequence_number: 0,
    latitude: 0, longitude: 0, recorded_at: new Date().toISOString(),
  });
  registerCleanup(cleanups, client, "activity_route_points", "id", f.activity_route_points);

  f.saved_foods = await insertRow(client, "saved_foods", {
    id: randomUUID(), user_id: userId, name: "AETHR staging food " + suffix,
    calories_100g: 1, protein_100g: 0, carbs_100g: 0, fat_100g: 0,
  });
  registerCleanup(cleanups, client, "saved_foods", "id", f.saved_foods);

  f.saved_recipes = await insertRow(client, "saved_recipes", {
    id: randomUUID(), user_id: userId, name: "AETHR staging recipe " + suffix,
    ingredients: [{ name: "Synthetic ingredient", grams: 1 }],
  });
  registerCleanup(cleanups, client, "saved_recipes", "id", f.saved_recipes);

  f.wellness_logs = await insertRow(client, "wellness_logs", {
    id: randomUUID(), user_id: userId, log_date: await uniqueWellnessDate(client, userId),
    notes: "Synthetic Phase 21C fixture",
  });
  registerCleanup(cleanups, client, "wellness_logs", "id", f.wellness_logs);

  f.profiles = await selectOwn(client, "profiles", "id", userId, "id,display_name");
  f.reminder_preferences = await selectOwn(
    client, "reminder_preferences", "user_id", userId,
    "user_id,enabled,reminder_time,reminder_kind",
  );
  return f;
}

async function updateOwnerRow(client, table, key, id, patch, label) {
  const response = await client.from(table).update(patch).eq(key, id).select(key).maybeSingle();
  assertSingleRow(response, label + " owner UPDATE");
}

async function verifyOwnerUpdates(clientA, idA, a, cleanups) {
  const mutable = [
    ["meal_entries", "id", a.meal_entries, { name: "AETHR staging meal updated" }],
    ["exercises", "id", a.exercises, { muscle_group: "staging-updated" }],
    ["workout_templates", "id", a.workout_templates, { name: "AETHR staging template updated" }],
    ["workout_sessions", "id", a.workout_sessions, { notes: "Updated synthetic session" }],
    ["activities", "id", a.activities, { notes: "Updated synthetic activity" }],
    ["wellness_logs", "id", a.wellness_logs, { notes: "Updated synthetic wellness fixture" }],
  ];
  for (const [table, key, id, patch] of mutable) {
    await updateOwnerRow(clientA, table, key, id, patch, table);
  }

  // These tables intentionally have no UPDATE policy in the current schema.
  // Even their owners must receive no returned row for UPDATE attempts.
  const insertDeleteOnly = [
    ["workout_template_exercises", "id", a.workout_template_exercises, { sort_order: 7 }],
    ["workout_sets", "id", a.workout_sets, { repetitions: 2 }],
    ["activity_route_points", "id", a.activity_route_points, { latitude: 0.0001 }],
    ["saved_foods", "id", a.saved_foods, { name: "AETHR staging food should not update" }],
    ["saved_recipes", "id", a.saved_recipes, { name: "AETHR staging recipe should not update" }],
  ];
  for (const [table, key, id, patch] of insertDeleteOnly) {
    const response = await clientA.from(table).update(patch).eq(key, id).select(key).maybeSingle();
    assertNoVisibleMutation(response, table + " owner UPDATE without an UPDATE policy");
  }

  const profileOriginal = a.profiles.display_name;
  cleanups.push(async () => {
    const restored = await clientA.from("profiles").update({ display_name: profileOriginal })
      .eq("id", idA).select("id").maybeSingle();
    assertSingleRow(restored, "profile display-name restoration");
  });
  await updateOwnerRow(clientA, "profiles", "id", idA, {
    display_name: "AETHR staging profile " + randomUUID().slice(0, 8),
  }, "profiles");

  const reminderOriginal = {
    enabled: a.reminder_preferences.enabled,
    reminder_time: a.reminder_preferences.reminder_time,
    reminder_kind: a.reminder_preferences.reminder_kind,
  };
  cleanups.push(async () => {
    const restored = await clientA.from("reminder_preferences").update(reminderOriginal)
      .eq("user_id", idA).select("user_id").maybeSingle();
    assertSingleRow(restored, "reminder-preferences restoration");
  });
  await updateOwnerRow(clientA, "reminder_preferences", "user_id", idA, {
    enabled: !reminderOriginal.enabled,
    reminder_time: "20:01:00",
    reminder_kind: reminderOriginal.reminder_kind === "rest" ? "check_in" : "rest",
  }, "reminder_preferences");
}

async function verifyOwnershipTransfers(clientA, clientB, idA, idB, a) {
  const cases = [
    ["meal_entries", "id", a.meal_entries],
    ["exercises", "id", a.exercises],
    ["workout_templates", "id", a.workout_templates],
    ["workout_sessions", "id", a.workout_sessions],
    ["activities", "id", a.activities],
    ["wellness_logs", "id", a.wellness_logs],
  ];
  for (const [table, key, id] of cases) {
    const response = await clientA.from(table).update({ user_id: idB })
      .eq(key, id).select(key).maybeSingle();
    assertRlsDenial(response, table + " ownership reassignment");
  }
}

async function verifyCrossAccountMutations(clientA, clientB, idB, b) {
  const cases = [
    ["profiles", "id", idB, { display_name: "unauthorized staging edit" }],
    ["meal_entries", "id", b.meal_entries, { name: "unauthorized staging edit" }],
    ["exercises", "id", b.exercises, { muscle_group: "unauthorized" }],
    ["workout_templates", "id", b.workout_templates, { name: "unauthorized" }],
    ["workout_template_exercises", "id", b.workout_template_exercises, { sort_order: 99 }],
    ["workout_sessions", "id", b.workout_sessions, { notes: "unauthorized" }],
    ["workout_sets", "id", b.workout_sets, { repetitions: 99 }],
    ["activities", "id", b.activities, { notes: "unauthorized" }],
    ["activity_route_points", "id", b.activity_route_points, { latitude: 1 }],
    ["saved_foods", "id", b.saved_foods, { name: "unauthorized" }],
    ["saved_recipes", "id", b.saved_recipes, { name: "unauthorized" }],
    ["wellness_logs", "id", b.wellness_logs, { notes: "unauthorized" }],
    ["reminder_preferences", "user_id", idB, { enabled: false }],
  ];
  for (const [table, key, id, patch] of cases) {
    await expectCrossAccountNoOp(clientA, table, key, id, patch, table);
    const stillOwned = await selectOwn(clientB, table, key, id, key);
    if (stillOwned[key] !== id) throw Error(table + ": owner could not see its fixture after denied mutations");
  }
}

async function verifySpoofedInserts(clientA, clientB, idA, idB, a, b) {
  const suffix = randomUUID().slice(0, 8);
  const cases = [
    ["meal_entries", { user_id: idB, meal: "snack", name: "forged " + suffix, calories: 1 }],
    ["exercises", { id: randomUUID(), user_id: idB, name: "forged " + suffix }],
    ["workout_templates", { id: randomUUID(), user_id: idB, name: "forged " + suffix }],
    ["workout_sessions", { id: randomUUID(), user_id: idB, title: "forged " + suffix }],
    ["activities", {
      id: randomUUID(), user_id: idB, activity_type: "walk", started_at: new Date().toISOString(),
      duration_seconds: 60, distance_km: 0.01, source: "manual",
    }],
    ["saved_foods", {
      id: randomUUID(), user_id: idB, name: "forged " + suffix,
      calories_100g: 1, protein_100g: 0, carbs_100g: 0, fat_100g: 0,
    }],
    ["saved_recipes", {
      id: randomUUID(), user_id: idB, name: "forged " + suffix,
      ingredients: [{ name: "Synthetic", grams: 1 }],
    }],
    ["wellness_logs", {
      id: randomUUID(), user_id: idB, log_date: await uniqueWellnessDate(clientB, idB),
      notes: "forged " + suffix,
    }],
    ["reminder_preferences", { user_id: idB, enabled: false, reminder_kind: "rest" }],
  ];
  for (const [table, payload] of cases) {
    await expectSpoofedInsert(clientA, table, payload, table, clientB);
  }

  // Relationship tables inherit ownership from their parent, not a user_id
  // column. Test both foreign-parent boundaries with otherwise valid records.
  await expectSpoofedInsert(clientA, "workout_template_exercises", {
    id: randomUUID(), template_id: b.workout_templates, exercise_id: a.exercises,
    sort_order: 1, target_sets: 1, target_reps: 1,
  }, "workout_template_exercises parent-template ownership", clientB);

  await expectSpoofedInsert(clientA, "workout_template_exercises", {
    id: randomUUID(), template_id: a.workout_templates, exercise_id: b.exercises,
    sort_order: 1, target_sets: 1, target_reps: 1,
  }, "workout_template_exercises private-exercise ownership", clientA);

  await expectSpoofedInsert(clientA, "workout_sets", {
    id: randomUUID(), user_id: idA, session_id: b.workout_sessions,
    exercise_name: "Forged " + suffix, set_number: 99, repetitions: 1, weight_kg: 0,
  }, "workout_sets parent-session ownership", clientA);

  await expectSpoofedInsert(clientA, "activity_route_points", {
    activity_id: b.activities, user_id: idA, sequence_number: 2999,
    latitude: 0, longitude: 0, recorded_at: new Date().toISOString(),
  }, "activity_route_points parent-activity ownership", clientA);
}

async function main() {
  const config = readStagingConfig(process.env);
  const clientA = createSupabase(config);
  const clientB = createSupabase(config);
  const cleanups = [];
  let failure = null;

  try {
    const [idA, idB] = await Promise.all([
      signIn(clientA, config.credentials[0], "Account A"),
      signIn(clientB, config.credentials[1], "Account B"),
    ]);
    if (idA === idB) throw Error("Two distinct staging-only test accounts are required");

    console.log("AETHR Phase 21C: authenticated public-key Data API write checks");
    const [a, b] = await Promise.all([
      createFixtures(clientA, idA, "A", cleanups),
      createFixtures(clientB, idB, "B", cleanups),
    ]);

    await verifyOwnerUpdates(clientA, idA, a, cleanups);
    console.log("PASS: permitted owner updates succeed; intentionally unavailable updates remain blocked");

    await verifyOwnershipTransfers(clientA, clientB, idA, idB, a);
    console.log("PASS: ownership reassignment rejected by WITH CHECK policies");

    await verifyCrossAccountMutations(clientA, clientB, idB, b);
    console.log("PASS: cross-account UPDATE and DELETE cannot mutate any of the 13 tables");

    await verifySpoofedInserts(clientA, clientB, idA, idB, a, b);
    console.log("PASS: forged owner IDs and foreign-parent references rejected");

    console.log("PASS: owner INSERTs succeeded for all writable test tables");
  } catch (error) {
    failure = error instanceof Error ? error.message : "unknown staging write-test failure";
  } finally {
    const cleanupErrors = [];
    for (const cleanup of cleanups.reverse()) {
      try { await cleanup(); } catch (error) {
        cleanupErrors.push(error instanceof Error ? error.message : "cleanup failed");
      }
    }
    await Promise.allSettled([
      clientA.auth.signOut({ scope: "local" }),
      clientB.auth.signOut({ scope: "local" }),
    ]);
    if (cleanupErrors.length) {
      failure = [failure, "Synthetic cleanup incomplete: " + cleanupErrors.join("; ")].filter(Boolean).join(" | ");
    }
  }

  if (failure) throw Error(failure);
  console.log("PASS: all synthetic records removed and profile/reminder settings restored");
  console.log("Phase 21C authenticated write-policy verification complete. No accounts were deleted.");
}

main().catch((error) => {
  console.error("STAGING WRITE VALIDATION FAILED: " + (error instanceof Error ? error.message : "unknown error"));
  process.exitCode = 1;
});
