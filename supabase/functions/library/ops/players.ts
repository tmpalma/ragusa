import { LibraryOpError } from "../errors.ts";
import { normalizeDisplayName } from "../rules/players.ts";
import { upsertPlayer } from "./shared.ts";
import type { OpRecord } from "./types.ts";

type PlayerRow = { email: string; display_name: string | null };

function toLibraryPlayer(row: PlayerRow) {
  return { email: row.email, displayName: row.display_name ?? "" };
}

export const playerOps: OpRecord = {
  async ensurePlayer({ db, email, userId }) {
    if (!email) {
      throw new LibraryOpError("empty_title", "Email is required.");
    }
    await upsertPlayer(db, email, userId);
    return null;
  },

  /** Returns the caller's `{ email, displayName }`, creating and linking the row first if needed. */
  async getPlayer({ db, email, userId }) {
    await upsertPlayer(db, email, userId);
    const { data, error } = await db
      .from("players")
      .select("email, display_name")
      .eq("email", email)
      .single();
    if (error) throw error;
    return toLibraryPlayer(data as PlayerRow);
  },

  /** Sets only `display_name` on the caller's own row (trimmed, 1..MAX_DISPLAY_NAME_LENGTH). */
  async updatePlayer({ db, email, userId }, payload) {
    const displayName = normalizeDisplayName(payload.displayName);
    await upsertPlayer(db, email, userId);
    const { data, error } = await db
      .from("players")
      .update({ display_name: displayName })
      .eq("email", email)
      .select("email, display_name")
      .single();
    if (error) throw error;
    return toLibraryPlayer(data as PlayerRow);
  },
};
