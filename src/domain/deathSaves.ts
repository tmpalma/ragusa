export const DEATH_SAVE_MAX = 3;

export interface DeathSaveState {
  deathSaveSuccesses: number;
  deathSaveFailures: number;
}

export function clampDeathSave(value: number): number {
  return Math.min(DEATH_SAVE_MAX, Math.max(0, Math.floor(value)));
}

export function clearDeathSaves(): DeathSaveState {
  return { deathSaveSuccesses: 0, deathSaveFailures: 0 };
}

export function hasDeathSaveMarks(state: DeathSaveState): boolean {
  return state.deathSaveSuccesses > 0 || state.deathSaveFailures > 0;
}

/** Clears death-save marks when the character is no longer at 0 HP. */
export function deathSavesClearedIfHealed(
  state: DeathSaveState,
  currentHitPoints: number | null,
  maxHitPoints: number,
): DeathSaveState | null {
  const effectiveHp = currentHitPoints ?? maxHitPoints;
  if (effectiveHp > 0 && hasDeathSaveMarks(state)) {
    return clearDeathSaves();
  }
  return null;
}
