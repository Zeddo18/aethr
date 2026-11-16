import { redirect } from "next/navigation";
import { Dumbbell, CheckCircle2, Trash2 } from "lucide-react";
import { StartWorkout, SetEntry, RestTimer, TemplateEntry } from "@/components/gym";
import { deleteSet, finishWorkout, startFromTemplate } from "./actions";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Gym · AETHR" };

type Session = { id: string; title: string; started_at: string; finished_at: string | null };
type SetRecord = { id: string; session_id: string; exercise_name: string; set_number: number; repetitions: number; weight_kg: number };

export default async function GymPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const [sessionsResult, templatesResult, exercisesResult] = await Promise.all([
    db.from("workout_sessions").select("id,title,started_at,finished_at")
      .eq("user_id", user.id).order("started_at", { ascending: false }).limit(40),
    db.from("workout_templates").select("id,name")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    db.from("exercises").select("name").eq("user_id", user.id).order("name").limit(100),
  ]);
  const sessions = (sessionsResult.data ?? []) as Session[];
  const ids = sessions.map(s => s.id);
  const { data: setsData } = ids.length ? await db.from("workout_sets")
    .select("id,session_id,exercise_name,set_number,repetitions,weight_kg")
    .eq("user_id", user.id).in("session_id", ids).order("created_at") : { data: [] };
  const sets = (setsData ?? []) as SetRecord[];
  const active = sessions.filter(s => !s.finished_at);
  const completed = sessions.filter(s => !!s.finished_at);
  const suggestions = Array.from(new Set([
    ...(exercisesResult.data ?? []).map(x => x.name),
    ...sets.map(x => x.exercise_name),
  ])).slice(0, 100);
  const records = new Map<string, number>();
  for (const set of sets) {
    const key = set.exercise_name.toLowerCase();
    records.set(key, Math.max(records.get(key) ?? 0, Number(set.weight_kg)));
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-accent"><Dumbbell size={21} /><span className="text-sm">Strength training</span></div>
        <h1 className="mt-2 font-display text-3xl font-semibold">Gym</h1>
        <p className="mt-2 text-sm text-muted">Log your sets, track training consistency, and take recovery days when needed.</p>
      </header>

      {sessionsResult.error && <p role="alert" className="rounded-xl border border-line bg-surface p-4 text-red-400">
        Workout tables are missing or unavailable. Apply supabase/phase4.sql in the Supabase SQL editor.
      </p>}

      <StartWorkout />

      {active.length > 0 && (
        <section className="space-y-4" aria-label="Active workouts">
          <h2 className="font-display text-xl font-semibold">In progress</h2>
          {active.map(session => {
            const list = sets.filter(s => s.session_id === session.id);
            return (
              <article key={session.id} className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="font-semibold">{session.title}</h3>
                    <p className="text-xs text-muted">Started {new Date(session.started_at).toLocaleString("en-PH", { timeZone:"Asia/Manila", dateStyle:"medium", timeStyle:"short" })}</p></div>
                  <form action={finishWorkout}>
                    <input name="id" type="hidden" value={session.id} />
                    <button className="btn-ghost border border-line text-sm" type="submit"><CheckCircle2 size={17} /> Finish</button>
                  </form>
                </div>
                <SetEntry sessionId={session.id} suggestedNames={suggestions} lastExercise={list.at(-1)?.exercise_name} />
                <RestTimer />
                {list.length > 0 && <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
                  {list.map(set => <li key={set.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{set.exercise_name} · Set {set.set_number}</p>
                      <p className="text-xs text-muted">{set.repetitions} reps × {set.weight_kg} kg</p>
                    </div>
                    <form action={deleteSet}><input type="hidden" name="id" value={set.id} />
                      <button type="submit" className="btn-ghost px-2" aria-label={`Delete ${set.exercise_name} set ${set.set_number}`}><Trash2 size={18}/></button>
                    </form>
                  </li>)}
                </ul>}
              </article>
            );
          })}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Workout templates</h2>
        <TemplateEntry />
        {(templatesResult.data ?? []).length > 0 && <ul className="space-y-2">
          {(templatesResult.data ?? []).map(t => <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3">
            <span className="truncate font-medium">{t.name}</span>
            <form action={startFromTemplate}><input type="hidden" name="id" value={t.id}/>
              <button className="btn-ghost border border-line text-sm" type="submit">Start</button>
            </form>
          </li>)}
        </ul>}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Recent workouts</h2>
        {completed.length === 0 ? <p className="text-sm text-muted">No completed workouts yet.</p> :
          <ul className="space-y-2">{completed.slice(0, 20).map(s => {
            const list = sets.filter(x => x.session_id === s.id);
            return <li key={s.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex justify-between gap-3"><strong>{s.title}</strong>
                <span className="text-xs text-muted">{new Date(s.started_at).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}</span></div>
              <p className="mt-1 text-sm text-muted">{list.length} logged sets · {new Set(list.map(x => x.exercise_name)).size} exercises</p>
            </li>;
          })}</ul>}
      </section>

      {records.size > 0 && <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Best recorded weights</h2>
        <p className="text-xs text-muted">Based on the most recent {sessions.length} workouts, not necessarily all-time records.</p>
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {Array.from(records.entries()).slice(0, 15).map(([name, weight]) =>
            <li key={name} className="flex justify-between gap-3 p-3 text-sm"><span>{name}</span><strong>{weight} kg</strong></li>)}
        </ul>
      </section>}
    </div>
  );
}
