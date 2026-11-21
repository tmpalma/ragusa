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

    // TODO(P1-C): read the player row and return { email, displayName }.
    async getPlayer() {
      throw new Error("Not implemented: getPlayer (Phase 1)");
    },

    // TODO(P1-C): trim displayName, throw empty_title when blank, update and return { email, displayName }.
    async updatePlayer() {
      throw new Error("Not implemented: updatePlayer (Phase 1)");
    },
  };
}
