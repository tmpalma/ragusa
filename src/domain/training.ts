import type {
  AbilityId,
  ArmorCategory,
  ClassData,
  SkillId,
  ToolProficiencyGrant,
  WeaponProficiencyGrant,
} from "../data/types";
import {
  armorCategoriesFromClassFeatureChoices,
  effectiveWeaponProficiencyGrants,
  weaponProficienciesFromClassFeatureChoices,
} from "./classFeatures";
import { resolvedClassLevels } from "./classLevels";
import type { FeatContributions } from "./featEffects";
import { activeSubclassFeatures, findSubclass } from "./subclasses";
import type { TableRules } from "./tableRules";

const ARMOR_ORDER: ArmorCategory[] = ["light", "medium", "heavy"];

export interface TrainingSummary {
  armorCategories: ArmorCategory[];
  shieldProficiency: boolean;
  weaponKinds: ("simple" | "martial")[];
  /** Worn pieces that grant training with that armor (e.g. Elven Chain). */
  grantedArmorPieceLabels: string[];
}

export interface MulticlassTrainingInput {
  rules: TableRules;
  levelPath: string[];
  resolveClass: (classKey: string) => ClassData | null | undefined;
  classFeatureChoicesByClass?: Record<string, Record<string, string>>;
  subclassByClass?: Record<string, string | null>;
  /** Used for the first class when per-class maps omit a key (legacy single-class saves). */
  legacyClassFeatureChoices?: Record<string, string>;
  legacySubclassKey?: string | null;
}

export interface ClassSkillChoiceGrant {
  classKey: string;
  count: number;
  options: SkillId[];
}

function usesStartingClassTraining(isInitialClass: boolean, rules: TableRules): boolean {
  return isInitialClass || rules.grantFullStartingProficienciesOnNewClass;
}

function classFeatureChoicesForClass(
  classKey: string,
  input: MulticlassTrainingInput,
): Record<string, string> {
  const perClass = input.classFeatureChoicesByClass?.[classKey];
  if (perClass) return perClass;
  if (classKey === input.levelPath[0]) {
    return input.legacyClassFeatureChoices ?? {};
  }
  return {};
}

function subclassKeyForClass(classKey: string, input: MulticlassTrainingInput): string | null {
  const perClass = input.subclassByClass?.[classKey];
  if (perClass !== undefined) return perClass;
  if (classKey === input.levelPath[0]) {
    return input.legacySubclassKey ?? null;
  }
  return null;
}

function baseClassArmorCategories(
  classData: ClassData,
  isInitialClass: boolean,
  rules: TableRules,
): ArmorCategory[] {
  if (usesStartingClassTraining(isInitialClass, rules)) {
    return classData.armorCategories ?? [];
  }
  return classData.multiclassProficiencies.armorCategories;
}

function baseClassShieldProficiency(
  classData: ClassData,
  isInitialClass: boolean,
  rules: TableRules,
): boolean {
  if (usesStartingClassTraining(isInitialClass, rules)) {
    return classData.shieldProficiency;
  }
  return classData.multiclassProficiencies.shieldProficiency;
}

function baseClassWeaponProficiencies(
  classData: ClassData,
  isInitialClass: boolean,
  rules: TableRules,
): WeaponProficiencyGrant[] {
  if (usesStartingClassTraining(isInitialClass, rules)) {
    return classData.weaponProficiencies;
  }
  return classData.multiclassProficiencies.weaponProficiencies;
}

function subclassWeaponProficiencyGrants(
  classData: ClassData,
  classLevel: number,
  subclassKey: string | null,
): WeaponProficiencyGrant[] {
  const subclass = findSubclass(classData.key, subclassKey);
  if (!subclass) return [];
  const grants: WeaponProficiencyGrant[] = [];
  for (const feature of activeSubclassFeatures(subclass, classLevel)) {
    for (const effect of feature.effects) {
      if (effect.type === "grant_weapon_proficiencies") {
        grants.push(...effect.grants);
      }
    }
  }
  return grants;
}

function weaponKindsFromGrants(grants: WeaponProficiencyGrant[]): ("simple" | "martial")[] {
  const weaponKinds = new Set<"simple" | "martial">();
  for (const grant of grants) {
    if (grant.kind === "simple") weaponKinds.add("simple");
    if (grant.kind === "martial" || grant.kind === "martialWithAnyProperty") {
      weaponKinds.add("martial");
    }
  }
  return (["simple", "martial"] as const).filter((kind) => weaponKinds.has(kind));
}

