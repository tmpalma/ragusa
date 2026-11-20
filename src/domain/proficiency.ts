/** @deprecated Use {@link proficiencyBonusForLevel} with character level. */
export const PROFICIENCY_BONUS = 2;

export function proficiencyBonusForLevel(characterLevel: number): number {
  return Math.ceil(characterLevel / 4) + 1;
}
