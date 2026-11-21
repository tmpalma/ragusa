import { describe, expect, it } from "vitest";
import { LibraryOpError } from "../errors.ts";
import { MAX_DISPLAY_NAME_LENGTH, normalizeDisplayName } from "./players.ts";

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error instanceof LibraryOpError ? error.code : "other";
  }
}

describe("normalizeDisplayName", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeDisplayName("  Ada Lovelace \n")).toBe("Ada Lovelace");
  });

  it("rejects blank or non-string names with empty_title", () => {
    expect(codeOf(() => normalizeDisplayName(""))).toBe("empty_title");
    expect(codeOf(() => normalizeDisplayName("   "))).toBe("empty_title");
    expect(codeOf(() => normalizeDisplayName(undefined))).toBe("empty_title");
    expect(codeOf(() => normalizeDisplayName(42))).toBe("empty_title");
  });

  it("accepts a name at the cap and rejects one longer (no truncation)", () => {
    const atCap = "a".repeat(MAX_DISPLAY_NAME_LENGTH);
    expect(normalizeDisplayName(` ${atCap} `)).toBe(atCap);
    expect(codeOf(() => normalizeDisplayName(`${atCap}b`))).toBe("empty_title");
  });

  it("counts code points, not UTF-16 units", () => {
    const emoji = "🐉".repeat(MAX_DISPLAY_NAME_LENGTH);
    expect(normalizeDisplayName(emoji)).toBe(emoji);
  });
});
