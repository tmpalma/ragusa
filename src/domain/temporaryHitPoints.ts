export interface TemporaryHitPointsState {
  temporaryHitPointsMax: number | null;
  temporaryHitPointsRemaining: number | null;
}

export interface DamageResult extends TemporaryHitPointsState {
  currentHitPoints: number | null;
}

/** Apply a new temp-HP grant; keeps the higher remaining total (2024 single-source rule). */
export function applyTemporaryHitPointsGrant(
  current: TemporaryHitPointsState,
  newAmount: number,
): TemporaryHitPointsState {
  if (!Number.isFinite(newAmount) || newAmount <= 0) {
    return { temporaryHitPointsMax: null, temporaryHitPointsRemaining: null };
  }
  const grant = Math.floor(newAmount);
  const currentRemaining =
    current.temporaryHitPointsRemaining ??
    (current.temporaryHitPointsMax != null ? current.temporaryHitPointsMax : 0);
  if (current.temporaryHitPointsMax == null || grant > currentRemaining) {
    return { temporaryHitPointsMax: grant, temporaryHitPointsRemaining: grant };
  }
  return {
    temporaryHitPointsMax: current.temporaryHitPointsMax,
    temporaryHitPointsRemaining: currentRemaining,
  };
}

export function clearTemporaryHitPoints(): TemporaryHitPointsState {
  return { temporaryHitPointsMax: null, temporaryHitPointsRemaining: null };
}

/** Spend damage against temp HP first, then regular HP. */
export function applyDamageToCharacter(input: {
  maxHitPoints: number;
  currentHitPoints: number | null;
  temporaryHitPointsMax: number | null;
  temporaryHitPointsRemaining: number | null;
  damage: number;
}): DamageResult {
  const damage = Math.max(0, Math.floor(input.damage));
  let hp = input.currentHitPoints ?? input.maxHitPoints;
  let tempMax = input.temporaryHitPointsMax;
  let tempRemaining = input.temporaryHitPointsRemaining;

  let remaining = damage;
  if (tempRemaining != null && tempRemaining > 0) {
    const absorbed = Math.min(tempRemaining, remaining);
    tempRemaining -= absorbed;
    remaining -= absorbed;
    if (tempRemaining <= 0) {
      tempMax = null;
      tempRemaining = null;
    }
  }

  if (remaining > 0) {
    hp = Math.max(0, hp - remaining);
  }

  return {
    currentHitPoints: hp >= input.maxHitPoints ? null : hp,
    temporaryHitPointsMax: tempMax,
    temporaryHitPointsRemaining: tempRemaining,
  };
}

export function clampTemporaryHitPointsRemaining(max: number, remaining: number): number {
  return Math.min(Math.max(1, Math.floor(remaining)), Math.floor(max));
}
