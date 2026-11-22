import Link from "next/link";
import { BookOpen } from "lucide-react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { AddFood } from "@/components/add-food";
import { formatDate, isDate, shiftDate, todayStr } from "@/lib/dates";
import { calculateTargets } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/server";
import { deleteEntry } from "./actions";

export const metadata = { title: "Food · AETHR" };

const MEALS = [["breakfast", "Breakfast"], ["lunch", "Lunch"], ["dinner", "Dinner"], ["snack", "Snacks"]] as const;

type Entry = { id: string; meal: string; name: string; amount_g: number | null; calories: number; protein_g: number; carbs_g: number; fat_g: number };

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-line" role="presentation">
      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: d } = await searchParams;
  const date = isDate(d) ? d : todayStr();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data, error }] = await Promise.all([
    supabase.from("profiles").select("sex,birth_date,height_cm,weight_kg,activity_level,goal").eq("id", user!.id).maybeSingle(),
    supabase.from("meal_entries").select("id,meal,name,amount_g,calories,protein_g,carbs_g,fat_g").eq("user_id", user!.id).eq("eaten_on", date).order("created_at"),
  ]);
  const entries = (data ?? []) as Entry[];
  const targets = profile ? calculateTargets(profile) : null;
  const sum = (k: "calories" | "protein_g" | "carbs_g" | "fat_g") => Math.round(entries.reduce((s, e) => s + Number(e[k]), 0));
  const eaten = sum("calories");
  const isToday = date === todayStr();

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Food</h1>
        <div className="flex items-center gap-1">
          <Link href={`/nutrition?date=${shiftDate(date, -1)}`} aria-label="Previous day" className="btn-ghost justify-center px-3"><ChevronLeft size={20} /></Link>
          <Link href={`/nutrition?date=${shiftDate(date, 1)}`} aria-label="Next day" className="btn-ghost justify-center px-3"><ChevronRight size={20} /></Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">{isToday ? "Today, " : ""}{formatDate(date)}</p>

      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm text-red-400">
          The food log isn&apos;t set up yet. Run supabase/phase2.sql in the Supabase SQL editor.
        </p>
      )}

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5" aria-label="Daily summary">
        <p className="font-display text-4xl font-semibold">{eaten}
          <span className="text-base font-normal text-muted">{" kcal logged"}</span>
        </p>
        {targets ? (
          <>
            <div className="mt-3"><Bar value={eaten} max={targets.calories} /></div>
            <p className="mt-2 text-sm text-muted">
              Optional adult maintenance reference: {targets.calories} kcal (estimate only)
            </p>
            <dl className="mt-5 space-y-3">
              {([["Protein", "protein_g"], ["Carbs", "carbs_g"], ["Fat", "fat_g"]] as const).map(([label, key]) => (
                <div key={key}>
                  <div className="mb-1 flex justify-between text-sm"><dt>{label}</dt><dd className="text-muted">{sum(key)} / {targets[key]} g</dd></div>
                  <Bar value={sum(key)} max={targets[key]} />
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Track meals and nutrition without a mandatory daily target.
          </p>
        )}
      </section>

      <div className="mt-4 space-y-3">
        <Link href={`/nutrition/library?date=${date}`} className="btn-ghost w-full justify-center border border-line">
          <BookOpen size={18} aria-hidden /> Saved foods, recipes & barcode lookup
        </Link>
        <AddFood date={date} />
      </div>

      <div className="mt-8 space-y-6">
        {MEALS.map(([key, label]) => {
          const items = entries.filter((e) => e.meal === key);
          return (
            <section key={key} aria-label={label}>
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-lg font-semibold">{label}</h2>
                <span className="text-sm text-muted">{Math.round(items.reduce((s, e) => s + Number(e.calories), 0))} kcal</span>
              </div>
              {items.length === 0 ? (
                <p className="mt-1 text-sm text-muted">Nothing logged.</p>
              ) : (
                <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface">
                  {items.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate">{e.name}</p>
                        <p className="text-xs text-muted">
                          {e.amount_g ? `${e.amount_g} g · ` : ""}P {Math.round(e.protein_g)} · C {Math.round(e.carbs_g)} · F {Math.round(e.fat_g)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-sm">{Math.round(e.calories)}</span>
                        <form action={deleteEntry}>
                          <input type="hidden" name="id" value={e.id} />
                          <button className="btn-ghost justify-center px-3" aria-label={`Delete ${e.name}`}><Trash2 size={18} /></button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
