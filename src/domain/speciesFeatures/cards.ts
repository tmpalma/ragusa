import type { SpeciesData } from "../../data/types";
import { formatLength, type MeasurementSystem } from "../units";
import type { ActionTiming, CombatCard } from "../combatActions";
import type { SpeciesFeatureContributions } from "./contributions";
import { activeSpeciesFeatures, SPECIES_EMBEDDED_USE_TRACKER_KEYS } from "./contributions";
import { speciesCantripChoiceOptions } from "./cantripChoices";

export interface SpeciesFeatureCard {
  id: string;
  speciesKey: string;
  featureKey: string;
  name: string;
  description: string;
  meta?: string;
  useTrackerSpeciesFeatureKey?: string;
  cantripChoice?: {
    choiceKey: string;
    selectedSpellKey: string | null;
    cantripSwapAvailable: boolean;
    options: { key: string; name: string }[];
  };
}

export interface BuildSpeciesFeatureCardsInput {
  speciesData: SpeciesData | null;
  lineageKey: string | null;
  level: number;
  speciesFeatureChoices?: Record<string, string>;
  speciesCantripSwapAvailable?: Record<string, boolean>;
  contributions: SpeciesFeatureContributions;
  spellcastingAbility: string | null;
  formatMeta: (key: string, params?: Record<string, string | number>) => string;
  /** Display caption for a distance stored in feet. Defaults to imperial. */
  formatLength?: (feet: number) => string;
}

const ELF_LINEAGE_LEVEL1_CANTTRIP_KEYS = new Set([
  "drow-cantrip",
  "high-elf-cantrip",
  "wood-elf-cantrip",
]);

const TIEFLING_LEGACY_LEVEL1_CANTTRIP_KEYS = new Set([
  "abyssal-cantrip",
  "chthonic-cantrip",
  "infernal-cantrip",
]);

export type SpeciesFeatureTitleTranslate = (
  key: string,
  params?: Record<string, string | number>,
  fallback?: string,
) => string;

export type SpeciesFeatureEntityTranslate = (
  catalogPrefix: string,
  entityKey: string,
  field: string,
  fallback?: string,
) => string;

export function formatSpeciesFeatureCombatTitle(
  speciesKey: string,
  featureKey: string,
  fallbackFeatureName: string,
  t: SpeciesFeatureTitleTranslate,
  tEntity: SpeciesFeatureEntityTranslate,
  resolvedFeatureName?: string,
): string {
  const speciesName = tEntity("catalog.species", speciesKey, "name", speciesKey);
  const featureName =
    resolvedFeatureName ??
    t(`catalog.species.${speciesKey}.trait.${featureKey}.name`, undefined, fallbackFeatureName);
  const speciesFeatureLabel = t("combat.speciesFeatureLabel", undefined, "Feature");
  return t(
    "combat.speciesFeatureCardTitle",
    { speciesName, speciesFeatureLabel, featureName },
    `${speciesName} ${speciesFeatureLabel} - ${featureName}`,
  );
}

function speciesFeatureCardName(
  speciesKey: string,
  featureKey: string,
  fallback: string,
  formatMeta: BuildSpeciesFeatureCardsInput["formatMeta"],
): string {
  if (speciesKey === "elf" && ELF_LINEAGE_LEVEL1_CANTTRIP_KEYS.has(featureKey)) {
    return formatMeta("combat.speciesFeature.elvenLineageLevel1");
  }
  if (speciesKey === "tiefling" && TIEFLING_LEGACY_LEVEL1_CANTTRIP_KEYS.has(featureKey)) {
    return formatMeta("combat.speciesFeature.fiendishLegacyLevel1");
  }
  return fallback;
}

function speciesFeatureMeta(
  featureKey: string,
  contributions: SpeciesFeatureContributions,
  spellcastingAbility: string | null,
  formatMeta: BuildSpeciesFeatureCardsInput["formatMeta"],
  formatLengthDisplay: (feet: number) => string,
): string | undefined {
  if (contributions.damageResistances.length > 0 && featureKey.includes("resistance")) {
    return formatMeta("combat.speciesFeature.damageResistanceMeta", {
      type: contributions.damageResistances.join(", "),
    });
  }
  if (contributions.darkvisionFeet > 0 && featureKey === "darkvision") {
    return formatMeta("combat.speciesFeature.darkvisionMeta", {
      length: formatLengthDisplay(contributions.darkvisionFeet),
    });
  }
  if (contributions.cantrips.length > 0 && featureKey.includes("cantrip")) {
    return formatMeta("combat.speciesFeature.cantripMeta", { spells: contributions.cantrips.join(", ") });
  }
  if (spellcastingAbility && (featureKey.includes("spell") || featureKey.includes("cantrip"))) {
    return formatMeta("combat.speciesFeature.spellcastingAbilityMeta", { ability: spellcastingAbility });
  }
  return undefined;
}

