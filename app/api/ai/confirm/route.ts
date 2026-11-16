import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDate, todayStr } from "@/lib/dates";

const meals = new Set(["breakfast", "lunch", "dinner", "snack"]);
type Entry = { name: unknown; grams: unknown; calories: unknown; protein: unknown; carbs: unknown; fat: unknown };

function num(n: unknown, max: number): number | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > max) return null;
  return Math.round(n * 10) / 10;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  let body: { date?: unknown; meal?: unknown; items?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const date = typeof body.date === "string" ? body.date : todayStr();
  const meal = body.meal;
  if (!isDate(date) || typeof meal !== "string" || !meals.has(meal) ||
      !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 10) {
    return NextResponse.json({ error: "Invalid meal details." }, { status: 400 });
  }
  const rows = (body.items as Entry[]).map(item => {
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    const grams = num(item?.grams, 10000);
    const calories = num(item?.calories, 9999);
    const protein = num(item?.protein, 999);
    const carbs = num(item?.carbs, 999);
    const fat = num(item?.fat, 999);
    if (!name || name.length > 120 || grams === null || grams <= 0 ||
        [calories, protein, carbs, fat].some(x => x === null)) return null;
    return { user_id: user.id, eaten_on: date, meal, name, amount_g: grams,
      calories, protein_g: protein, carbs_g: carbs, fat_g: fat };
  });
  if (rows.some(x => x === null)) {
    return NextResponse.json({ error: "Review all portions and nutrition values before saving. Unknown nutrition must be checked manually." }, { status: 400 });
  }
  const { error } = await supabase.from("meal_entries").insert(rows);
  if (error) return NextResponse.json({ error: "Failed to save the meal." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
