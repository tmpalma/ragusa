import { CLASSES, WEAPONS, findByKey } from "../../data";
import type { ClassData, WeaponData, WeaponMasteryProperty, WeaponProficiencyGrant } from "../../data/types";
import { resolvedClassLevels } from "../classLevels";
import { mergedWeaponProficiencyGrants, type MulticlassTrainingInput } from "../training";
import { weaponHasProperty } from "../weaponAttack";
import { activeClassFeatures, collectClassFeatureContributions, type ClassFeatureContributions } from "./contributions";

export interface MasteryRiderCard {
  id: string;
  mastery: WeaponMasteryProperty;
  name: string;
  description: string;
}

export interface WeaponMasteryEmptyPrompt {
  count: number;
}

export function uniqueMasteriesFromPicks(picks: readonly string[]): WeaponMasteryProperty[] {
  const seen = new Set<WeaponMasteryProperty>();
  const masteries: WeaponMasteryProperty[] = [];
  for (const pick of picks) {
    if (!pick) continue;
    const weapon = WEAPONS.find((entry) => entry.key === pick);
    if (!weapon?.mastery || seen.has(weapon.mastery)) continue;
    seen.add(weapon.mastery);
    masteries.push(weapon.mastery);
  }
  return masteries;
}

export function buildMasteryRiderCards(
  weaponMasteryPicks: readonly string[],
  masteryLabel: (mastery: WeaponMasteryProperty) => string,
  masteryDescription: (mastery: WeaponMasteryProperty) => string,
): MasteryRiderCard[] {
  return uniqueMasteriesFromPicks(weaponMasteryPicks).map((mastery) => ({
    id: `mastery-rider-${mastery}`,
    mastery,
    name: masteryLabel(mastery),
    description: masteryDescription(mastery),
  }));
}

export function flattenWeaponMasteryPicks(
  levelPath: string[],
  picksByClass: Readonly<Record<string, readonly string[]>>,
): string[] {
  const result: string[] = [];
  for (const { classKey } of resolvedClassLevels(levelPath)) {
    result.push(...(picksByClass[classKey] ?? []));
  }
  return result;
}

export function weaponMasteryPicksForClass(
  picksByClass: Readonly<Record<string, readonly string[]>>,
  classKey: string,
  legacyPrimaryPicks: readonly string[] = [],
): string[] {
  const stored = picksByClass[classKey];
  if (stored) return [...stored];
  return legacyPrimaryPicks.length > 0 ? [...legacyPrimaryPicks] : [];
}

export function anyClassHasWeaponMasteryFeature(
  classLevels: ReturnType<typeof resolvedClassLevels>,
): boolean {
  for (const { classKey, classLevel } of classLevels) {
    const classData = findByKey(CLASSES, classKey);
    if (!classData) continue;
    if (activeClassFeatures(classData, classLevel).some((feature) => feature.key === "weapon-mastery")) {
      return true;
    }
  }
  return false;
}

export interface SyncWeaponMasteryPicksInput {
  levelPath: string[];
  picksByClass: Readonly<Record<string, readonly string[]>>;
  legacyPrimaryPicks: readonly string[];
  trainingInput: MulticlassTrainingInput;
  extraWeaponProficiencies?: WeaponProficiencyGrant[];
}

export function syncWeaponMasteryPicksByClass(input: SyncWeaponMasteryPicksInput): Record<string, string[]> {
  const {
    levelPath,
    picksByClass,
    legacyPrimaryPicks,
    trainingInput,
    extraWeaponProficiencies = [],
  } = input;
  const primaryClassKey = levelPath[0];
  const proficiencyGrants =
    extraWeaponProficiencies.length > 0
      ? extraWeaponProficiencies
      : mergedWeaponProficiencyGrants(trainingInput);
  const next: Record<string, string[]> = {};

  for (const { classKey, classLevel } of resolvedClassLevels(levelPath)) {
    const contributions = collectClassFeatureContributions(classKey, classLevel);
    if (contributions.weaponMasteryCount <= 0) continue;

    const existing =
      classKey === primaryClassKey
        ? weaponMasteryPicksForClass(picksByClass, classKey, legacyPrimaryPicks)
        : [...(picksByClass[classKey] ?? [])];

    const classData = findByKey(CLASSES, classKey);
    next[classKey] = retainValidWeaponMasteryPicks(
      existing,
      contributions.weaponMasteryCount,
      classData,
      contributions.weaponMasteryMeleeOnly,
      proficiencyGrants,
    );
  }

  return next;
}

export function buildWeaponMasteryEmptyPrompt(
  levelPath: string[],
  weaponMasteryPicks: readonly string[],
  contributions: ClassFeatureContributions,
): WeaponMasteryEmptyPrompt | null {
  if (contributions.weaponMasteryCount <= 0) return null;
  if (!anyClassHasWeaponMasteryFeature(resolvedClassLevels(levelPath))) return null;
  if (weaponMasteryPicks.some(Boolean)) return null;
  return { count: contributions.weaponMasteryCount };
}

