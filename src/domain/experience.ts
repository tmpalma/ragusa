/** Cumulative XP required to reach each character level (2024 PHB). Index 0 = level 1. */
export const XP_TO_REACH_LEVEL: readonly number[] = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000,
  195000, 225000, 265000, 305000, 355000,
];

export const MAX_CHARACTER_LEVEL_RULES = XP_TO_REACH_LEVEL.length;

/** XP threshold to reach the next level, or null at max rules level (20). */
export function xpThresholdForNextLevel(currentLevel: number): number | null {
  if (!Number.isInteger(currentLevel) || currentLevel < 1 || currentLevel >= MAX_CHARACTER_LEVEL_RULES) {
    return null;
  }
  return XP_TO_REACH_LEVEL[currentLevel];
}

/** XP still needed for the next level; null when there is no next level. */
export function xpRemainingForNextLevel(currentLevel: number, experiencePoints: number): number | null {
  const threshold = xpThresholdForNextLevel(currentLevel);
  if (threshold == null) return null;
  return Math.max(0, threshold - Math.max(0, experiencePoints));
}
