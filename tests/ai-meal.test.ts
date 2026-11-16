import { describe, expect, it } from "vitest";
import { validateParsedMeal } from "../lib/ai/meal";

describe("AI meal validation", () => {
  it("accepts measured food and time", () => {
    const parsed = validateParsedMeal({ meal: "lunch", time: "12:30", foods: [{ name: "soy sauce", grams: 20 }] });
    expect(parsed.foods).toEqual([{ name: "soy sauce", grams: 20 }]);
    expect(parsed.time).toBe("12:30");
  });
  it("keeps unknown quantities unknown", () => {
    expect(validateParsedMeal({ meal: null, time: null, foods: [{ name: "rice", grams: null }] }).foods[0].grams).toBeNull();
  });
  it("rejects impossible quantities", () => {
    expect(() => validateParsedMeal({ meal: null, time: null, foods: [{ name: "rice", grams: -4 }] })).toThrow();
  });
  it("rejects fabricated ingredient lists", () => {
    expect(() => validateParsedMeal({ meal: "lunch", time: null, foods: [] })).toThrow();
    expect(() => validateParsedMeal({ meal: null, time: null, foods: Array.from({ length: 11 }, () => ({ name: "rice", grams: 20 })) })).toThrow();
  });
});