function weaponMatchesGrant(weapon: WeaponData, grant: WeaponProficiencyGrant): boolean {
  switch (grant.kind) {
    case "simple":
      return weapon.isSimple;
    case "martial":
      return !weapon.isSimple;
    case "martialWithAnyProperty":
      if (weapon.isSimple) return false;
      return grant.properties.some((property) => weaponHasProperty(weapon, property));
  }
}

export function isProficientWithWeapon(weapon: WeaponData, grants: WeaponProficiencyGrant[]): boolean {
  return grants.some((grant) => weaponMatchesGrant(weapon, grant));
}

export function classHasWeaponProficiency(
  classData: ClassData | null,
  weapon: WeaponData,
  extraGrants: WeaponProficiencyGrant[] = [],
): boolean {
  if (!classData && extraGrants.length === 0) return false;
  const grants = [...(classData?.weaponProficiencies ?? []), ...extraGrants];
  return isProficientWithWeapon(weapon, grants);
}

export function weaponEligibleForMastery(
  weapon: WeaponData,
  classData: ClassData | null,
  meleeOnly: boolean,
  extraWeaponProficiencies: WeaponProficiencyGrant[] = [],
): boolean {
  if (!weapon.mastery) return false;
  if (!classHasWeaponProficiency(classData, weapon, extraWeaponProficiencies)) return false;
  if (meleeOnly && !isMeleeWeapon(weapon)) return false;
  return true;
}

function isMeleeWeapon(weapon: WeaponData): boolean {
  return !weaponHasProperty(weapon, "Ammunition");
}

export function eligibleMasteryWeapons(
  classData: ClassData | null,
  meleeOnly: boolean,
  extraWeaponProficiencies: WeaponProficiencyGrant[] = [],
): WeaponData[] {
  return WEAPONS.filter((weapon) => weaponEligibleForMastery(weapon, classData, meleeOnly, extraWeaponProficiencies));
}

export function compactWeaponMasteryPicks(picks: readonly string[]): string[] {
  return picks.filter((pick) => pick !== "");
}

export function firstEmptyWeaponMasterySlot(picks: readonly string[]): number {
  return picks.findIndex((pick) => !pick);
}

export function weaponMasterySlotForKey(picks: readonly string[], weaponKey: string): number {
  return picks.findIndex((pick) => pick === weaponKey);
}

export function applyWeaponMasteryPick(
  picks: readonly string[],
  index: number,
  weaponKey: string | null,
  classData: ClassData | null,
  meleeOnly: boolean,
  maxPicks: number,
  extraWeaponProficiencies: WeaponProficiencyGrant[] = [],
): string[] | null {
  if (!classData || index < 0 || index >= maxPicks) return null;

  const next = [...picks];
  while (next.length < maxPicks) next.push("");

  if (weaponKey === null || weaponKey === "") {
    if (!next[index]) return null;
    next[index] = "";
    return next;
  }

  const weapon = WEAPONS.find((entry) => entry.key === weaponKey);
  if (!weapon || !weaponEligibleForMastery(weapon, classData, meleeOnly, extraWeaponProficiencies)) return null;
  if (next.some((pick, pickIndex) => pickIndex !== index && pick === weaponKey)) return null;
  if (next[index] === weaponKey) return null;

  next[index] = weaponKey;
  return next;
}

export function availableMasteryWeaponOptions(
  picks: readonly string[],
  classData: ClassData | null,
  meleeOnly: boolean,
  slotIndex: number,
  extraWeaponProficiencies: WeaponProficiencyGrant[] = [],
): WeaponData[] {
  const taken = new Set(picks.filter((pick, index) => pick && index !== slotIndex));
  return eligibleMasteryWeapons(classData, meleeOnly, extraWeaponProficiencies).filter(
    (weapon) => !taken.has(weapon.key),
  );
}

export function isValidFeatWeaponMasteryPick(
  weaponKey: string | null,
  classData: ClassData | null,
  extraWeaponProficiencies: WeaponProficiencyGrant[] = [],
): boolean {
  if (weaponKey === null) return true;
  const weapon = WEAPONS.find((entry) => entry.key === weaponKey);
  if (!weapon?.mastery) return false;
  return weaponEligibleForMastery(weapon, classData, false, extraWeaponProficiencies);
}

export function availableFeatWeaponMasteryOptions(
  classData: ClassData | null,
  extraWeaponProficiencies: WeaponProficiencyGrant[] = [],
): WeaponData[] {
  return eligibleMasteryWeapons(classData, false, extraWeaponProficiencies);
}

export function retainValidWeaponMasteryPicks(
  picks: readonly string[],
  count: number,
  classData: ClassData | null,
  meleeOnly: boolean,
  extraWeaponProficiencies: WeaponProficiencyGrant[] = [],
): string[] {
  const next = picks.slice(0, count);
  while (next.length < count) next.push("");
  return next.map((pick) => {
    if (!pick) return "";
    const weapon = WEAPONS.find((entry) => entry.key === pick);
    return weapon && weaponEligibleForMastery(weapon, classData, meleeOnly, extraWeaponProficiencies) ? pick : "";
  });
}
