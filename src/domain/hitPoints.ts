import type { ResolvedClassLevel } from "./classLevels";
import { hitPointBonusFromFeats } from "./featEffects";

export function hitPointBonusFromSpecies(hpPerLevel: number, level: number): number {
  return hpPerLevel * level;
}

/** Average HP gained from a hit die on levels after the first. */
export function averageHitDieGainPerLevel(hitDie: number): number {
  return Math.floor(hitDie / 2) + 1;
}

export interface OverviewHitPointsDisplay {
  current: number;
  max: number;
  /** Empty when no temp HP; otherwise `+{remaining}` (e.g. `+2`). */
  tempSuffix: string;
}

/** Read-only Overview HP line: current/max with optional temp suffix. */
export function overviewHitPointsDisplay(input: {
  maxHitPoints: number | null;
  currentHitPoints: number | null;
  temporaryHitPointsMax: number | null;
  temporaryHitPointsRemaining: number | null;
}): OverviewHitPointsDisplay | null {
  if (input.maxHitPoints == null) return null;

  const max = input.maxHitPoints;
  const baseCurrent = input.currentHitPoints ?? max;
  const { temporaryHitPointsMax, temporaryHitPointsRemaining } = input;
  const tempActive =
    temporaryHitPointsMax != null && temporaryHitPointsRemaining != null && temporaryHitPointsRemaining > 0;
  const tempSuffix = tempActive ? `+${temporaryHitPointsRemaining}` : "";
  const current = baseCurrent + (tempActive ? temporaryHitPointsRemaining! : 0);

  return { current, max, tempSuffix };
}

export type CombatHitPointsMutation =
  | { kind: "heal"; baseValue: number | null }
  | { kind: "damage"; amount: number };

/** Maps a target display HP total to heal (base HP) or damage, matching Combat stepper logic. */
export function combatHitPointsMutationForDisplayTarget(input: {
  maxHitPoints: number;
  baseCurrent: number;
  temporaryHitPointsMax: number | null;
  temporaryHitPointsRemaining: number | null;
  displayTarget: number;
}): CombatHitPointsMutation | null {
  const tempRemaining = input.temporaryHitPointsRemaining ?? 0;
  const tempActive = input.temporaryHitPointsMax != null && tempRemaining > 0;
  const displayCurrent = input.baseCurrent + (tempActive ? tempRemaining : 0);

  if (input.displayTarget >= displayCurrent) {
    const newBase = Math.min(
      input.maxHitPoints,
      input.displayTarget - (tempActive ? tempRemaining : 0),
    );
    const baseValue = newBase >= input.maxHitPoints ? null : newBase;
    return { kind: "heal", baseValue };
  }

  const amount = displayCurrent - input.displayTarget;
  if (amount <= 0) return null;
  return { kind: "damage", amount };
}

/** Constitution save DC for maintaining concentration after taking damage (max 30). */
export function concentrationSaveDc(damageTaken: number): number {
  const safeDamage = Math.max(0, Math.floor(damageTaken));
  return Math.min(30, Math.max(10, Math.floor(safeDamage / 2)));
}

/** Preview display HP after applying bulk damage or healing (temp HP unchanged). */
export function displayHitPointsAfterBulkChange(input: {
  displayCurrent: number;
  displayCap: number;
  mode: "damage" | "heal";
  amount: number;
}): number {
  if (input.amount <= 0) return input.displayCurrent;
  if (input.mode === "damage") {
    return Math.max(0, input.displayCurrent - input.amount);
  }
  return Math.min(input.displayCap, input.displayCurrent + input.amount);
}

export function computeHitPoints(
  hitDie: number,
  conModifier: number,
  level: number,
  activeFeatKeys: string[],
  speciesHpPerLevel = 0,
  classHpPerLevel = 0,
): number {
  const safeLevel = Math.max(1, level);
  const perLevelGain = averageHitDieGainPerLevel(hitDie) + conModifier;
  const classHp =
    safeLevel === 1 ? hitDie + conModifier : hitDie + conModifier + (safeLevel - 1) * perLevelGain;

  return (
    classHp +
    hitPointBonusFromFeats(activeFeatKeys, safeLevel) +
    hitPointBonusFromSpecies(speciesHpPerLevel, safeLevel) +
    classHpPerLevel * safeLevel
  );
}

/** Flat HP bonus from per-class-level features (e.g. Draconic Resilience), summed per class level. */
export function multiclassClassHpBonus(
  classLevels: ResolvedClassLevel[],
  resolveClassHpPerLevelRate: (classKey: string, classLevel: number) => number,
): number {
  let total = 0;
  for (const { classKey, classLevel } of classLevels) {
    total += resolveClassHpPerLevelRate(classKey, classLevel) * classLevel;
  }
  return total;
}

/**
 * Multiclass max HP: character level 1 uses that class's max hit die + CON; every later
 * level uses that step's class hit die average (floor(die/2)+1) + CON.
 */
/** Count hit dice by die size from a level path (e.g. Wizard 1 / Fighter 3 → { 6: 1, 10: 3 }). */
export function hitDiceMaxByDieFromLevelPath(
  levelPath: string[],
  resolveHitDie: (classKey: string) => number,
): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const classKey of levelPath) {
    const die = resolveHitDie(classKey);
    counts[die] = (counts[die] ?? 0) + 1;
  }
  return counts;
}

export interface HitDicePoolEntry {
  die: number;
  max: number;
  current: number;
}

/** Resolve remaining hit dice per die size; honors legacy single-pool currentHitDice. */
export function resolveHitDicePools(input: {
  maxByDie: Record<number, number>;
  hitDiceRemaining: Partial<Record<number, number | null>>;
  legacyCurrentHitDice: number | null;
}): HitDicePoolEntry[] {
  const dice = Object.keys(input.maxByDie)
    .map(Number)
    .sort((a, b) => a - b);
  const legacySinglePool =
    dice.length === 1 && Object.keys(input.hitDiceRemaining).length === 0;

  return dice.map((die) => {
    const max = input.maxByDie[die]!;
    const stored = input.hitDiceRemaining[die];
    let current: number;
    if (stored != null) {
      current = stored;
    } else if (legacySinglePool && input.legacyCurrentHitDice != null) {
      current = input.legacyCurrentHitDice;
    } else {
      current = max;
    }
    return { die, max, current: Math.min(Math.max(current, 0), max) };
  });
}

export function computeHitPointsFromLevelPath(
  levelPath: string[],
  resolveHitDie: (classKey: string) => number,
  conModifier: number,
  activeFeatKeys: string[],
  speciesHpPerLevel = 0,
  classHpBonus = 0,
): number {
  if (levelPath.length === 0) return 0;

  let classHp = 0;
  for (let index = 0; index < levelPath.length; index++) {
    const hitDie = resolveHitDie(levelPath[index]!);
    classHp +=
      index === 0 ? hitDie + conModifier : averageHitDieGainPerLevel(hitDie) + conModifier;
  }

  const characterLevel = levelPath.length;
  return (
    classHp +
    hitPointBonusFromFeats(activeFeatKeys, characterLevel) +
    hitPointBonusFromSpecies(speciesHpPerLevel, characterLevel) +
    classHpBonus
  );
}
