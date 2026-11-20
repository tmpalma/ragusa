import { WEAPONS } from "../../data";
import type { AbilityId, ClassData, FeatureOptionCombatCard, SubclassData } from "../../data/types";
import type { ActionTiming, CombatCard } from "../combatActions";
import { formatModifier } from "../modifiers";
import { proficiencyBonusForLevel } from "../proficiency";
import { formatWeaponDamage } from "../weaponAttack";
import { activeClassFeatures, classFeatureCatalogEntityKey, resolveHitPointPoolMax, type ClassFeatureContributions, CLASS_EMBEDDED_USE_TRACKER_KEYS } from "./contributions";
import { resolveClassFeatureOptionPickCount } from "./optionPicks";
import {
  isImplicitSingleCombatOption,
  selectedSubclassOptionCombatCards,
  subclassFeatureOptionPickGrantForFeature,
} from "../subclasses";

export interface ClassFeatureChoice {
  choiceKey: string;
  options: { key: string; name: string; desc: string }[];
  selectedOptionKey: string | null;
}

export interface ClassFeatureReferenceOption {
  key: string;
  name: string;
  desc: string;
}

export interface ClassFeatureOptionPickCard {
  choiceKey: string;
  count: number;
  options: { key: string; name: string; desc: string; repeatable?: boolean }[];
  picks: (string | null)[];
}

export interface ClassFeatureCard {
  id: string;
  classKey: string;
  featureKey: string;
  catalogEntityKey: string;
  name: string;
  combatParentName?: string;
  description: string;
  meta?: string;
  choice?: ClassFeatureChoice;
  referenceOptions?: ClassFeatureReferenceOption[];
  optionPicks?: ClassFeatureOptionPickCard;
  useTrackerClassFeatureKey?: string;
}

export interface BuildClassFeatureCardsInput {
  classData: ClassData | null;
  subclassData?: SubclassData | null;
  level: number;
  subclassFeatureChoices?: Record<string, string>;
  subclassFeatureOptionPicks?: Record<string, (string | null)[]>;
  weaponMasteryPicks: string[];
  contributions: ClassFeatureContributions;
  abilityModifiers: Record<AbilityId, number>;
  formatMeta: (key: string, params?: Record<string, string | number>) => string;
  weaponLabel: (weaponKey: string, fallback: string) => string;
  masteryLabel: (mastery: string) => string;
}

function monkFeatureSaveDc(wisModifier: number, level: number): number {
  return 8 + proficiencyBonusForLevel(level) + wisModifier;
}

export function darkOnesBlessingTempHp(chaModifier: number, level: number): number {
  return Math.max(1, chaModifier + level);
}

export function battleMasterManeuverSaveDc(
  abilityModifiers: Record<AbilityId, number>,
  characterLevel = 4,
): number {
  return 8 + proficiencyBonusForLevel(characterLevel) + Math.max(abilityModifiers.str, abilityModifiers.dex);
}

