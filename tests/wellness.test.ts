import { describe, expect, it } from "vitest";
import { hoursLabel, sleepMinutes, validateWellness } from "../lib/wellness";

const now = new Date("2026-11-23T12:00:00Z");
const base = {
  log_date: "2026-11-23",
  sleep_start: "2026-11-22T14:00:00Z",
  sleep_end: "2026-11-22T22:00:00Z",
  energy: "okay", rest_feeling: "rested", activity_feeling: "unsure", notes: "Quiet evening",
};
describe("optional recovery journal", () => {
  it("accepts a private check-in without sleep or mood information", () => {
    expect(validateWellness({
      ...base, sleep_start: null, sleep_end: null,
      energy: null, rest_feeling: null, activity_feeling: null, notes: "",
    }, now)).not.toBeNull();
  });
  it("handles overnight sleep and readable durations", () => {
    expect(sleepMinutes(base.sleep_start, base.sleep_end)).toBe(480);
    expect(hoursLabel(480)).toBe("8h 0m");
    expect(hoursLabel(null)).toBe("Not recorded");
  });
  it("rejects reversed and unrealistic intervals", () => {
    expect(validateWellness({...base, sleep_start:base.sleep_end, sleep_end:base.sleep_start}, now)).toBeNull();
    expect(validateWellness({...base, sleep_end:"2026-11-24T22:00:00Z"}, now)).toBeNull();
    expect(validateWellness({...base, sleep_start:null}, now)).toBeNull();
  });
  it("rejects unexpected categories and oversized notes", () => {
    expect(validateWellness({...base, energy:"excellent"}, now)).toBeNull();
    expect(validateWellness({...base, notes:"a".repeat(1001)}, now)).toBeNull();
  });
  it("rejects invalid or future dates", () => {
    expect(validateWellness({...base, log_date:"2026-02-30"}, now)).toBeNull();
    expect(validateWellness({...base, log_date:"2027-12-30"}, now)).toBeNull();
  });
});