/** Saving throw proficiencies from class levels (first class only under RAW). */
export function mergedClassSaveProficiencies(
  rules: TableRules,
  levelPath: string[],
  resolveClass: (classKey: string) => ClassData | null | undefined,
): AbilityId[] {
  const saves = new Set<AbilityId>();
  const resolved = resolvedClassLevels(levelPath);

  for (let index = 0; index < resolved.length; index++) {
    const { classKey } = resolved[index];
    const classData = resolveClass(classKey);
    if (!classData) continue;

    const isInitialClass = index === 0;
    if (isInitialClass || rules.grantStartingSavesOnNewClass) {
      for (const save of classData.savingThrows) {
        saves.add(save);
      }
    }
  }

  return [...saves];
}

/** Skill pick grants per class (starting training vs multiclass table). */
export function mergedClassSkillChoiceGrants(
  rules: TableRules,
  levelPath: string[],
  resolveClass: (classKey: string) => ClassData | null | undefined,
): ClassSkillChoiceGrant[] {
  const grants: ClassSkillChoiceGrant[] = [];
  const resolved = resolvedClassLevels(levelPath);

  for (let index = 0; index < resolved.length; index++) {
    const { classKey } = resolved[index];
    const classData = resolveClass(classKey);
    if (!classData) continue;

    const isInitialClass = index === 0;
    const skillChoice = usesStartingClassTraining(isInitialClass, rules)
      ? classData.skillChoice
      : classData.multiclassProficiencies.skillChoice;
    if (skillChoice) {
      grants.push({ classKey, count: skillChoice.count, options: skillChoice.options });
    }
  }

  return grants;
}

/** Multiclass skill pick grant for a non-primary class in the path, if any. */
export function multiclassSkillChoiceGrantForClass(
  rules: TableRules,
  levelPath: string[],
  classKey: string,
  resolveClass: (classKey: string) => ClassData | null | undefined,
): ClassSkillChoiceGrant | null {
  const primaryClassKey = levelPath[0];
  if (!primaryClassKey || classKey === primaryClassKey) return null;
  return mergedClassSkillChoiceGrants(rules, levelPath, resolveClass).find((grant) => grant.classKey === classKey) ?? null;
}

/** Tool proficiency grants per class (starting training vs multiclass table). */
export function mergedClassToolProficiencyGrants(
  rules: TableRules,
  levelPath: string[],
  resolveClass: (classKey: string) => ClassData | null | undefined,
): { classKey: string; grants: ToolProficiencyGrant[] }[] {
  const grants: { classKey: string; grants: ToolProficiencyGrant[] }[] = [];
  const resolved = resolvedClassLevels(levelPath);

  for (let index = 0; index < resolved.length; index++) {
    const { classKey } = resolved[index];
    const classData = resolveClass(classKey);
    if (!classData) continue;

    const isInitialClass = index === 0;
    const toolGrants = usesStartingClassTraining(isInitialClass, rules)
      ? classData.toolProficiencies
      : classData.multiclassProficiencies.toolProficiencies;
    if (toolGrants.length > 0) {
      grants.push({ classKey, grants: toolGrants });
    }
  }

  return grants;
}

export function mergedWeaponProficiencyGrants(input: MulticlassTrainingInput): WeaponProficiencyGrant[] {
  return mergedClassArmorAndWeapons(input).weaponGrants;
}

function mergedClassArmorAndWeapons(input: MulticlassTrainingInput): {
  armorCategories: ArmorCategory[];
  shieldProficiency: boolean;
  weaponGrants: WeaponProficiencyGrant[];
} {
  const armorSet = new Set<ArmorCategory>();
  let shieldProficiency = false;
  const weaponGrants: WeaponProficiencyGrant[] = [];
  const resolved = resolvedClassLevels(input.levelPath);

  for (let index = 0; index < resolved.length; index++) {
    const { classKey, classLevel } = resolved[index];
    const classData = input.resolveClass(classKey);
    if (!classData) continue;

    const isInitialClass = index === 0;
    const classFeatureChoices = classFeatureChoicesForClass(classKey, input);
    const subclassKey = subclassKeyForClass(classKey, input);

    for (const category of baseClassArmorCategories(classData, isInitialClass, input.rules)) {
      armorSet.add(category);
    }
    if (baseClassShieldProficiency(classData, isInitialClass, input.rules)) {
      shieldProficiency = true;
    }
    for (const category of armorCategoriesFromClassFeatureChoices(
      classData,
      classLevel,
      classFeatureChoices,
    )) {
      armorSet.add(category);
    }

    weaponGrants.push(
      ...baseClassWeaponProficiencies(classData, isInitialClass, input.rules),
      ...weaponProficienciesFromClassFeatureChoices(classData, classLevel, classFeatureChoices),
      ...subclassWeaponProficiencyGrants(classData, classLevel, subclassKey),
    );
  }

  return {
    armorCategories: ARMOR_ORDER.filter((category) => armorSet.has(category)),
    shieldProficiency,
    weaponGrants,
  };
}