function classFeatureMeta(
  featureKey: string,
  level: number,
  weaponMasteryPicks: string[],
  contributions: ClassFeatureContributions,
  abilityModifiers: Record<AbilityId, number>,
  formatMeta: BuildClassFeatureCardsInput["formatMeta"],
  weaponLabel: BuildClassFeatureCardsInput["weaponLabel"],
  masteryLabel: BuildClassFeatureCardsInput["masteryLabel"],
): string | undefined {
  if (featureKey === "sneak-attack" && contributions.sneakAttackDice) {
    return formatMeta("combat.classFeature.sneakAttackMeta", { dice: contributions.sneakAttackDice });
  }
  if (featureKey === "martial-arts" && contributions.martialArtsDie) {
    return formatMeta("combat.classFeature.martialArtsDieMeta", { die: contributions.martialArtsDie });
  }
  if (featureKey === "monks-focus") {
    return formatMeta("combat.classFeature.monkSaveDcMeta", {
      dc: monkFeatureSaveDc(abilityModifiers.wis, level),
    });
  }
  if (featureKey === "second-wind" && contributions.secondWindUses && contributions.secondWindHealDice) {
    return formatMeta("combat.classFeature.secondWindMeta", {
      heal: `${contributions.secondWindHealDice} + ${level}`,
      uses: contributions.secondWindUses,
    });
  }
  if (featureKey === "dark-ones-blessing") {
    const amount = darkOnesBlessingTempHp(abilityModifiers.cha, level);
    return formatMeta("combat.classFeature.darkOnesBlessingMeta", { amount });
  }
  const pool = contributions.hitPointPools.find((entry) => entry.featureKey === featureKey);
  if (pool) {
    const max = resolveHitPointPoolMax(pool.formula, { level, abilityModifiers });
    return formatMeta("combat.classFeature.arcaneWardHp", { max });
  }
  if (featureKey === "weapon-mastery" && contributions.weaponMasteryCount > 0) {
    const filled = weaponMasteryPicks.filter(Boolean);
    const remaining = contributions.weaponMasteryCount - filled.length;
    if (filled.length === 0) {
      return formatMeta("combat.classFeature.weaponMasteryEmpty", { count: contributions.weaponMasteryCount });
    }
    const parts = filled.map((key) => {
      const weapon = WEAPONS.find((entry) => entry.key === key);
      const name = weaponLabel(key, weapon?.name ?? key);
      const mastery = weapon?.mastery ? masteryLabel(weapon.mastery) : "";
      return mastery ? `${name} (${mastery})` : name;
    });
    return remaining > 0
      ? `${parts.join(", ")} · ${formatMeta("combat.classFeature.weaponMasteryRemaining", { count: remaining })}`
      : parts.join(", ");
  }
  return undefined;
}

export function buildClassFeatureCards(input: BuildClassFeatureCardsInput): ClassFeatureCard[] {
  const {
    classData,
    subclassData = null,
    level,
    subclassFeatureChoices = {},
    subclassFeatureOptionPicks = {},
    weaponMasteryPicks,
    contributions,
    abilityModifiers,
    formatMeta,
    weaponLabel,
    masteryLabel,
  } = input;
  if (!classData) return [];

  const cards: ClassFeatureCard[] = [];

  for (const feature of activeClassFeatures(classData, level, subclassData)) {
    if (!feature.combatSurface) continue;
    if (feature.key === "weapon-mastery") continue;
    // Timed actions stay in the Actions/Bonus/Reaction lists only,
    // unless classFeatureCard requests a description card (e.g. Land's Aid spending Wild Shape).
    if (feature.actionTiming && !feature.classFeatureCard) continue;

    const choiceEffect = feature.effects.find((effect) => {
      if (effect.type !== "choose_feature_option") return false;
      if (resolveClassFeatureOptionPickCount(effect, level) !== 1) return false;
      if (isImplicitSingleCombatOption(effect)) return false;
      const surface = effect.uiSurface ?? "character";
      return surface === "character" || surface === "combat";
    });
    const referenceEffect = feature.effects.find((effect) => {
      if (effect.type !== "choose_feature_option") return false;
      return (effect.uiSurface ?? "character") === "reference";
    });
    const choice =
      choiceEffect?.type === "choose_feature_option"
        ? {
            choiceKey: choiceEffect.choiceKey,
            options: choiceEffect.options,
            selectedOptionKey: subclassFeatureChoices[choiceEffect.choiceKey] ?? null,
          }
        : undefined;
    const referenceOptions =
      referenceEffect?.type === "choose_feature_option" ? referenceEffect.options : undefined;
    const selectedOption = choice?.options.find((option) => option.key === choice.selectedOptionKey);
    const optionDesc = selectedOption?.desc?.trim();
    const optionPickGrant = subclassFeatureOptionPickGrantForFeature(subclassData, feature.key, level);
    const optionPicks = optionPickGrant
      ? {
          choiceKey: optionPickGrant.choiceKey,
          count: optionPickGrant.count,
          options: optionPickGrant.options,
          picks:
            subclassFeatureOptionPicks[optionPickGrant.choiceKey]?.length === optionPickGrant.count
              ? subclassFeatureOptionPicks[optionPickGrant.choiceKey]!
              : Array.from({ length: optionPickGrant.count }, () => null),
        }
      : undefined;

    cards.push({
      id: `class-feature-${classData.key}-${feature.key}`,
      classKey: classData.key,
      featureKey: feature.key,
      catalogEntityKey: classFeatureCatalogEntityKey(classData.key, feature.key, subclassData),
      name: feature.name,
      combatParentName: feature.combatParentName,
      description: optionDesc ? optionDesc : feature.desc,
      meta: classFeatureMeta(
        feature.key,
        level,
        weaponMasteryPicks,
        contributions,
        abilityModifiers,
        formatMeta,
        weaponLabel,
        masteryLabel,
      ),
      choice,
      referenceOptions,
      optionPicks,
      ...(CLASS_EMBEDDED_USE_TRACKER_KEYS.has(feature.key) && feature.limitedUses
        ? { useTrackerClassFeatureKey: feature.key }
        : {}),
    });
  }

  return cards;
}

