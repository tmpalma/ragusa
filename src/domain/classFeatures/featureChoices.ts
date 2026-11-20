import type {
  AbilityId,
  ArmorCategory,
  ClassData,
  ClassFeatureData,
  ClassFeatureEffect,
  FeatureOptionData,
  SkillId,
  WeaponProficiencyGrant,
} from "../../data/types";
import { activeSubclassFeatures, findSubclass } from "../subclasses";

export interface ClassFeatureChoiceGrant {
  choiceKey: string;
  featureKey: string;
  featureName: string;
  grantedAtLevel: number;
}

function activeClassFeaturesUpToLevel(classData: ClassData, level: number): ClassFeatureData[] {
  return classData.features.filter((feature) => feature.grantedAtLevel <= level);
}

function choiceEffectsFromFeatures(features: ClassFeatureData[]): Extract<ClassFeatureEffect, { type: "choose_feature_option" }>[] {
  const effects: Extract<ClassFeatureEffect, { type: "choose_feature_option" }>[] = [];
  for (const feature of features) {
    for (const effect of feature.effects) {
      if (effect.type === "choose_feature_option") {
        effects.push(effect);
      }
    }
  }
  return effects;
}

export function classFeatureChoiceGrantsAtLevel(classData: ClassData | null, level: number): ClassFeatureChoiceGrant[] {
  if (!classData) return [];
  const grants: ClassFeatureChoiceGrant[] = [];
  for (const feature of classData.features) {
    if (feature.grantedAtLevel !== level) continue;
    for (const effect of feature.effects) {
      if (effect.type !== "choose_feature_option") continue;
      if ((effect.count ?? 1) > 1) continue;
      if (effect.uiSurface === "spells" || effect.uiSurface === "combat") continue;
      grants.push({
        choiceKey: effect.choiceKey,
        featureKey: feature.key,
        featureName: feature.name,
        grantedAtLevel: feature.grantedAtLevel,
      });
    }
  }
  return grants;
}

export function classFeatureChoiceKeys(classData: ClassData | null, level: number): string[] {
  return classFeatureChoiceGrantsAtLevel(classData, level).map((grant) => grant.choiceKey);
}

export function classFeatureChoiceOptions(
  classData: ClassData | null,
  choiceKey: string,
): FeatureOptionData[] {
  if (!classData) return [];
  for (const feature of classData.features) {
    for (const effect of feature.effects) {
      if (effect.type === "choose_feature_option" && effect.choiceKey === choiceKey) {
        return effect.options;
      }
    }
  }
  return [];
}

export function selectedClassFeatureOption(
  classData: ClassData | null,
  choiceKey: string,
  classFeatureChoices: Record<string, string>,
): FeatureOptionData | null {
  const selectedKey = classFeatureChoices[choiceKey];
  if (!selectedKey) return null;
  return classFeatureChoiceOptions(classData, choiceKey).find((option) => option.key === selectedKey) ?? null;
}

function selectedOptions(
  classData: ClassData | null,
  level: number,
  classFeatureChoices: Record<string, string>,
): FeatureOptionData[] {
  if (!classData) return [];
  const options: FeatureOptionData[] = [];
  for (const effect of choiceEffectsFromFeatures(activeClassFeaturesUpToLevel(classData, level))) {
    const selected = selectedClassFeatureOption(classData, effect.choiceKey, classFeatureChoices);
    if (selected) options.push(selected);
  }
  return options;
}

export function extraCantripSlotsFromClassFeatureChoices(
  classData: ClassData | null,
  level: number,
  classFeatureChoices: Record<string, string> = {},
): number {
  return selectedOptions(classData, level, classFeatureChoices).reduce(
    (total, option) => total + (option.extraCantripCount ?? 0),
    0,
  );
}

export function effectiveWeaponProficiencyGrants(
  classData: ClassData | null,
  level: number,
  classFeatureChoices: Record<string, string> = {},
  subclassKey: string | null = null,
): WeaponProficiencyGrant[] {
  if (!classData) return [];
  const subclass = findSubclass(classData.key, subclassKey);
  const subclassGrants: WeaponProficiencyGrant[] = [];
  if (subclass) {
    for (const feature of activeSubclassFeatures(subclass, level)) {
      for (const effect of feature.effects) {
        if (effect.type === "grant_weapon_proficiencies") {
          subclassGrants.push(...effect.grants);
        }
      }
    }
  }
  return [
    ...classData.weaponProficiencies,
    ...weaponProficienciesFromClassFeatureChoices(classData, level, classFeatureChoices),
    ...subclassGrants,
  ];
}

