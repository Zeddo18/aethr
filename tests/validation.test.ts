import { describe, expect, it } from "vitest";
import { parseOptionalNumber, validateCredentials } from "../lib/validation";

describe("validateCredentials", () => {
  it("accepts a valid pair", () => expect(validateCredentials("a@b.co", "longenough")).toBeNull());
  it("rejects a bad email", () => expect(validateCredentials("nope", "longenough")).toMatch(/email/i));
  it("rejects a short password", () => expect(validateCredentials("a@b.co", "short")).toMatch(/8 characters/));
});

describe("parseOptionalNumber", () => {
  it("returns null for blank", () => expect(parseOptionalNumber("", 1, 10)).toBeNull());
  it("parses in range", () => expect(parseOptionalNumber("5", 1, 10)).toBe(5));
  it("flags out of range", () => expect(parseOptionalNumber("50", 1, 10)).toBe("invalid"));
  it("flags non-numbers", () => expect(parseOptionalNumber("abc", 1, 10)).toBe("invalid"));
});
