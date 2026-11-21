// Pure, runtime-agnostic rules. No esm.sh imports, no Deno globals, no I/O.

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Trimmed string payload field, or "" when missing / not a string. */
export function trimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Trimmed string payload field, or undefined when not a string. */
export function optionalTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}
