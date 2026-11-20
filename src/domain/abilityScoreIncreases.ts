import { ABILITIES } from "../data/skills";
import type { AbilityId } from "../data/types";

export const ABILITY_SCORE_INCREASE_BUDGET = 3;
export const MAX_ABILITY_SCORE_INCREASE_PER_ABILITY = 3;

export const EMPTY_ABILITY_SCORE_INCREASES: Record<AbilityId, number> = {
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
};

export function totalAbilityScoreIncreases(increases: Partial<Record<AbilityId, number>>): number {
  return Object.values(increases).reduce((sum, value) => sum + (value ?? 0), 0);
}

export function abilityScoresAfterIncreases(
  baseScores: Record<AbilityId, number>,
  increases: Partial<Record<AbilityId, number>>,
): Record<AbilityId, number> {
  return Object.fromEntries(
    ABILITIES.map(({ id }) => [id, baseScores[id] + (increases[id] ?? 0)]),
  ) as Record<AbilityId, number>;
}

export function sanitizeAbilityScoreIncreases(
  increases: Partial<Record<AbilityId, number>>,
): Record<AbilityId, number> | null {
  const sanitized = { ...EMPTY_ABILITY_SCORE_INCREASES };
  let total = 0;

  for (const { id } of ABILITIES) {
    const raw = increases[id] ?? 0;
    if (!Number.isInteger(raw) || raw < 0 || raw > MAX_ABILITY_SCORE_INCREASE_PER_ABILITY) return null;
    sanitized[id] = raw;
    total += raw;
  }

  if (total > ABILITY_SCORE_INCREASE_BUDGET) return null;
  return sanitized;
}

export function maxAbilityScoreIncreaseForAbility(
  increases: Partial<Record<AbilityId, number>>,
  ability: AbilityId,
): number {
  const current = increases[ability] ?? 0;
  const spentElsewhere = totalAbilityScoreIncreases(increases) - current;
  const remainingBudget = ABILITY_SCORE_INCREASE_BUDGET - spentElsewhere;
  return Math.min(MAX_ABILITY_SCORE_INCREASE_PER_ABILITY, Math.max(0, remainingBudget));
}
