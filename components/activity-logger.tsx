"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pause, Play, Save, Square } from "lucide-react";
import { distanceMeters, paceMinutesPerKm, type RoutePoint, type ActivityType } from "@/lib/activity";

const clock = (seconds: number) => {
  const h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60), s = seconds % 60;
  return [h ? String(h) : "", String(m).padStart(h ? 2 : 1, "0"), String(s).padStart(2, "0")].filter(Boolean).join(":");
};
const pace = (seconds: number, km: number) => {
  const value = paceMinutesPerKm(seconds, km);
  if (value === null) return "—";
  let total = Math.round(value * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")} / km`;
};
async function persist(body: unknown) {
  const response = await fetch("/api/activities", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to save activity.");
}

export function ActivityLogger() {
  const router = useRouter();
  const [kind, setKind] = useState<ActivityType>("run");
  const [start, setStart] = useState(() => new Date().toISOString().slice(0,16));
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [meters, setMeters] = useState(0);
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const watch = useRef<number | null>(null);
  const started = useRef<string | null>(null);
  const activeAt = useRef<number | null>(null);
  const elapsedBefore = useRef(0);
  const samples = useRef<RoutePoint[]>([]);
  const traveled = useRef(0);
  const active = useRef(false);

  function stopWatch() {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null; active.current = false;
  }
  useEffect(() => {
    const tick = () => setElapsed(elapsedBefore.current + (activeAt.current ? Math.floor((Date.now()-activeAt.current)/1000) : 0));
    const timer = window.setInterval(tick, 500);
    return () => { window.clearInterval(timer); stopWatch(); };
  }, []);

  function begin() {
    if (!navigator.geolocation || !window.isSecureContext) {
      setMessage("GPS requires iPhone Safari over HTTPS (or localhost). You can still log the session manually."); return;
    }
    started.current = new Date().toISOString();
    samples.current = []; traveled.current = 0; elapsedBefore.current = 0;
    activeAt.current = Date.now(); active.current = true;
    setPoints([]); setMeters(0); setElapsed(0); setTracking(true); setPaused(false); setMessage("");
    attachWatch();
  }

  function attachWatch() {
    try {
      watch.current = navigator.geolocation.watchPosition(
        pos => {
          if (!active.current || pos.coords.accuracy > 60) return;
          const point = { latitude:pos.coords.latitude, longitude:pos.coords.longitude,
            recorded_at:new Date(pos.timestamp).toISOString() };
          const prior = samples.current.at(-1);
          if (prior) {
            const dt = (Date.parse(point.recorded_at)-Date.parse(prior.recorded_at))/1000;
            const delta = distanceMeters(prior, point);
            if (dt < 2 || delta < 4 || delta / dt > 9) return;
            traveled.current += delta;
          }
          if (samples.current.length >= 500) { setMessage("Route point limit reached. Stop and save the session."); stopWatch(); return; }
          samples.current = [...samples.current, point];
          setPoints(samples.current);
          setMeters(traveled.current);
        },
        () => { setMessage("Location unavailable or permission denied. Pause and save a manual activity if needed."); stopWatch(); },
        { enableHighAccuracy:true, maximumAge:0, timeout:15000 }
      );
    } catch { setMessage("GPS tracking couldn't start."); stopWatch(); }
  }

  function pause() {
    if (!tracking) return;
    if (paused) {
      activeAt.current = Date.now(); active.current = true;
      setPaused(false); attachWatch();
    } else {
      elapsedBefore.current += activeAt.current ? Math.floor((Date.now()-activeAt.current)/1000) : 0;
      activeAt.current = null; stopWatch(); setPaused(true);
    }
  }

  function finish() {
    if (!tracking) return;
    if (activeAt.current) elapsedBefore.current += Math.floor((Date.now()-activeAt.current)/1000);
    activeAt.current = null; stopWatch(); setPaused(true);
    setTracking(false); setElapsed(elapsedBefore.current);
    setDuration(String(Math.max(1, Math.ceil(elapsedBefore.current/60))));
    setDistance((traveled.current/1000).toFixed(3));
    if (started.current) {
      const date = new Date(started.current);
      setStart(new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16));
    }
    setMessage("GPS session stopped. Review and save. Your route is stored only if you confirm.");
  }

  async function save(source: "manual"|"gps") {
    setBusy(true); setMessage("");
    const mins = Number(duration), km = Number(distance);
    if (!duration.trim() || !distance.trim() || !Number.isFinite(mins) || mins <= 0 || mins > 1440 ||
        !Number.isFinite(km) || km < 0 || km > 1000 || !start) {
      setBusy(false); setMessage("Enter a valid start time, duration in minutes, and distance in kilometers."); return;
    }
    const date = new Date(start);
    if (Number.isNaN(date.getTime())) { setBusy(false); setMessage("Invalid date."); return; }
    try {
      await persist({
        activity_type:kind, started_at:date.toISOString(), duration_seconds:Math.round(mins*60),
        distance_km:Math.round(km*1000)/1000, notes, source,
        points:source==="gps" ? points : [],
      });
      setMessage("Activity saved."); setDuration(""); setDistance(""); setNotes("");
      setPoints([]); started.current = null; router.refresh();
    } catch(e) { setMessage(e instanceof Error ? e.message : "Unable to save."); }
    finally { setBusy(false); }
  }

  const gpsReady = !tracking && points.length > 0 && kind !== "treadmill";
  return (
    <section className="space-y-4" aria-label="Log activity">
      <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
        <h2 className="font-display text-xl font-semibold">Log an activity</h2>
        <div><label htmlFor="activity-kind" className="label">Activity</label>
          <select id="activity-kind" className="field" value={kind} onChange={e=>setKind(e.target.value as ActivityType)} disabled={tracking}>
            <option value="run">Outdoor run</option><option value="walk">Walk</option><option value="treadmill">Treadmill</option>
          </select></div>
        <div><label htmlFor="activity-start" className="label">Started at (local time)</label>
          <input id="activity-start" type="datetime-local" className="field" value={start} onChange={e=>setStart(e.target.value)} disabled={tracking} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label htmlFor="activity-duration" className="label">Duration (minutes)</label>
            <input id="activity-duration" className="field" inputMode="decimal" type="number" step="0.1" min="0.1" max="1440" value={duration} onChange={e=>setDuration(e.target.value)} disabled={tracking}/></div>
          <div><label htmlFor="activity-distance" className="label">Distance (km)</label>
            <input id="activity-distance" className="field" inputMode="decimal" type="number" step="0.001" min="0" max="1000" value={distance} onChange={e=>setDistance(e.target.value)} disabled={tracking}/></div>
        </div>
        <div><label htmlFor="activity-notes" className="label">Notes (optional)</label>
          <textarea id="activity-notes" className="field" maxLength={1000} rows={2}
            value={notes} onChange={e=>setNotes(e.target.value)} placeholder="How did the session feel?" /></div>
        <p className="text-sm text-muted">Estimated pace: {pace(Number(duration||0)*60, Number(distance||0))}</p>
        {!tracking && <button className="btn w-full gap-2" disabled={busy} onClick={()=>save(gpsReady?"gps":"manual")}>
          <Save size={18}/>{busy?"Saving…":gpsReady?"Save GPS activity":"Save manual activity"}</button>}
      </div>

      {kind !== "treadmill" && <section className="rounded-2xl border border-line bg-surface p-4 space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><MapPin size={19}/> Optional foreground GPS</h2>
        <p className="text-sm text-muted">Location is optional. iPhone Safari may stop GPS updates when you lock your screen or switch apps. Tracking requires HTTPS and your permission. Saved routes are private.</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><div className="font-semibold tabular-nums">{clock(elapsed)}</div><span className="text-xs text-muted">Elapsed</span></div>
          <div><div className="font-semibold tabular-nums">{(meters/1000).toFixed(2)}</div><span className="text-xs text-muted">km</span></div>
          <div><div className="font-semibold tabular-nums">{pace(elapsed,meters/1000)}</div><span className="text-xs text-muted">Pace</span></div>
        </div>
        <div className="flex gap-2">
          {!tracking && !gpsReady && <button className="btn w-full gap-2" onClick={begin}><Play size={17}/>Start GPS</button>}
          {tracking && <><button className="btn-ghost flex-1 border border-line" onClick={pause}>
            {paused?<Play size={17}/>:<Pause size={17}/>} {paused?"Resume":"Pause"}</button>
            <button className="btn flex-1 gap-2" onClick={finish}><Square size={16}/>Stop</button></>}
          {gpsReady && <button className="btn-ghost border border-line w-full" onClick={()=>{setPoints([]);setMeters(0);setElapsed(0);started.current=null;setMessage("GPS route discarded.");}}>Discard route</button>}
        </div>
        {points.length > 0 && <p className="text-xs text-muted">{points.length} GPS points recorded. The full route is saved privately after confirmation; the map preview comes in a later iteration.</p>}
      </section>}
      {message && <p role="status" className="rounded-xl border border-line bg-surface p-3 text-sm">{message}</p>}
    </section>
  );
}

export function DeleteActivity({ id }: { id:string }) {
  const router = useRouter();
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  async function remove() {
    if (!window.confirm("Delete this activity and its saved GPS route?")) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/activities", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id}) });
      if (!res.ok) throw new Error("Delete failed.");
      router.refresh();
    } catch { setError("Unable to delete activity."); }
    finally { setBusy(false); }
  }
  return <span className="inline-flex flex-col items-end gap-1">
    <button className="btn-ghost text-xs" disabled={busy} onClick={remove}>Delete</button>
    {error && <span role="alert" className="text-xs text-red-400">{error}</span>}
  </span>;
}
