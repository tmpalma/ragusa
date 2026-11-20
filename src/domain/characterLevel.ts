/** Maximum character level supported in this slice (single-class level-up through 6). */
export const MAX_CHARACTER_LEVEL = 6;

/** Per-class level cap; all SRD classes reach level 6 in this slice. */
export function maxCharacterLevelFor(_classKey: string | null): number {
  return MAX_CHARACTER_LEVEL;
}
