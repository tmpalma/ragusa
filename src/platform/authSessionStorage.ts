import { isValidEmail, normalizeEmail } from "./claimedIdentity";

const LEGACY_BYPASS_SESSION_KEY = "bypass-session";
const LOCAL_AUTH_SESSION_KEY = "local-auth-session";
const RETURN_PATH_KEY = "auth-return-path";

export type SessionKind = "magic";

export interface AppSession {
  kind: SessionKind;
  email: string;
}

/** Removes a legacy bypass record from older builds. */
export function clearLegacyBypassSession(): void {
  localStorage.removeItem(LEGACY_BYPASS_SESSION_KEY);
}

export function saveReturnPath(path: string): void {
  if (!path || path === "/login") return;
  localStorage.setItem(RETURN_PATH_KEY, path);
}

export function consumeReturnPath(): string {
  const stored = localStorage.getItem(RETURN_PATH_KEY);
  localStorage.removeItem(RETURN_PATH_KEY);
  if (!stored || stored === "/login") return "/account";
  return stored;
}

export function peekReturnPath(): string | null {
  return localStorage.getItem(RETURN_PATH_KEY);
}

export function sessionFromMagicUser(email: string): AppSession | null {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) return null;
  return { kind: "magic", email: normalized };
}

export function saveLocalAuthSession(session: AppSession): void {
  localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify(session));
}

export function loadLocalAuthSession(): AppSession | null {
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_SESSION_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw) as Record<string, unknown>;
    if (record.kind !== "magic") return null;
    if (typeof record.email !== "string") return null;
    return sessionFromMagicUser(record.email);
  } catch {
    return null;
  }
}

export function clearLocalAuthSession(): void {
  localStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
}