// Pure, runtime-agnostic rules. No esm.sh imports, no Deno globals, no I/O.
import { LibraryOpError } from "../errors.ts";
import { isRecord } from "./shared.ts";

export const CHARACTER_FILE_FORMAT = "dnd55e-chargen-character";
export const CHARACTER_FILE_SCHEMA_VERSION = 1;

/** Most characters one player may own. Mirrors `src/domain/libraryLimits.ts` (the function cannot import `src/`). */
export const MAX_CHARACTERS_PER_PLAYER = 4;

export type CharacterRow = {
  id: unknown;
  owner_email: unknown;
  title: unknown;
  document: unknown;
  updated_at: unknown;
};

/** Validates an exported character file and returns its `character` document. */
export function parseImportDocument(fileJson: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileJson);
  } catch {
    throw new LibraryOpError("invalid_character_file", "Invalid character file.");
  }
  if (!isRecord(parsed)) {
    throw new LibraryOpError("invalid_character_file", "Invalid character file.");
  }
  if (parsed.format !== CHARACTER_FILE_FORMAT) {
    throw new LibraryOpError("invalid_character_file", "Invalid character file.");
  }
  const schemaVersion = parsed.schemaVersion;
  if (typeof schemaVersion !== "number" || schemaVersion > CHARACTER_FILE_SCHEMA_VERSION) {
    throw new LibraryOpError("invalid_character_file", "Invalid character file.");
  }
  const character = parsed.character;
  if (!isRecord(character)) {
    throw new LibraryOpError("invalid_character_file", "Invalid character file.");
  }
  return character;
}

/** Title for an imported character: its trimmed `name`, else "Imported character". */
export function importedCharacterTitle(document: Record<string, unknown>): string {
  return typeof document.name === "string" && document.name.trim()
    ? document.name.trim()
    : "Imported character";
}

/** Document for a new character: the given one when it is an object, else `{ name: title }`. */
export function newCharacterDocument(document: unknown, title: string): Record<string, unknown> {
  return document && isRecord(document) ? document : { name: title };
}

/**
 * Refuses a new character (create or import) once the owner already has `MAX_CHARACTERS_PER_PLAYER`.
 * Accounts already over the cap keep their characters but cannot add more.
 */
export function assertCanAddCharacter(count: number): void {
  if (count >= MAX_CHARACTERS_PER_PLAYER) {
    throw new LibraryOpError(
      "character_limit",
      `You can have at most ${MAX_CHARACTERS_PER_PLAYER} characters.`,
    );
  }
}

/** A seated character (one with any campaign membership) cannot be deleted. */
export function assertCharacterDeletable(membership: unknown): void {
  if (membership) {
    throw new LibraryOpError(
      "character_has_membership",
      "Remove the character from their campaign before deleting them.",
    );
  }
}

export function characterFromRow(row: CharacterRow) {
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    title: row.title,
    document: row.document,
    updatedAt: row.updated_at,
  };
}