export function buildClassFeatureActionCards(input: BuildClassFeatureCardsInput): Record<ActionTiming, CombatCard[]> {
  const {
    classData,
    subclassData = null,
    level,
    subclassFeatureChoices = {},
    weaponMasteryPicks,
    contributions,
    abilityModifiers,
    formatMeta,
    weaponLabel,
    masteryLabel,
  } = input;
  const cards: Record<ActionTiming, CombatCard[]> = { action: [], bonus: [], reaction: [] };
  if (!classData) return cards;

  for (const feature of activeClassFeatures(classData, level, subclassData)) {
    if (!feature.combatSurface || !feature.actionTiming) continue;

    cards[feature.actionTiming].push({
      id: `class-feature-${classData.key}-${feature.key}`,
      kind: "class-feature",
      entityKey: classData.key,
      traitSlug: feature.key,
      name: feature.name,
      description: feature.desc,
      combatParentName: feature.combatParentName,
      displayMeta: classFeatureMeta(
        feature.key,
        level,
        weaponMasteryPicks,
        contributions,
        abilityModifiers,
        formatMeta,
        weaponLabel,
        masteryLabel,
      ),
      ...(CLASS_EMBEDDED_USE_TRACKER_KEYS.has(feature.key) && feature.limitedUses && !feature.classFeatureCard
        ? { useTrackerClassFeatureKey: feature.key }
        : {}),
    });
  }

  for (const optionCard of selectedSubclassOptionCombatCards(subclassData, subclassFeatureChoices)) {
    const combatCard = combatCardFromFeatureOption(classData.key, optionCard, abilityModifiers, level);
    if (optionCard.attack) {
      cards.action.push(combatCard);
    } else if (optionCard.actionTiming) {
      cards[optionCard.actionTiming].push(combatCard);
    }
  }

  return cards;
}

function optionCombatAttackMeta(
  attack: NonNullable<FeatureOptionCombatCard["attack"]>,
  abilityModifiers: Record<AbilityId, number>,
  characterLevel: number,
): NonNullable<CombatCard["attackMeta"]> {
  const modifier = abilityModifiers[attack.ability] ?? 0;
  return {
    bonus: formatModifier(modifier + proficiencyBonusForLevel(characterLevel)),
    damage: formatWeaponDamage(attack.damageDice, modifier, attack.damageType),
    ability: attack.ability,
  };
}

function combatCardFromFeatureOption(
  classKey: string,
  optionCard: FeatureOptionCombatCard,
  abilityModifiers: Record<AbilityId, number>,
  characterLevel: number,
): CombatCard {
  return {
    id: `class-feature-${classKey}-${optionCard.key}`,
    kind: "class-feature",
    name: optionCard.name,
    description: optionCard.desc,
    attackMeta: optionCard.attack
      ? optionCombatAttackMeta(optionCard.attack, abilityModifiers, characterLevel)
      : undefined,
  };
}

export function classFeatureMetaForSheet(
  _classKey: string,
  featureKey: string,
  contributions: ClassFeatureContributions,
  level: number,
): string | null {
  if (featureKey === "sneak-attack" && contributions.sneakAttackDice) {
    return contributions.sneakAttackDice;
  }
  if (featureKey === "martial-arts" && contributions.martialArtsDie) {
    return contributions.martialArtsDie;
  }
  if (featureKey === "second-wind" && contributions.secondWindUses && contributions.secondWindHealDice) {
    return `${contributions.secondWindHealDice} + ${level}, ${contributions.secondWindUses} uses`;
  }
  return null;
}
