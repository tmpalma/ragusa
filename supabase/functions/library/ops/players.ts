import { LibraryOpError } from "../errors.ts";
import { upsertPlayer } from "./shared.ts";
import type { OpRecord } from "./types.ts";

export const playerOps: OpRecord = {
  async ensurePlayer({ db, email, userId }) {
    if (!email) {
      throw new LibraryOpError("empty_title", "Email is required.");
    }
    await upsertPlayer(db, email, userId);
    return null;
  },

  // TODO(P1-C): return { email, displayName } for the caller.
  async getPlayer() {
    throw new Error("Not implemented: getPlayer (Phase 1)");
  },

  // TODO(P1-C): trim displayName, throw empty_title when blank, update and return { email, displayName }.
  async updatePlayer() {
    throw new Error("Not implemented: updatePlayer (Phase 1)");
  },
};