function buildMetaForFeature(
  feature: { key: string; effects: { type: string; spellName?: string; damageType?: string }[] },
  contributions: SpeciesFeatureContributions,
  spellcastingAbility: string | null,
  formatMeta: BuildSpeciesFeatureCardsInput["formatMeta"],
  formatLengthDisplay: (feet: number) => string,
): string | undefined {
  for (const effect of feature.effects) {
    if (effect.type === "damage_resistance" && "damageType" in effect && effect.damageType) {
      return formatMeta("combat.speciesFeature.damageResistanceMeta", { type: effect.damageType });
    }
    if (effect.type === "grant_cantrip" && effect.spellName) {
      const parts = [formatMeta("combat.speciesFeature.cantripMeta", { spells: effect.spellName })];
      if (spellcastingAbility) {
        parts.push(formatMeta("combat.speciesFeature.spellcastingAbilityMeta", { ability: spellcastingAbility }));
      }
      return parts.join(" · ");
    }
    if (effect.type === "always_prepared_spell" && effect.spellName) {
      const parts = [effect.spellName];
      if (spellcastingAbility) {
        parts.push(formatMeta("combat.speciesFeature.spellcastingAbilityMeta", { ability: spellcastingAbility }));
      }
      return parts.join(" · ");
    }
  }
  return speciesFeatureMeta(feature.key, contributions, spellcastingAbility, formatMeta, formatLengthDisplay);
}

export function buildSpeciesFeatureCards(input: BuildSpeciesFeatureCardsInput): SpeciesFeatureCard[] {
  const {
    speciesData,
    lineageKey,
    level,
    speciesFeatureChoices = {},
    speciesCantripSwapAvailable = {},
    contributions,
    spellcastingAbility,
    formatMeta,
    formatLength: formatLengthDisplay = (feet) => formatLength(feet, "imperial"),
  } = input;
  if (!speciesData) return [];

  const cards: SpeciesFeatureCard[] = [];

  for (const feature of activeSpeciesFeatures(speciesData, lineageKey, level)) {
    if (!feature.combatSurface) continue;
    // Timed actions stay in the Actions/Bonus/Reaction lists only.
    if (feature.actionTiming) continue;

    const cantripChoiceEffect = feature.effects.find((effect) => effect.type === "choose_cantrip");
    const cantripChoice =
      cantripChoiceEffect?.type === "choose_cantrip"
        ? {
            choiceKey: cantripChoiceEffect.choiceKey,
            selectedSpellKey:
              speciesFeatureChoices[cantripChoiceEffect.choiceKey] ??
              cantripChoiceEffect.defaultSpellKey,
            cantripSwapAvailable:
              speciesCantripSwapAvailable[cantripChoiceEffect.choiceKey] ?? false,
            options: speciesCantripChoiceOptions(cantripChoiceEffect.listClassKey),
          }
        : undefined;

    cards.push({
      id: `species-feature-${speciesData.key}-${feature.key}`,
      speciesKey: speciesData.key,
      featureKey: feature.key,
      name: speciesFeatureCardName(speciesData.key, feature.key, feature.name, formatMeta),
      description: feature.desc,
      meta: buildMetaForFeature(feature, contributions, spellcastingAbility, formatMeta, formatLengthDisplay),
      cantripChoice,
      ...(SPECIES_EMBEDDED_USE_TRACKER_KEYS.has(feature.key) && feature.limitedUses
        ? { useTrackerSpeciesFeatureKey: feature.key }
        : {}),
    });
  }

  return cards;
}

export function buildSpeciesFeatureActionCards(input: BuildSpeciesFeatureCardsInput): Record<ActionTiming, CombatCard[]> {
  const {
    speciesData,
    lineageKey,
    level,
    contributions,
    spellcastingAbility,
    formatMeta,
    formatLength: formatLengthDisplay = (feet) => formatLength(feet, "imperial"),
  } = input;
  const cards: Record<ActionTiming, CombatCard[]> = { action: [], bonus: [], reaction: [] };
  if (!speciesData) return cards;

  for (const feature of activeSpeciesFeatures(speciesData, lineageKey, level)) {
    if (!feature.combatSurface || !feature.actionTiming) continue;

    cards[feature.actionTiming].push({
      id: `species-feature-${speciesData.key}-${feature.key}`,
      kind: "species-trait",
      entityKey: speciesData.key,
      traitSlug: feature.key,
      name: feature.name,
      description: feature.desc,
      displayMeta: buildMetaForFeature(
        feature,
        contributions,
        spellcastingAbility,
        formatMeta,
        formatLengthDisplay,
      ),
      ...(SPECIES_EMBEDDED_USE_TRACKER_KEYS.has(feature.key) && feature.limitedUses
        ? { useTrackerSpeciesFeatureKey: feature.key }
        : {}),
    });
  }

  return cards;
}

export function speciesFeatureMetaForSheet(
  _speciesKey: string,
  featureKey: string,
  contributions: SpeciesFeatureContributions,
  system: MeasurementSystem = "imperial",
): string | null {
  if (featureKey === "darkvision" && contributions.darkvisionFeet > 0) {
    return formatLength(contributions.darkvisionFeet, system);
  }
  if (contributions.damageResistances.length > 0 && featureKey.includes("resistance")) {
    return contributions.damageResistances.join(", ");
  }
  return null;
}

export function lineageDisplayName(
  speciesData: SpeciesData | null,
  lineageKey: string | null,
): string | null {
  if (!speciesData?.choice || !lineageKey) return null;
  return speciesData.choice.options.find((option) => option.key === lineageKey)?.name ?? null;
}
