export const isDate = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export const todayStr = () => new Intl.DateTimeFormat("en-CA").format(new Date());

export function shiftDate(s: string, days: number) {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const formatDate = (s: string) =>
  new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${s}T12:00:00Z`));
