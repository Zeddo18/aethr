import { describe, expect, it } from "vitest";
import { calculateTargets } from "../lib/nutrition";

const now = new Date("2026-11-15T12:00:00Z");
const base = { sex: "male", birth_date: "1996-06-01", height_cm: 180, weight_kg: 80, activity_level: "moderate", goal: "maintain" };

describe("calculateTargets", () => {
  it("returns maintenance calories (Mifflin-St Jeor x activity)", () => {
    expect(calculateTargets(base, now)?.calories).toBe(2759);
  });
  it("applies a deficit when losing weight", () => {
    expect(calculateTargets({ ...base, goal: "lose" }, now)?.calories).toBe(2207);
  });
  it("sets protein from body weight", () => {
    expect(calculateTargets(base, now)?.protein_g).toBe(144);
  });
  it("returns null when the profile is incomplete", () => {
    expect(calculateTargets({ ...base, weight_kg: null }, now)).toBeNull();
  });
});
