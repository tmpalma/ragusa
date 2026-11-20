import type { ProficiencyState } from "../state/characterState";
import { PROFICIENCY_BONUS } from "./proficiency";

export function skillBonus(
  abilityModifierValue: number,
  proficiencyState: ProficiencyState,
  jackOfAllTrades = false,
  proficiencyBonus = PROFICIENCY_BONUS,
): number {
  const proficiencyPart =
    proficiencyState === "expert"
      ? proficiencyBonus * 2
      : proficiencyState === "proficient"
        ? proficiencyBonus
        : jackOfAllTrades
          ? Math.floor(proficiencyBonus / 2)
          : 0;
  return abilityModifierValue + proficiencyPart;
}
