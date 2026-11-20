import { CLASSES, findByKey } from "../../data";
import type {
  AbilityId,
  ClassData,
  ClassFeatureData,
  ClassFeatureEffect,
  LimitedUsesFormula,
  RestRecovery,
  SubclassData,
} from "../../data/types";
import { findSubclass, selectedSubclassOptionCombatCards } from "../subclasses";
import type { ResolvedClassLevel } from "../classLevels";
import { extraAttackCount } from "../multiclassCasterLevel";
import type { TableRules } from "../tableRules";
import { proficiencyBonusForLevel } from "../proficiency";
import {
  ELDRITCH_INVOCATIONS_CHOICE_KEY,
  selectedClassFeatureOptionPicks,
} from "./optionPicks";

export type HitPointPoolFormula = Extract<ClassFeatureEffect, { type: "hit_point_pool" }>["formula"];

export interface HitPointPoolContribution {
  featureKey: string;
  formula: HitPointPoolFormula;
}

export interface ClassFeatureContributions {
  sneakAttackDice: string | null;
  martialArtsDie: string | null;
  weaponMasteryCount: number;
  weaponMasteryMeleeOnly: boolean;
  expertiseCount: number;
  secondWindUses: number | null;
  secondWindHealDice: string | null;
  hasFightingStyleFeature: boolean;
  unarmoredDefenseAbilities: AbilityId[] | null;
  unarmoredDefenseDisallowShield: boolean;
  hpPerClassLevel: number;
  jackOfAllTrades: boolean;
  unarmoredMovementBonusFeet: number;
  savingThrowAbilityBonus: { ability: AbilityId; minimum: number } | null;
  roving: boolean;
  darkvisionFeet: number;
  darkvisionGrantOrIncreaseFeet: number;
  hitPointPools: HitPointPoolContribution[];
}

export interface ClassFeaturePoolTracker {
  id: string;
  classKey: string;
  featureKey: string;
  catalogEntityKey: string;
  name: string;
  maxHp: number;
}

export interface ClassFeatureUseTracker {
  id: string;
  classKey: string;
  featureKey: string;
  catalogEntityKey: string;
  name: string;
  maxUses: number;
  restRecovery: RestRecovery;
}

export interface ArmorClassFormulaOption {
  key: string;
  classKey: string;
  featureKey: string;
  name: string;
  abilities: AbilityId[];
  disallowShield: boolean;
}

export interface CollectMulticlassClassFeatureContributionsInput {
  classLevels: ResolvedClassLevel[];
  subclassByClass?: Record<string, string | null>;
  armorClassFormulaKey?: string | null;
}

export function classFeatureCatalogEntityKey(
  classKey: string,
  featureKey: string,
  subclassData: SubclassData | null,
): string {
  if (subclassData?.features.some((feature) => feature.key === featureKey)) {
    return `${classKey}.subclass.${subclassData.key}.feature.${featureKey}`;
  }
  return `${classKey}.feature.${featureKey}`;
}

export interface ResolveLimitedUsesContext {
  level: number;
  abilityModifiers: Record<AbilityId, number>;
}

export function resolveHitPointPoolMax(
  formula: HitPointPoolFormula,
  context: ResolveLimitedUsesContext,
): number {
  switch (formula.kind) {
    case "twiceLevelPlusAbility": {
      const mod = context.abilityModifiers[formula.ability] ?? 0;
      return Math.max(0, context.level * 2 + mod);
    }
  }
}

/** 2024 Bardic Inspiration die size by bard level (d6 → d8 → d10 → d12). */
export function bardicInspirationDieSides(level: number): number {
  if (level >= 15) return 12;
  if (level >= 10) return 10;
  if (level >= 5) return 8;
  return 6;
}

export function resolveLimitedUses(formula: LimitedUsesFormula, context: ResolveLimitedUsesContext): number {
  switch (formula.kind) {
    case "fixed":
      return formula.uses;
    case "abilityMod": {
      const mod = context.abilityModifiers[formula.ability] ?? 0;
      return Math.max(1, mod + (formula.plus ?? 0));
    }
    case "levelTimes":
      return context.level * formula.multiplier;
    case "proficiencyBonus":
      return proficiencyBonusForLevel(context.level);
    case "byLevel": {
      const entries = Object.entries(formula.usesByLevel)
        .map(([level, uses]) => [Number(level), uses] as const)
        .filter(([level]) => level <= context.level)
        .sort((a, b) => b[0] - a[0]);
      return entries[0]?.[1] ?? 0;
    }
  }
}

