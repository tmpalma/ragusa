import type {
  AbilityId,
  ClassData,
  ClassFeatureEffect,
  PreparedSpellCount,
  SpellListMode,
  SubclassData,
} from "../data/types";
import { extraCantripSlotsFromClassFeatureChoices } from "./classFeatures/featureChoices";
import type { ResolvedClassLevel } from "./classLevels";
import type { MulticlassCasterContext } from "./multiclassCasterLevel";
import {
  characterSpellcastingSlots,
  pactMagicPoolFromClassLevels,
  spellProgressionRowForLevel,
  spellSlotRowForLevel,
  type PactMagicPool,
} from "./spellProgression";

export function resolvePreparedSpellCount(
  formula: PreparedSpellCount,
  abilityModifiers: Record<AbilityId, number>,
  level: number,
): number {
  if (formula.kind === "fixed") return formula.count;
  const minimum = formula.minimum ?? 1;
  return Math.max(minimum, abilityModifiers[formula.ability] + level);
}

function resolveByLevel<T>(map: Partial<Record<number, T>>, level: number): T | undefined {
  const entries = Object.entries(map)
    .map(([entryLevel, value]) => [Number(entryLevel), value] as const)
    .filter(([entryLevel]) => entryLevel <= level)
    .sort((a, b) => b[0] - a[0]);
  return entries[0]?.[1];
}

export interface SpellcastingSummary {
  ability: AbilityId;
  abilityModifier: number;
  attackBonus: number;
  saveDc: number;
  /** Remaining maxima by spell level; omit levels with 0 slots. */
  slotsByLevel: Record<number, number>;
  level1Slots: number;
  cantripsKnown: number;
  spellsPreparedOrKnown: number;
  listMode: SpellListMode | null;
}

export interface SpellcastingInput {
  spellcastingAbility: AbilityId | null;
  spellcastingGainedAtLevel: number | null;
  slotsByLevel?: Record<number, number>;
  level1Slots?: number;
  abilityModifierValue: number;
  proficiencyBonus: number;
  characterLevel: number;
  cantripsKnown?: number;
  spellsPreparedOrKnown?: number;
  listMode?: SpellListMode | null;
  extraAttackBonus?: number;
  extraSaveDc?: number;
}

export type GrantSpellcastingEffect = Extract<ClassFeatureEffect, { type: "grant_spellcasting" }>;

export interface EffectiveSpellcasting {
  ability: AbilityId;
  gainedAtLevel: number;
  listMode: SpellListMode;
  listClassKey: string;
  slotRow: number[];
  cantripsKnown: number;
  spellsPreparedOrKnown: number;
}

/**
 * Returns null when the class doesn't cast spells at all, or when its
 * spellcasting feature isn't gained yet at the character's current level
 * (e.g. a late-casting subclass like Eldritch Knight). Paladin and Ranger
 * gain spellcasting at level 1 in srd-2024.
 */
export function computeSpellcasting(input: SpellcastingInput): SpellcastingSummary | null {
  const { spellcastingAbility, spellcastingGainedAtLevel } = input;
  if (!spellcastingAbility || spellcastingGainedAtLevel === null) return null;
  if (input.characterLevel < spellcastingGainedAtLevel) return null;

  const slotsByLevel = input.slotsByLevel ?? (input.level1Slots ? { 1: input.level1Slots } : {});
  const extraAttack = input.extraAttackBonus ?? 0;
  const extraDc = input.extraSaveDc ?? 0;

  return {
    ability: spellcastingAbility,
    abilityModifier: input.abilityModifierValue,
    attackBonus: input.abilityModifierValue + input.proficiencyBonus + extraAttack,
    saveDc: 8 + input.abilityModifierValue + input.proficiencyBonus + extraDc,
    slotsByLevel,
    level1Slots: slotsByLevel[1] ?? 0,
    cantripsKnown: input.cantripsKnown ?? 0,
    spellsPreparedOrKnown: input.spellsPreparedOrKnown ?? 0,
    listMode: input.listMode ?? null,
  };
}

/** Subclass `grant_spellcasting` effect active at the given character level. */
export function grantSpellcastingEffect(
  subclass: SubclassData | null,
  level: number,
): GrantSpellcastingEffect | null {
  if (!subclass) return null;
  let match: GrantSpellcastingEffect | null = null;
  for (const feature of subclass.features) {
    if (feature.grantedAtLevel > level) continue;
    for (const effect of feature.effects) {
      if (effect.type === "grant_spellcasting" && level >= effect.gainedAtLevel) {
        match = effect;
      }
    }
  }
  return match;
}

