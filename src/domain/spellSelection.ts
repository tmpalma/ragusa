import { CLASS_SPELL_LISTS, CLASSES, SPELLS, findByKey } from "../data";
import type { AbilityId, ActionTiming, ClassData, ClassSpellList, SpellData, SpellProgression, SubclassData } from "../data/types";
import {
  featGrantSpellsEffects,
  type FeatChoices,
} from "./featEffects";
import {
  featCantripPickSlotCount,
  featSpellPickSlotCount,
  magicInitiateFeatKeyFromActive,
  resolveFeatSpellcastingAbility,
} from "./featGrantSpells";
import { PROFICIENCY_BONUS } from "./proficiency";
import { extraCantripSlotsFromClassFeatureChoices } from "./classFeatures/featureChoices";
import {
  PACT_OF_THE_TOME_SPELL_PICKS_KEY,
  spellNamesFromClassFeatureOptionPicks,
} from "./classFeatures/optionPicks";
import { spellProgressionRowForLevel } from "./spellProgression";
import {
  effectiveSpellListClassKey,
  effectiveSpellSlotRow,
  grantSpellcastingEffect,
  resolvePreparedSpellCount,
  slotsByLevelFromRow,
} from "./spellcasting";
import { activeSubclassFeatures, findSubclass } from "./subclasses";
import type { ClassFeatureSpellPickSet } from "../data/types";
import type { ResolvedClassLevel } from "./classLevels";
import { effectiveLevelPath, resolvedClassLevels } from "./classLevels";
import type { Character, CharacterAction } from "../state/characterState";
import type { PerClassSpellcasting } from "./spellcasting";

export function spellKeyFromName(name: string, spells: SpellData[] = SPELLS): string | null {
  const normalized = name.trim().toLowerCase();
  const match = spells.find((spell) => spell.name.toLowerCase() === normalized);
  return match?.key ?? null;
}

export { resolvePreparedSpellCount } from "./spellcasting";

export interface SpellPickLimits {
  cantripSlots: number;
  spellSlots: number;
  spellbookSlots: number;
  listMode: SpellProgression["listMode"];
}

export interface SpellPickLimitsContext {
  abilityModifiers: Record<AbilityId, number>;
  getClassData: (classKey: string) => ClassData | null | undefined;
  subclassByClass?: Record<string, string | null>;
  classFeatureChoicesByClass?: Record<string, Record<string, string>>;
  getSubclassData?: (subclassKey: string) => SubclassData | null | undefined;
}

/** Prepared/known and cantrip limits per class, using each class's own level. */
export function spellPickLimitsByClass(
  classLevels: ResolvedClassLevel[],
  ctx: SpellPickLimitsContext,
): Record<string, SpellPickLimits> {
  const result: Record<string, SpellPickLimits> = {};
  for (const { classKey, classLevel } of classLevels) {
    const classData = ctx.getClassData(classKey) ?? null;
    const subclassKey = ctx.subclassByClass?.[classKey];
    const subclass =
      subclassKey && ctx.getSubclassData ? (ctx.getSubclassData(subclassKey) ?? null) : null;
    const choices = ctx.classFeatureChoicesByClass?.[classKey] ?? {};
    result[classKey] = spellPickLimitsForClass(
      classData,
      ctx.abilityModifiers,
      classLevel,
      choices,
      subclass,
    );
  }
  return result;
}

/** Total cantrip pick slots across all classes (union — each class contributes its cantrips). */
export function multiclassCantripSlotTotal(limitsByClass: Record<string, SpellPickLimits>): number {
  return Object.values(limitsByClass).reduce((sum, limits) => sum + limits.cantripSlots, 0);
}

/** True when the character has levels in more than one class. */
export function isMulticlassCharacter(character: Pick<Character, "levelPath" | "classKey" | "level">): boolean {
  return resolvedClassLevels(effectiveLevelPath(character as Character)).length > 1;
}

export function subclassKeyForClass(
  character: Pick<Character, "classKey" | "subclassKey" | "subclassByClass">,
  classKey: string,
): string | null {
  if (character.subclassByClass[classKey] !== undefined) {
    return character.subclassByClass[classKey];
  }
  if (classKey === character.classKey) return character.subclassKey;
  return null;
}

export function classFeatureChoicesForClass(
  character: Pick<Character, "classKey" | "classFeatureChoices" | "classFeatureChoicesByClass">,
  classKey: string,
): Record<string, string> {
  const byClass = character.classFeatureChoicesByClass[classKey];
  if (byClass && Object.keys(byClass).length > 0) return byClass;
  if (classKey === character.classKey) return character.classFeatureChoices;
  return byClass ?? {};
}

/** Per-class prepared/known picks; legacy flat spellPicks map to the initial class. */
export function spellPicksForClass(character: Character, classKey: string): string[] {
  const byClass = character.spellPicksByClass[classKey];
  if (byClass && byClass.length > 0) return byClass;
  if (classKey === character.classKey && character.spellPicks.length > 0) return character.spellPicks;
  return byClass ?? [];
}

/** Per-class cantrip picks; legacy flat cantripPicks map to the initial class. */
export function cantripPicksForClass(character: Character, classKey: string): string[] {
  const byClass = character.cantripPicksByClass[classKey];
  if (byClass && byClass.length > 0) return byClass;
  const hasAnyByClass = Object.values(character.cantripPicksByClass).some((picks) => picks.length > 0);
  if (!hasAnyByClass && classKey === character.classKey && character.cantripPicks.length > 0) {
    return character.cantripPicks;
  }
  return byClass ?? [];
}

