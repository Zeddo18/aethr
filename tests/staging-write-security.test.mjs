import { describe, expect, it } from "vitest";
import {
  assertNoVisibleMutation,
  assertRlsDenial,
  assertSingleRow,
} from "../lib/staging-write-security.mjs";

describe("Phase 21C authenticated Data API write assertions", () => {
  it("accepts an explicit PostgreSQL RLS WITH CHECK denial", () => {
    expect(() => assertRlsDenial({
      data: null, error: { code: "42501", message: "new row violates row-level security policy" },
    }, "forged insert")).not.toThrow();
  });

  it("fails if a forged insert succeeds", () => {
    expect(() => assertRlsDenial({ data: { id: "synthetic-id" }, error: null }, "forged insert"))
      .toThrow(/RLS BYPASS/);
  });

  it("fails closed when a forged insert has an unrelated database error", () => {
    expect(() => assertRlsDenial({ data: null, error: { code: "23505" } }, "forged insert"))
      .toThrow(/expected PostgreSQL RLS denial/);
  });

  it("does not treat an empty response without an RLS error as proof of a denied insert", () => {
    expect(() => assertRlsDenial({ data: null, error: null }, "forged insert"))
      .toThrow(/inconclusive/);
  });

  it("accepts zero-row cross-account UPDATE and DELETE results", () => {
    expect(() => assertNoVisibleMutation({ data: null, error: null }, "cross-account update")).not.toThrow();
    expect(() => assertNoVisibleMutation({ data: [], error: null }, "cross-account delete")).not.toThrow();
  });

  it("fails when a cross-account mutation returns a row", () => {
    expect(() => assertNoVisibleMutation({ data: { id: "synthetic-id" }, error: null }, "cross-account delete"))
      .toThrow(/RLS BYPASS/);
  });

  it("fails on API errors instead of interpreting them as safe RLS behavior", () => {
    expect(() => assertNoVisibleMutation({ data: null, error: { code: "42501" } }, "cross-account update"))
      .toThrow(/request failed/);
  });

  it("requires a returned row for legitimate owner operations", () => {
    expect(() => assertSingleRow({ data: { id: "synthetic-id" }, error: null }, "owner insert")).not.toThrow();
    expect(() => assertSingleRow({ data: null, error: null }, "owner delete")).toThrow(/exactly one/);
    expect(() => assertSingleRow({ data: null, error: { code: "42501" } }, "owner update")).toThrow(/code 42501/);
  });
});