export function activeClassFeatures(
  classData: ClassData | null,
  level: number,
  subclassData: SubclassData | null = null,
): ClassFeatureData[] {
  if (!classData) return [];
  const base = classData.features.filter((feature) => feature.grantedAtLevel <= level);
  if (!subclassData) return base;
  const sub = subclassData.features.filter((feature) => feature.grantedAtLevel <= level);
  return [...base, ...sub];
}

export function activeLimitedUseFeatures(
  classData: ClassData | null,
  level: number,
  subclassData: SubclassData | null = null,
): ClassFeatureData[] {
  return activeClassFeatures(classData, level, subclassData).filter((feature) => feature.limitedUses != null);
}

/** Limited-use class features whose counters render on the feature card, not the stat row. */
export const CLASS_EMBEDDED_USE_TRACKER_KEYS = new Set([
  "bardic-inspiration",
  "arcane-recovery",
  "beguiling-magic",
  "monks-focus",
  "uncanny-metabolism",
  "magical-cunning",
  "hunters-prey",
  "star-map",
  "illuminated-cartography",
  "combat-superiority",
  "psionic-power",
  "portent",
  "tides-of-chaos",
  "paladins-smite",
  "steps-of-the-fey",
  "restore-balance",
  "second-wind",
  "action-surge",
  "telekinetic-movement",
  "lay-on-hands",
]);

export function buildClassFeatureUseTrackers(
  classData: ClassData | null,
  level: number,
  abilityModifiers: Record<AbilityId, number>,
  subclassData: SubclassData | null = null,
  surface?: "combat" | "spells",
  subclassFeatureChoices: Record<string, string> = {},
  options?: { excludeEmbeddedOnCard?: boolean },
): ClassFeatureUseTracker[] {
  if (!classData) return [];

  const featureTrackers = activeLimitedUseFeatures(classData, level, subclassData)
    .filter((feature) => surface == null || (feature.trackerSurface ?? "combat") === surface)
    .filter(
      (feature) =>
        !options?.excludeEmbeddedOnCard || !CLASS_EMBEDDED_USE_TRACKER_KEYS.has(feature.key),
    )
    .map((feature) => ({
      id: `class-feature-uses-${classData.key}-${feature.key}`,
      classKey: classData.key,
      featureKey: feature.key,
      catalogEntityKey: classFeatureCatalogEntityKey(classData.key, feature.key, subclassData),
      name: feature.name,
      maxUses: resolveLimitedUses(feature.limitedUses!, { level, abilityModifiers }),
      restRecovery: feature.restRecovery ?? "long",
    }));

  if (surface === "spells") return featureTrackers;

  const optionTrackers = selectedSubclassOptionCombatCards(subclassData, subclassFeatureChoices)
    .filter((card) => card.limitedUses != null)
    .map((card) => ({
      id: `class-feature-uses-${classData.key}-${card.key}`,
      classKey: classData.key,
      featureKey: card.key,
      catalogEntityKey: `${classData.key}.subclass.${subclassData?.key}.feature.${card.key}`,
      name: card.name,
      maxUses: resolveLimitedUses(card.limitedUses!, { level, abilityModifiers }),
      restRecovery: "long" as RestRecovery,
    }));

  return [...featureTrackers, ...optionTrackers];
}

export function buildClassFeaturePoolTrackers(
  classData: ClassData | null,
  level: number,
  abilityModifiers: Record<AbilityId, number>,
  subclassData: SubclassData | null = null,
): ClassFeaturePoolTracker[] {
  if (!classData) return [];

  const context: ResolveLimitedUsesContext = { level, abilityModifiers };
  const trackers: ClassFeaturePoolTracker[] = [];

  for (const feature of activeClassFeatures(classData, level, subclassData)) {
    for (const effect of feature.effects) {
      if (effect.type !== "hit_point_pool") continue;
      trackers.push({
        id: `class-feature-pool-${classData.key}-${feature.key}`,
        classKey: classData.key,
        featureKey: feature.key,
        catalogEntityKey: classFeatureCatalogEntityKey(classData.key, feature.key, subclassData),
        name: feature.name,
        maxHp: resolveHitPointPoolMax(effect.formula, context),
      });
    }
  }

  return trackers;
}

