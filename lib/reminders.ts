export type ReminderKind = "check_in" | "rest";
export type ReminderPreferences = { enabled: boolean; reminder_time: string; reminder_kind: ReminderKind };

export function validateReminder(value: unknown): ReminderPreferences | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (typeof p.enabled !== "boolean" || typeof p.reminder_time !== "string" ||
    !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(p.reminder_time) ||
    (p.reminder_kind !== "check_in" && p.reminder_kind !== "rest")) return null;
  return { enabled: p.enabled, reminder_time: p.reminder_time, reminder_kind: p.reminder_kind };
}
export const reminderLabel = (kind: ReminderKind) =>
  kind === "rest" ? "It's okay to make time for rest." : "A gentle invitation to check in with yourself.";

export function shouldShowReminder(p: ReminderPreferences, now: Date, lastShownDate: string | null, timeZone = "Asia/Manila") {
  if (!p.enabled) return false;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  const day = `${get("year")}-${get("month")}-${get("day")}`;
  const clock = `${get("hour")}:${get("minute")}`;
  return day !== lastShownDate && clock >= p.reminder_time;
}
