import { ABILITIES } from "../data/skills";
import type { AbilityId } from "../data/types";

export const MIN_POINT_BUY_SCORE = 8;
export const MAX_POINT_BUY_SCORE = 15;

const POINT_BUY_COSTS: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

export function pointBuyCost(score: number): number {
  return POINT_BUY_COSTS[score] ?? 0;
}

export function totalPointBuyCost(scores: Record<AbilityId, number>): number {
  return ABILITIES.reduce((sum, { id }) => sum + pointBuyCost(scores[id]), 0);
}

export function clampPointBuyScores(scores: Record<AbilityId, number>): Record<AbilityId, number> {
  return Object.fromEntries(
    ABILITIES.map(({ id }) => [
      id,
      Math.min(MAX_POINT_BUY_SCORE, Math.max(MIN_POINT_BUY_SCORE, scores[id])),
    ]),
  ) as Record<AbilityId, number>;
}
