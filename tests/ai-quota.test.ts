import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consumeAiAllowance, aiQuotaError } from "../lib/ai/quota";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const fakeClient = (result: unknown) => ({
  rpc: vi.fn().mockResolvedValue(result),
}) as unknown as SupabaseClient;

describe("Phase 15 persistent AI quota integration", () => {
  it("allows the provider call only after database confirms consumption", async () => {
    const c = fakeClient({ data: true, error: null });
    expect(await consumeAiAllowance(c, "parse")).toBe("allowed");
    expect(c.rpc).toHaveBeenCalledWith("consume_ai_quota", { p_kind: "parse" });
  });

  it("treats an exhausted database quota as a hard 429 without a provider call", async () => {
    const c = fakeClient({ data: false, error: null });
    const decision = await consumeAiAllowance(c, "transcribe");
    expect(decision).toBe("limited");
    const response = aiQuotaError("limited");
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("3600");
  });

  it("fails closed when the migration is missing or Supabase errors", async () => {
    const c = fakeClient({ data: null, error: { code: "PGRST202" } });
    const decision = await consumeAiAllowance(c, "parse");
    expect(decision).toBe("unavailable");
    const response = aiQuotaError("unavailable");
    expect(response.status).toBe(503);
  });

  it("fails closed on malformed RPC data", async () => {
    expect(await consumeAiAllowance(fakeClient({ data: "true", error: null }), "parse")).toBe("unavailable");
    const throwing = { rpc: vi.fn().mockRejectedValue(Error("network")) } as unknown as SupabaseClient;
    expect(await consumeAiAllowance(throwing, "parse")).toBe("unavailable");
  });

  it("requires a quota reservation before both paid OpenAI fetches", () => {
    const routes = [
      ["app/api/ai/parse/route.ts", 'consumeAiAllowance(supabase, "parse")'],
      ["app/api/ai/transcribe/route.ts", 'consumeAiAllowance(supabase, "transcribe")'],
    ];
    for (const [path, reservation] of routes) {
      const source = readFileSync(join(process.cwd(), path), "utf8");
      const reservationIndex = source.indexOf(reservation);
      const providerIndex = source.indexOf('fetch("https://api.openai.com/');
      expect(reservationIndex, path).toBeGreaterThan(0);
      expect(providerIndex, path).toBeGreaterThan(reservationIndex);
      expect(source).toContain('if (allowance !== "allowed") return aiQuotaError(allowance);');
    }
  });
});
