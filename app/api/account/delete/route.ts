import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  isSameOriginRequest, validDeletionPayload, isServerOnlyAdminKey,
} from "@/lib/account-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie" };

function json(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return json("Invalid request origin.", 403);

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (!Number.isFinite(contentLength) || contentLength > 2_048) {
    return json("Invalid request size.", 413);
  }

  const db = await createClient();
  const { data: { user }, error: userError } = await db.auth.getUser();
  if (userError || !user?.id || !user.email) return json("Sign in required.", 401);

  let input: unknown;
  try { input = await request.json(); } catch { return json("Invalid request.", 400); }
  if (!validDeletionPayload(input)) {
    return json("Enter your current password and the exact confirmation phrase.", 400);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Never risk partial account deletion with an unconfigured or public key.
  if (!url || !anonKey || !isServerOnlyAdminKey(serverKey)) {
    return json("Account deletion is not configured yet. No data was deleted.", 503);
  }

  // Re-authenticate with a *separate* short-lived client. Do not trust a
  // browser-provided user ID and never log, persist or expose the password.
  const verifier = createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  let confirmed = false;
  try {
    const { data, error } = await verifier.auth.signInWithPassword({
      email: user.email,
      password: input.password,
    });
    confirmed = !error && Boolean(data.user?.id) && data.user?.id === user.id;
  } catch {
    return json("Identity verification is temporarily unavailable.", 503);
  } finally {
    await verifier.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
  if (!confirmed) return json("Password confirmation failed. No data was deleted.", 403);

  // The privileged client is constructed only inside this server route.
  // It is never exported or sent to a browser. Related AETHR tables use
  // ON DELETE CASCADE from auth.users; any FK failure must abort the operation.
  try {
    const admin = createSupabaseClient(url, serverKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error } = await admin.auth.admin.deleteUser(user.id, false);
    if (error) return json("Account deletion could not be completed. No success was reported.", 503);
  } catch {
    return json("Account deletion could not be completed. No success was reported.", 503);
  }

  // Revocation/clearing of current cookies is best-effort after deleting the
  // user. All owned AETHR rows with FK CASCADE are deleted by PostgreSQL.
  await db.auth.signOut().catch(() => undefined);
  return NextResponse.json(
    { deleted: true, message: "Your AETHR account and associated app records were deleted." },
    { status: 200, headers },
  );
}
