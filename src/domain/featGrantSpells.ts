import { SPELLS } from "../data";
import type { AbilityId } from "../data/types";
import { ABILITIES } from "../data/skills";
import type { FeatChoices } from "./featEffects";
import { PROFICIENCY_BONUS } from "./proficiency";
import { classSpellListFor, allRitualLevel1SpellKeys } from "./spellSelection";

export type GrantSpellsEffect = {
  type: "grant_spells";
  spellList?: "wizard" | "cleric" | "druid" | "sorcerer" | "any";
  cantripCount?: number;
  spellLevel?: number;
  fixedSpellcastingAbility?: AbilityId;
  restRecovery?: "long" | "short";
  fixedSpellKeys?: string[];
  fixedSpellGrants?: { spellKey: string; minSlotLevel?: number }[];
  schools?: string[];
  ritualOnly?: boolean;
  spellPickCount?: number;
  freeCast?: "none" | "firstSpellPick" | "eachGranted";
  inheritAbilityFromAsi?: boolean;
  minSlotLevel?: number;
  /** When set, spell pick count scales with proficiency bonus (Ritual Caster). */
  spellPickCountFromProficiency?: boolean;
  /** Resolve spell list from the character's Magic Initiate feat (Magic Connoisseur). */
  inheritSpellListFromMagicInitiate?: boolean;
  /** Use the Magic Initiate feat's spellcasting ability choice. */
  inheritAbilityFromMagicInitiate?: boolean;
};

export const MAGIC_INITIATE_FEAT_KEYS = [
  "magic-initiate-wizard",
  "magic-initiate-cleric",
  "magic-initiate-druid",
] as const;

export type MagicInitiateFeatKey = (typeof MAGIC_INITIATE_FEAT_KEYS)[number];

export function magicInitiateFeatKeyFromActive(activeFeatKeys: string[]): MagicInitiateFeatKey | null {
  for (const key of MAGIC_INITIATE_FEAT_KEYS) {
    if (activeFeatKeys.includes(key)) return key;
  }
  return null;
}

export function spellListForMagicInitiateFeatKey(
  featKey: string,
): "wizard" | "cleric" | "druid" | null {
  switch (featKey) {
    case "magic-initiate-wizard":
      return "wizard";
    case "magic-initiate-cleric":
      return "cleric";
    case "magic-initiate-druid":
      return "druid";
    default:
      return null;
  }
}

export function featSpellUseStorageKey(featKey: string, spellKey: string): string {
  return `${featKey}:${spellKey}`;
}

export function legacyFeatSpellUseStorageKey(featKey: string): string {
  return featKey;
}

export function readFeatSpellUseCount(
  featSpellUses: Record<string, number>,
  featKey: string,
  spellKey: string,
  maxUses: number,
): number {
  const keyed = featSpellUseStorageKey(featKey, spellKey);
  if (keyed in featSpellUses) return featSpellUses[keyed];
  if (featKey in featSpellUses) return featSpellUses[featKey];
  return maxUses;
}

export function resolveGrantSpellsFreeCast(
  effect: GrantSpellsEffect,
): "none" | "firstSpellPick" | "eachGranted" {
  if (effect.freeCast) return effect.freeCast;
  if ((effect.spellLevel ?? 0) >= 1 && !effect.fixedSpellKeys?.length) {
    return "firstSpellPick";
  }
  return "none";
}

export function resolveFeatSpellcastingAbility(
  effect: GrantSpellsEffect,
  choices: FeatChoices,
  context?: { magicInitiateChoices?: FeatChoices },
): AbilityId | null {
  if (effect.fixedSpellcastingAbility) return effect.fixedSpellcastingAbility;
  if (effect.inheritAbilityFromMagicInitiate && context?.magicInitiateChoices?.spellcastingAbility) {
    return context.magicInitiateChoices.spellcastingAbility;
  }
  if (effect.inheritAbilityFromAsi) {
    const increased = ABILITIES.map(({ id }) => id).find((ability) => (choices.abilityIncreases[ability] ?? 0) > 0);
    if (increased) return increased;
  }
  return choices.spellcastingAbility;
}

export function featSpellPickSlotCount(
  effect: GrantSpellsEffect,
  proficiencyBonus: number,
): number {
  if (effect.spellPickCountFromProficiency) return proficiencyBonus;
  if (effect.spellPickCount != null) return effect.spellPickCount;
  return (effect.spellLevel ?? 0) >= 1 ? 1 : 0;
}

export function featCantripPickSlotCount(effect: GrantSpellsEffect): number {
  return effect.cantripCount ?? 0;
}

function spellsAtLevel(level: number, schools?: string[], ritualOnly?: boolean): string[] {
  const normalizedSchools = schools?.map((school) => school.trim().toLowerCase()) ?? null;
  return SPELLS.filter((spell) => {
    if (spell.level !== level) return false;
    if (ritualOnly && !spell.ritual) return false;
    if (normalizedSchools && !normalizedSchools.includes(spell.school.trim().toLowerCase())) return false;
    return true;
  })
    .map((spell) => spell.key)
    .sort();
}

export function featSpellPickOptionsForEffect(
  effect: GrantSpellsEffect,
  pickLevel: number,
  context?: { activeFeatKeys?: string[] },
): string[] {
  if (effect.ritualOnly && pickLevel === 1) return allRitualLevel1SpellKeys();
  const resolvedSpellList =
    effect.inheritSpellListFromMagicInitiate && context?.activeFeatKeys
      ? spellListForMagicInitiateFeatKey(magicInitiateFeatKeyFromActive(context.activeFeatKeys) ?? "")
      : effect.spellList;
  if (resolvedSpellList && resolvedSpellList !== "any") {
    const list = classSpellListFor(resolvedSpellList);
    if (pickLevel === 0) return list.cantrips;
    if (pickLevel === 1) {
      const keys = list.level1;
      if (!effect.schools?.length) return keys;
      const schools = new Set(effect.schools.map((school) => school.trim().toLowerCase()));
      return keys.filter((key) => {
        const spell = SPELLS.find((entry) => entry.key === key);
        return spell ? schools.has(spell.school.trim().toLowerCase()) : false;
      });
    }
    if (pickLevel === 2) return list.level2 ?? [];
    if (pickLevel === 3) return list.level3 ?? [];
    return [];
  }
  return spellsAtLevel(pickLevel, effect.schools, effect.ritualOnly);
}

export function featGrantedSpellKeysForFreeCast(
  effect: GrantSpellsEffect,
  choices: FeatChoices,
  spellPickOffset = 0,
  proficiencyBonus: number = PROFICIENCY_BONUS,
): string[] {
  const mode = resolveGrantSpellsFreeCast(effect);
  if (mode === "none") return [];

  const keys: string[] = [];
  if (effect.fixedSpellGrants) {
    for (const grant of effect.fixedSpellGrants) keys.push(grant.spellKey);
  }
  if (effect.fixedSpellKeys) keys.push(...effect.fixedSpellKeys);
  const spellSlotCount = featSpellPickSlotCount(effect, proficiencyBonus);
  if (mode === "firstSpellPick") {
    const firstPick = choices.spellPicks
      .slice(spellPickOffset, spellPickOffset + spellSlotCount)
      .find((pick) => pick != null);
    if (firstPick) keys.push(firstPick);
  } else if (mode === "eachGranted") {
    for (let index = 0; index < spellSlotCount; index += 1) {
      const pick = choices.spellPicks[spellPickOffset + index];
      if (pick) keys.push(pick);
    }
  }
  return [...new Set(keys)];
}
