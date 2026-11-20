/** Effective max HP including a stored bonus (e.g. Aid). */
export function effectiveMaxHitPoints(baseMax: number | null, bonus: number): number | null {
  if (baseMax == null) return null;
  return baseMax + Math.max(0, Math.floor(bonus));
}

export function applyHitPointMaxBonus(input: {
  baseMaxHitPoints: number;
  currentBonus: number;
  newBonus: number;
  currentHitPoints: number | null;
}): { hitPointMaxBonus: number; currentHitPoints: number | null } {
  const newBonus = Math.max(0, Math.floor(input.newBonus));
  if (newBonus <= 0) {
    return clearHitPointMaxBonus(input);
  }

  const oldMax = input.baseMaxHitPoints + Math.max(0, input.currentBonus);
  const newMax = input.baseMaxHitPoints + newBonus;
  const delta = newBonus - Math.max(0, input.currentBonus);
  const currentEffective = input.currentHitPoints ?? oldMax;
  const newCurrent = Math.min(newMax, currentEffective + delta);

  return {
    hitPointMaxBonus: newBonus,
    currentHitPoints: newCurrent >= newMax ? null : newCurrent,
  };
}

export function clearHitPointMaxBonus(input: {
  baseMaxHitPoints: number;
  currentBonus: number;
  currentHitPoints: number | null;
}): { hitPointMaxBonus: number; currentHitPoints: number | null } {
  const currentBonus = Math.max(0, Math.floor(input.currentBonus));
  if (currentBonus <= 0) {
    return { hitPointMaxBonus: 0, currentHitPoints: input.currentHitPoints };
  }

  const oldMax = input.baseMaxHitPoints + currentBonus;
  const newMax = input.baseMaxHitPoints;
  const currentEffective = input.currentHitPoints ?? oldMax;
  const newCurrent = Math.min(Math.max(0, currentEffective - currentBonus), newMax);

  return {
    hitPointMaxBonus: 0,
    currentHitPoints: newCurrent >= newMax ? null : newCurrent,
  };
}
