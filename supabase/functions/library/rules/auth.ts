// Pure, runtime-agnostic rules. No esm.sh imports, no Deno globals, no I/O.
import { LibraryOpError, type LibraryErrorCode } from "../errors.ts";

/**
 * Extracts the JWT from an `Authorization: Bearer <jwt>` header.
 * Missing header, another scheme, or an empty/malformed token → `unauthenticated`.
 */
export function parseBearerToken(header: string | null | undefined): string {
  const match = /^Bearer[ \t]+(\S+)$/i.exec((header ?? "").trim());
  if (!match) {
    throw new LibraryOpError("unauthenticated", "Sign in required.");
  }
  return match[1];
}

/** Default display name for a new player: the email's local part (`ada` for `ada@example.com`). */
export function displayNameFromEmail(email: string): string {
  const at = email.indexOf("@");
  const local = (at >= 0 ? email.slice(0, at) : email).trim();
  return local || email;
}

/**
 * A player row may be linked to one auth user only. `null` means unlinked (linkable);
 * the same id is fine; a different id means the email was reused → `forbidden`.
 * Returns true when the row still needs linking to `userId`.
 */
export function assertAuthUserLink(existingAuthUserId: string | null | undefined, userId: string): boolean {
  if (existingAuthUserId == null) return true;
  if (existingAuthUserId === userId) return false;
  throw new LibraryOpError("forbidden", "This email is linked to another account.");
}

/** HTTP status for an expected library error. */
export function statusForErrorCode(code: LibraryErrorCode): number {
  switch (code) {
    case "unauthenticated":
      return 401;
    case "forbidden":
      return 403;
    default:
      return 400;
  }
}

/** Distinct non-empty string ids from rows, in first-seen order (for scoped `.in(...)` reads). */
export function distinctIds<T>(rows: ReadonlyArray<T>, pick: (row: T) => unknown): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const id = pick(row);
    if (typeof id === "string" && id) ids.add(id);
  }
  return [...ids];
}
