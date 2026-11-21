import { describe, expect, it } from "vitest";
import { isRecord, normalizeEmail, optionalTrimmedString, trimmedString } from "./shared.ts";

describe("shared rules", () => {
  it("normalizes emails", () => {
    expect(normalizeEmail("  Player@Example.COM ")).toBe("player@example.com");
  });

  it("detects plain records", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord("x")).toBe(false);
  });

  it("trims string fields", () => {
    expect(trimmedString("  a ")).toBe("a");
    expect(trimmedString(3)).toBe("");
    expect(optionalTrimmedString(" a ")).toBe("a");
    expect(optionalTrimmedString(undefined)).toBeUndefined();
  });
});