/** Per-class spellbook picks; legacy flat spellbookPicks map to the initial class. */
export function spellbookPicksForClass(character: Character, classKey: string): string[] {
  const byClass = character.spellbookPicksByClass[classKey];
  if (byClass && byClass.length > 0) return byClass;
  if (classKey === character.classKey && character.spellbookPicks.length > 0) return character.spellbookPicks;
  return byClass ?? [];
}

/** Union of per-class spell picks (deduped, first-taken class order). */
export function allPerClassSpellPicks(character: Character, classLevels: ResolvedClassLevel[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const { classKey } of classLevels) {
    for (const pick of spellPicksForClass(character, classKey)) {
      if (seen.has(pick)) continue;
      seen.add(pick);
      result.push(pick);
    }
  }
  return result;
}

/** Union of per-class cantrip picks (deduped, first-taken class order). */
export function allPerClassCantripPicks(character: Character, classLevels: ResolvedClassLevel[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const { classKey } of classLevels) {
    for (const pick of cantripPicksForClass(character, classKey)) {
      if (seen.has(pick)) continue;
      seen.add(pick);
      result.push(pick);
    }
  }
  return result;
}

/** All cantrip picks for display; single-class uses flat storage, multiclass merges per-class picks. */
export function unionCantripPicks(character: Character): string[] {
  if (isMulticlassCharacter(character)) {
    return allPerClassCantripPicks(character, resolvedClassLevels(effectiveLevelPath(character)));
  }
  return character.cantripPicks;
}

export function cantripPickOptionsForClass(
  classKey: string,
  classLevel: number,
  character: Pick<Character, "classKey" | "subclassKey" | "subclassByClass">,
): string[] {
  const classData = findByKey(CLASSES, classKey);
  const subclassKey = subclassKeyForClass(character, classKey);
  const subclass = findSubclass(classKey, subclassKey);
  const listClassKey = effectiveSpellListClassKey(classData, subclass, classLevel);
  return classSpellListFor(classKey, listClassKey).cantrips;
}

/** Remove spells the character already knows; keep selected picks valid for retention. */
export function filterOwnedSpellPickOptions(
  options: string[],
  ownedSpellKeys: Set<string>,
  retainSelectedKeys: string[] = [],
): string[] {
  if (retainSelectedKeys.length === 0) {
    return options.filter((key) => !ownedSpellKeys.has(key));
  }
  const retain = new Set(retainSelectedKeys);
  return options.filter((key) => !ownedSpellKeys.has(key) || retain.has(key));
}

/** All spell keys the character already knows from any class, feat, or species grant. */
export function characterOwnedSpellKeys(input: {
  character: Character;
  classLevels: ResolvedClassLevel[];
  speciesCantrips: string[];
  speciesPreparedSpells: { spellName: string; minLevel: number }[];
  activeFeatKeys: string[];
  featChoicesFor: (featKey: string) => FeatChoices;
  spellSlots?: Record<number, number>;
}): Set<string> {
  const owned = new Set<string>();

  for (const key of unionCantripPicks(input.character)) {
    owned.add(key);
  }

  if (isMulticlassCharacter(input.character)) {
    for (const key of allPerClassSpellPicks(input.character, input.classLevels)) {
      owned.add(key);
    }
    for (const { classKey } of input.classLevels) {
      for (const key of spellbookPicksForClass(input.character, classKey)) {
        owned.add(key);
      }
    }
  } else {
    for (const key of input.character.spellPicks) {
      owned.add(key);
    }
  }

  for (const key of allSpellbookKeys({
    spellbookPicks: input.character.spellbookPicks,
    spellbookExtraPicks: input.character.spellbookExtraPicks,
    subclassSpellbookPicks: input.character.subclassSpellbookPicks,
  })) {
    owned.add(key);
  }

  for (const key of input.character.alwaysPreparedSpellPicks ?? []) {
    owned.add(key);
  }

  const grantedSeen = new Set<string>();
  for (const { classKey, classLevel } of input.classLevels) {
    const subclassKey = subclassKeyForClass(input.character, classKey);
    for (const entry of buildAllGrantedSpells({
      speciesCantrips: input.speciesCantrips,
      speciesPreparedSpells: input.speciesPreparedSpells,
      classKey,
      subclassKey,
      subclassFeatureChoices: input.character.subclassFeatureChoices,
      classFeatureOptionPicks: input.character.classFeatureOptionPicks,
      classFeatureSpellPicks: input.character.classFeatureSpellPicks,
      level: classLevel,
      activeFeatKeys: input.activeFeatKeys,
      featChoicesFor: input.featChoicesFor,
      spellSlots: input.spellSlots,
    })) {
      if (grantedSeen.has(entry.spellKey)) continue;
      grantedSeen.add(entry.spellKey);
      owned.add(entry.spellKey);
    }
  }

  return owned;
}

/** True when a known/prepared/granted spell requires concentration. */
export function isPreparedConcentrationSpell(spellKey: string): boolean {
  const spell = findSpellByKey(spellKey);
  return spell != null && spell.concentration;
}

