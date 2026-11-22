import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateReminder } from "@/lib/reminders";

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid reminder settings." }, { status: 400 });
  }
  const prefs = validateReminder(raw);
  if (!prefs) return NextResponse.json({ error: "Choose a valid reminder time and type." }, { status: 400 });
  const { error } = await db.from("reminder_preferences").upsert({
    user_id: user.id, ...prefs, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  return error ? NextResponse.json({ error: "Unable to save preferences. Apply supabase/phase9.sql." }, { status: 500 })
    : NextResponse.json({ saved: true });
}
