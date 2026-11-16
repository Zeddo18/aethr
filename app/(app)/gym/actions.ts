"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { workoutId, workoutInteger, workoutName, workoutWeight } from "@/lib/workout-validation";

export type GymState = { error?: string; message?: string } | undefined;
async function auth() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  return { db, user };
}
function refresh() { revalidatePath("/gym"); revalidatePath("/dashboard"); }

export async function startWorkout(_: GymState, form: FormData): Promise<GymState> {
  const title = workoutName(form.get("title"));
  if (!title) return { error: "Enter a workout name (up to 100 characters)." };
  const { db, user } = await auth();
  const { error } = await db.from("workout_sessions").insert({ user_id: user.id, title });
  if (error) return { error: "Could not create workout. Check whether phase4.sql was applied." };
  refresh();
  return { message: "Workout started. Add your first set below." };
}

export async function addSet(_: GymState, form: FormData): Promise<GymState> {
  const sessionId = form.get("session_id");
  const name = workoutName(form.get("exercise_name"));
  const reps = workoutInteger(form.get("repetitions"));
  const weight = workoutWeight(form.get("weight_kg"));
  if (!workoutId(sessionId) || !name || reps === null || weight === null)
    return { error: "Enter a valid exercise, repetitions (1–100) and weight (0–10000 kg)." };
  const { db, user } = await auth();
  const { data: session } = await db.from("workout_sessions")
    .select("id,finished_at").eq("id", sessionId).eq("user_id", user.id).maybeSingle();
  if (!session || session.finished_at) return { error: "This workout isn't active." };
  const { data: sets, error: readError } = await db.from("workout_sets")
    .select("set_number").eq("session_id", sessionId).eq("user_id", user.id)
    .eq("exercise_name", name).order("set_number", { ascending: false }).limit(1);
  if (readError) return { error: "Unable to load previous sets." };
  const next = (sets?.[0]?.set_number ?? 0) + 1;
  if (next > 100) return { error: "Maximum of 100 sets per exercise." };
  const { error } = await db.from("workout_sets").insert({
    user_id: user.id, session_id: sessionId, exercise_name: name,
    set_number: next, repetitions: reps, weight_kg: weight,
  });
  if (error) return { error: "Unable to save set. Try again." };
  refresh();
  return { message: `Saved ${name}: set ${next}.` };
}

export async function deleteSet(form: FormData) {
  const id = form.get("id");
  if (!workoutId(id)) return;
  const { db, user } = await auth();
  await db.from("workout_sets").delete().eq("id", id).eq("user_id", user.id);
  refresh();
}

export async function finishWorkout(form: FormData) {
  const id = form.get("id");
  if (!workoutId(id)) return;
  const { db, user } = await auth();
  await db.from("workout_sessions").update({ finished_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", user.id).is("finished_at", null);
  refresh();
}

export async function saveTemplate(_: GymState, form: FormData): Promise<GymState> {
  const title = workoutName(form.get("title"));
  const raw = String(form.get("exercises") ?? "");
  const names = Array.from(new Set(raw.split("\n").map(workoutName).filter((x): x is string => !!x)));
  if (!title || names.length < 1 || names.length > 20) return { error: "Enter a template name and 1–20 exercise names (one per line)." };
  const { db, user } = await auth();
  const { data: template, error } = await db.from("workout_templates")
    .insert({ user_id: user.id, name: title }).select("id").single();
  if (error || !template) return { error: "Unable to save template." };
  const { data: existing, error: searchError } = await db.from("exercises")
    .select("id,name").eq("user_id", user.id);
  if (searchError) return { error: "Template saved, but exercises couldn't be loaded." };
  const ids: string[] = [];
  for (const name of names) {
    const item = existing?.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (item) { ids.push(item.id); continue; }
    const { data, error: insertError } = await db.from("exercises")
      .insert({ user_id: user.id, name }).select("id").single();
    if (insertError || !data) return { error: "Template saved, but one exercise failed. Review your template." };
    ids.push(data.id);
  }
  const { error: linkError } = await db.from("workout_template_exercises")
    .insert(ids.map((exercise_id, sort_order) => ({ template_id: template.id, exercise_id, sort_order })));
  if (linkError) return { error: "Template saved, but exercise links failed." };
  refresh();
  return { message: "Template saved." };
}