/** Known, prepared, or granted spells that require concentration (deduped, sorted by name). */
export function preparedConcentrationSpellKeys(
  preparedSpellKeys: string[],
  grantedSpellKeys: string[] = [],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const key of [...preparedSpellKeys, ...grantedSpellKeys]) {
    if (seen.has(key) || !isPreparedConcentrationSpell(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result.sort((a, b) => {
    const spellA = findSpellByKey(a);
    const spellB = findSpellByKey(b);
    return (spellA?.name ?? a).localeCompare(spellB?.name ?? b);
  });
}

/** Concentration options from a character's cantrip, spell, and granted picks (all spellcasting classes). */
export function characterConcentrationSpellKeys(input: {
  character: Character;
  classLevels: ResolvedClassLevel[];
  speciesCantrips: string[];
  speciesPreparedSpells: { spellName: string; minLevel: number }[];
  activeFeatKeys: string[];
  featChoicesFor: (featKey: string) => FeatChoices;
  spellSlots?: Record<number, number>;
}): string[] {
  const prepared = isMulticlassCharacter(input.character)
    ? allPerClassSpellPicks(input.character, input.classLevels)
    : input.character.spellPicks;
  const cantrips = unionCantripPicks(input.character);

  const grantedKeys: string[] = [];
  const seen = new Set<string>();
  for (const { classKey, classLevel } of input.classLevels) {
    const subclassKey = subclassKeyForClass(input.character, classKey);
    for (const entry of buildAllGrantedSpells({
      speciesCantrips: input.speciesCantrips,
      speciesPreparedSpells: input.speciesPreparedSpells,
      classKey,
      subclassKey,
      subclassFeatureChoices: input.character.subclassFeatureChoices,
      classFeatureOptionPicks: input.character.classFeatureOptionPicks,
      classFeatureSpellPicks: input.character.classFeatureSpellPicks,
      level: classLevel,
      activeFeatKeys: input.activeFeatKeys,
      featChoicesFor: input.featChoicesFor,
      spellSlots: input.spellSlots,
    })) {
      if (seen.has(entry.spellKey)) continue;
      seen.add(entry.spellKey);
      grantedKeys.push(entry.spellKey);
    }
  }

  return preparedConcentrationSpellKeys([...cantrips, ...prepared], grantedKeys);
}

/** True when a known/prepared/granted spell has the Ritual tag. */
export function isPreparedRitualSpell(spellKey: string): boolean {
  const spell = findSpellByKey(spellKey);
  return spell != null && spell.ritual;
}

/** Known, prepared, or granted ritual spells (deduped, sorted by name). */
export function preparedRitualSpellKeys(
  preparedSpellKeys: string[],
  grantedSpellKeys: string[] = [],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const key of [...preparedSpellKeys, ...grantedSpellKeys]) {
    if (seen.has(key) || !isPreparedRitualSpell(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result.sort((a, b) => {
    const spellA = findSpellByKey(a);
    const spellB = findSpellByKey(b);
    return (spellA?.name ?? a).localeCompare(spellB?.name ?? b);
  });
}

/** Ritual options from a character's spell and granted picks (all spellcasting classes). */
export function characterRitualSpellKeys(input: {
  character: Character;
  classLevels: ResolvedClassLevel[];
  speciesCantrips: string[];
  speciesPreparedSpells: { spellName: string; minLevel: number }[];
  activeFeatKeys: string[];
  featChoicesFor: (featKey: string) => FeatChoices;
  spellSlots?: Record<number, number>;
}): string[] {
  const prepared = isMulticlassCharacter(input.character)
    ? allPerClassSpellPicks(input.character, input.classLevels)
    : input.character.spellPicks;
  const cantrips = unionCantripPicks(input.character);

  const grantedKeys: string[] = [];
  const seen = new Set<string>();
  for (const { classKey, classLevel } of input.classLevels) {
    const subclassKey = subclassKeyForClass(input.character, classKey);
    for (const entry of buildAllGrantedSpells({
      speciesCantrips: input.speciesCantrips,
      speciesPreparedSpells: input.speciesPreparedSpells,
      classKey,
      subclassKey,
      subclassFeatureChoices: input.character.subclassFeatureChoices,
      classFeatureOptionPicks: input.character.classFeatureOptionPicks,
      classFeatureSpellPicks: input.character.classFeatureSpellPicks,
      level: classLevel,
      activeFeatKeys: input.activeFeatKeys,
      featChoicesFor: input.featChoicesFor,
      spellSlots: input.spellSlots,
    })) {
      if (seen.has(entry.spellKey)) continue;
      seen.add(entry.spellKey);
      grantedKeys.push(entry.spellKey);
    }
  }

  return preparedRitualSpellKeys([...cantrips, ...prepared], grantedKeys);
}

/** Per-class spellcasting entries that are active at each class's level. */
export function activePerClassSpellcasting(perClass: PerClassSpellcasting[]): PerClassSpellcasting[] {
  return perClass.filter((entry) => entry.summary != null);
}

export function spellPickLimitsForClass(
  classData: ClassData | null,
  abilityModifiers: Record<AbilityId, number>,
  level: number,
  classFeatureChoices: Record<string, string> = {},
  subclass: SubclassData | null = null,
): SpellPickLimits {
  const grant = grantSpellcastingEffect(subclass, level);
  if (grant) {
    let spellSlots = 0;
    if (grant.listMode === "known") {
      const entries = Object.entries(grant.spellsKnownByLevel ?? {})
        .map(([entryLevel, value]) => [Number(entryLevel), value] as const)
        .filter(([entryLevel]) => entryLevel <= level)
        .sort((a, b) => b[0] - a[0]);
      spellSlots = entries[0]?.[1] ?? 0;
    } else if (grant.spellsPrepared) {
      spellSlots = resolvePreparedSpellCount(grant.spellsPrepared, abilityModifiers, level);
    }
    const cantripEntries = Object.entries(grant.cantripsKnownByLevel)
      .map(([entryLevel, value]) => [Number(entryLevel), value] as const)
      .filter(([entryLevel]) => entryLevel <= level)
      .sort((a, b) => b[0] - a[0]);
    const extraCantripSlots = classData
      ? extraCantripSlotsFromClassFeatureChoices(classData, level, classFeatureChoices)
      : 0;
    return {
      cantripSlots: (cantripEntries[0]?.[1] ?? 0) + extraCantripSlots,
      spellSlots,
      spellbookSlots: 0,
      listMode: grant.listMode,
    };
  }

  if (!classData) {
    return { cantripSlots: 0, spellSlots: 0, spellbookSlots: 0, listMode: null };
  }
  const progression = classData.spellProgression ?? null;
  const row = spellProgressionRowForLevel(progression, level);
  if (!progression || !row || classData.spellcastingGainedAtLevel == null) {
    return { cantripSlots: 0, spellSlots: 0, spellbookSlots: 0, listMode: null };
  }
  if (level < classData.spellcastingGainedAtLevel) {
    return { cantripSlots: 0, spellSlots: 0, spellbookSlots: 0, listMode: null };
  }

  const cantripSlots = row.cantripsKnown;
  const spellbookSlots = row.spellbookSize ?? 0;
  let spellSlots = 0;

  if (progression.listMode === "known") {
    spellSlots = row.spellsKnown ?? 0;
  } else if (row.spellsPrepared) {
    spellSlots = resolvePreparedSpellCount(row.spellsPrepared, abilityModifiers, level);
  }

  const extraCantripSlots = extraCantripSlotsFromClassFeatureChoices(classData, level, classFeatureChoices);

  return {
    cantripSlots: cantripSlots + extraCantripSlots,
    spellSlots,
    spellbookSlots,
    listMode: progression.listMode,
  };
}

export function classSpellListFor(classKey: string | null, listClassKey?: string | null): ClassSpellList {
  const key = listClassKey ?? classKey;
  if (!key) return { cantrips: [], level1: [], level2: [], level3: [] };
  const list = CLASS_SPELL_LISTS[key];
  return list ?? { cantrips: [], level1: [], level2: [], level3: [] };
}

export function preparedSpellListKeys(
  classData: ClassData | null,
  level: number,
  subclass: SubclassData | null = null,
): string[] {
  if (!classData) return [];
  const listClassKey = effectiveSpellListClassKey(classData, subclass, level) ?? classData.key;
  const list = classSpellListFor(classData.key, listClassKey);
  const slots = slotsByLevelFromRow(effectiveSpellSlotRow(classData, subclass, level));
  const overlayActive = grantSpellcastingEffect(subclass, level) != null;

  if (classData.casterType === "PACT" && !overlayActive) {
    const maxSlotLevel = Object.entries(slots).reduce(
      (max, [levelKey, count]) => (count > 0 ? Math.max(max, Number(levelKey)) : max),
      0,
    );
    const keys: string[] = [];
    if (maxSlotLevel >= 1) keys.push(...list.level1);
    if (maxSlotLevel >= 2) keys.push(...(list.level2 ?? []));
    if (maxSlotLevel >= 3) keys.push(...(list.level3 ?? []));
    return keys;
  }

  const keys: string[] = [];
  if ((slots[1] ?? 0) > 0) keys.push(...list.level1);
  if ((slots[2] ?? 0) > 0) keys.push(...(list.level2 ?? []));
  if ((slots[3] ?? 0) > 0) keys.push(...(list.level3 ?? []));
  return keys;
}

/** Spellbook options for wizards: all list spells up to the highest slot level with slots > 0. */
export function spellbookListKeys(
  classData: ClassData | null,
  level: number,
  subclass: SubclassData | null = null,
): string[] {
  return preparedSpellListKeys(classData, level, subclass);
}

/** Prepared spell options for the current level; always-prepared class/subclass spells are excluded. */
export function preparedSpellPickOptions(
  classKey: string | null,
  level: number = 1,
  subclassKey: string | null = null,
): string[] {
  const classData = findByKey(CLASSES, classKey);
  const subclass = findSubclass(classKey, subclassKey);
  const grantedKeys = new Set(
    buildGrantedSpells({
      speciesCantrips: [],
      speciesPreparedSpells: [],
      classKey,
      subclassKey,
      level,
    })
      .filter((entry) => entry.source === "classFeature")
      .map((entry) => entry.spellKey),
  );
  return preparedSpellListKeys(classData, level, subclass).filter((key) => !grantedKeys.has(key));
}

export function availableSpellOptions(
  list: string[],
  currentPicks: (string | null)[],
  index: number,
): string[] {
  const taken = new Set(currentPicks.filter((pick, pickIndex) => pick != null && pickIndex !== index));
  return list.filter((key) => !taken.has(key));
}

export function availableSpellOptionsCompact(list: string[], picked: string[]): string[] {
  const taken = new Set(picked);
  return list.filter((key) => !taken.has(key));
}

export function uniqueSpellLevels(spellKeys: string[]): number[] {
  const levels = new Set<number>();
  for (const key of spellKeys) {
    const level = findSpellByKey(key)?.level;
    if (level != null && level > 0) levels.add(level);
  }
  return [...levels].sort((a, b) => a - b);
}

export function filterSpellKeysByLevel(spellKeys: string[], spellLevel: number | null): string[] {
  if (spellLevel == null) return spellKeys;
  return spellKeys.filter((key) => findSpellByKey(key)?.level === spellLevel);
}

export function spellPickerLabel(name: string, school: string): string {
  return `${name} (${school})`;
}

export function localizedSpellPickerLabel(
  spellKey: string,
  translateName: (key: string, fallback: string) => string,
  translateSchool: (school: string) => string,
): string {
  const spell = findSpellByKey(spellKey);
  const name = translateName(spellKey, spell?.name ?? spellKey);
  if (!spell?.school) return name;
  return spellPickerLabel(name, translateSchool(spell.school));
}

export function ownedSpellKeysForCharacter(input: {
  character: Character;
  speciesCantrips: string[];
  speciesPreparedSpells: { spellName: string; minLevel: number }[];
  activeFeatKeys: string[];
  featChoicesFor: (featKey: string) => FeatChoices;
  spellSlots?: Record<number, number>;
}): Set<string> {
  return characterOwnedSpellKeys({
    character: input.character,
    classLevels: resolvedClassLevels(effectiveLevelPath(input.character)),
    speciesCantrips: input.speciesCantrips,
    speciesPreparedSpells: input.speciesPreparedSpells,
    activeFeatKeys: input.activeFeatKeys,
    featChoicesFor: input.featChoicesFor,
    spellSlots: input.spellSlots,
  });
}

export function retainValidSpellPicks(
  current: (string | null)[],
  count: number,
  allowed: string[],
): (string | null)[] {
  const allowedSet = new Set(allowed);
  const retained = current
    .slice(0, count)
    .map((pick) => (pick && allowedSet.has(pick) ? pick : null));
  while (retained.length < count) retained.push(null);
  return retained.slice(0, count);
}

export function retainValidCompactSpellPicks(
  current: string[],
  maxCount: number,
  allowed: string[],
): string[] {
  const allowedSet = new Set(allowed);
  return current.filter((pick) => allowedSet.has(pick)).slice(0, maxCount);
}

export function addCompactSpellPick(
  current: string[],
  spellKey: string,
  maxCount: number,
  allowed: string[],
): string[] | null {
  if (current.length >= maxCount) return null;
  if (current.includes(spellKey)) return null;
  if (!allowed.includes(spellKey)) return null;
  return [...current, spellKey];
}

export function removeCompactSpellPick(current: string[], spellKey: string): string[] {
  return current.filter((pick) => pick !== spellKey);
}

export function retainValidUncappedSpellPicks(current: string[], allowed: string[]): string[] {
  const allowedSet = new Set(allowed);
  return current.filter((pick) => allowedSet.has(pick));
}

export interface SpellbookKeyBuckets {
  spellbookPicks: string[];
  spellbookExtraPicks: string[];
  subclassSpellbookPicks: string[];
}

export function allSpellbookKeys(buckets: SpellbookKeyBuckets): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const key of [
    ...buckets.spellbookPicks,
    ...buckets.subclassSpellbookPicks,
    ...buckets.spellbookExtraPicks,
  ]) {
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}

/** All spellbook-known keys for a character (single-class flat buckets or per-class wizard picks). */
export function allCharacterSpellbookKeys(
  character: Character,
  classLevels: ResolvedClassLevel[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const addKeys = (keys: string[]) => {
    for (const key of keys) {
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(key);
    }
  };

  if (isMulticlassCharacter(character)) {
    for (const { classKey } of classLevels) {
      const classData = findByKey(CLASSES, classKey);
      if (classData?.spellProgression?.listMode !== "spellbook") continue;
      addKeys(spellbookPicksForClass(character, classKey));
    }
    return result;
  }

  addKeys(
    allSpellbookKeys({
      spellbookPicks: character.spellbookPicks,
      spellbookExtraPicks: character.spellbookExtraPicks,
      subclassSpellbookPicks: character.subclassSpellbookPicks,
    }),
  );
  return result;
}

export function wizardSpellbookDisplayKeys(character: Character, classKey: string): string[] {
  return allSpellbookKeys({
    spellbookPicks: spellbookPicksForClass(character, classKey),
    spellbookExtraPicks: character.spellbookExtraPicks,
    subclassSpellbookPicks: character.subclassSpellbookPicks,
  });
}

/** Level-up and subclass Savant entries in the spellbook (not scroll copies). */
export function wizardProgressionSpellbookKeys(character: Character, classKey: string): string[] {
  return allSpellbookKeys({
    spellbookPicks: spellbookPicksForClass(character, classKey),
    spellbookExtraPicks: [],
    subclassSpellbookPicks: character.subclassSpellbookPicks,
  });
}

/** Spells copied into the spellbook during play (scrolls, other spellbooks). */
export function wizardCopiedSpellbookKeys(character: Character): string[] {
  return character.spellbookExtraPicks;
}

export function spellbookRemoveAction(
  character: Character,
  spellKey: string,
  classKey: string | null,
): CharacterAction | null {
  const resolvedClassKey = classKey ?? character.classKey;
  if (!resolvedClassKey) return null;

  if (spellbookPicksForClass(character, resolvedClassKey).includes(spellKey)) {
    return isMulticlassCharacter(character)
      ? { type: "REMOVE_CLASS_SPELLBOOK_PICK", classKey: resolvedClassKey, spellKey }
      : { type: "REMOVE_SPELLBOOK_PICK", spellKey };
  }
  if (character.spellbookExtraPicks.includes(spellKey)) {
    return { type: "REMOVE_SPELLBOOK_EXTRA_PICK", spellKey };
  }
  if (character.subclassSpellbookPicks.includes(spellKey)) {
    return { type: "REMOVE_SUBCLASS_SPELLBOOK_PICK", spellKey };
  }
  return null;
}

export function spellAlreadyInSpellbook(spellKey: string, buckets: SpellbookKeyBuckets): boolean {
  return allSpellbookKeys(buckets).includes(spellKey);
}

export function addUncappedCompactSpellPick(
  current: string[],
  spellKey: string,
  allowed: string[],
  buckets: SpellbookKeyBuckets,
): string[] | null {
  if (spellAlreadyInSpellbook(spellKey, buckets)) return null;
  if (current.includes(spellKey)) return null;
  if (!allowed.includes(spellKey)) return null;
  return [...current, spellKey];
}

/** Adds a catalog spell key to an uncapped unique list (no class list). */
export function addUniqueCatalogSpellPick(current: string[], spellKey: string): string[] | null {
  if (!findSpellByKey(spellKey)) return null;
  if (current.includes(spellKey)) return null;
  return [...current, spellKey];
}

export function applySpellPick(
  current: (string | null)[],
  index: number,
  spellKey: string | null,
  allowed: string[],
): (string | null)[] | null {
  if (index < 0 || index >= current.length) return null;
  if (spellKey != null && !allowed.includes(spellKey)) return null;
  if (spellKey != null && current.some((pick, pickIndex) => pickIndex !== index && pick === spellKey)) {
    return null;
  }
  const next = [...current];
  next[index] = spellKey;
  return next;
}

export interface ClassFeatureSpellPickRef {
  featureKey: string;
  kind: "cantrip" | "ritual";
}

export interface GrantedSpellEntry {
  spellKey: string;
  locked: boolean;
  source: "species" | "classFeature" | "feat";
  featKey?: string;
  spellcastingAbility?: AbilityId;
  combatActionTiming?: ActionTiming;
  classFeatureSpellPick?: ClassFeatureSpellPickRef;
}

export interface CharacterSpellEntry {
  spellKey: string;
  locked: boolean;
  source: "pick" | "species" | "classFeature" | "feat" | "spellbook" | "alwaysPrepared";
  pickKind?: "cantrip" | "spell";
  featKey?: string;
  spellcastingAbility?: AbilityId;
  combatActionTiming?: ActionTiming;
  classFeatureSpellPick?: ClassFeatureSpellPickRef;
}

export function buildGrantedSpells(input: {
  speciesCantrips: string[];
  speciesPreparedSpells: { spellName: string; minLevel: number }[];
  classKey: string | null;
  subclassKey?: string | null;
  subclassFeatureChoices?: Record<string, string>;
  classFeatureOptionPicks?: Record<string, (string | null)[]>;
  classFeatureSpellPicks?: Record<string, ClassFeatureSpellPickSet>;
  level: number;
}): GrantedSpellEntry[] {
  const entries: GrantedSpellEntry[] = [];

  for (const cantripName of input.speciesCantrips) {
    const spellKey = spellKeyFromName(cantripName);
    if (spellKey) entries.push({ spellKey, locked: true, source: "species" });
  }

  for (const prepared of input.speciesPreparedSpells) {
    if (input.level < prepared.minLevel) continue;
    const spellKey = spellKeyFromName(prepared.spellName);
    if (spellKey) entries.push({ spellKey, locked: true, source: "species" });
  }

  if (input.classKey === "ranger") {
    const huntersMark = spellKeyFromName("Hunter's Mark");
    if (huntersMark) entries.push({ spellKey: huntersMark, locked: true, source: "classFeature" });
  }

  const subclass = findSubclass(input.classKey, input.subclassKey ?? null);
  if (subclass) {
    for (const feature of activeSubclassFeatures(subclass, input.level)) {
      const timing = feature.actionTiming;
      for (const effect of feature.effects) {
        if (effect.type === "always_prepared_spells") {
          for (const spellName of effect.spellNames) {
            const spellKey = spellKeyFromName(spellName);
            if (spellKey) {
              entries.push({
                spellKey,
                locked: true,
                source: "classFeature",
                ...(timing ? { combatActionTiming: timing } : {}),
              });
            }
          }
        }
        if (effect.type === "choose_feature_option") {
          const selectedKey = (input.subclassFeatureChoices ?? {})[effect.choiceKey];
          if (!selectedKey) continue;
          const option = effect.options.find((entry) => entry.key === selectedKey);
          if (!option?.spellNames) continue;
          for (const spellName of option.spellNames) {
            const spellKey = spellKeyFromName(spellName);
            if (spellKey) {
              entries.push({
                spellKey,
                locked: true,
                source: "classFeature",
                ...(timing ? { combatActionTiming: timing } : {}),
              });
            }
          }
        }
      }
    }
  }

  const classData = input.classKey ? findByKey(CLASSES, input.classKey) : null;
  if (classData) {
    for (const feature of classData.features) {
      if (feature.grantedAtLevel > input.level) continue;
      const timing = feature.actionTiming;
      for (const effect of feature.effects) {
        if (effect.type === "always_prepared_spells") {
          for (const spellName of effect.spellNames) {
            const spellKey = spellKeyFromName(spellName);
            if (spellKey) {
              entries.push({
                spellKey,
                locked: true,
                source: "classFeature",
                ...(timing ? { combatActionTiming: timing } : {}),
              });
            }
          }
        }
      }
    }

    for (const spellName of spellNamesFromClassFeatureOptionPicks(
      classData,
      input.level,
      input.classFeatureOptionPicks ?? {},
    )) {
      const spellKey = spellKeyFromName(spellName);
      if (spellKey) entries.push({ spellKey, locked: true, source: "classFeature" });
    }

    if (classData.key === "warlock") {
      const tomePicks = input.classFeatureSpellPicks?.[PACT_OF_THE_TOME_SPELL_PICKS_KEY];
      if (tomePicks) {
        for (const spellKey of tomePicks.cantrips) {
          if (!spellKey) continue;
          entries.push({
            spellKey,
            locked: false,
            source: "classFeature",
            classFeatureSpellPick: {
              featureKey: PACT_OF_THE_TOME_SPELL_PICKS_KEY,
              kind: "cantrip",
            },
          });
        }
        for (const spellKey of tomePicks.rituals) {
          if (!spellKey) continue;
          entries.push({
            spellKey,
            locked: false,
            source: "classFeature",
            classFeatureSpellPick: {
              featureKey: PACT_OF_THE_TOME_SPELL_PICKS_KEY,
              kind: "ritual",
            },
          });
        }
      }
    }
  }

  return entries;
}

export function buildFeatGrantedSpells(input: {
  activeFeatKeys: string[];
  featChoicesFor: (featKey: string) => FeatChoices;
  spellSlots?: Record<number, number>;
}): GrantedSpellEntry[] {
  const entries: GrantedSpellEntry[] = [];
  const seen = new Set<string>();

  for (const featKey of input.activeFeatKeys) {
    const grantEffects = featGrantSpellsEffects(featKey);
    if (grantEffects.length === 0) continue;

    const choices = input.featChoicesFor(featKey);
    const magicInitiateKey = magicInitiateFeatKeyFromActive(input.activeFeatKeys);
    const magicInitiateChoices = magicInitiateKey ? input.featChoicesFor(magicInitiateKey) : undefined;
    const spellcastingAbility =
      resolveFeatSpellcastingAbility(grantEffects[0]!, choices, { magicInitiateChoices }) ?? undefined;

    const pushSpell = (spellKey: string, minSlotLevel?: number) => {
      if (seen.has(spellKey)) return;
      if (minSlotLevel != null && minSlotLevel > 1) {
        const hasSlot = Object.entries(input.spellSlots ?? {}).some(
          ([level, count]) => Number(level) >= minSlotLevel && count > 0,
        );
        if (!hasSlot) return;
      }
      seen.add(spellKey);
      entries.push({
        spellKey,
        locked: true,
        source: "feat",
        featKey,
        spellcastingAbility,
      });
    };

    let cantripOffset = 0;
    let spellOffset = 0;
    for (const grantEffect of grantEffects) {
      for (const grant of grantEffect.fixedSpellGrants ?? []) {
        pushSpell(grant.spellKey, grant.minSlotLevel ?? grantEffect.minSlotLevel);
      }
      for (const fixedKey of grantEffect.fixedSpellKeys ?? []) {
        pushSpell(fixedKey, grantEffect.minSlotLevel);
      }

      const cantripCount = featCantripPickSlotCount(grantEffect);
      for (let index = 0; index < cantripCount; index += 1) {
        const cantripKey = choices.cantripPicks[cantripOffset + index];
        if (cantripKey) pushSpell(cantripKey);
      }
      cantripOffset += cantripCount;

      const spellCount = featSpellPickSlotCount(grantEffect, PROFICIENCY_BONUS);
      for (let index = 0; index < spellCount; index += 1) {
        const spellKey = choices.spellPicks[spellOffset + index];
        if (spellKey) pushSpell(spellKey);
      }
      spellOffset += spellCount;
    }
  }

  return entries;
}

export { featSpellPickOptionsForEffect } from "./featGrantSpells.js";

/** Spell keys granted by feats; used to exclude from class pickers. */
export function featGrantedSpellKeys(input: {
  activeFeatKeys: string[];
  featChoicesFor: (featKey: string) => FeatChoices;
}): Set<string> {
  return new Set(buildFeatGrantedSpells(input).map((entry) => entry.spellKey));
}

export function allClassCantripKeys(): string[] {
  const keys = new Set<string>();
  for (const list of Object.values(CLASS_SPELL_LISTS)) {
    for (const key of list.cantrips) keys.add(key);
  }
  return [...keys].sort();
}

export function allRitualLevel1SpellKeys(): string[] {
  return SPELLS.filter((spell) => spell.level === 1 && spell.ritual)
    .map((spell) => spell.key)
    .sort();
}

export function initialPactOfTheTomeSpellPicks(): ClassFeatureSpellPickSet {
  return {
    cantrips: [null, null, null],
    rituals: [null, null],
  };
}

export function buildAllGrantedSpells(input: {
  speciesCantrips: string[];
  speciesPreparedSpells: { spellName: string; minLevel: number }[];
  classKey: string | null;
  subclassKey?: string | null;
  subclassFeatureChoices?: Record<string, string>;
  classFeatureOptionPicks?: Record<string, (string | null)[]>;
  classFeatureSpellPicks?: Record<string, ClassFeatureSpellPickSet>;
  level: number;
  activeFeatKeys: string[];
  featChoicesFor: (featKey: string) => FeatChoices;
  spellSlots?: Record<number, number>;
}): GrantedSpellEntry[] {
  const classAndSpecies = buildGrantedSpells({
    speciesCantrips: input.speciesCantrips,
    speciesPreparedSpells: input.speciesPreparedSpells,
    classKey: input.classKey,
    subclassKey: input.subclassKey ?? null,
    subclassFeatureChoices: input.subclassFeatureChoices ?? {},
    classFeatureOptionPicks: input.classFeatureOptionPicks ?? {},
    classFeatureSpellPicks: input.classFeatureSpellPicks ?? {},
    level: input.level,
  });
  const featSpells = buildFeatGrantedSpells({
    activeFeatKeys: input.activeFeatKeys,
    featChoicesFor: input.featChoicesFor,
    spellSlots: input.spellSlots,
  });

  const seen = new Set<string>();
  const merged: GrantedSpellEntry[] = [];
  for (const entry of [...classAndSpecies, ...featSpells]) {
    if (seen.has(entry.spellKey)) continue;
    seen.add(entry.spellKey);
    merged.push(entry);
  }
  return merged;
}

export function buildCharacterSpellEntries(input: {
  cantripPicks: string[];
  spellPicks: string[];
  granted: GrantedSpellEntry[];
  spellbookKnownKeys?: string[];
  alwaysPreparedPicks?: string[];
}): CharacterSpellEntry[] {
  const entries: CharacterSpellEntry[] = [];
  const seen = new Set<string>();

  for (const granted of input.granted) {
    if (seen.has(granted.spellKey)) continue;
    seen.add(granted.spellKey);
    entries.push({
      spellKey: granted.spellKey,
      locked: granted.locked,
      source: granted.source,
      ...(granted.featKey ? { featKey: granted.featKey } : {}),
      ...(granted.spellcastingAbility ? { spellcastingAbility: granted.spellcastingAbility } : {}),
      ...(granted.combatActionTiming ? { combatActionTiming: granted.combatActionTiming } : {}),
      ...(granted.classFeatureSpellPick ? { classFeatureSpellPick: granted.classFeatureSpellPick } : {}),
    });
  }

  for (const spellKey of input.alwaysPreparedPicks ?? []) {
    if (seen.has(spellKey)) continue;
    seen.add(spellKey);
    entries.push({ spellKey, locked: false, source: "alwaysPrepared" });
  }

  for (const pick of input.cantripPicks) {
    const replaceIndex = entries.findIndex(
      (entry) => entry.spellKey === pick && entry.source === "alwaysPrepared",
    );
    if (replaceIndex >= 0) {
      entries[replaceIndex] = { spellKey: pick, locked: false, source: "pick", pickKind: "cantrip" };
      continue;
    }
    if (seen.has(pick)) continue;
    seen.add(pick);
    entries.push({ spellKey: pick, locked: false, source: "pick", pickKind: "cantrip" });
  }

  for (const pick of input.spellPicks) {
    const replaceIndex = entries.findIndex(
      (entry) => entry.spellKey === pick && entry.source === "alwaysPrepared",
    );
    if (replaceIndex >= 0) {
      entries[replaceIndex] = { spellKey: pick, locked: false, source: "pick", pickKind: "spell" };
      continue;
    }
    if (seen.has(pick)) continue;
    seen.add(pick);
    entries.push({ spellKey: pick, locked: false, source: "pick", pickKind: "spell" });
  }

  for (const spellKey of input.spellbookKnownKeys ?? []) {
    if (seen.has(spellKey)) continue;
    seen.add(spellKey);
    entries.push({ spellKey, locked: false, source: "spellbook" });
  }

  return entries.sort((a, b) => {
    const spellA = findByKey(SPELLS, a.spellKey);
    const spellB = findByKey(SPELLS, b.spellKey);
    const levelDiff = (spellA?.level ?? 0) - (spellB?.level ?? 0);
    if (levelDiff !== 0) return levelDiff;
    return (spellA?.name ?? a.spellKey).localeCompare(spellB?.name ?? b.spellKey);
  });
}

export function findSpellByKey(spellKey: string): SpellData | null {
  return findByKey(SPELLS, spellKey);
}

const ROUNDS_PER_MINUTE = 10;
const ROUNDS_PER_HOUR = ROUNDS_PER_MINUTE * 60;
const ROUNDS_PER_DAY = ROUNDS_PER_HOUR * 24;

/** Converts catalog duration text to combat rounds (1 round = 6 seconds). */
export function spellDurationToRounds(duration: string): number | null {
  const normalized = duration.trim().toLowerCase();
  const roundMatch = /^(\d+)\s+rounds?$/.exec(normalized);
  if (roundMatch) return Number(roundMatch[1]);
  const minuteMatch = /^(\d+)\s+minutes?$/.exec(normalized);
  if (minuteMatch) return Number(minuteMatch[1]) * ROUNDS_PER_MINUTE;
  const hourMatch = /^(\d+)\s+hours?$/.exec(normalized);
  if (hourMatch) return Number(hourMatch[1]) * ROUNDS_PER_HOUR;
  const dayMatch = /^(\d+)\s+days?$/.exec(normalized);
  if (dayMatch) return Number(dayMatch[1]) * ROUNDS_PER_DAY;
  return null;
}

export function concentrationSpellMaxRounds(spellKey: string): number | null {
  const spell = findSpellByKey(spellKey);
  if (!spell) return null;
  return spellDurationToRounds(spell.duration);
}

export function subclassSpellbookPickOptions(
  classKey: string | null,
  school: string,
  maxSpellLevel: number,
  level: number,
): string[] {
  const listKeys = spellbookListKeys(findByKey(CLASSES, classKey), level);
  const normalizedSchool = school.trim().toLowerCase();
  return listKeys.filter((key) => {
    const spell = findSpellByKey(key);
    if (!spell || spell.level < 1 || spell.level > maxSpellLevel) return false;
    return spell.school.trim().toLowerCase() === normalizedSchool;
  });
}
