import { describe, expect, it } from "vitest";
import { dateInZone, progressDates, summarizeProgress } from "../lib/progress";

const dates = progressDates("2026-11-16", 7);
const fixture = () => summarizeProgress(dates,
  [
    { eaten_on: "2026-11-15", meal: "lunch", name: "Rice" },
    { eaten_on: "2026-11-15", meal: "dinner", name: "rice" },
    { eaten_on: "2026-11-16", meal: "breakfast", name: "Egg" },
  ],
  [
    { id: "w1", started_at: "2026-11-15T17:30:00Z", finished_at: "2026-11-15T18:30:00Z" },
    { id: "w1", started_at: "2026-11-15T17:30:00Z", finished_at: "2026-11-15T18:30:00Z" },
    { id: "w2", started_at: "2026-11-16T10:00:00Z", finished_at: null },
  ],
  [
    { id: "r1", started_at: "2026-11-15T17:00:00Z", activity_type: "walk", duration_seconds: 1200, distance_km: 1.5 },
    { id: "r2", started_at: "2026-11-16T08:00:00Z", activity_type: "run", duration_seconds: 600, distance_km: 2.25 },
  ]);

describe("progress analytics", () => {
  it("creates ordered date windows", () => {
    expect(dates).toEqual(["2026-11-10","2026-11-11","2026-11-12","2026-11-13","2026-11-14","2026-11-15","2026-11-16"]);
  });
  it("converts UTC timestamps to Philippine-local dates", () => {
    expect(dateInZone("2026-11-15T17:00:00Z")).toBe("2026-11-16");
    expect(dateInZone("invalid")).toBeNull();
  });
  it("summarizes logged activity without counting duplicate sessions", () => {
    const s = fixture();
    expect(s.loggedMeals).toBe(3);
    expect(s.mealDays).toBe(2);
    expect(s.variety).toBe(2);
    expect(s.completedWorkouts).toBe(1);
    expect(s.activitySessions).toBe(2);
    expect(s.movementMinutes).toBe(30);
    expect(s.movementKm).toBe(3.8);
    expect(s.activeDays).toBe(1);
    expect(s.days.at(-1)).toMatchObject({date:"2026-11-16",workouts:1,activities:2});
  });
  it("handles empty datasets without invented metrics", () => {
    const s = summarizeProgress(dates,[],[],[]);
    expect(s.loggedMeals).toBe(0);
    expect(s.activeDays).toBe(0);
    expect(s.days).toHaveLength(7);
  });
});
