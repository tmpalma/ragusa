import { CLASSES, findByKey } from "../data";
import type { ClassFeatureData, LanguageId } from "../data/types";
import { activeFeatKeysFromCharacter, type Character } from "../state/characterState";
import { findFeatDefinition } from "./featEffects";
import { findSubclass } from "./subclasses";

/** 2024 origin step: Common plus two player-chosen standard languages. */
export const ORIGIN_LANGUAGE_PICK_COUNT = 2;

export interface LanguageGrant {
  languageKey: LanguageId;
  /** catalog.classes entity key suffix, e.g. druid.feature.druidic */
  catalogEntityKey?: string;
  /** catalog.feats feat key */
  featKey?: string;
  /** When true, show the automatic Common label instead of a feature name. */
  automatic?: boolean;
  fallbackLabel: string;
}

function languagesFromFeatureEffects(
  feature: ClassFeatureData,
  classKey: string,
  subclassKey: string | null,
): LanguageGrant[] {
  const grants: LanguageGrant[] = [];
  const catalogEntityKey = subclassKey
    ? `${classKey}.subclass.${subclassKey}.feature.${feature.key}`
    : `${classKey}.feature.${feature.key}`;

  for (const effect of feature.effects) {
    if (effect.type === "grant_languages") {
      for (const languageKey of effect.languages) {
        grants.push({
          languageKey,
          catalogEntityKey,
          fallbackLabel: feature.name,
        });
      }
    }
  }
  return grants;
}

function classLanguageGrants(classKey: string | null, level: number): LanguageGrant[] {
  const classData = findByKey(CLASSES, classKey);
  if (!classData) return [];

  const grants: LanguageGrant[] = [];
  for (const feature of classData.features) {
    if (feature.grantedAtLevel > level) continue;
    grants.push(...languagesFromFeatureEffects(feature, classData.key, null));
  }
  return grants;
}

function subclassLanguageGrants(
  classKey: string | null,
  subclassKey: string | null,
  level: number,
): LanguageGrant[] {
  const subclass = findSubclass(classKey, subclassKey);
  if (!subclass || level < 3) return [];

  const grants: LanguageGrant[] = [];
  for (const feature of subclass.features) {
    if (feature.grantedAtLevel > level) continue;
    grants.push(...languagesFromFeatureEffects(feature, subclass.classKey, subclass.key));
  }
  return grants;
}

function speciesLanguageGrants(_character: Character): LanguageGrant[] {
  // 2024 species traits do not grant languages; origin picks cover standard languages.
  return [];
}

function featLanguageGrants(featKeys: string[]): LanguageGrant[] {
  const grants: LanguageGrant[] = [];
  for (const featKey of featKeys) {
    const definition = findFeatDefinition(featKey);
    if (!definition) continue;
    for (const effect of definition.effects) {
      if (effect.type !== "grant_languages") continue;
      for (const languageKey of effect.languages) {
        grants.push({
          languageKey,
          featKey,
          fallbackLabel: featKey,
        });
      }
    }
  }
  return grants;
}

function mergeLanguageGrants(grants: LanguageGrant[]): LanguageGrant[] {
  const seen = new Set<LanguageId>();
  const merged: LanguageGrant[] = [];
  for (const grant of grants) {
    if (seen.has(grant.languageKey)) continue;
    seen.add(grant.languageKey);
    merged.push(grant);
  }
  return merged;
}

export function automaticLanguageGrants(character: Character): LanguageGrant[] {
  const featKeys = activeFeatKeysFromCharacter(character);
  return mergeLanguageGrants([
    {
      languageKey: "common",
      automatic: true,
      fallbackLabel: "Common",
    },
    ...speciesLanguageGrants(character),
    ...classLanguageGrants(character.classKey, character.level),
    ...subclassLanguageGrants(character.classKey, character.subclassKey, character.level),
    ...featLanguageGrants(featKeys),
  ]);
}

export function grantedLanguageKeys(character: Character): LanguageId[] {
  return automaticLanguageGrants(character).map((grant) => grant.languageKey);
}

function classLanguagePickCount(classKey: string | null, level: number): number {
  const classData = findByKey(CLASSES, classKey);
  if (!classData) return 0;

  let count = 0;
  for (const feature of classData.features) {
    if (feature.grantedAtLevel > level) continue;
    for (const effect of feature.effects) {
      if (effect.type === "grant_language_picks") {
        count += effect.count;
      }
    }
  }
  return count;
}

export function languagePickMaxCount(character: Character): number {
  return ORIGIN_LANGUAGE_PICK_COUNT + classLanguagePickCount(character.classKey, character.level);
}

export function allKnownLanguages(character: Character): LanguageId[] {
  const seen = new Set<LanguageId>();
  const result: LanguageId[] = [];
  for (const languageKey of [...grantedLanguageKeys(character), ...character.languagePicks]) {
    if (seen.has(languageKey)) continue;
    seen.add(languageKey);
    result.push(languageKey);
  }
  return result;
}

export function retainValidLanguagePicks(character: Character): LanguageId[] {
  const granted = new Set(grantedLanguageKeys(character));
  const maxCount = languagePickMaxCount(character);
  return character.languagePicks.filter((key) => !granted.has(key)).slice(0, maxCount);
}
