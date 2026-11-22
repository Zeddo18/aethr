export type ActivityType = "run" | "walk" | "treadmill";
export type RoutePoint = { latitude: number; longitude: number; recorded_at: string };
export type ActivityInput = {
  activity_type: ActivityType; started_at: string; duration_seconds: number;
  distance_km: number; notes: string; source: "manual" | "gps"; points: RoutePoint[];
};
const finite = (n: unknown, min: number, max: number): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;

export function validateActivity(raw: unknown): ActivityInput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.activity_type !== "run" && r.activity_type !== "walk" && r.activity_type !== "treadmill") return null;
  if (r.source !== "gps" && r.source !== "manual") return null;
  if (r.activity_type === "treadmill" && r.source === "gps") return null;
  if (typeof r.started_at !== "string" || !Number.isFinite(Date.parse(r.started_at))) return null;
  const start = Date.parse(r.started_at);
  if (start > Date.now() + 60_000 || start < Date.now() - 365 * 86400_000) return null;
  if (!finite(r.duration_seconds, 1, 86400) || !Number.isInteger(r.duration_seconds)) return null;
  if (!finite(r.distance_km, 0, 1000)) return null;
  if (typeof r.notes !== "string" || r.notes.length > 1000) return null;
  if (!Array.isArray(r.points) || r.points.length > 500 || (r.source === "manual" && r.points.length !== 0)) return null;
  const points: RoutePoint[] = [];
  for (const p of r.points) {
    if (!p || typeof p !== "object") return null;
    if (!finite(p.latitude, -90, 90) || !finite(p.longitude, -180, 180) ||
        typeof p.recorded_at !== "string" || !Number.isFinite(Date.parse(p.recorded_at))) return null;
    const t = Date.parse(p.recorded_at);
    if (t < start - 60_000 || t > Date.now() + 60_000) return null;
    points.push({ latitude: p.latitude, longitude: p.longitude, recorded_at: p.recorded_at });
  }
  return { activity_type: r.activity_type, source: r.source, started_at: r.started_at,
    duration_seconds: r.duration_seconds, distance_km: r.distance_km,
    notes: r.notes, points };
}

export function distanceMeters(a: Pick<RoutePoint,"latitude"|"longitude">, b: Pick<RoutePoint,"latitude"|"longitude">) {
  const rad = Math.PI / 180;
  const lat = (b.latitude - a.latitude) * rad;
  const lon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(lat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(lon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function paceMinutesPerKm(seconds: number, km: number): number | null {
  return km > 0 ? seconds / 60 / km : null;
}
