"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Moon, Save, Trash2, CalendarDays } from "lucide-react";
import { hoursLabel, sleepMinutes, type WellnessLog } from "@/lib/wellness";

type Form = { date: string; sleepStart: string; sleepEnd: string;
  energy: string; rest: string; activity: string; notes: string };
const empty = (date: string): Form => ({
  date, sleepStart: "", sleepEnd: "", energy: "", rest: "", activity: "", notes: "",
});
function localInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function dateText(date: string) {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(date + "T12:00:00Z"));
}
async function send(url: string, method: string, body: unknown) {
  const response = await fetch(url, {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
}
export function RecoveryJournal({ today, entries }: {today: string; entries: WellnessLog[]}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(empty(today));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const saved = entries.find(e => e.log_date === form.date);
  function useEntry(date: string) {
    const entry = entries.find(x => x.log_date === date);
    setForm(entry ? {
      date,
      sleepStart: localInput(entry.sleep_start),
      sleepEnd: localInput(entry.sleep_end),
      energy: entry.energy ?? "",
      rest: entry.rest_feeling ?? "",
      activity: entry.activity_feeling ?? "",
      notes: entry.notes,
    } : empty(date));
    setError(""); setMessage("");
  }
  function change<K extends keyof Form>(key: K, value: Form[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }
  async function submit() {
    if (Boolean(form.sleepStart) !== Boolean(form.sleepEnd)) {
      setError("Enter both sleep start and wake time, or leave both blank."); return;
    }
    const start = form.sleepStart ? new Date(form.sleepStart) : null;
    const end = form.sleepEnd ? new Date(form.sleepEnd) : null;
    const startIso = start && !Number.isNaN(start.getTime()) ? start.toISOString() : null;
    const endIso = end && !Number.isNaN(end.getTime()) ? end.toISOString() : null;
    if (form.sleepStart && (!startIso || !endIso || sleepMinutes(startIso, endIso) === null)) {
      setError("Check your sleep times. Wake time must follow bedtime, within 24 hours."); return;
    }
    setBusy(true);setError("");setMessage("");
    try {
      await send("/api/wellness","POST",{
        log_date:form.date, sleep_start:startIso, sleep_end:endIso,
        energy:form.energy || null, rest_feeling:form.rest || null,
        activity_feeling:form.activity || null, notes:form.notes,
      });
      setMessage("Check-in saved. You can edit it any time.");
      router.refresh();
    } catch(e) {setError(e instanceof Error ? e.message : "Could not save entry.");}
    finally {setBusy(false);}
  }
  async function remove() {
    if (!saved || !window.confirm("Delete this check-in?")) return;
    setBusy(true);setError("");setMessage("");
    try {
      await send("/api/wellness","DELETE",{log_date:form.date});
      setForm(empty(form.date));setMessage("Check-in deleted.");
      router.refresh();
    } catch(e) {setError(e instanceof Error ? e.message : "Could not delete entry.");}
    finally {setBusy(false);}
  }
  const preview = form.sleepStart && form.sleepEnd ?
    sleepMinutes(new Date(form.sleepStart).toISOString(), new Date(form.sleepEnd).toISOString()) : null;
  const recordedSleep = entries.filter(x => sleepMinutes(x.sleep_start,x.sleep_end) !== null).length;
  return <div className="space-y-6">
    <header>
      <div className="flex items-center gap-2 text-accent"><Moon size={21} aria-hidden/><span className="text-sm">Private recovery journal</span></div>
      <h1 className="mt-2 font-display text-3xl font-semibold">Recovery & wellness</h1>
      <p className="mt-2 text-sm text-muted">Reflect on sleep, rest and how you feel. Every field is optional except the date. There are no scores or targets.</p>
    </header>
    {error && <p role="alert" className="rounded-xl border border-line p-3 text-sm text-red-400">{error}</p>}
    {message && <p role="status" className="rounded-xl border border-line p-3 text-sm">{message}</p>}
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-4" aria-label="Recovery check-in">
      <h2 className="font-display text-xl font-semibold">{saved ? "Edit check-in" : "New check-in"}</h2>
      <div>
        <label className="label" htmlFor="wellness-date">Date</label>
        <input id="wellness-date" type="date" className="field" value={form.date}
          max={today} onChange={e=>useEntry(e.target.value)}/>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="sleep-start">Fell asleep (optional)</label>
          <input id="sleep-start" type="datetime-local" className="field" value={form.sleepStart}
            onChange={e=>change("sleepStart",e.target.value)}/></div>
        <div><label className="label" htmlFor="sleep-end">Woke up (optional)</label>
          <input id="sleep-end" type="datetime-local" className="field" value={form.sleepEnd}
            onChange={e=>change("sleepEnd",e.target.value)}/></div>
      </div>
      <p className="text-sm text-muted">Sleep duration: {hoursLabel(preview)}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div><label className="label" htmlFor="energy">Energy today</label>
          <select id="energy" className="field" value={form.energy} onChange={e=>change("energy",e.target.value)}>
            <option value="">Not set</option><option value="low">Low</option><option value="okay">Okay</option><option value="high">High</option>
          </select></div>
        <div><label className="label" htmlFor="rest-feeling">How rested?</label>
          <select id="rest-feeling" className="field" value={form.rest} onChange={e=>change("rest",e.target.value)}>
            <option value="">Not set</option><option value="rested">Rested</option><option value="neutral">Neutral</option><option value="tired">Tired</option>
          </select></div>
        <div><label className="label" htmlFor="activity-feeling">Movement preference</label>
          <select id="activity-feeling" className="field" value={form.activity} onChange={e=>change("activity",e.target.value)}>
            <option value="">Not set</option><option value="ready">Feel like moving</option><option value="unsure">Not sure</option><option value="rest">Prefer rest</option>
          </select></div>
      </div>
      <div><label className="label" htmlFor="wellness-notes">Notes (optional)</label>
        <textarea id="wellness-notes" rows={3} maxLength={1000} className="field"
          value={form.notes} onChange={e=>change("notes",e.target.value)}
          placeholder="Anything you'd like to remember about your day?"/></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn flex-1 gap-2" disabled={busy || !form.date} onClick={submit}>
          <Save size={18}/>{busy?"Saving…":"Save check-in"}</button>
        {saved && <button type="button" disabled={busy} onClick={remove}
          className="btn-ghost border border-line gap-2"><Trash2 size={18}/>Delete</button>}
      </div>
      <p className="text-xs text-muted">Journal entries are visible only to your account. Sleep duration is based on your entered times; this is not a sleep diagnosis or a fitness readiness assessment.</p>
    </section>
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold">Recent entries</h2>
      <p className="text-sm text-muted">{entries.length} recorded check-ins · {recordedSleep} with sleep times. There is no requirement to log daily.</p>
      {entries.length===0 && <p className="rounded-xl border border-line p-4 text-sm text-muted">No check-ins yet. You can start whenever you like.</p>}
      <ul className="space-y-2">
        {entries.map(entry=><li key={entry.id}>
          <button type="button" onClick={()=>useEntry(entry.log_date)} className="w-full rounded-2xl border border-line bg-surface p-4 text-left hover:border-accent">
            <span className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-medium"><CalendarDays size={16} aria-hidden/>{dateText(entry.log_date)}</span>
              <span className="text-xs text-accent">Edit</span>
            </span>
            <span className="mt-2 block text-xs text-muted">
              {sleepMinutes(entry.sleep_start,entry.sleep_end) !== null
                ? "Sleep logged: " + hoursLabel(sleepMinutes(entry.sleep_start,entry.sleep_end)) : "Sleep not recorded"}
              {entry.rest_feeling ? " · " + entry.rest_feeling : ""}
              {entry.energy ? " · Energy: " + entry.energy : ""}
            </span>
            {entry.notes && <span className="mt-2 block whitespace-pre-wrap text-sm text-muted">{entry.notes}</span>}
          </button>
        </li>)}
      </ul>
    </section>
  </div>;
}
