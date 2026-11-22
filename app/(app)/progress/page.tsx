import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Apple, CalendarDays, Dumbbell, Footprints } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { progressDates, summarizeProgress, type MealRow, type MovementRow, type WorkoutRow } from "@/lib/progress";
import { todayStr } from "@/lib/dates";

export const metadata = { title: "Progress · AETHR" };
export const dynamic = "force-dynamic";

type QueryResult<T> = { data: T[] | null; error: { message: string } | null };
function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"));
}
function Metric({ title, value, detail, icon: Icon }: {
  title: string; value: string; detail: string; icon: typeof Apple;
}) {
  return <div className="rounded-2xl border border-line bg-surface p-4">
    <Icon size={19} className="text-accent" aria-hidden />
    <p className="mt-3 text-xs text-muted">{title}</p>
    <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
    <p className="mt-1 text-xs text-muted">{detail}</p>
  </div>;
}
function WeekBars({ label, values, unit }: { label: string; values: { name: string; value: number }[]; unit: string }) {
  const max = Math.max(1, ...values.map(x => x.value));
  return <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
    <h2 className="font-display text-lg font-semibold">{label}</h2>
    <div className="grid grid-cols-4 gap-2" aria-label={label + " over four weeks"}>
      {values.map((v, index) => <div key={index} className="space-y-2 text-center">
        <div className="flex h-28 items-end justify-center rounded-lg bg-paper/50 p-1">
          <div role="img" aria-label={v.name + ": " + v.value + " " + unit}
            className="w-full rounded-md bg-accent/85" style={{ height: v.value ? Math.max(6, Math.round(v.value / max * 100)) + "%" : "0%" }} />
        </div>
        <p className="text-xs text-muted">{v.name}</p>
        <p className="text-sm font-medium tabular-nums">{v.value}</p>
      </div>)}
    </div>
  </section>;
}