export function weaponMasteryCountIncreasesAtLevel(classKey: string | null, level: number): boolean {
  if (!classKey || level < 2) return false;
  const current = collectClassFeatureContributions(classKey, level).weaponMasteryCount;
  const previous = collectClassFeatureContributions(classKey, level - 1).weaponMasteryCount;
  return current > previous;
}

export const EMPTY_CLASS_FEATURE_CONTRIBUTIONS: ClassFeatureContributions = {
  sneakAttackDice: null,
  martialArtsDie: null,
  weaponMasteryCount: 0,
  weaponMasteryMeleeOnly: false,
  expertiseCount: 0,
  secondWindUses: null,
  secondWindHealDice: null,
  hasFightingStyleFeature: false,
  unarmoredDefenseAbilities: null,
  unarmoredDefenseDisallowShield: false,
  hpPerClassLevel: 0,
  jackOfAllTrades: false,
  unarmoredMovementBonusFeet: 0,
  savingThrowAbilityBonus: null,
  roving: false,
  darkvisionFeet: 0,
  darkvisionGrantOrIncreaseFeet: 0,
  hitPointPools: [],
};

export function applyDarkvisionGrantOrIncrease(currentFeet: number, grantFeet: number): number {
  if (grantFeet <= 0) return currentFeet;
  return currentFeet <= 0 ? grantFeet : currentFeet + grantFeet;
}

export function mergeDarkvisionFeet(
  speciesFeet: number,
  classMaxFeet: number,
  classGrantOrIncreaseFeet: number,
): number {
  return applyDarkvisionGrantOrIncrease(Math.max(speciesFeet, classMaxFeet), classGrantOrIncreaseFeet);
}

function resolveDiceByLevel(diceByLevel: Partial<Record<number, string>>, level: number): string | null {
  const entries = Object.entries(diceByLevel)
    .map(([entryLevel, dice]) => [Number(entryLevel), dice] as const)
    .filter(([entryLevel]) => entryLevel <= level)
    .sort((a, b) => b[0] - a[0]);
  return entries[0]?.[1] ?? null;
}

function resolveCountByLevel(
  countByLevel: Partial<Record<number, number>> | undefined,
  baseCount: number,
  level: number,
): number {
  if (!countByLevel) return baseCount;
  const entries = Object.entries(countByLevel)
    .map(([entryLevel, count]) => [Number(entryLevel), count] as const)
    .filter(([entryLevel]) => entryLevel <= level)
    .sort((a, b) => b[0] - a[0]);
  return entries[0]?.[1] ?? baseCount;
}

function foldClassFeatureEffect(
  contributions: ClassFeatureContributions,
  effect: ClassFeatureEffect,
  level: number,
  limitedUses?: LimitedUsesFormula,
): void {
  switch (effect.type) {
    case "sneak_attack": {
      const dice = resolveDiceByLevel(effect.diceByLevel, level);
      if (dice) contributions.sneakAttackDice = dice;
      break;
    }
    case "martial_arts": {
      const dice = resolveDiceByLevel(effect.diceByLevel, level);
      if (dice) contributions.martialArtsDie = dice;
      break;
    }
    case "weapon_mastery":
      contributions.weaponMasteryCount = Math.max(
        contributions.weaponMasteryCount,
        resolveCountByLevel(effect.countByLevel, effect.count, level),
      );
      if (effect.meleeOnly) contributions.weaponMasteryMeleeOnly = true;
      break;
    case "expertise":
      contributions.expertiseCount += effect.count;
      break;
    case "second_wind":
      contributions.secondWindHealDice = effect.healDice;
      if (limitedUses) {
        contributions.secondWindUses = resolveLimitedUses(limitedUses, {
          level,
          abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
        });
      } else {
        contributions.secondWindUses = effect.uses ?? null;
      }
      break;
    case "fighting_style_feature":
      contributions.hasFightingStyleFeature = true;
      break;
    case "unarmored_defense":
      contributions.unarmoredDefenseAbilities = effect.abilities;
      contributions.unarmoredDefenseDisallowShield = effect.disallowShield ?? false;
      break;
    case "hit_points_per_class_level":
      contributions.hpPerClassLevel += effect.amount;
      break;
    case "jack_of_all_trades":
      contributions.jackOfAllTrades = true;
      break;
    case "unarmored_movement":
      contributions.unarmoredMovementBonusFeet = Math.max(
        contributions.unarmoredMovementBonusFeet,
        effect.bonusFeet,
      );
      break;
    case "saving_throw_bonus":
      contributions.savingThrowAbilityBonus = {
        ability: effect.ability,
        minimum: effect.minimum ?? Number.NEGATIVE_INFINITY,
      };
      break;
    case "roving":
      contributions.roving = true;
      break;
    case "darkvision":
      if (effect.increaseExisting) {
        contributions.darkvisionGrantOrIncreaseFeet = applyDarkvisionGrantOrIncrease(
          contributions.darkvisionGrantOrIncreaseFeet,
          effect.feet,
        );
      } else {
        contributions.darkvisionFeet = Math.max(contributions.darkvisionFeet, effect.feet);
      }
      break;
    default:
      break;
  }
}

