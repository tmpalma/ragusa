/** Most characters one player may own. Mirrored in `supabase/functions/library/rules/characters.ts`. */
export const MAX_CHARACTERS_PER_PLAYER = 4;

/**
 * Longest display name, in Unicode code points.
 * Mirrored in `supabase/functions/library/rules/players.ts` (checked in `memoryLibrary/players.test.ts`).
 */
export const MAX_DISPLAY_NAME_LENGTH = 40;

/** Number of Unicode code points in `value` (what the display-name cap counts). */
export function displayNameLength(value: string): number {
  return [...value].length;
}
