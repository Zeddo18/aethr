import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { collectAccountData, AccountExportError } from "@/lib/account-data";
import { isSameOriginRequest } from "@/lib/account-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store", "Vary": "Cookie" };

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, {
      status: 403, headers: privateHeaders,
    });
  }
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Sign in required." }, {
      status: 401, headers: privateHeaders,
    });
  }

  try {
    const json = await collectAccountData(db, {
      id: user.id,
      email: user.email,
    });
    const filename = "aethr-data-" + new Date().toISOString().slice(0, 10) + ".json";
    return new Response(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "Pragma": "no-cache",
        "Vary": "Cookie",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof AccountExportError ? error.httpStatus : 503;
    const message = error instanceof AccountExportError
      ? error.message
      : "Your data export is temporarily unavailable. Please try again later.";
    return NextResponse.json({ error: message }, {
      status, headers: privateHeaders,
    });
  }
}