export function collectClassFeatureContributions(
  classKey: string | null,
  level: number,
  subclassKey: string | null = null,
): ClassFeatureContributions {
  const contributions: ClassFeatureContributions = { ...EMPTY_CLASS_FEATURE_CONTRIBUTIONS };

  if (!classKey) return contributions;

  const classData = findByKey(CLASSES, classKey);
  if (!classData) return contributions;

  const subclassData = findSubclass(classKey, subclassKey);

  for (const feature of activeClassFeatures(classData, level, subclassData)) {
    for (const effect of feature.effects) {
      foldClassFeatureEffect(contributions, effect, level, feature.limitedUses);
      if (effect.type === "hit_point_pool") {
        contributions.hitPointPools.push({ featureKey: feature.key, formula: effect.formula });
      }
    }
  }

  return contributions;
}

function mergeClassFeatureContributions(
  accumulated: ClassFeatureContributions,
  next: ClassFeatureContributions,
  sourceClassKey: string,
): void {
  if (sourceClassKey === "rogue" && next.sneakAttackDice) {
    accumulated.sneakAttackDice = next.sneakAttackDice;
  }
  if (sourceClassKey === "monk" && next.martialArtsDie) {
    accumulated.martialArtsDie = next.martialArtsDie;
  }
  if (next.weaponMasteryCount > 0) {
    if (accumulated.weaponMasteryCount === 0) {
      accumulated.weaponMasteryMeleeOnly = next.weaponMasteryMeleeOnly;
    } else {
      accumulated.weaponMasteryMeleeOnly =
        accumulated.weaponMasteryMeleeOnly && next.weaponMasteryMeleeOnly;
    }
    accumulated.weaponMasteryCount += next.weaponMasteryCount;
  }
  accumulated.expertiseCount += next.expertiseCount;
  if (sourceClassKey === "fighter") {
    accumulated.secondWindUses = next.secondWindUses;
    accumulated.secondWindHealDice = next.secondWindHealDice;
  }
  accumulated.hasFightingStyleFeature ||= next.hasFightingStyleFeature;
  accumulated.hpPerClassLevel += next.hpPerClassLevel;
  accumulated.jackOfAllTrades ||= next.jackOfAllTrades;
  accumulated.unarmoredMovementBonusFeet = Math.max(
    accumulated.unarmoredMovementBonusFeet,
    next.unarmoredMovementBonusFeet,
  );
  if (next.savingThrowAbilityBonus) {
    accumulated.savingThrowAbilityBonus = next.savingThrowAbilityBonus;
  }
  accumulated.roving ||= next.roving;
  accumulated.darkvisionFeet = Math.max(accumulated.darkvisionFeet, next.darkvisionFeet);
  accumulated.darkvisionGrantOrIncreaseFeet = applyDarkvisionGrantOrIncrease(
    accumulated.darkvisionGrantOrIncreaseFeet,
    next.darkvisionGrantOrIncreaseFeet,
  );
  accumulated.hitPointPools.push(...next.hitPointPools);
}