export function weaponProficienciesFromClassFeatureChoices(
  classData: ClassData | null,
  level: number,
  classFeatureChoices: Record<string, string> = {},
): WeaponProficiencyGrant[] {
  return selectedOptions(classData, level, classFeatureChoices).flatMap((option) => option.weaponProficiencies ?? []);
}

export function armorCategoriesFromClassFeatureChoices(
  classData: ClassData | null,
  level: number,
  classFeatureChoices: Record<string, string> = {},
): ArmorCategory[] {
  const categories = new Set<ArmorCategory>();
  for (const option of selectedOptions(classData, level, classFeatureChoices)) {
    for (const category of option.armorCategories ?? []) {
      categories.add(category);
    }
  }
  return [...categories];
}

function skillCheckBonusTargets(
  bonusSpec: NonNullable<FeatureOptionData["skillCheckBonus"]>,
  classFeatureChoices: Record<string, string>,
): SkillId[] {
  if (!bonusSpec.choiceKey) return bonusSpec.skills;
  const picked = classFeatureChoices[bonusSpec.choiceKey];
  return picked && bonusSpec.skills.includes(picked as SkillId) ? [picked as SkillId] : [];
}

export function isValidClassFeatureChoice(
  classData: ClassData | null,
  classFeatureChoices: Record<string, string>,
  choiceKey: string,
  optionKey: string | null,
): boolean {
  if (!classData) return false;
  if (optionKey == null) return true;

  for (const feature of classData.features) {
    for (const effect of feature.effects) {
      if (effect.type !== "choose_feature_option") continue;
      for (const option of effect.options) {
        const skillChoiceKey = option.skillCheckBonus?.choiceKey;
        if (skillChoiceKey !== choiceKey) continue;
        if (classFeatureChoices[effect.choiceKey] !== option.key) return false;
        return option.skillCheckBonus!.skills.includes(optionKey as SkillId);
      }
    }
  }

  const options = classFeatureChoiceOptions(classData, choiceKey);
  if (options.length === 0) return false;
  return options.some((option) => option.key === optionKey);
}

export function classFeatureChoicesAfterParentChange(
  classData: ClassData,
  parentChoiceKey: string,
  newParentOptionKey: string | null,
  classFeatureChoices: Record<string, string>,
): Record<string, string> {
  const next = { ...classFeatureChoices };
  const options = classFeatureChoiceOptions(classData, parentChoiceKey);
  const selectedOption = newParentOptionKey ? options.find((option) => option.key === newParentOptionKey) : null;

  for (const option of options) {
    const skillChoiceKey = option.skillCheckBonus?.choiceKey;
    if (!skillChoiceKey) continue;
    if (selectedOption?.skillCheckBonus?.choiceKey !== skillChoiceKey) {
      delete next[skillChoiceKey];
      continue;
    }
    const picked = next[skillChoiceKey];
    if (picked && !option.skillCheckBonus!.skills.includes(picked as SkillId)) {
      delete next[skillChoiceKey];
    }
  }

  return next;
}

export function skillBonusesFromClassFeatureChoices(
  classData: ClassData | null,
  level: number,
  classFeatureChoices: Record<string, string>,
  abilityModifiers: Record<AbilityId, number>,
): Partial<Record<SkillId, number>> {
  const bonuses: Partial<Record<SkillId, number>> = {};
  for (const option of selectedOptions(classData, level, classFeatureChoices)) {
    const bonusSpec = option.skillCheckBonus;
    if (!bonusSpec) continue;
    const amount = Math.max(bonusSpec.minimum ?? Number.NEGATIVE_INFINITY, abilityModifiers[bonusSpec.ability] ?? 0);
    for (const skill of skillCheckBonusTargets(bonusSpec, classFeatureChoices)) {
      bonuses[skill] = (bonuses[skill] ?? 0) + amount;
    }
  }
  return bonuses;
}
