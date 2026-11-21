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
};
