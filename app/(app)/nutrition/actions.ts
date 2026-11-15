"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/actions";
import { isDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { parseOptionalNumber } from "@/lib/validation";

const MEALS = ["breakfast", "lunch", "dinner", "snack"];

export async function addEntry(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const meal = String(formData.get("meal") ?? "");
  const date = String(formData.get("date") ?? "");
  const calories = parseOptionalNumber(formData.get("calories"), 0, 9999);
  const protein = parseOptionalNumber(formData.get("protein_g"), 0, 999);
  const carbs = parseOptionalNumber(formData.get("carbs_g"), 0, 999);
  const fat = parseOptionalNumber(formData.get("fat_g"), 0, 999);
  const amount = parseOptionalNumber(formData.get("amount_g"), 0.1, 10000);

  if (!name) return { error: "Enter a food name." };
  if (!MEALS.includes(meal) || !isDate(date)) return { error: "Something went wrong. Reload and try again." };
  if (calories === null || calories === "invalid") return { error: "Calories must be a number from 0 to 9999." };
  if ([protein, carbs, fat, amount].includes("invalid")) return { error: "Check the amount and macro numbers." };

  const { error } = await supabase.from("meal_entries").insert({
    user_id: user.id, eaten_on: date, meal, name, calories,
    protein_g: protein ?? 0, carbs_g: carbs ?? 0, fat_g: fat ?? 0, amount_g: amount,
  });
  if (error) return { error: "Couldn't save this food. Try again." };

  revalidatePath("/nutrition");
  revalidatePath("/dashboard");
  return { message: "Food added." };
}

export async function deleteEntry(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  const supabase = await createClient();
  await supabase.from("meal_entries").delete().eq("id", id).eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "");
  revalidatePath("/nutrition");
  revalidatePath("/dashboard");
}
