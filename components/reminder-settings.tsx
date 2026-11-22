"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Smartphone, CheckCircle2 } from "lucide-react";
import { reminderLabel, shouldShowReminder, type ReminderKind, type ReminderPreferences } from "@/lib/reminders";

export function ReminderSettings({ initial }: { initial: ReminderPreferences }) {
  const [prefs, setPrefs] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)));
  }, []);
  useEffect(() => {
    if (!saved.enabled) return;
    const key = "aethr-reminder-last-shown";
    const nowDay = () => {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      const get = (type: string) => parts.find(p => p.type === type)?.value || "";
      return `${get("year")}-${get("month")}-${get("day")}`;
    };
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const today = nowDay();
      if (shouldShowReminder(saved, new Date(), sessionStorage.getItem(key))) {
        sessionStorage.setItem(key, today);
        setNotice(reminderLabel(saved.reminder_kind));
      }
    };
    check();
    const interval = window.setInterval(check, 60_000);
    return () => window.clearInterval(interval);
  }, [saved]);

  async function save() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/reminders", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prefs),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save.");
      setSaved(prefs);
      setMessage("Reminder preferences saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save preferences."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <header>
      <div className="flex items-center gap-2 text-accent"><Smartphone size={21} aria-hidden/><span className="text-sm">Personal app preferences</span></div>
      <h1 className="mt-2 font-display text-3xl font-semibold">App experience</h1>
      <p className="mt-2 text-sm text-muted">Choose how AETHR works for you. Reminders are entirely optional.</p>
    </header>
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-display text-xl font-semibold">Install AETHR</h2>
      {installed ? <p className="flex items-center gap-2 text-sm"><CheckCircle2 size={18} className="text-accent"/> Running in standalone app mode</p> :
        <p className="text-sm text-muted">On iPhone Safari, tap Share, then Add to Home Screen. On a compatible desktop browser, use its Install option if offered.</p>}
      <p className="text-xs text-muted">Installing creates a home-screen shortcut and app-like window. AETHR still requires internet access; offline logging is not included yet.</p>
    </section>
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-display text-xl font-semibold">Gentle in-app reminders</h2>
      <label className="flex min-h-12 items-center gap-3">
        <input className="size-5 accent-accent" type="checkbox" checked={prefs.enabled}
          onChange={e=>setPrefs(x=>({...x,enabled:e.target.checked}))}/>
        <span className="flex items-center gap-2 text-sm">{prefs.enabled?<Bell size={18}/>:<BellOff size={18}/>} Enable reminders</span>
      </label>
      <div><label className="label" htmlFor="reminder-kind">Reminder type</label>
        <select id="reminder-kind" className="field" value={prefs.reminder_kind}
          onChange={e=>setPrefs(x=>({...x,reminder_kind:e.target.value as ReminderKind}))}>
          <option value="check_in">Optional wellness check-in</option>
          <option value="rest">Rest reminder</option>
        </select></div>
      <div><label className="label" htmlFor="reminder-time">Reminder time (Philippine time)</label>
        <input id="reminder-time" type="time" className="field" value={prefs.reminder_time}
          onChange={e=>setPrefs(x=>({...x,reminder_time:e.target.value}))}/></div>
      <button className="btn w-full" type="button" onClick={save} disabled={busy}>
        {busy?"Saving…":"Save preferences"}
      </button>
      {error&&<p role="alert" className="text-sm text-red-400">{error}</p>}
      {message&&<p role="status" className="text-sm text-accent">{message}</p>}
      {notice&&<p role="status" className="rounded-xl border border-line bg-paper p-4 text-sm">{notice}</p>}
      <p className="text-xs text-muted">Reminders appear only while this settings page is open and visible; they are not push notifications, alarms or background tasks. They appear at most once per tab session each Philippine-local day after your selected time. You can turn them off any time.</p>
    </section>
  </div>;
}
