import { describe, expect, it } from "vitest";
import { calculateTargets } from "../lib/nutrition";

const now = new Date("2026-11-15T12:00:00Z");
const base = { sex: "male", birth_date: "1996-06-01", height_cm: 180, weight_kg: 80, activity_level: "moderate", goal: "maintain" };

describe("calculateTargets", () => {
  it("returns an optional adult maintenance estimate", () => {
    expect(calculateTargets(base, now)?.calories).toBe(2759);
  });
  it("does not automatically prescribe deficits or surpluses", () => {
    expect(calculateTargets({ ...base, goal: "lose" }, now)).toBeNull();
    expect(calculateTargets({ ...base, goal: "gain" }, now)).toBeNull();
  });
  it("does not generate calorie targets for minors", () => {
    expect(calculateTargets({ ...base, birth_date: "2010-06-01" }, now)).toBeNull();
  });
  it("returns null for an incomplete profile", () => {
    expect(calculateTargets({ ...base, weight_kg: null }, now)).toBeNull();
  });
});
