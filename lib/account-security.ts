/** Shared security rules for sensitive account-data operations. */

export const DELETE_CONFIRMATION = "DELETE MY ACCOUNT";

export function isSameOriginRequest(request: Request): boolean {
  try {
    const origin = request.headers.get("origin");
    if (!origin || origin === "null") return false;
    const from = new URL(origin);
    const to = new URL(request.url);
    return (from.protocol === "https:" || from.protocol === "http:") &&
      from.origin === to.origin;
  } catch {
    return false;
  }
}

export function validDeletionPayload(value: unknown): value is {
  confirmation: typeof DELETE_CONFIRMATION;
  password: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  return payload.confirmation === DELETE_CONFIRMATION &&
    typeof payload.password === "string" &&
    payload.password.length >= 1 && payload.password.length <= 256;
}

export function isServerOnlyAdminKey(value: string | undefined): value is string {
  if (!value || value.length < 20) return false;
  if (value.startsWith("sb_publishable_")) return false;
  // Legacy anon JWTs are not allowed. Supabase's newer sb_secret_ keys are.
  if (value.startsWith("sb_secret_")) return true;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return payload.role === "service_role";
  } catch {
    return false;
  }
}
