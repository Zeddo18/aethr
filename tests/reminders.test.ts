import { describe, expect, it } from "vitest";
import { reminderLabel, shouldShowReminder, validateReminder } from "../lib/reminders";

describe("optional reminders", () => {
  const base = { enabled: true, reminder_time: "20:00", reminder_kind: "rest" as const };
  it("validates opt-in settings", () => {
    expect(validateReminder(base)).toEqual(base);
    expect(validateReminder({ ...base, reminder_time: "27:00" })).toBeNull();
    expect(validateReminder({ ...base, reminder_kind: "weight_loss" })).toBeNull();
  });
  it("does not display without consent", () => {
    expect(shouldShowReminder({ ...base, enabled: false }, new Date("2026-11-23T13:00:00Z"), null)).toBe(false);
  });
  it("uses Philippine-local time and avoids repeating a day", () => {
    const now = new Date("2026-11-23T12:30:00Z");
    expect(shouldShowReminder(base, now, null)).toBe(true);
    expect(shouldShowReminder(base, now, "2026-11-23")).toBe(false);
    expect(shouldShowReminder(base, new Date("2026-11-23T11:00:00Z"), null)).toBe(false);
  });
  it("provides non-judgmental reminder text", () => {
    expect(reminderLabel("rest")).toMatch(/rest/i);
  });
});
