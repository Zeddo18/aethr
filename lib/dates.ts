export const isDate = (s: string | undefined): s is string => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const date = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === s;
};

// AETHR currently serves a Philippine-based user. Never use the deployment server's timezone
// for a personal food diary. This can accept a user-selected IANA timezone in the future.
export const DEFAULT_TIME_ZONE = "Asia/Manila";
export const todayStr = (now = new Date(), timeZone = DEFAULT_TIME_ZONE) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

export function shiftDate(s: string, days: number) {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const formatDate = (s: string) =>
  new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${s}T12:00:00Z`));
