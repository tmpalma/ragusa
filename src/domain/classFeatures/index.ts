export type { ClassFeatureEffect, LimitedUsesFormula } from "../../data/types";

export {
  armorCategoriesFromClassFeatureChoices,
  classFeatureChoiceGrantsAtLevel,
  classFeatureChoiceKeys,
  classFeatureChoiceOptions,
  classFeatureChoicesAfterParentChange,
  effectiveWeaponProficiencyGrants,
  extraCantripSlotsFromClassFeatureChoices,
  isValidClassFeatureChoice,
  selectedClassFeatureOption,
  skillBonusesFromClassFeatureChoices,
  weaponProficienciesFromClassFeatureChoices,
  type ClassFeatureChoiceGrant,
} from "./featureChoices";

export {
  activeClassFeatures,
  activeLimitedUseFeatures,
  activeMulticlassClassFeatures,
  buildClassFeatureUseTrackers,
  buildClassFeaturePoolTrackers,
  CLASS_EMBEDDED_USE_TRACKER_KEYS,
  buildMulticlassClassFeatureUseTrackers,
  buildMulticlassClassFeaturePoolTrackers,
  collectClassFeatureContributions,
  collectMulticlassClassFeatureContributions,
  collectArmorClassFormulaOptions,
  needsArmorClassFormulaPick,
  resolveArmorClassFormulaSelection,
  extraAttackCountsFromClassLevels,
  resolveMulticlassExtraAttackCount,
  weaponMasteryCountIncreasesAtLevel,
  EMPTY_CLASS_FEATURE_CONTRIBUTIONS,
  applyDarkvisionGrantOrIncrease,
  mergeDarkvisionFeet,
  classFeatureCatalogEntityKey,
  hasFightingStyleFeature,
  classFeaturesAtLevel,
  hasExpertiseGrantedAtLevel,
  resolveHitPointPoolMax,
  resolveLimitedUses,
  bardicInspirationDieSides,
  type ArmorClassFormulaOption,
  type ClassFeatureContributions,
  type ClassFeaturePoolTracker,
  type ClassFeatureUseTracker,
  type CollectMulticlassClassFeatureContributionsInput,
  type HitPointPoolContribution,
  type HitPointPoolFormula,
  type ResolveLimitedUsesContext,
} from "./contributions";

export {
  availableFontOfMagicSlotCosts,
  effectiveSpellSlotCount,
  effectiveSpellSlotsByLevel,
  fontOfMagicSlotCost,
  FONT_OF_MAGIC_FEATURE_KEY,
  FONT_OF_MAGIC_SLOT_COSTS,
  type FontOfMagicSlotCost,
} from "./fontOfMagic";

export {
  buildInvocationActionCards,
} from "./invocations";

export {
  classFeatureOptionPickCount,
  classFeatureOptionPickGrantsForSurface,
  classFeatureOptionPickOptions,
  classFeatureOptionPicksForLevel,
  clearInvocationCantripChoicesAtIndex,
  ELDRITCH_INVOCATIONS_CHOICE_KEY,
  initialClassFeatureOptionPicks,
  invocationCantripChoiceKey,
  invocationOptionsForLevel,
  isValidClassFeatureOptionPick,
  isValidInvocationCantripChoice,
  parseInvocationCantripChoiceKey,
  PACT_OF_THE_TOME_KEY,
  PACT_OF_THE_TOME_SPELL_PICKS_KEY,
  resolveClassFeatureOptionPickCount,
  selectedClassFeatureOptionPicks,
  spellNamesFromClassFeatureOptionPicks,
  type ClassFeatureOptionPickGrant,
} from "./optionPicks";

export {
  classFeatureSkillGrants,
  classFeatureSkillGrantsAtLevel,
  initialClassFeatureSkillPicks,
  type ClassFeatureSkillGrant,
} from "./skillGrants";

export {
  fightingStyleFeatOptionsForClass,
  fightingStyleGrantedAtLevel,
  isFightingStyleFeatAllowedForClass,
} from "./fightingStyle";

export {
  applyWeaponMasteryPick,
  availableFeatWeaponMasteryOptions,
  availableMasteryWeaponOptions,
  buildMasteryRiderCards,
  buildWeaponMasteryEmptyPrompt,
  anyClassHasWeaponMasteryFeature,
  classHasWeaponProficiency,
  compactWeaponMasteryPicks,
  firstEmptyWeaponMasterySlot,
  flattenWeaponMasteryPicks,
  isProficientWithWeapon,
  isValidFeatWeaponMasteryPick,
  eligibleMasteryWeapons,
  retainValidWeaponMasteryPicks,
  syncWeaponMasteryPicksByClass,
  uniqueMasteriesFromPicks,
  weaponEligibleForMastery,
  weaponMasteryPicksForClass,
  weaponMasterySlotForKey,
  type MasteryRiderCard,
  type WeaponMasteryEmptyPrompt,
} from "./weaponMastery";

export {
  battleMasterManeuverSaveDc,
  buildClassFeatureActionCards,
  buildClassFeatureCards,
  classFeatureMetaForSheet,
  darkOnesBlessingTempHp,
  type BuildClassFeatureCardsInput,
  type ClassFeatureCard,
} from "./cards";
