import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateActivity } from "@/lib/activity";

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 110_000) return NextResponse.json({ error: "Activity too large." }, { status: 413 });
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid activity." }, { status: 400 }); }
  const activity = validateActivity(payload);
  if (!activity) return NextResponse.json({ error: "Check activity type, date, distance, duration, and route." }, { status: 400 });
  const { data, error } = await db.from("activities").insert({
    user_id: user.id, activity_type: activity.activity_type,
    started_at: activity.started_at, duration_seconds: activity.duration_seconds,
    distance_km: activity.distance_km, notes: activity.notes, source: activity.source,
  }).select("id").single();
  if (error || !data) return NextResponse.json({ error: "Unable to save activity. Apply the Phase 5 migration." }, { status: 500 });
  if (activity.points.length) {
    const rows = activity.points.map((p, i) => ({
      activity_id: data.id, user_id: user.id, sequence_number: i,
      latitude: p.latitude, longitude: p.longitude, recorded_at: p.recorded_at,
    }));
    const { error: routeError } = await db.from("activity_route_points").insert(rows);
    if (routeError) {
      // Avoid recording a route-less GPS session after a failed save.
      await db.from("activities").delete().eq("id", data.id).eq("user_id", user.id);
      return NextResponse.json({ error: "Could not save the GPS route. Your unsaved session remains in the browser until you retry." }, { status: 500 });
    }
  }
  return NextResponse.json({ id: data.id, saved: true });
}

export async function DELETE(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const id = typeof body === "object" && body !== null && "id" in body ? (body as { id: unknown }).id : null;
  if (typeof id !== "string" || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))
    return NextResponse.json({ error: "Invalid activity identifier." }, { status: 400 });
  const { error } = await db.from("activities").delete().eq("id", id).eq("user_id", user.id);
  return error ? NextResponse.json({ error: "Unable to delete activity." }, { status: 500 })
    : NextResponse.json({ deleted: true });
}
