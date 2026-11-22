import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateWellness } from "@/lib/wellness";
import { isDate } from "@/lib/dates";

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid journal entry." }, { status: 400 }); }
  const log = validateWellness(body);
  if (!log) return NextResponse.json({
    error: "Check the date, optional sleep times, and notes. Sleep times must be in order and no more than 24 hours apart.",
  }, { status: 400 });
  const { error } = await db.from("wellness_logs").upsert(
    { ...log, user_id: user.id, updated_at: new Date().toISOString() },
    { onConflict: "user_id,log_date" }
  );
  if (error) return NextResponse.json({
    error: "Could not save check-in. Apply supabase/phase8.sql and verify permissions.",
  }, { status: 500 });
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const date = typeof body === "object" && body !== null && "log_date" in body
    ? (body as {log_date: unknown}).log_date : null;
  if (typeof date !== "string" || !isDate(date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  const { error } = await db.from("wellness_logs").delete()
    .eq("user_id", user.id).eq("log_date", date);
  return error ? NextResponse.json({ error: "Unable to delete check-in." }, { status: 500 })
    : NextResponse.json({ deleted: true });
}
