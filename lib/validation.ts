export function validateCredentials(email: string, password: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
  if (password.length < 8) return "Use a password with at least 8 characters.";
  return null;
}

export function parseOptionalNumber(value: FormDataEntryValue | null, min: number, max: number): number | null | "invalid" {
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return "invalid";
  return n;
}
