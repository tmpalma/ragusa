import { LibraryOpError } from "../errors.ts";
import type { OpRecord } from "./types.ts";

export const playerOps: OpRecord = {
  async ensurePlayer({ db, email }) {
    if (!email) {
      throw new LibraryOpError("empty_title", "Email is required.");
    }
    const { data: existing, error: readError } = await db
      .from("players")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (readError) throw readError;
    if (existing) return null;
    const { error } = await db.from("players").insert({ email, display_name: email });
    if (error) throw error;
    return null;
  },
};