export function effectiveSpellListClassKey(
  classData: ClassData | null,
  subclass: SubclassData | null,
  level: number,
): string | null {
  const grant = grantSpellcastingEffect(subclass, level);
  if (grant) return grant.listClassKey;
  return classData?.key ?? null;
}

export function effectiveSpellSlotRow(
  classData: ClassData | null,
  subclass: SubclassData | null,
  level: number,
): number[] {
  const grant = grantSpellcastingEffect(subclass, level);
  if (grant) return resolveByLevel(grant.slotsByLevel, level) ?? [];
  if (!classData?.spellSlots) return [];
  if (classData.spellcastingGainedAtLevel != null && level < classData.spellcastingGainedAtLevel) {
    return [];
  }
  return spellSlotRowForLevel(classData.spellSlots, level);
}

/** Spell-slot maxima keyed by spell level (1–9), omitting levels with 0 slots. */
export function slotsByLevelFromRow(row: number[]): Record<number, number> {
  const slots: Record<number, number> = {};
  for (let index = 0; index < row.length; index += 1) {
    const count = row[index] ?? 0;
    if (count > 0) slots[index + 1] = count;
  }
  return slots;
}

function pickLimitsFromGrant(
  grant: GrantSpellcastingEffect,
  level: number,
  abilityModifiers: Record<AbilityId, number>,
): Pick<EffectiveSpellcasting, "cantripsKnown" | "spellsPreparedOrKnown"> {
  const cantripsKnown = resolveByLevel(grant.cantripsKnownByLevel, level) ?? 0;
  let spellsPreparedOrKnown = 0;
  if (grant.listMode === "known") {
    spellsPreparedOrKnown = resolveByLevel(grant.spellsKnownByLevel ?? {}, level) ?? 0;
  } else if (grant.spellsPrepared) {
    spellsPreparedOrKnown = resolvePreparedSpellCount(grant.spellsPrepared, abilityModifiers, level);
  }
  return { cantripsKnown, spellsPreparedOrKnown };
}

/**
 * Merges subclass `grant_spellcasting` when the subclass is selected and
 * character level meets `gainedAtLevel`. Returns null when no spellcasting
 * applies at this level (base class or overlay).
 */
export function effectiveSpellcasting(
  classData: ClassData | null,
  subclass: SubclassData | null,
  level: number,
  abilityModifiers: Record<AbilityId, number>,
  classFeatureChoices: Record<string, string> = {},
): EffectiveSpellcasting | null {
  const grant = grantSpellcastingEffect(subclass, level);
  if (grant) {
    const { cantripsKnown, spellsPreparedOrKnown } = pickLimitsFromGrant(grant, level, abilityModifiers);
    const extraCantrips = classData
      ? extraCantripSlotsFromClassFeatureChoices(classData, level, classFeatureChoices)
      : 0;
    return {
      ability: grant.ability,
      gainedAtLevel: grant.gainedAtLevel,
      listMode: grant.listMode,
      listClassKey: grant.listClassKey,
      slotRow: resolveByLevel(grant.slotsByLevel, level) ?? [],
      cantripsKnown: cantripsKnown + extraCantrips,
      spellsPreparedOrKnown,
    };
  }

  if (!classData?.spellcastingAbility || classData.spellcastingGainedAtLevel == null) return null;
  if (level < classData.spellcastingGainedAtLevel) return null;

  const progression = classData.spellProgression;
  const row = spellProgressionRowForLevel(progression, level);
  if (!progression || !row) return null;

  let spellsPreparedOrKnown = 0;
  if (progression.listMode === "known") {
    spellsPreparedOrKnown = row.spellsKnown ?? 0;
  } else if (row.spellsPrepared) {
    spellsPreparedOrKnown = resolvePreparedSpellCount(row.spellsPrepared, abilityModifiers, level);
  }

  const extraCantrips = extraCantripSlotsFromClassFeatureChoices(classData, level, classFeatureChoices);

  return {
    ability: classData.spellcastingAbility,
    gainedAtLevel: classData.spellcastingGainedAtLevel,
    listMode: progression.listMode ?? "prepared",
    listClassKey: classData.key,
    slotRow: spellSlotRowForLevel(classData.spellSlots, level),
    cantripsKnown: row.cantripsKnown + extraCantrips,
    spellsPreparedOrKnown,
  };
}

export interface MulticlassSpellcastingContext extends MulticlassCasterContext {
  abilityModifiers: Record<AbilityId, number>;
  proficiencyBonus: number;
  createdSpellSlots?: Record<number, number>;
  classFeatureChoicesByClass?: Record<string, Record<string, string>>;
  extraAttackBonus?: number;
  extraSaveDc?: number;
}

