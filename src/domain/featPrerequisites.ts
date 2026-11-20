import { FEATS, findByKey } from "../data";
import type { ArmorCategory, ClassData, WeaponProficiencyGrant } from "../data/types";
import type { Character } from "../state/characterState";
import { abilityScoresAfterIncreases } from "./abilityScoreIncreases";
import { effectiveWeaponProficiencyGrants } from "./classFeatures/featureChoices";
import { hasFightingStyleFeature } from "./classFeatures";
import { collectFeatContributions, findFeatDefinition, type FeatPrerequisite } from "./featEffects";
import { activeFeatKeysFromSlots, activeFeatSlots, featChoicesResolverForCharacter } from "./featSlots";
import { buildTrainingSummary } from "./training";

export interface FeatPrerequisiteResult {
  met: boolean;
  unmet: FeatPrerequisite[];
}

function characterActiveFeatKeys(character: Character): string[] {
  return activeFeatKeysFromSlots(activeFeatSlots(character));
}

function featWeaponProficiencyGrants(character: Character): WeaponProficiencyGrant[] {
  const grants: WeaponProficiencyGrant[] = [];
  for (const featKey of characterActiveFeatKeys(character)) {
    const definition = findFeatDefinition(featKey);
    if (!definition) continue;
    for (const effect of definition.effects) {
      if (effect.type === "grant_weapon_proficiency") {
        grants.push({ kind: effect.proficiency });
      }
    }
  }
  return grants;
}

function hasArmorCategoryTraining(
  character: Character,
  classData: ClassData | null,
  category: ArmorCategory,
): boolean {
  const contributions = collectFeatContributions(
    characterActiveFeatKeys(character),
    featChoicesResolverForCharacter(character),
    character.abilityScores,
    [],
  );
  const summary = buildTrainingSummary({
    classData,
    level: character.level,
    classFeatureChoices: character.classFeatureChoices,
    subclassKey: character.subclassKey,
    featContributions: contributions,
  });
  return summary.armorCategories.includes(category);
}

function hasMartialWeaponProficiency(character: Character, classData: ClassData | null): boolean {
  const grants = [
    ...effectiveWeaponProficiencyGrants(
      classData,
      character.level,
      character.classFeatureChoices,
      character.subclassKey,
    ),
    ...featWeaponProficiencyGrants(character),
  ];
  return grants.some((grant) => grant.kind === "martial");
}

function evaluatePrerequisite(
  prerequisite: FeatPrerequisite,
  character: Character,
  classData: ClassData | null,
): boolean {
  switch (prerequisite.type) {
    case "level":
      return character.level >= prerequisite.min;
    case "fighting_style_feature":
      return hasFightingStyleFeature(character.classKey, character.level);
    case "spellcasting_feature":
      return (
        classData != null &&
        classData.casterType !== "NONE" &&
        classData.spellcastingGainedAtLevel != null &&
        classData.spellcastingGainedAtLevel <= character.level
      );
    case "ability": {
      const scores = abilityScoresAfterIncreases(character.abilityScores, character.abilityScoreIncreases);
      return prerequisite.abilities.some((ability) => scores[ability] >= prerequisite.min);
    }
    case "feat":
      return prerequisite.featKeys.some((key) => characterActiveFeatKeys(character).includes(key));
    case "feat_category":
      return characterActiveFeatKeys(character).some((featKey) => {
        const feat = findByKey(FEATS, featKey);
        return feat?.category === prerequisite.category;
      });
    case "martial_weapon_proficiency":
      return hasMartialWeaponProficiency(character, classData);
    case "armor_category_training":
      return hasArmorCategoryTraining(character, classData, prerequisite.category);
  }
}

export function evaluateFeatPrerequisites(
  featKey: string | null,
  character: Character,
  classData: ClassData | null,
): FeatPrerequisiteResult {
  if (!featKey) return { met: true, unmet: [] };

  const definition = findFeatDefinition(featKey);
  if (!definition || definition.prerequisites.length === 0) return { met: true, unmet: [] };

  const unmet = definition.prerequisites.filter(
    (prerequisite) => !evaluatePrerequisite(prerequisite, character, classData),
  );

  return { met: unmet.length === 0, unmet };
}
