"use client";

import { useActionState } from "react";
import { updateProfile, type FormState } from "@/app/actions";

export type Profile = {
  display_name: string | null; sex: string | null; birth_date: string | null;
  height_cm: number | null; weight_kg: number | null;
  activity_level: string | null; goal: string | null; units: string | null;
};

function Select({ name, label, value, options }: { name: string; label: string; value: string | null; options: [string, string][] }) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <select id={name} name={name} defaultValue={value ?? ""} className="field">
        <option value="">Not set</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, undefined);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="display_name" className="label">Name</label>
        <input id="display_name" name="display_name" defaultValue={profile.display_name ?? ""} className="field" />
      </div>
      <Select name="sex" label="Sex" value={profile.sex} options={[["female", "Female"], ["male", "Male"], ["other", "Other"]]} />
      <div>
        <label htmlFor="birth_date" className="label">Date of birth</label>
        <input id="birth_date" name="birth_date" type="date" defaultValue={profile.birth_date ?? ""} className="field" />
      </div>
      <div>
        <label htmlFor="height_cm" className="label">Height (cm)</label>
        <input id="height_cm" name="height_cm" inputMode="decimal" defaultValue={profile.height_cm ?? ""} className="field" />
      </div>
      <div>
        <label htmlFor="weight_kg" className="label">Weight (kg)</label>
        <input id="weight_kg" name="weight_kg" inputMode="decimal" defaultValue={profile.weight_kg ?? ""} className="field" />
      </div>
      <Select name="activity_level" label="Activity level" value={profile.activity_level}
        options={[["sedentary", "Mostly seated"], ["light", "Light"], ["moderate", "Moderate"], ["active", "Active"], ["athlete", "Athlete"]]} />
      <Select name="goal" label="Goal" value={profile.goal} options={[["lose", "Lose weight"], ["maintain", "Maintain"], ["gain", "Gain muscle"]]} />
      <Select name="units" label="Units" value={profile.units ?? "metric"} options={[["metric", "Metric"], ["imperial", "Imperial"]]} />
      <p role="status" aria-live="polite" className="min-h-5 text-sm sm:col-span-2">
        {state?.error && <span className="text-red-400">{state.error}</span>}
        {state?.message && <span className="text-emerald-400">{state.message}</span>}
      </p>
      <button className="btn sm:col-span-2 sm:w-fit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
    </form>
  );
}
