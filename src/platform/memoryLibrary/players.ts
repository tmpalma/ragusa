import { LibraryClientError, type LibraryPlayer, type PlayerLibrary } from "../libraryClient";
import { ensurePlayerRow, normalizeEmail, type MemoryLibraryStore } from "./store";

/**
 * Longest display name, in Unicode code points.
 * Mirrors `supabase/functions/library/rules/players.ts` (checked in `players.test.ts`).
 */
export const MAX_DISPLAY_NAME_LENGTH = 40;

/** Number of Unicode code points in `value` (what the display-name cap counts). */
export function displayNameLength(value: string): number {
  return [...value].length;
}

/**
 * Client mirror of the edge `normalizeDisplayName`: trims, then rejects a blank or over-long
 * name with `empty_title` (long names are rejected, not truncated).
 */
export function normalizeDisplayName(value: unknown): string {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) {
    throw new LibraryClientError("empty_title", "Display name is required.");
  }
  if (displayNameLength(name) > MAX_DISPLAY_NAME_LENGTH) {
    throw new LibraryClientError(
      "empty_title",
      `Display name must be at most ${MAX_DISPLAY_NAME_LENGTH} characters.`,
    );
  }
  return name;
}

function requireOwnerEmail(email: string): string {
  const ownerEmail = normalizeEmail(email);
  if (!ownerEmail) {
    throw new LibraryClientError("empty_title", "Email is required.");
  }
  return ownerEmail;
}

export function createPlayerLibrary(store: MemoryLibraryStore): PlayerLibrary {
  return {
    async ensurePlayer(email) {
      ensurePlayerRow(store, requireOwnerEmail(email));
    },

    async getPlayer(email): Promise<LibraryPlayer> {
      const ownerEmail = requireOwnerEmail(email);
      ensurePlayerRow(store, ownerEmail);
      const row = store.players.get(ownerEmail)!;
      return { email: row.email, displayName: row.displayName };
    },

    async updatePlayer(email, input): Promise<LibraryPlayer> {
      const ownerEmail = requireOwnerEmail(email);
      const displayName = normalizeDisplayName(input.displayName);
      ensurePlayerRow(store, ownerEmail);
      const row = store.players.get(ownerEmail)!;
      row.displayName = displayName;
      return { email: row.email, displayName: row.displayName };
    },
  };
}
