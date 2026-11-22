"use client";

import { useActionState, useEffect, useState } from "react";
import { addSet, saveTemplate, startWorkout, type GymState } from "@/app/(app)/gym/actions";

type EntryProps = { sessionId: string; suggestedNames: string[]; lastExercise?: string };
export function StartWorkout() {
  const [state, action, busy] = useActionState<GymState, FormData>(startWorkout, undefined);
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <label className="label" htmlFor="workout-title">Start a workout</label>
      <input id="workout-title" className="field" name="title" maxLength={100}
        placeholder="Upper body, full body, leg day…" required />
      <button className="btn w-full" disabled={busy}>{busy ? "Starting…" : "Start workout"}</button>
      {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      {state?.message && <p role="status" className="text-sm text-accent">{state.message}</p>}
    </form>
  );
}

export function SetEntry({ sessionId, suggestedNames, lastExercise }: EntryProps) {
  const [state, action, busy] = useActionState<GymState, FormData>(addSet, undefined);
  const [exercise, setExercise] = useState(lastExercise ?? "");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("0");
  useEffect(() => { if (state?.message) setReps("10"); }, [state]);
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <h3 className="font-display text-lg font-semibold">Log a set</h3>
      <input type="hidden" name="session_id" value={sessionId} />
      <label className="label" htmlFor="exercise-name">Exercise</label>
      <input id="exercise-name" list="exercise-options" className="field" name="exercise_name"
        value={exercise} maxLength={100} onChange={e => setExercise(e.target.value)}
        placeholder="Squat, push-up, dumbbell press…" required />
      <datalist id="exercise-options">{suggestedNames.map(n => <option key={n} value={n} />)}</datalist>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="set-reps">Repetitions</label>
          <input id="set-reps" className="field" type="number" inputMode="numeric"
            name="repetitions" min={1} max={100} value={reps} onChange={e=>setReps(e.target.value)} required /></div>
        <div><label className="label" htmlFor="set-weight">Weight (kg)</label>
          <input id="set-weight" className="field" type="number" inputMode="decimal" step="0.01"
            name="weight_kg" min={0} max={10000} value={weight} onChange={e=>setWeight(e.target.value)} required /></div>
      </div>
      <button disabled={busy} className="btn w-full">{busy ? "Saving…" : "Save set"}</button>
      {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      {state?.message && <p role="status" className="text-sm text-accent">{state.message}</p>}
    </form>
  );
}

export function TemplateEntry() {
  const [state, action, busy] = useActionState<GymState, FormData>(saveTemplate, undefined);
  return (
    <details className="rounded-2xl border border-line bg-surface">
      <summary className="cursor-pointer px-4 py-4 font-semibold">Create a workout template</summary>
      <form action={action} className="space-y-3 border-t border-line p-4">
        <label className="label" htmlFor="template-title">Template name</label>
        <input id="template-title" name="title" className="field" required maxLength={100} placeholder="Push day" />
        <label className="label" htmlFor="template-exercises">Exercises — one per line</label>
        <textarea id="template-exercises" name="exercises" rows={5} className="field" required
          placeholder={"Bench press\nIncline dumbbell press\nTriceps extension"} />
        <button className="btn w-full" disabled={busy}>{busy ? "Saving…" : "Save template"}</button>
        {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
        {state?.message && <p role="status" className="text-sm text-accent">{state.message}</p>}
      </form>
    </details>
  );
}

export function RestTimer() {
  const [seconds, setSeconds] = useState(0);
  const [until, setUntil] = useState<number | null>(null);
  useEffect(() => {
    if (until === null) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) setUntil(null);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [until]);
  return (
    <section aria-label="Rest timer" className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="font-semibold">Rest timer</h3>
      <p role="timer" className="my-3 font-display text-3xl tabular-nums">
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
      </p>
      <div className="flex flex-wrap gap-2">
        {[60,90,120].map(n => <button type="button" key={n}
          onClick={() => {setSeconds(n);setUntil(Date.now()+n*1000);}}
          className="btn-ghost border border-line">{n}s</button>)}
        <button type="button" className="btn-ghost border border-line"
          onClick={() => {setUntil(null);setSeconds(0);}}>Reset</button>
      </div>
      <p className="mt-2 text-xs text-muted">Timer updates while this page stays open. It does not send background notifications.</p>
    </section>
  );
}
