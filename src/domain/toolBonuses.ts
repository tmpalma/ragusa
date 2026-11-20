import { toolAbility, type ToolId } from "../data/toolStats";
import type { AbilityId } from "../data/types";
import { PROFICIENCY_BONUS } from "./proficiency";

export function toolBonus(abilityModifiers: Record<AbilityId, number>, toolId: ToolId): number {
  return abilityModifiers[toolAbility(toolId)] + PROFICIENCY_BONUS;
}