export function collectArmorClassFormulaOptions(
  classLevels: ResolvedClassLevel[],
  subclassByClass: Record<string, string | null> = {},
): ArmorClassFormulaOption[] {
  const options: ArmorClassFormulaOption[] = [];

  for (const { classKey, classLevel } of classLevels) {
    const classData = findByKey(CLASSES, classKey);
    if (!classData) continue;

    const subclassData = findSubclass(classKey, subclassByClass[classKey] ?? null);
    for (const feature of activeClassFeatures(classData, classLevel, subclassData)) {
      for (const effect of feature.effects) {
        if (effect.type !== "unarmored_defense") continue;
        options.push({
          key: classFeatureCatalogEntityKey(classKey, feature.key, subclassData),
          classKey,
          featureKey: feature.key,
          name: feature.name,
          abilities: effect.abilities,
          disallowShield: effect.disallowShield ?? false,
        });
      }
    }
  }

  return options;
}

export function needsArmorClassFormulaPick(options: ArmorClassFormulaOption[]): boolean {
  return options.length > 1;
}

export function resolveArmorClassFormulaSelection(
  options: ArmorClassFormulaOption[],
  selectedKey: string | null | undefined,
): ArmorClassFormulaOption | null {
  if (options.length === 0) return null;
  if (options.length === 1) return options[0]!;
  if (!selectedKey) return null;
  return options.find((option) => option.key === selectedKey) ?? null;
}

function applyArmorClassFormulaToContributions(
  contributions: ClassFeatureContributions,
  formula: ArmorClassFormulaOption | null,
): void {
  if (!formula) {
    contributions.unarmoredDefenseAbilities = null;
    contributions.unarmoredDefenseDisallowShield = false;
    return;
  }
  contributions.unarmoredDefenseAbilities = formula.abilities;
  contributions.unarmoredDefenseDisallowShield = formula.disallowShield;
}

/** Union class/subclass feature contributions at each class's own level. */
export function collectMulticlassClassFeatureContributions(
  input: CollectMulticlassClassFeatureContributionsInput,
): ClassFeatureContributions {
  const { classLevels, subclassByClass = {}, armorClassFormulaKey = null } = input;
  const contributions: ClassFeatureContributions = { ...EMPTY_CLASS_FEATURE_CONTRIBUTIONS };

  for (const { classKey, classLevel } of classLevels) {
    const perClass = collectClassFeatureContributions(
      classKey,
      classLevel,
      subclassByClass[classKey] ?? null,
    );
    mergeClassFeatureContributions(contributions, perClass, classKey);
  }

  const armorClassFormulas = collectArmorClassFormulaOptions(classLevels, subclassByClass);
  applyArmorClassFormulaToContributions(
    contributions,
    resolveArmorClassFormulaSelection(armorClassFormulas, armorClassFormulaKey),
  );

  return contributions;
}

const EXTRA_ATTACK_FEATURE_KEY = "extra-attack";
const TWO_EXTRA_ATTACKS_FEATURE_KEY = "two-extra-attacks";
const THIRSTING_BLADE_FEATURE_KEY = "thirsting-blade";

function extraAttackCountForClass(
  classKey: string,
  classLevel: number,
  subclassKey: string | null,
  classFeatureOptionPicks: Record<string, (string | null)[]>,
): number {
  const classData = findByKey(CLASSES, classKey);
  if (!classData) return 0;

  const subclassData = findSubclass(classKey, subclassKey);
  const features = activeClassFeatures(classData, classLevel, subclassData);
  if (features.some((feature) => feature.key === TWO_EXTRA_ATTACKS_FEATURE_KEY)) {
    return 3;
  }
  if (
    features.some(
      (feature) =>
        feature.key === EXTRA_ATTACK_FEATURE_KEY || feature.key === THIRSTING_BLADE_FEATURE_KEY,
    )
  ) {
    return 2;
  }
  if (classKey === "warlock") {
    const invocations = selectedClassFeatureOptionPicks(
      classData,
      ELDRITCH_INVOCATIONS_CHOICE_KEY,
      classLevel,
      classFeatureOptionPicks,
    );
    if (invocations.some((option) => option.key === THIRSTING_BLADE_FEATURE_KEY)) {
      return 2;
    }
  }
  return 0;
}

