export {
  isValidSpeciesCantripChoice,
  resolveSpeciesCantripChoice,
  speciesCantripChoiceListClassKey,
  speciesCantripChoiceOptions,
} from "./cantripChoices";

export {
  activeLimitedUseSpeciesFeatures,
  activeSpeciesFeatures,
  activeSpeciesCantripChoiceKeys,
  buildSpeciesFeatureUseTrackers,
  collectSpeciesFeatureContributions,
  EMPTY_SPECIES_FEATURE_CONTRIBUTIONS,
  resolveLimitedUses,
  speciesCantripChoiceDefault,
  SPECIES_EMBEDDED_USE_TRACKER_KEYS,
  type SpeciesFeatureContributions,
  type SpeciesFeatureUseTracker,
} from "./contributions";

export {
  applySpeciesSkillPick,
  availableSpeciesSkillOptions,
  initialSpeciesSkillPicks,
  retainValidSpeciesSkillPicks,
} from "./skillPicks";

export {
  buildSpeciesFeatureActionCards,
  buildSpeciesFeatureCards,
  formatSpeciesFeatureCombatTitle,
  lineageDisplayName,
  speciesFeatureMetaForSheet,
  type BuildSpeciesFeatureCardsInput,
  type SpeciesFeatureCard,
  type SpeciesFeatureEntityTranslate,
  type SpeciesFeatureTitleTranslate,
} from "./cards";

export function speciesSkillPickCount(
  contributions: { skillPickCount: number },
): number {
  return contributions.skillPickCount;
}

export function speciesToolPickCount(
  contributions: { toolPickCount: number },
): number {
  return contributions.toolPickCount;
}

export function humanVersatileFeatCount(speciesKey: string | null, level: number): number {
  return speciesKey === "human" && level >= 1 ? 1 : 0;
}