export function buildTrainingSummary(input: {
  classData: ClassData | null;
  level: number;
  classFeatureChoices: Record<string, string>;
  subclassKey: string | null;
  featContributions: FeatContributions;
  grantedArmorPieceLabels?: string[];
  multiclass?: MulticlassTrainingInput;
}): TrainingSummary {
  if (input.multiclass) {
    const merged = mergedClassArmorAndWeapons({
      ...input.multiclass,
      legacyClassFeatureChoices:
        input.multiclass.legacyClassFeatureChoices ?? input.classFeatureChoices,
      legacySubclassKey: input.multiclass.legacySubclassKey ?? input.subclassKey,
    });

    const armorSet = new Set(merged.armorCategories);
    let shieldProficiency = merged.shieldProficiency;
    const weaponGrants = [...merged.weaponGrants];

    for (const category of input.featContributions.armorCategoryGrants) {
      armorSet.add(category);
    }
    if (input.featContributions.shieldProficiencyGrant) {
      shieldProficiency = true;
    }
    for (const proficiency of input.featContributions.weaponProficiencyGrants) {
      weaponGrants.push({ kind: proficiency });
    }

    return {
      armorCategories: ARMOR_ORDER.filter((category) => armorSet.has(category)),
      shieldProficiency,
      weaponKinds: weaponKindsFromGrants(weaponGrants),
      grantedArmorPieceLabels: input.grantedArmorPieceLabels ?? [],
    };
  }

  const armorSet = new Set<ArmorCategory>();
  let shieldProficiency = false;

  if (input.classData) {
    for (const category of input.classData.armorCategories ?? []) {
      armorSet.add(category);
    }
    if (input.classData.shieldProficiency) {
      shieldProficiency = true;
    }
    for (const category of armorCategoriesFromClassFeatureChoices(
      input.classData,
      input.level,
      input.classFeatureChoices,
    )) {
      armorSet.add(category);
    }
  }

  for (const category of input.featContributions.armorCategoryGrants) {
    armorSet.add(category);
  }
  if (input.featContributions.shieldProficiencyGrant) {
    shieldProficiency = true;
  }

  const weaponGrants = input.classData
    ? effectiveWeaponProficiencyGrants(
        input.classData,
        input.level,
        input.classFeatureChoices,
        input.subclassKey,
      )
    : [];
  for (const proficiency of input.featContributions.weaponProficiencyGrants) {
    weaponGrants.push({ kind: proficiency });
  }

  return {
    armorCategories: ARMOR_ORDER.filter((category) => armorSet.has(category)),
    shieldProficiency,
    weaponKinds: weaponKindsFromGrants(weaponGrants),
    grantedArmorPieceLabels: input.grantedArmorPieceLabels ?? [],
  };
}

export type TrainingLabelFn = (key: string) => string;

export function formatTrainingArmorLine(summary: TrainingSummary, label: TrainingLabelFn): string {
  const parts = [
    ...summary.armorCategories.map((category) => label(`sheet.training.armor.${category}`)),
    ...(summary.shieldProficiency ? [label("sheet.training.shields")] : []),
    ...summary.grantedArmorPieceLabels,
  ];
  return parts.length > 0 ? parts.join(" · ") : label("rules.emDash");
}

export function formatTrainingWeaponsLine(summary: TrainingSummary, label: TrainingLabelFn): string {
  const parts = summary.weaponKinds.map((kind) => label(`sheet.training.weapons.${kind}`));
  return parts.length > 0 ? parts.join(" · ") : label("rules.emDash");
}

export function formatTrainingWeaponMasteryLine(
  weaponKeys: readonly string[],
  weaponLabel: (weaponKey: string) => string,
): string {
  const parts = weaponKeys.filter(Boolean).map((weaponKey) => weaponLabel(weaponKey));
  return parts.join(" · ");
}
