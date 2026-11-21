// Pure module: safe to import from rules/, ops/ and tests.

export type LibraryErrorCode =
  | "character_already_seated"
  | "character_has_membership"
  | "not_found"
  | "invalid_character_file"
  | "empty_title"
  | "invalid_homebrew_item"
  | "unauthenticated"
  | "forbidden"
  | "character_limit"
  | "invalid_items_file";

/**
 * Expected, user-facing failure. Mapped to `{ ok: false, code, message }` with the HTTP status from
 * `statusForErrorCode` in `rules/auth.ts` (401 unauthenticated, 403 forbidden, 400 otherwise).
 */
export class LibraryOpError extends Error {
  readonly code: LibraryErrorCode;

  constructor(code: LibraryErrorCode, message: string) {
    super(message);
    this.name = "LibraryOpError";
    this.code = code;
  }
}
