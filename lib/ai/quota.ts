import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AiRequestKind = "parse" | "transcribe";
export type AiQuotaDecision = "allowed" | "limited" | "unavailable";

/**
 * Supabase RPC atomically consumes a per-user token in Postgres. This remains
 * reliable across multiple deployed Next.js instances and parallel requests.
 * Fail closed if the migration is missing, the connection fails, or response
 * is malformed: never call the paid AI provider without a confirmed allowance.
 */
export async function consumeAiAllowance(
  supabase: SupabaseClient,
  kind: AiRequestKind,
): Promise<AiQuotaDecision> {
  try {
    const { data, error } = await supabase.rpc("consume_ai_quota", { p_kind: kind });
    if (error || typeof data !== "boolean") return "unavailable";
    return data ? "allowed" : "limited";
  } catch {
    return "unavailable";
  }
}

export function aiQuotaError(decision: Exclude<AiQuotaDecision, "allowed">) {
  if (decision === "limited") {
    return NextResponse.json(
      { error: "You've reached the AI request limit for this hour. You can still log meals manually." },
      { status: 429, headers: { "Retry-After": "3600", "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    { error: "AI is temporarily unavailable until usage protection is configured. Manual food logging still works." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
