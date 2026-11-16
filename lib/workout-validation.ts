export const workoutId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function workoutName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length > 0 && name.length <= 100 ? name : null;
}
export function workoutInteger(value: unknown, max = 100): number | null {
  const n = typeof value === "number" || typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= max ? n : null;
}
export function workoutWeight(value: unknown): number | null {
  if (!(typeof value === "number" || typeof value === "string" && value.trim() !== "")) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 10000 && Math.round(n * 100) === n * 100 ? n : null;
}
