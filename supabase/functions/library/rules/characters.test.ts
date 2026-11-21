import { describe, expect, it } from "vitest";
import { LibraryOpError } from "../errors.ts";
import {
  assertCanAddCharacter,
  assertCharacterDeletable,
  CHARACTER_FILE_FORMAT,
  CHARACTER_FILE_SCHEMA_VERSION,
  importedCharacterTitle,
  MAX_CHARACTERS_PER_PLAYER,
  newCharacterDocument,
  parseImportDocument,
} from "./characters.ts";

function fileJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    format: CHARACTER_FILE_FORMAT,
    schemaVersion: CHARACTER_FILE_SCHEMA_VERSION,
    character: { name: "Ragusa" },
    ...overrides,
  });
}

function expectInvalidFile(run: () => unknown) {
  try {
    run();
  } catch (err) {
    expect(err).toBeInstanceOf(LibraryOpError);
    expect((err as LibraryOpError).code).toBe("invalid_character_file");
    expect((err as LibraryOpError).message).toBe("Invalid character file.");
    return;
  }
  throw new Error("expected invalid_character_file");
}

describe("parseImportDocument", () => {
  it("returns the character document for a valid file", () => {
    expect(parseImportDocument(fileJson())).toEqual({ name: "Ragusa" });
  });

  it("accepts older schema versions", () => {
    expect(parseImportDocument(fileJson({ schemaVersion: 0 }))).toEqual({ name: "Ragusa" });
  });

  it("rejects malformed JSON", () => {
    expectInvalidFile(() => parseImportDocument("{not json"));
  });

  it("rejects a non-object root", () => {
    expectInvalidFile(() => parseImportDocument("[]"));
  });

  it("rejects the wrong format", () => {
    expectInvalidFile(() => parseImportDocument(fileJson({ format: "something-else" })));
  });

  it("rejects a newer schemaVersion", () => {
    expectInvalidFile(() => parseImportDocument(fileJson({ schemaVersion: CHARACTER_FILE_SCHEMA_VERSION + 1 })));
  });

  it("rejects a missing schemaVersion", () => {
    expectInvalidFile(() => parseImportDocument(fileJson({ schemaVersion: "1" })));
  });

  it("rejects a non-object character", () => {
    expectInvalidFile(() => parseImportDocument(fileJson({ character: "Ragusa" })));
    expectInvalidFile(() => parseImportDocument(fileJson({ character: [] })));
    expectInvalidFile(() => parseImportDocument(fileJson({ character: null })));
  });
});

describe("importedCharacterTitle", () => {
  it("uses the trimmed name", () => {
    expect(importedCharacterTitle({ name: "  Ragusa " })).toBe("Ragusa");
  });

  it("falls back when the name is blank or missing", () => {
    expect(importedCharacterTitle({ name: "   " })).toBe("Imported character");
    expect(importedCharacterTitle({})).toBe("Imported character");
  });
});

describe("newCharacterDocument", () => {
  it("keeps an object document and defaults otherwise", () => {
    expect(newCharacterDocument({ name: "X", level: 3 }, "T")).toEqual({ name: "X", level: 3 });
    expect(newCharacterDocument(undefined, "T")).toEqual({ name: "T" });
    expect(newCharacterDocument([], "T")).toEqual({ name: "T" });
  });
});

describe("assertCharacterDeletable", () => {
  it("allows deleting an unseated character", () => {
    expect(() => assertCharacterDeletable(null)).not.toThrow();
  });

  it("refuses deleting a character with a membership", () => {
    expect(() => assertCharacterDeletable({ id: "m1", campaign_id: "c1" })).toThrow(
      expect.objectContaining({
        code: "character_has_membership",
        message: "Remove the character from their campaign before deleting them.",
      }),
    );
  });
});

describe("assertCanAddCharacter", () => {
  it("allows adding below the cap", () => {
    expect(() => assertCanAddCharacter(0)).not.toThrow();
    expect(() => assertCanAddCharacter(3)).not.toThrow();
  });

  it("refuses at the cap and above it", () => {
    expect(MAX_CHARACTERS_PER_PLAYER).toBe(4);
    for (const count of [4, 5, 9]) {
      try {
        assertCanAddCharacter(count);
        throw new Error("expected character_limit");
      } catch (err) {
        expect(err).toBeInstanceOf(LibraryOpError);
        expect((err as LibraryOpError).code).toBe("character_limit");
      }
    }
  });
});
