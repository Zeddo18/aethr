"use client";

import { useActionState, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { addEntry } from "@/app/(app)/nutrition/actions";
import type { FormState } from "@/app/actions";

type Hit = { name: string; kcal: number; protein: number | null; carbs: number | null; fat: number | null; source: string; basis: string };
const r1 = (n: number) => String(Math.round(n * 10) / 10);
const EMPTY = { name: "", amount: "", kcal: "", protein: "", carbs: "", fat: "" };

const scale = (h: Hit, g: number) => ({
  kcal: r1((h.kcal * g) / 100),
  protein: h.protein === null ? "" : r1((h.protein * g) / 100),
  carbs: h.carbs === null ? "" : r1((h.carbs * g) / 100),
  fat: h.fat === null ? "" : r1((h.fat * g) / 100),
});

export function AddFood({ date }: { date: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addEntry, undefined);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState("");
  const [base, setBase] = useState<Hit | null>(null);
  const [f, setF] = useState(EMPTY);

  useEffect(() => {
    if (state?.message) { setF(EMPTY); setBase(null); setHits([]); setQ(""); setNote(""); }
  }, [state]);

  async function search() {
    if (q.trim().length < 2) return;
    setSearching(true); setNote("");
    try {
      const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setHits(data.results ?? []);
      setNote(data.error ?? (data.results?.length ? "" : "No matches. Enter the food manually."));
    } catch {
      setNote("Food search is unavailable. Enter the food manually.");
    } finally { setSearching(false); }
  }

  function pick(h: Hit) {
    setBase(h); setHits([]);
    setF({ name: h.name, amount: "100", ...scale(h, 100) });
  }

  function setAmount(v: string) {
    const g = Number(v);
    setF((p) => ({ ...p, amount: v, ...(base && g > 0 ? scale(base, g) : {}) }));
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <details className="rounded-2xl border border-line bg-surface">
      <summary className="flex min-h-14 cursor-pointer items-center px-5 font-display text-lg font-medium">Add food</summary>
      <div className="space-y-4 border-t border-line p-5">
        <div>
          <label htmlFor="food-search" className="label">Search foods</label>
          <div className="flex gap-2">
            <input id="food-search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }}
              placeholder="Oats, chicken breast…" className="field" />
            <button type="button" onClick={search} disabled={searching} className="btn shrink-0 px-4" aria-label="Search">
              <Search size={20} aria-hidden />
            </button>
          </div>
          <p aria-live="polite" className="mt-1.5 min-h-5 text-sm text-muted">{searching ? "Searching…" : note || "Search results: Open Food Facts. Missing nutrients are left blank for review."}</p>
          {hits.length > 0 && (
            <ul className="mt-1 max-h-60 overflow-auto rounded-xl border border-line">
              {hits.map((h, i) => (
                <li key={i}>
                  <button type="button" onClick={() => pick(h)} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-paper">
                    <span className="text-sm">{h.name}</span>
                    <span className="shrink-0 text-xs text-muted">{Math.round(h.kcal)} kcal / 100 g</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form action={action} className="grid grid-cols-2 gap-3">
          <input type="hidden" name="date" value={date} />
          <div className="col-span-2">
            <label htmlFor="name" className="label">Food</label>
            <input id="name" name="name" value={f.name} onChange={set("name")} className="field" required />
          </div>
          <div>
            <label htmlFor="meal" className="label">Meal</label>
            <select id="meal" name="meal" defaultValue="breakfast" className="field">
              <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option><option value="snack">Snack</option>
            </select>
          </div>
          <div>
            <label htmlFor="amount_g" className="label">Amount (g)</label>
            <input id="amount_g" name="amount_g" inputMode="decimal" value={f.amount} onChange={(e) => setAmount(e.target.value)} className="field" />
          </div>
          <div>
            <label htmlFor="calories" className="label">Calories</label>
            <input id="calories" name="calories" inputMode="decimal" value={f.kcal} onChange={set("kcal")} className="field" required />
          </div>
          <div>
            <label htmlFor="protein_g" className="label">Protein (g)</label>
            <input id="protein_g" name="protein_g" inputMode="decimal" value={f.protein} onChange={set("protein")} className="field" />
          </div>
          <div>
            <label htmlFor="carbs_g" className="label">Carbs (g)</label>
            <input id="carbs_g" name="carbs_g" inputMode="decimal" value={f.carbs} onChange={set("carbs")} className="field" />
          </div>
          <div>
            <label htmlFor="fat_g" className="label">Fat (g)</label>
            <input id="fat_g" name="fat_g" inputMode="decimal" value={f.fat} onChange={set("fat")} className="field" />
          </div>
          <p role="status" aria-live="polite" className="col-span-2 min-h-5 text-sm">
            {state?.error && <span className="text-red-400">{state.error}</span>}
            {state?.message && <span className="text-emerald-400">{state.message}</span>}
          </p>
          <button className="btn col-span-2" disabled={pending}>{pending ? "Adding…" : "Add to log"}</button>
        </form>
      </div>
    </details>
  );
}
