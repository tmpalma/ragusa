import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/** Per-request context handed to every op handler. */
export type OpContext = {
  /** Service-role client (bypasses RLS): every handler must scope queries to `email`. */
  db: SupabaseClient;
  /** Caller's normalized email, taken from the verified JWT (never from the body). Always non-empty. */
  email: string;
  /** Caller's Supabase Auth user id (`auth.users.id`), from the verified JWT. */
  userId: string;
};

/** Request body minus `op` and `email`. */
export type OpPayload = Record<string, unknown>;

/**
 * Resolves to the value sent back as `{ ok: true, data }`. Throw `LibraryOpError` for expected failures
 * (HTTP status from `statusForErrorCode`).
 */
export type OpHandler = (ctx: OpContext, payload: OpPayload) => Promise<unknown>;

/** One domain module's ops, keyed by op name. Merged in `registry.ts`. */
export type OpRecord = Record<string, OpHandler>;