export interface PerClassSpellcasting {
  classKey: string;
  classLevel: number;
  summary: SpellcastingSummary | null;
}

export interface MulticlassSpellcastingResult {
  /** Combined Spellcasting table slots (excludes Pact Magic). */
  spellcastingSlots: Record<number, number>;
  /** Warlock Pact Magic pool when applicable. */
  pactMagic: PactMagicPool | null;
  /** Per-class spell DCs, prepared/known counts, and cantrip limits. */
  perClass: PerClassSpellcasting[];
}

function subclassForClassKey(
  classKey: string,
  ctx: MulticlassSpellcastingContext,
): SubclassData | null {
  const subclassKey = ctx.subclassByClass?.[classKey];
  if (!subclassKey || !ctx.getSubclassData) return null;
  return ctx.getSubclassData(subclassKey) ?? null;
}

/** Per-class spellcasting summaries keyed by class level (not character level). */
export function computePerClassSpellcasting(
  classLevels: ResolvedClassLevel[],
  ctx: MulticlassSpellcastingContext,
): PerClassSpellcasting[] {
  return classLevels.map(({ classKey, classLevel }) => {
    const classData = ctx.getClassData(classKey) ?? null;
    const subclass = subclassForClassKey(classKey, ctx);
    const choices = ctx.classFeatureChoicesByClass?.[classKey] ?? {};
    const effective = effectiveSpellcasting(classData, subclass, classLevel, ctx.abilityModifiers, choices);
    if (!effective) {
      return { classKey, classLevel, summary: null };
    }

    const summary = computeSpellcasting({
      spellcastingAbility: effective.ability,
      spellcastingGainedAtLevel: effective.gainedAtLevel,
      slotsByLevel: {},
      abilityModifierValue: ctx.abilityModifiers[effective.ability],
      proficiencyBonus: ctx.proficiencyBonus,
      characterLevel: classLevel,
      cantripsKnown: effective.cantripsKnown,
      spellsPreparedOrKnown: effective.spellsPreparedOrKnown,
      listMode: effective.listMode,
      extraAttackBonus: ctx.extraAttackBonus ?? 0,
      extraSaveDc: ctx.extraSaveDc ?? 0,
    });

    return { classKey, classLevel, summary };
  });
}

/** Combined Spellcasting slots, Pact Magic overlay, and per-class summaries. */
export function computeMulticlassSpellcasting(
  classLevels: ResolvedClassLevel[],
  ctx: MulticlassSpellcastingContext,
): MulticlassSpellcastingResult {
  const spellcastingSlots = characterSpellcastingSlots(
    classLevels,
    ctx,
    ctx.createdSpellSlots ?? {},
  );
  const pactMagic = pactMagicPoolFromClassLevels(classLevels, ctx.getClassData);
  const perClass = computePerClassSpellcasting(classLevels, ctx);

  return { spellcastingSlots, pactMagic, perClass };
}

/** Builds a SpellcastingSummary for deriveCharacter and UI. */
export function computeEffectiveSpellcasting(
  classData: ClassData | null,
  subclass: SubclassData | null,
  level: number,
  abilityModifiers: Record<AbilityId, number>,
  proficiencyBonus: number,
  createdSpellSlots: Record<number, number> = {},
  extraAttackBonus = 0,
  extraSaveDc = 0,
  classFeatureChoices: Record<string, string> = {},
): SpellcastingSummary | null {
  const effective = effectiveSpellcasting(classData, subclass, level, abilityModifiers, classFeatureChoices);
  if (!effective) return null;

  let slotsByLevel = slotsByLevelFromRow(effective.slotRow);
  for (const [levelKey, bonus] of Object.entries(createdSpellSlots)) {
    const spellLevel = Number(levelKey);
    if (bonus > 0) {
      slotsByLevel = { ...slotsByLevel, [spellLevel]: (slotsByLevel[spellLevel] ?? 0) + bonus };
    }
  }

  return computeSpellcasting({
    spellcastingAbility: effective.ability,
    spellcastingGainedAtLevel: effective.gainedAtLevel,
    slotsByLevel,
    abilityModifierValue: abilityModifiers[effective.ability],
    proficiencyBonus,
    characterLevel: level,
    cantripsKnown: effective.cantripsKnown,
    spellsPreparedOrKnown: effective.spellsPreparedOrKnown,
    listMode: effective.listMode,
    extraAttackBonus,
    extraSaveDc,
  });
}
