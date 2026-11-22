import { isDate } from "./dates";

export type Energy = "low" | "okay" | "high";
export type RestFeeling = "rested" | "neutral" | "tired";
export type ActivityFeeling = "ready" | "unsure" | "rest";
export type WellnessInput = {
  log_date: string;
  sleep_start: string | null;
  sleep_end: string | null;
  energy: Energy | null;
  rest_feeling: RestFeeling | null;
  activity_feeling: ActivityFeeling | null;
  notes: string;
};
export type WellnessLog = WellnessInput & { id: string; created_at: string };

const energyValues = ["low", "okay", "high"];
const restValues = ["rested", "neutral", "tired"];
const activityValues = ["ready", "unsure", "rest"];
function choice<T extends string>(value: unknown, options: string[]): T | null | undefined {
  if (value === null || value === "") return null;
  return typeof value === "string" && options.includes(value) ? value as T : undefined;
}
export function sleepMinutes(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const first = Date.parse(start), last = Date.parse(end);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  const minutes = (last - first) / 60000;
  return minutes > 0 && minutes <= 1440 ? Math.round(minutes) : null;
}
export function validateWellness(raw: unknown, now = new Date()): WellnessInput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.log_date !== "string" || !isDate(r.log_date)) return null;
  const endAllowed = now.getTime() + 60000;
  const startAllowed = now.getTime() - 366 * 86400000;
  const day = Date.parse(r.log_date + "T12:00:00Z");
  if (day < startAllowed || day > endAllowed + 86400000) return null;
  const start = r.sleep_start === null || r.sleep_start === "" ? null : r.sleep_start;
  const end = r.sleep_end === null || r.sleep_end === "" ? null : r.sleep_end;
  if ((start === null) !== (end === null)) return null;
  if (start !== null && (typeof start !== "string" || typeof end !== "string" ||
      sleepMinutes(start, end) === null || Date.parse(end) > endAllowed ||
      Date.parse(start) < startAllowed)) return null;
  const energy = choice<Energy>(r.energy, energyValues);
  const rest = choice<RestFeeling>(r.rest_feeling, restValues);
  const activity = choice<ActivityFeeling>(r.activity_feeling, activityValues);
  if (energy === undefined || rest === undefined || activity === undefined) return null;
  if (typeof r.notes !== "string" || r.notes.length > 1000) return null;
  return {
    log_date: r.log_date,
    sleep_start: start as string | null,
    sleep_end: end as string | null,
    energy, rest_feeling: rest, activity_feeling: activity,
    notes: r.notes.trim(),
  };
}
export function hoursLabel(minutes: number | null): string {
  if (minutes === null) return "Not recorded";
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
