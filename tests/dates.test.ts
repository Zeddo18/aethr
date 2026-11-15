import { describe, expect, it } from "vitest";
import { isDate, shiftDate, todayStr } from "../lib/dates";

describe("food diary dates", () => {
  it("uses Philippine time rather than UTC", () => {
    expect(todayStr(new Date("2026-11-15T17:00:00Z"))).toBe("2026-11-16");
  });
  it("rejects impossible dates", () => {
    expect(isDate("2026-02-30")).toBe(false);
    expect(isDate("2026-02-28")).toBe(true);
  });
  it("moves days across month boundaries", () => {
    expect(shiftDate("2026-11-30", 1)).toBe("2026-12-01");
  });
});
