import type { AuthMode } from "./authMode";
import { isValidEmail, normalizeEmail } from "./email";

/** Keys written by builds before Supabase Auth (claimed email + bypass/magic sessions). */
export const LEGACY_AUTH_STORAGE_KEYS = ["bypass-session", "local-auth-session", "claimed-identity"] as const;
/** Fake session for local (no Supabase env) mode only. */
const LOCAL_DEV_SESSION_KEY = "local-dev-session";
const RETURN_PATH_KEY = "auth-return-path";

export interface AppSession {
  /** Which backend produced the session. */
  kind: AuthMode;
  /** Normalized email of the signed-in user. */
  email: string;
  /** Supabase auth user id; null in local mode. */
  userId: string | null;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Removes pre-Supabase-Auth session and claimed-identity records. Safe to run on every boot. */
export function cleanupLegacyAuthStorage(storage: StorageLike = localStorage): void {
  for (const key of LEGACY_AUTH_STORAGE_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      // storage unavailable; nothing to clean
    }
  }
}

/** Maps a Supabase auth user to the app session. Null when the user has no usable email. */
export function sessionFromAuthUser(
  user: { id: string; email?: string | null } | null | undefined,
): AppSession | null {
  if (!user || typeof user.email !== "string") return null;
  const email = normalizeEmail(user.email);
  if (!isValidEmail(email)) return null;
  return { kind: "supabase", email, userId: user.id };
}

export function localDevSession(email: string): AppSession | null {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) return null;
  return { kind: "local", email: normalized, userId: null };
}

/** True when two sessions identify the same signed-in user (ignores token refreshes). */
export function sameSessionUser(a: AppSession | null, b: AppSession | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.kind === b.kind && a.email === b.email && a.userId === b.userId;
}

export function saveLocalDevSession(session: AppSession, storage: StorageLike = localStorage): void {
  storage.setItem(LOCAL_DEV_SESSION_KEY, JSON.stringify({ email: session.email }));
}

export function loadLocalDevSession(storage: StorageLike = localStorage): AppSession | null {
  try {
    const raw = storage.getItem(LOCAL_DEV_SESSION_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw) as Record<string, unknown>;
    if (typeof record.email !== "string") return null;
    return localDevSession(record.email);
  } catch {
    return null;
  }
}

export function clearLocalDevSession(storage: StorageLike = localStorage): void {
  storage.removeItem(LOCAL_DEV_SESSION_KEY);
}

/**
 * How long a saved return path stays usable. A sign-in abandoned for longer than this must not
 * redirect a later session that happens to start on `/`.
 */
export const RETURN_PATH_TTL_MS = 30 * 60 * 1000;

/** Saves where to go after sign-in, stamped with `now` so it expires after `RETURN_PATH_TTL_MS`. */
export function saveReturnPath(path: string, now: number = Date.now()): void {
  if (!path || path === "/login") return;
  localStorage.setItem(RETURN_PATH_KEY, JSON.stringify({ path: stripAuthCallbackParams(path), savedAt: now }));
}

/** Returns and clears the saved return path, or `/account` when none is fresh. */
export function consumeReturnPath(now: number = Date.now()): string {
  const stored = peekReturnPath(now);
  localStorage.removeItem(RETURN_PATH_KEY);
  if (!stored || stored === "/login") return "/account";
  return stored;
}

/** The saved return path when present and fresh; drops an expired or malformed record. */
export function peekReturnPath(now: number = Date.now()): string | null {
  const raw = localStorage.getItem(RETURN_PATH_KEY);
  if (raw == null) return null;
  const path = freshReturnPath(raw, now);
  if (path == null) localStorage.removeItem(RETURN_PATH_KEY);
  return path;
}

function freshReturnPath(raw: string, now: number): string | null {
  try {
    const record = JSON.parse(raw) as unknown;
    if (typeof record !== "object" || record === null) return null;
    const { path, savedAt } = record as Record<string, unknown>;
    if (typeof path !== "string" || typeof savedAt !== "number") return null;
    const age = now - savedAt;
    if (age < 0 || age > RETURN_PATH_TTL_MS) return null;
    return path;
  } catch {
    // A bare string from an older build has no timestamp: treat it as stale.
    return null;
  }
}

/** Drops a leftover PKCE `code` from a path (for example a link opened in a different browser). */
export function stripAuthCallbackParams(path: string): string {
  const hashIndex = path.indexOf("#");
  const beforeHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const queryIndex = beforeHash.indexOf("?");
  if (queryIndex < 0) return path;
  const pathname = beforeHash.slice(0, queryIndex);
  const params = new URLSearchParams(beforeHash.slice(queryIndex + 1));
  if (!params.has("code")) return path;
  params.delete("code");
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}
