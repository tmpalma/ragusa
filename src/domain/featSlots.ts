import { CLASSES, findByKey } from "../data";
import type { ClassData, FeatData } from "../data/types";
import type { Character } from "../state/characterState";
import { classFeatGrantLevels, isFeatRepeatable } from "./classGrantedFeats";
import { isHiddenFeatPickerCategory } from "./featCategories";
import { EMPTY_FEAT_CHOICES, featChoicesForKey, type FeatChoices } from "./featEffects";

export type FeatSource =
  | { kind: "origin" }
  | { kind: "fightingStyle" }
  | { kind: "versatile"; index: number }
  | { kind: "classGrant"; level: number };

export interface ActiveFeatSlot {
  featKey: string;
  source: FeatSource;
}

function classDataFor(character: Character): ClassData | null {
  return findByKey(CLASSES, character.classKey);
}

export function activeFeatSlots(character: Character): ActiveFeatSlot[] {
  const slots: ActiveFeatSlot[] = [];
  if (character.featKey) slots.push({ featKey: character.featKey, source: { kind: "origin" } });
  if (character.fightingStyleFeatKey) {
    slots.push({ featKey: character.fightingStyleFeatKey, source: { kind: "fightingStyle" } });
  }
  character.extraFeats.forEach((featKey, index) => {
    if (featKey) slots.push({ featKey, source: { kind: "versatile", index } });
  });
  const classData = classDataFor(character);
  for (const level of classFeatGrantLevels(classData, character.level)) {
    const featKey = character.classGrantedFeats[level];
    if (featKey) slots.push({ featKey, source: { kind: "classGrant", level } });
  }
  return slots;
}

export function featChoicesForSlot(character: Character, source: FeatSource): FeatChoices {
  switch (source.kind) {
    case "origin":
      return character.featChoices;
    case "fightingStyle":
      return character.fightingStyleFeatChoices;
    case "versatile":
      return character.extraFeatChoices[source.index] ?? EMPTY_FEAT_CHOICES;
    case "classGrant":
      return character.classGrantedFeatChoices[source.level] ?? EMPTY_FEAT_CHOICES;
  }
}

export function activeFeatKeysFromSlots(slots: readonly ActiveFeatSlot[]): string[] {
  return slots.map((slot) => slot.featKey);
}

export function takenNonRepeatableFeatKeys(
  character: Character,
  excludeClassGrantLevel?: number,
): Set<string> {
  const keys = new Set<string>();
  if (character.featKey) keys.add(character.featKey);
  if (character.fightingStyleFeatKey) keys.add(character.fightingStyleFeatKey);
  for (const featKey of character.extraFeats) {
    if (featKey) keys.add(featKey);
  }
  for (const [levelText, featKey] of Object.entries(character.classGrantedFeats)) {
    const level = Number(levelText);
    if (featKey && level !== excludeClassGrantLevel) keys.add(featKey);
  }
  return new Set([...keys].filter((key) => !isFeatRepeatable(key)));
}

export function featChoicesResolverForCharacter(
  character: Character,
): (featKey: string, slotIndex?: number) => FeatChoices {
  const slots = activeFeatSlots(character);
  return (featKey, slotIndex) => {
    if (slotIndex != null && slots[slotIndex]?.featKey === featKey) {
      return featChoicesForSlot(character, slots[slotIndex]!.source);
    }
    return featChoicesForKey(
      featKey,
      character.featKey,
      character.featChoices,
      character.extraFeats,
      character.extraFeatChoices,
      character.fightingStyleFeatKey,
      character.fightingStyleFeatChoices,
      character.classGrantedFeats,
      character.classGrantedFeatChoices,
    );
  };
}

export function findActiveFeatSlot(
  character: Character,
  featKey: string,
): { slot: ActiveFeatSlot; slotIndex: number } | null {
  const slots = activeFeatSlots(character);
  const slotIndex = slots.findIndex((slot) => slot.featKey === featKey);
  if (slotIndex < 0) return null;
  return { slot: slots[slotIndex]!, slotIndex };
}

export function featWeaponMasteryPicksFromCharacter(character: Character): string[] {
  const picks: string[] = [];
  for (const slot of activeFeatSlots(character)) {
    const pick = featChoicesForSlot(character, slot.source).weaponMasteryPick;
    if (pick) picks.push(pick);
  }
  return picks;
}

export function classGrantedFeatPickerOptions(
  feats: FeatData[],
  character: Character,
  grantLevel: number,
  meetsPrerequisites: (featKey: string) => boolean,
): FeatData[] {
  const taken = takenNonRepeatableFeatKeys(character, grantLevel);
  return feats.filter((feat) => {
    if (feat.category === "Epic Boon") return false;
    if (isHiddenFeatPickerCategory(feat.category)) return false;
    if (taken.has(feat.key)) return false;
    return meetsPrerequisites(feat.key);
  });
}
