import { redirect } from "next/navigation";
import { Footprints, Activity } from "lucide-react";
import { ActivityLogger, DeleteActivity } from "@/components/activity-logger";
import { paceMinutesPerKm } from "@/lib/activity";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Run & Walk · AETHR" };
type Logged = {
  id: string; activity_type: "run" | "walk" | "treadmill";
  source: "gps" | "manual"; started_at: string;
  duration_seconds: number; distance_km: number; notes: string;
};
function formattedPace(s:number, km:number) {
  const p = paceMinutesPerKm(s,km);
  if (p === null) return "—";
  const sec = Math.round(p * 60);
  return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")} / km`;
}
export default async function ActivityPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await db.from("activities")
    .select("id,activity_type,source,started_at,duration_seconds,distance_km,notes")
    .eq("user_id",user.id).order("started_at",{ascending:false}).limit(50);
  const activities = (data ?? []) as Logged[];
  const totalKm = activities.reduce((sum, a)=>sum+Number(a.distance_km),0);
  const totalMinutes = Math.round(activities.reduce((sum,a)=>sum+a.duration_seconds,0)/60);
  return <div className="space-y-6">
    <header>
      <div className="flex items-center gap-2 text-accent"><Footprints size={21}/><span className="text-sm">Outdoor & indoor activity</span></div>
      <h1 className="mt-2 font-display text-3xl font-semibold">Run & Walk</h1>
      <p className="mt-2 text-sm text-muted">Record your movement at your own pace. No distance or speed goals required.</p>
    </header>
    {error && <p role="alert" className="rounded-xl border border-line bg-surface p-4 text-sm text-red-400">
      Activity tables are unavailable. Apply supabase/phase5.sql to your database.
    </p>}
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-line bg-surface p-4">
        <Activity size={20} className="mb-2 text-accent"/>
        <strong className="font-display text-2xl">{totalKm.toFixed(1)} km</strong>
        <p className="text-xs text-muted">In recent {activities.length} sessions</p>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-4">
        <Footprints size={20} className="mb-2 text-accent"/>
        <strong className="font-display text-2xl">{totalMinutes} min</strong>
        <p className="text-xs text-muted">Recorded activity time</p>
      </div>
    </div>
    <ActivityLogger/>
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold">Activity history</h2>
      {!activities.length ? <p className="text-sm text-muted">No runs or walks logged yet.</p> :
        <ul className="space-y-2">
          {activities.map(a=><li key={a.id} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="font-semibold capitalize">{a.activity_type === "treadmill" ? "Treadmill" : a.activity_type}</h3>
                <p className="text-xs text-muted">
                  {new Date(a.started_at).toLocaleString("en-PH",{timeZone:"Asia/Manila",dateStyle:"medium",timeStyle:"short"})} · {a.source.toUpperCase()}
                </p></div>
              <DeleteActivity id={a.id}/>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div><strong>{Number(a.distance_km).toFixed(2)}</strong><p className="text-xs text-muted">km</p></div>
              <div><strong>{Math.round(a.duration_seconds/60)}</strong><p className="text-xs text-muted">minutes</p></div>
              <div><strong>{formattedPace(a.duration_seconds,Number(a.distance_km))}</strong><p className="text-xs text-muted">pace</p></div>
            </div>
            {a.notes && <p className="mt-3 text-sm text-muted whitespace-pre-wrap">{a.notes}</p>}
          </li>)}
        </ul>}
    </section>
  </div>;
}
