"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Mic, Send, Sparkles } from "lucide-react";

type Candidate = {
  name: string; kcal: number; protein: number | null; carbs: number | null;
  fat: number | null; source: string; basis: string;
};
type Food = { name: string; grams: string; calories: string; protein: string; carbs: string; fat: string; source: string };
type Parsed = { meal: "breakfast" | "lunch" | "dinner" | "snack" | null; time: string | null; foods: { name: string; grams: number | null }[] };
const fmt = (value: number | null, grams: number) => value === null ? "" : String(Math.round(value * grams / 10) / 10);

export function AiFoodAssistant({ date }: { date: string }) {
  const router = useRouter();
  const upload = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [image, setImage] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [meal, setMeal] = useState("lunch");
  const [time, setTime] = useState<string | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [suggestions, setSuggestions] = useState<Candidate[][]>([]);
  const [chosen, setChosen] = useState<number[]>([]);

  async function photo(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3_000_000) {
      setError("Please choose a JPEG, PNG or WebP photo smaller than 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
      setPhotoName(file.name);
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function analyze() {
    if (!message.trim() && !image) return;
    setBusy(true); setError(""); setNotice(""); setFoods([]);
    try {
      const response = await fetch("/api/ai/parse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message.trim(), image }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to analyze meal.");
      const parsed = data.meal as Parsed;
      const matches = data.suggestions as Candidate[][];
      setMeal(parsed.meal ?? "lunch");
      setTime(parsed.time);
      setSuggestions(matches);
      setChosen(matches.map(() => -1));
      setFoods(parsed.foods.map(food => ({
        name: food.name, grams: food.grams === null ? "" : String(food.grams),
        calories: "", protein: "", carbs: "", fat: "", source: "",
      })));
      setNotice("Review each item. Select a verified food or enter the nutrition information yourself. Unknown amounts are never guessed.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to analyze meal."); }
    finally { setBusy(false); }
  }

  function change(index: number, key: keyof Food, value: string) {
    setFoods(prev => prev.map((f, i) => i === index ? { ...f, [key]: value } : f));
  }

  function select(index: number, selected: number) {
    setChosen(prev => prev.map((v, i) => i === index ? selected : v));
    const item = suggestions[index]?.[selected];
    if (!item) return;
    setFoods(prev => prev.map((f, i) => {
      if (i !== index) return f;
      const grams = Number(f.grams);
      const safeGrams = Number.isFinite(grams) && grams > 0 ? grams : 100;
      return { ...f, name: item.name, grams: f.grams || "100", source: item.source,
        calories: fmt(item.kcal, safeGrams),
        protein: fmt(item.protein, safeGrams),
        carbs: fmt(item.carbs, safeGrams),
        fat: fmt(item.fat, safeGrams) };
    }));
  }

  function amount(index: number, text: string) {
    const picked = suggestions[index]?.[chosen[index]];
    const grams = Number(text);
    setFoods(prev => prev.map((f, i) => i !== index ? f : {
      ...f, grams: text,
      ...(picked && text !== "" && Number.isFinite(grams) && grams > 0 ? {
        calories: fmt(picked.kcal, grams), protein: fmt(picked.protein, grams),
        carbs: fmt(picked.carbs, grams), fat: fmt(picked.fat, grams),
      } : {}),
    }));
  }

  async function confirm() {
    const items = foods.map(f => ({
      name: f.name, grams: Number(f.grams),
      calories: f.calories === "" ? null : Number(f.calories),
      protein: f.protein === "" ? null : Number(f.protein),
      carbs: f.carbs === "" ? null : Number(f.carbs),
      fat: f.fat === "" ? null : Number(f.fat),
    }));
    if (items.some(f => !f.name.trim() || !Number.isFinite(f.grams) || f.grams <= 0 ||
      [f.calories, f.protein, f.carbs, f.fat].some(n => n === null || !Number.isFinite(n) || n < 0))) {
      setError("Please review each food's grams, calories, protein, carbs and fat. Missing values cannot be silently saved as zero.");
      return;
    }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/ai/confirm", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, meal, items }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Unable to save meal.");
      setNotice("Meal saved. Check your food diary.");
      setFoods([]); setSuggestions([]); setMessage(""); setImage(""); setPhotoName("");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save meal."); }
    finally { setSaving(false); }
  }

  return (
    <section className="space-y-5" aria-label="AI food assistant">
      <header>
        <div className="flex items-center gap-2 text-accent"><Sparkles size={22} /><span className="text-sm">AI food assistant</span></div>
        <h1 className="mt-2 font-display text-3xl font-semibold">What did you eat?</h1>
        <p className="mt-2 text-sm text-muted">Describe your food in English or Taglish. Example: 150g chicken, 200g cooked rice, 20g soy sauce at 12:30 PM.</p>
      </header>
      <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
        <label htmlFor="ai-meal" className="label">Describe your meal</label>
        <textarea id="ai-meal" value={message} onChange={e => setMessage(e.target.value)}
          maxLength={1000} rows={3} className="field" placeholder="Type food names, grams, cooking method and meal time…" />
        <input ref={upload} type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
          className="hidden" aria-label="Food photo" onChange={e => photo(e.target.files?.[0])} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost border border-line" onClick={() => upload.current?.click()}>
            <Camera size={18} /> {photoName ? "Change photo" : "Add photo"}
          </button>
          {photoName && <button type="button" className="btn-ghost" onClick={() => { setImage(""); setPhotoName(""); }}>Remove photo</button>}
        </div>
        {photoName && <p className="text-xs text-muted">Attached: {photoName}</p>}
        <button type="button" className="btn w-full gap-2" disabled={busy || (!message.trim() && !image)}
          onClick={analyze}><Send size={17} />{busy ? "Analyzing…" : "Analyze meal"}</button>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-700 p-3 text-sm text-red-300">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-line p-3 text-sm text-muted">{notice}</p>}

      {foods.length > 0 && (
        <section className="space-y-4" aria-label="Review meal">
          <h2 className="font-display text-xl font-semibold">Review before saving</h2>
          <div>
            <label htmlFor="ai-meal-type" className="label">Meal</label>
            <select id="ai-meal-type" className="field" value={meal} onChange={e => setMeal(e.target.value)}>
              {["breakfast","lunch","dinner","snack"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {time && <p className="mt-2 text-xs text-muted">Mentioned time: {time}. Exact meal times are not yet stored by the food diary.</p>}
          </div>
          {foods.map((food, i) => (
            <article key={i} className="rounded-2xl border border-line bg-surface p-4 space-y-3">
              <h3 className="font-semibold">Food {i + 1}</h3>
              {suggestions[i]?.length > 0 && (
                <div><label className="label" htmlFor={`match-${i}`}>Verified food search</label>
                  <select id={`match-${i}`} className="field" value={chosen[i] ?? -1}
                    onChange={e => select(i, Number(e.target.value))}>
                    <option value={-1}>Choose a matching product or enter manually</option>
                    {suggestions[i].map((s, j) => <option key={j} value={j}>{s.name} · {s.kcal} kcal / 100g</option>)}
                  </select></div>
              )}
              {!suggestions[i]?.length && <p className="text-xs text-muted">No suitable database match. Enter label values manually or try a more specific name.</p>}
              <label className="label" htmlFor={`name-${i}`}>Food name</label>
              <input id={`name-${i}`} className="field" value={food.name} maxLength={120} onChange={e => change(i, "name", e.target.value)} />
              <label className="label" htmlFor={`grams-${i}`}>Weight in grams (verify with your scale)</label>
              <input id={`grams-${i}`} className="field" type="number" min="0.1" max="10000" step="any"
                value={food.grams} onChange={e => amount(i, e.target.value)} placeholder="Required" />
              <div className="grid grid-cols-2 gap-3">
                {([["calories","Calories"],["protein","Protein (g)"],["carbs","Carbs (g)"],["fat","Fat (g)"]] as const).map(([key,label]) => (
                  <div key={key}><label className="label" htmlFor={`${key}-${i}`}>{label}</label>
                    <input id={`${key}-${i}`} type="number" step="any" min="0" max={key==="calories"?"9999":"999"}
                      className="field" value={food[key]} onChange={e => change(i,key,e.target.value)} placeholder="Verify" /></div>
                ))}
              </div>
              <p className="text-xs text-muted">{food.source ? `Data source: ${food.source}. Verify matching brand and preparation.` : "Nutrition has not been verified. Please use a food label or reliable source."}</p>
            </article>
          ))}
          <button type="button" className="btn w-full" disabled={saving} onClick={confirm}>
            {saving ? "Saving…" : `Confirm and save ${foods.length} food item${foods.length===1?"":"s"}`}
          </button>
        </section>
      )}
      <p className="text-xs text-muted">AI can make mistakes. A photo cannot accurately determine ingredient weight. Nothing is saved without confirmation.</p>
    </section>
  );
}
