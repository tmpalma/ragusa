import { PROFICIENCY_BONUS } from "./proficiency";

export function computeInitiative(
  dexModifier: number,
  initiativeAddProficiency: boolean,
  proficiencyBonus = PROFICIENCY_BONUS,
  extraBonus = 0,
): number {
  const featBonus = initiativeAddProficiency ? proficiencyBonus : 0;
  return dexModifier + featBonus + extraBonus;
}
