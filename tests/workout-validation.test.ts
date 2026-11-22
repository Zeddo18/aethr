import { describe, it, expect } from "vitest";
import { workoutId, workoutInteger, workoutName, workoutWeight } from "../lib/workout-validation";

describe("gym input validation", () => {
  it("allows clean exercise names", () => {
    expect(workoutName("  Dumbbell   press ")).toBe("Dumbbell press");
    expect(workoutName(" ")).toBeNull();
  });
  it("rejects invalid reps and set counts", () => {
    expect(workoutInteger("12")).toBe(12);
    expect(workoutInteger("0")).toBeNull();
    expect(workoutInteger("4.5")).toBeNull();
    expect(workoutInteger("101")).toBeNull();
  });
  it("accepts bodyweight sets and rejects unsafe measurements", () => {
    expect(workoutWeight("0")).toBe(0);
    expect(workoutWeight("22.5")).toBe(22.5);
    expect(workoutWeight("-1")).toBeNull();
    expect(workoutWeight("bad")).toBeNull();
  });
  it("validates UUIDs", () => {
    expect(workoutId("57a136a0-f372-4658-8562-d567fd599f5f")).toBe(true);
    expect(workoutId("something")).toBe(false);
  });
});
