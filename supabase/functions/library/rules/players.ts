// Pure, runtime-agnostic rules for player rows. No esm.sh imports, no Deno globals, no I/O.
import { LibraryOpError } from "../errors.ts";

/** Longest display name, in Unicode code points. Mirrored in `src/platform/memoryLibrary/players.ts`. */
export const MAX_DISPLAY_NAME_LENGTH = 40;

/**
 * Validates a requested display name: trims it, then rejects a blank or over-long name with
 * `empty_title`. Long names are rejected rather than truncated so the stored name is never
 * silently different from what the user typed (the client enforces the cap before sending).
 */
export function normalizeDisplayName(value: unknown): string {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) {
    throw new LibraryOpError("empty_title", "Display name is required.");
  }
  if ([...name].length > MAX_DISPLAY_NAME_LENGTH) {
    throw new LibraryOpError(
      "empty_title",
      `Display name must be at most ${MAX_DISPLAY_NAME_LENGTH} characters.`,
    );
  }
  return name;
}
