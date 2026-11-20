import type { ClassData, SpellSlotTable, SubclassData } from "../data/types";
import { spellSlotRow } from "./spellProgression";
import { grantSpellcastingEffect, slotsByLevelFromRow } from "./spellcasting";
import type { TableRules } from "./tableRules";

/** One class entry with its level in that class (not character level). */
export interface ResolvedClassLevel {
  classKey: string;
  classLevel: number;
}

export interface MulticlassCasterContext {
  subclassByClass?: Record<string, string | null>;
  getClassData: (classKey: string) => ClassData | null | undefined;
  getSubclassData?: (subclassKey: string) => SubclassData | null | undefined;
}

/**
 * XPHB Multiclass Spellcaster table (identical to full-caster slots 1–20).
 * Rows 1–4 match wizard spellSlots in the generated class catalog.
 */
export const XPHB_MULTICLASS_SPELL_SLOT_TABLE: SpellSlotTable = {
  byCharacterLevel: {
    1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
    5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
    7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
    8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
    9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
    10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
    11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
    18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
    19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
    20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  },
};

function subclassForClass(
  classKey: string,
  ctx: MulticlassCasterContext,
): SubclassData | null | undefined {
  const subclassKey = ctx.subclassByClass?.[classKey];
  if (!subclassKey || !ctx.getSubclassData) return null;
  return ctx.getSubclassData(subclassKey);
}

function activeGrantSpellcasting(
  classKey: string,
  classLevel: number,
  ctx: MulticlassCasterContext,
): boolean {
  const subclass = subclassForClass(classKey, ctx);
  return grantSpellcastingEffect(subclass ?? null, classLevel) !== null;
}

function hasBaseSpellcasting(classData: ClassData, classLevel: number): boolean {
  if (classData.casterType === "PACT" || classData.casterType === "NONE") return false;
  if (classData.spellcastingGainedAtLevel == null) return false;
  return classLevel >= classData.spellcastingGainedAtLevel;
}

/** Whether this class contributes the Spellcasting feature (not Pact Magic). */
export function hasSpellcastingFeature(
  classKey: string,
  classLevel: number,
  ctx: MulticlassCasterContext,
): boolean {
  if (activeGrantSpellcasting(classKey, classLevel, ctx)) return true;
  const classData = ctx.getClassData(classKey);
  if (!classData) return false;
  return hasBaseSpellcasting(classData, classLevel);
}

/** Distinct class keys that currently have the Spellcasting feature. */
export function spellcastingClassKeys(
  classLevels: ResolvedClassLevel[],
  ctx: MulticlassCasterContext,
): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const { classKey, classLevel } of classLevels) {
    if (seen.has(classKey)) continue;
    if (hasSpellcastingFeature(classKey, classLevel, ctx)) {
      seen.add(classKey);
      keys.push(classKey);
    }
  }
  return keys;
}

/** True when the XPHB multiclass spell slot table applies (2+ Spellcasting classes). */
export function usesMulticlassSpellSlotTable(
  classLevels: ResolvedClassLevel[],
  ctx: MulticlassCasterContext,
): boolean {
  return spellcastingClassKeys(classLevels, ctx).length > 1;
}

/**
 * Caster-level contribution for one class toward the multiclass spell slot total.
 * Warlock Pact Magic levels are excluded (returns 0).
 */
export function casterLevelContribution(
  classKey: string,
  classLevel: number,
  ctx: MulticlassCasterContext,
): number {
  if (activeGrantSpellcasting(classKey, classLevel, ctx)) {
    return Math.floor(classLevel / 3);
  }

  const classData = ctx.getClassData(classKey);
  if (!classData || !hasBaseSpellcasting(classData, classLevel)) {
    return 0;
  }

  if (classData.casterType === "FULL") {
    return classLevel;
  }
  if (classData.casterType === "HALF") {
    return Math.ceil(classLevel / 2);
  }

  return 0;
}

/** Combined multiclass caster level (sum of per-class contributions). */
export function multiclassCasterLevel(
  classLevels: ResolvedClassLevel[],
  ctx: MulticlassCasterContext,
): number {
  let total = 0;
  const seen = new Set<string>();
  for (const { classKey, classLevel } of classLevels) {
    if (seen.has(classKey)) continue;
    seen.add(classKey);
    total += casterLevelContribution(classKey, classLevel, ctx);
  }
  return total;
}

function singleClassSpellSlots(
  classKey: string,
  classLevel: number,
  ctx: MulticlassCasterContext,
): Record<number, number> {
  const subclass = subclassForClass(classKey, ctx);
  const grant = grantSpellcastingEffect(subclass ?? null, classLevel);
  if (grant) {
    const entries = Object.entries(grant.slotsByLevel)
      .map(([level, row]) => [Number(level), row] as const)
      .filter(([level]) => level <= classLevel)
      .sort((a, b) => b[0] - a[0]);
    const row = entries[0]?.[1] ?? [];
    return slotsByLevelFromRow(row);
  }

  const classData = ctx.getClassData(classKey);
  const row = classData?.spellSlots?.byCharacterLevel[classLevel] ?? [];
  return slotsByLevelFromRow(row);
}

/**
 * Spellcasting slot maxima (Spellcasting table pool only; excludes Pact Magic).
 * Uses the multiclass table when Spellcasting exists on more than one class;
 * otherwise uses the sole spellcasting class's own table at that class's level.
 */
export function resolveSpellcastingSlots(
  classLevels: ResolvedClassLevel[],
  ctx: MulticlassCasterContext,
): Record<number, number> {
  const keys = spellcastingClassKeys(classLevels, ctx);
  if (keys.length === 0) return {};
  if (keys.length === 1) {
    const classKey = keys[0]!;
    const entry = classLevels.find((row) => row.classKey === classKey);
    if (!entry) return {};
    return singleClassSpellSlots(classKey, entry.classLevel, ctx);
  }

  const casterLevel = multiclassCasterLevel(classLevels, ctx);
  const row = spellSlotRow(XPHB_MULTICLASS_SPELL_SLOT_TABLE, casterLevel);
  return slotsByLevelFromRow(row);
}

/**
 * Extra Attack attack count from multiple sources.
 * RAW: min(2, max of sources) unless tableRules.extraAttackStacks allows stacking.
 */
export function extraAttackCount(attackCountsBySource: number[], rules: TableRules): number {
  if (attackCountsBySource.length === 0) return 0;
  const max = Math.max(...attackCountsBySource);
  if (rules.extraAttackStacks) {
    return max;
  }
  return Math.min(2, max);
}