export default async function ProgressPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const dates = progressDates(todayStr(), 28);
  const startDate = dates[0];
  // UTC query bounds add a day on either side to include Philippine-local day boundaries.
  const before = new Date(startDate + "T00:00:00Z");
  before.setUTCDate(before.getUTCDate() - 1);
  const end = new Date(dates[27] + "T00:00:00Z");
  end.setUTCDate(end.getUTCDate() + 2);
  const minTs = before.toISOString();
  const maxTs = end.toISOString();

  const [mealsResult, workoutsResult, activityResult] = await Promise.all([
    db.from("meal_entries").select("eaten_on,meal,name")
      .eq("user_id", user.id).gte("eaten_on", startDate).lte("eaten_on", dates[27]).limit(1000),
    db.from("workout_sessions").select("id,started_at,finished_at")
      .eq("user_id", user.id).gte("started_at", minTs).lt("started_at", maxTs).limit(1000),
    db.from("activities").select("id,started_at,activity_type,duration_seconds,distance_km")
      .eq("user_id", user.id).gte("started_at", minTs).lt("started_at", maxTs).limit(1000),
  ]);
  const mealData = mealsResult as QueryResult<MealRow>;
  const gymData = workoutsResult as QueryResult<WorkoutRow>;
  const activityData = activityResult as QueryResult<MovementRow>;
  const mealAvailable = !mealData.error;
  const gymAvailable = !gymData.error;
  const activityAvailable = !activityData.error;
  const summary = summarizeProgress(dates, mealData.data ?? [], gymData.data ?? [], activityData.data ?? []);

  const weeks = Array.from({ length: 4 }, (_, i) => summary.days.slice(i * 7, i * 7 + 7));
  const mealBars = weeks.map((d, i) => ({ name: "Week " + (i + 1), value: d.filter(x => x.meals > 0).length }));
  const trainingBars = weeks.map((d, i) => ({ name: "Week " + (i + 1), value: d.reduce((n, x) => n + x.workouts + x.activities, 0) }));
  const truncated = [mealData, gymData, activityData].some(r => !r.error && (r.data?.length ?? 0) >= 1000);
  const allEmpty = !summary.loggedMeals && !summary.completedWorkouts && !summary.activitySessions;

  return <div className="space-y-6">
    <header>
      <div className="flex items-center gap-2 text-accent"><Activity size={21} aria-hidden /><span className="text-sm">Your activity history</span></div>
      <h1 className="mt-2 font-display text-3xl font-semibold">Progress</h1>
      <p className="mt-2 text-sm text-muted">A snapshot of the last 28 days, {dateLabel(startDate)} – {dateLabel(dates[27])}. Tracking is optional; rest days are part of your routine.</p>
    </header>
    {(!mealAvailable || !gymAvailable || !activityAvailable) && <div role="status" className="rounded-xl border border-line bg-surface p-4 text-sm">
      <p className="font-medium">Some categories are unavailable</p>
      <p className="mt-1 text-muted">
        {!mealAvailable && "Food diary data could not be loaded. "}
        {!gymAvailable && "Gym data is unavailable until Phase 4 is merged and the migration is applied. "}
        {!activityAvailable && "Run and walk data is unavailable until Phase 5 is merged and the migration is applied."}
      </p>
    </div>}
    {truncated && <p role="status" className="text-sm text-muted">This summary is partial because at least one category reached the 1,000-record query limit.</p>}
    <div className="grid grid-cols-2 gap-3">
      <Metric title="Days with food logs" value={mealAvailable ? String(summary.mealDays) : "—"}
        detail="Days with at least one entry" icon={Apple}/>
      <Metric title="Different foods recorded" value={mealAvailable ? String(summary.variety) : "—"}
        detail="Based on distinct names" icon={Apple}/>
      <Metric title="Completed gym sessions" value={gymAvailable ? String(summary.completedWorkouts) : "—"}
        detail="Sessions marked complete" icon={Dumbbell}/>
      <Metric title="Walk/run sessions" value={activityAvailable ? String(summary.activitySessions) : "—"}
        detail="Includes treadmill entries" icon={Footprints}/>
      <Metric title="Movement time" value={activityAvailable ? summary.movementMinutes + " min" : "—"}
        detail="From logged activities" icon={CalendarDays}/>
      <Metric title="Distance recorded" value={activityAvailable ? summary.movementKm + " km" : "—"}
        detail="From logged activities" icon={Footprints}/>
    </div>
    {allEmpty && <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
      No activity is recorded for this period. You can use AETHR whenever tracking is helpful; there is no minimum goal.
    </p>}
    <div className="space-y-3">
      {mealAvailable && <WeekBars label="Food logging days" values={mealBars} unit="days"/>}
      {(gymAvailable || activityAvailable) && <WeekBars label="Logged movement and gym sessions" values={trainingBars} unit="sessions"/>}
    </div>
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-display text-lg font-semibold">Daily history</h2>
      <p className="mt-1 text-xs text-muted">Dates are shown in Philippine time. This is a record, not a performance score.</p>
      <div className="mt-3 divide-y divide-line">
        {summary.days.slice().reverse().map(row => <div key={row.date} className="flex items-center justify-between gap-3 py-2 text-sm">
          <span>{dateLabel(row.date)}</span>
          <span className="text-right text-xs text-muted">
            {mealAvailable && row.meals > 0 ? row.meals + " foods" : ""}
            {gymAvailable && row.workouts > 0 ? " · " + row.workouts + " gym" : ""}
            {activityAvailable && row.activities > 0 ? " · " + row.activities + " walks/runs" : ""}
            {!row.meals && !row.workouts && !row.activities ? "No entries" : ""}
          </span>
        </div>)}
      </div>
    </section>
    <nav className="grid grid-cols-2 gap-3 text-sm" aria-label="Related sections">
      <Link href="/nutrition" className="btn-ghost justify-center border border-line">Food diary</Link>
      <Link href="/dashboard" className="btn-ghost justify-center border border-line">Today</Link>
    </nav>
  </div>;
}
