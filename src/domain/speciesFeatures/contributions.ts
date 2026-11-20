import type {
  AbilityId,
  SkillId,
  SpeciesData,
  RestRecovery,
  SpeciesFeatureData,
  SpeciesFeatureEffect,
} from "../../data/types";
import { resolveLimitedUses } from "../classFeatures/contributions";
import { resolveSpeciesCantripChoice } from "./cantripChoices";
import { SPELLS, findByKey } from "../../data";

export interface SpeciesFeatureContributions {
  walkSpeedFeet: number | null;
  darkvisionFeet: number;
  damageResistances: string[];
  hpPerLevel: number;
  skillPickCount: number;
  skillPickOptions: SkillId[] | null;
  toolPickCount: number;
  acBonus: number;
  cantrips: string[];
  preparedSpells: { spellName: string; minLevel: number }[];
  carryingSizeIncrease: number;
}

export interface SpeciesFeatureUseTracker {
  id: string;
  speciesKey: string;
  featureKey: string;
  name: string;
  maxUses: number;
  restRecovery: RestRecovery;
}

export interface ResolveLimitedUsesContext {
  level: number;
  abilityModifiers: Record<AbilityId, number>;
}

export const EMPTY_SPECIES_FEATURE_CONTRIBUTIONS: SpeciesFeatureContributions = {
  walkSpeedFeet: null,
  darkvisionFeet: 0,
  damageResistances: [],
  hpPerLevel: 0,
  skillPickCount: 0,
  skillPickOptions: null,
  toolPickCount: 0,
  acBonus: 0,
  cantrips: [],
  preparedSpells: [],
  carryingSizeIncrease: 0,
};

export function activeSpeciesFeatures(
  speciesData: SpeciesData | null,
  lineageKey: string | null,
  level: number,
): SpeciesFeatureData[] {
  if (!speciesData) return [];

  const base = speciesData.features.filter((feature) => feature.grantedAtLevel <= level);

  if (!speciesData.choice || !lineageKey) return base;

  const option = speciesData.choice.options.find((entry) => entry.key === lineageKey);
  if (!option) return base;

  const lineageFeatures = option.features.filter((feature) => feature.grantedAtLevel <= level);
  return [...base, ...lineageFeatures];
}

export function activeLimitedUseSpeciesFeatures(
  speciesData: SpeciesData | null,
  lineageKey: string | null,
  level: number,
): SpeciesFeatureData[] {
  return activeSpeciesFeatures(speciesData, lineageKey, level).filter((feature) => feature.limitedUses != null);
}

function foldSpeciesFeatureEffect(
  contributions: SpeciesFeatureContributions,
  effect: SpeciesFeatureEffect,
  speciesFeatureChoices: Record<string, string>,
): void {
  switch (effect.type) {
    case "walk_speed_set":
      contributions.walkSpeedFeet = effect.feet;
      break;
    case "darkvision":
      contributions.darkvisionFeet = Math.max(contributions.darkvisionFeet, effect.feet);
      break;
    case "damage_resistance":
      if (!contributions.damageResistances.includes(effect.damageType)) {
        contributions.damageResistances.push(effect.damageType);
      }
      break;
    case "hp_per_level":
      contributions.hpPerLevel += effect.amount;
      break;
    case "grant_skill_proficiency":
      contributions.skillPickCount += effect.count;
      if (effect.options) {
        contributions.skillPickOptions = effect.options;
      }
      break;
    case "grant_tool_proficiency":
      contributions.toolPickCount += effect.count;
      break;
    case "ac_bonus":
      contributions.acBonus += effect.amount;
      break;
    case "grant_cantrip":
      if (!contributions.cantrips.includes(effect.spellName)) {
        contributions.cantrips.push(effect.spellName);
      }
      break;
    case "choose_cantrip": {
      const spellKey = resolveSpeciesCantripChoice(
        speciesFeatureChoices,
        effect.choiceKey,
        effect.defaultSpellKey,
      );
      const spellName = findByKey(SPELLS, spellKey)?.name ?? effect.defaultSpellKey;
      if (!contributions.cantrips.includes(spellName)) {
        contributions.cantrips.push(spellName);
      }
      break;
    }
    case "always_prepared_spell":
      contributions.preparedSpells.push({
        spellName: effect.spellName,
        minLevel: effect.minLevel ?? 1,
      });
      break;
    case "carrying_size_increase":
      contributions.carryingSizeIncrease += effect.steps;
      break;
    default:
      break;
  }
}

export function collectSpeciesFeatureContributions(
  speciesData: SpeciesData | null,
  lineageKey: string | null,
  level: number,
  speciesFeatureChoices: Record<string, string> = {},
): SpeciesFeatureContributions {
  const contributions: SpeciesFeatureContributions = {
    ...EMPTY_SPECIES_FEATURE_CONTRIBUTIONS,
    preparedSpells: [],
    cantrips: [],
    damageResistances: [],
    carryingSizeIncrease: 0,
  };

  for (const feature of activeSpeciesFeatures(speciesData, lineageKey, level)) {
    for (const effect of feature.effects) {
      foldSpeciesFeatureEffect(contributions, effect, speciesFeatureChoices);
    }
  }

  return contributions;
}

export function activeSpeciesCantripChoiceKeys(
  speciesData: SpeciesData | null,
  lineageKey: string | null,
  level: number,
): string[] {
  const keys: string[] = [];
  for (const feature of activeSpeciesFeatures(speciesData, lineageKey, level)) {
    for (const effect of feature.effects) {
      if (effect.type === "choose_cantrip") {
        keys.push(effect.choiceKey);
      }
    }
  }
  return keys;
}

export function speciesCantripChoiceDefault(
  speciesData: SpeciesData | null,
  lineageKey: string | null,
  choiceKey: string,
): string | null {
  if (!speciesData?.choice || !lineageKey) return null;
  for (const feature of activeSpeciesFeatures(speciesData, lineageKey, 1)) {
    for (const effect of feature.effects) {
      if (effect.type === "choose_cantrip" && effect.choiceKey === choiceKey) {
        return effect.defaultSpellKey;
      }
    }
  }
  return null;
}

export { resolveLimitedUses } from "../classFeatures/contributions";

/** Limited-use species traits whose counters render on the feature card, not Special Traits. */
export const SPECIES_EMBEDDED_USE_TRACKER_KEYS = new Set(["stonecunning", "relentless-endurance"]);

export function buildSpeciesFeatureUseTrackers(
  speciesData: SpeciesData | null,
  lineageKey: string | null,
  level: number,
  abilityModifiers: Record<AbilityId, number>,
  options?: { excludeEmbeddedOnCard?: boolean },
): SpeciesFeatureUseTracker[] {
  if (!speciesData) return [];

  return activeLimitedUseSpeciesFeatures(speciesData, lineageKey, level)
    .filter(
      (feature) =>
        !options?.excludeEmbeddedOnCard || !SPECIES_EMBEDDED_USE_TRACKER_KEYS.has(feature.key),
    )
    .map((feature) => ({
      id: `species-feature-uses-${speciesData.key}-${feature.key}`,
      speciesKey: speciesData.key,
      featureKey: feature.key,
      name: feature.name,
      maxUses: resolveLimitedUses(feature.limitedUses!, { level, abilityModifiers }),
      restRecovery: feature.restRecovery ?? "long",
    }));
}
