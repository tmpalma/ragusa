import { LibraryClientError, type PlayerLibrary } from "../libraryClient";
import { ensurePlayerRow, normalizeEmail, type MemoryLibraryStore } from "./store";

export function createPlayerLibrary(store: MemoryLibraryStore): PlayerLibrary {
  return {
    async ensurePlayer(email) {
      const ownerEmail = normalizeEmail(email);
      if (!ownerEmail) {
        throw new LibraryClientError("empty_title", "Email is required.");
      }
      ensurePlayerRow(store, ownerEmail);
    },
  };
}
