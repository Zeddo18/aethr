"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseOptionalNumber, validateCredentials } from "@/lib/validation";

export type FormState = { error?: string; message?: string } | undefined;

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const invalid = validateCredentials(email, password);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email or password is incorrect." };
  redirect("/dashboard");
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!name) return { error: "Enter your name." };
  const invalid = validateCredentials(email, password);
  if (invalid) return { error: invalid };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: error.message };
  if (data.session) redirect("/dashboard");
  return { message: "Check your email to confirm your account, then sign in." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const SEX = ["female", "male", "other"];
const ACTIVITY = ["sedentary", "light", "moderate", "active", "athlete"];
const GOAL = ["lose", "maintain", "gain"];
const UNITS = ["metric", "imperial"];

const pick = (v: FormDataEntryValue | null, allowed: string[]) =>
  typeof v === "string" && allowed.includes(v) ? v : null;

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const height = parseOptionalNumber(formData.get("height_cm"), 50, 260);
  const weight = parseOptionalNumber(formData.get("weight_kg"), 20, 400);
  if (height === "invalid") return { error: "Height must be between 50 and 260 cm." };
  if (weight === "invalid") return { error: "Weight must be between 20 and 400 kg." };

  const birth = String(formData.get("birth_date") ?? "");
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: String(formData.get("display_name") ?? "").trim().slice(0, 80) || null,
    sex: pick(formData.get("sex"), SEX),
    birth_date: /^\d{4}-\d{2}-\d{2}$/.test(birth) ? birth : null,
    height_cm: height,
    weight_kg: weight,
    activity_level: pick(formData.get("activity_level"), ACTIVITY),
    goal: pick(formData.get("goal"), GOAL),
    units: pick(formData.get("units"), UNITS) ?? "metric",
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Couldn't save your profile. Try again." };
  return { message: "Profile saved." };
}