export function extraAttackCountsFromClassLevels(
  classLevels: ResolvedClassLevel[],
  subclassByClass: Record<string, string | null> = {},
  classFeatureOptionPicks: Record<string, (string | null)[]> = {},
): number[] {
  const counts: number[] = [];
  for (const { classKey, classLevel } of classLevels) {
    const count = extraAttackCountForClass(
      classKey,
      classLevel,
      subclassByClass[classKey] ?? null,
      classFeatureOptionPicks,
    );
    if (count > 0) {
      counts.push(count);
    }
  }
  return counts;
}

export function resolveMulticlassExtraAttackCount(
  classLevels: ResolvedClassLevel[],
  rules: TableRules,
  subclassByClass: Record<string, string | null> = {},
  classFeatureOptionPicks: Record<string, (string | null)[]> = {},
): number {
  return extraAttackCount(
    extraAttackCountsFromClassLevels(classLevels, subclassByClass, classFeatureOptionPicks),
    rules,
  );
}

export function buildMulticlassClassFeatureUseTrackers(
  classLevels: ResolvedClassLevel[],
  abilityModifiers: Record<AbilityId, number>,
  subclassByClass: Record<string, string | null> = {},
  surface?: "combat" | "spells",
  subclassFeatureChoicesByClass: Record<string, Record<string, string>> = {},
): ClassFeatureUseTracker[] {
  const trackers: ClassFeatureUseTracker[] = [];

  for (const { classKey, classLevel } of classLevels) {
    const classData = findByKey(CLASSES, classKey);
    if (!classData) continue;

    const subclassKey = subclassByClass[classKey] ?? null;
    const subclassData = findSubclass(classKey, subclassKey);
    trackers.push(
      ...buildClassFeatureUseTrackers(
        classData,
        classLevel,
        abilityModifiers,
        subclassData,
        surface,
        subclassFeatureChoicesByClass[classKey] ?? {},
      ),
    );
  }

  return trackers;
}

export function buildMulticlassClassFeaturePoolTrackers(
  classLevels: ResolvedClassLevel[],
  abilityModifiers: Record<AbilityId, number>,
  subclassByClass: Record<string, string | null> = {},
): ClassFeaturePoolTracker[] {
  const trackers: ClassFeaturePoolTracker[] = [];

  for (const { classKey, classLevel } of classLevels) {
    const classData = findByKey(CLASSES, classKey);
    if (!classData) continue;

    trackers.push(
      ...buildClassFeaturePoolTrackers(
        classData,
        classLevel,
        abilityModifiers,
        findSubclass(classKey, subclassByClass[classKey] ?? null),
      ),
    );
  }

  return trackers;
}

export function activeMulticlassClassFeatures(
  classLevels: ResolvedClassLevel[],
  subclassByClass: Record<string, string | null> = {},
): ClassFeatureData[] {
  const features: ClassFeatureData[] = [];

  for (const { classKey, classLevel } of classLevels) {
    const classData = findByKey(CLASSES, classKey);
    if (!classData) continue;

    features.push(
      ...activeClassFeatures(
        classData,
        classLevel,
        findSubclass(classKey, subclassByClass[classKey] ?? null),
      ),
    );
  }

  return features;
}

export function hasFightingStyleFeature(classKey: string | null, level: number): boolean {
  return collectClassFeatureContributions(classKey, level).hasFightingStyleFeature;
}

export function classFeaturesAtLevel(
  classData: ClassData | null,
  level: number,
  subclassData: SubclassData | null = null,
): ClassFeatureData[] {
  if (!classData) return [];
  const base = classData.features.filter((feature) => feature.grantedAtLevel === level);
  if (!subclassData) return base;
  const sub = subclassData.features.filter((feature) => feature.grantedAtLevel === level);
  return [...base, ...sub];
}

export function hasExpertiseGrantedAtLevel(classData: ClassData | null, level: number): boolean {
  if (!classData) return false;
  return classData.features.some(
    (feature) =>
      feature.grantedAtLevel === level && feature.effects.some((effect) => effect.type === "expertise"),
  );
}
