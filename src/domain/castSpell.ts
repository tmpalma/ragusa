import { FEATS, findByKey } from "../data";
import type { AbilityId, ClassFeatureData, SpeciesData, SpeciesFeatureData } from "../data/types";
import type { CharacterAction } from "../state/characterState";
import {
  armoryRestUsesStorageKey,
  currentEquipmentRestUses,
  equipmentRestUsePoolsForMagicItem,
  equipmentRestUsePoolsForVariant,
  gearRestUsesStorageKey,
} from "./equipmentRestUses";
import {
  buildFeatSpellUseTrackers,
  type FeatChoices,
} from "./featEffects";
import { readFeatSpellUseCount } from "./featGrantSpells";
import type { PactMagicPool } from "./spellProgression";
import { findSpellByKey, isPreparedRitualSpell, spellKeyFromName } from "./spellSelection";
import {
  activeLimitedUseSpeciesFeatures,
  resolveLimitedUses,
} from "./speciesFeatures";

export type CastSlotPool = "spell" | "pact";

export interface SpellFreeCastSource {
  id: string;
  kind: "feat" | "species" | "equipment" | "class";
  label: string;
  remaining: number;
  maxUses: number;
  featStorageKey?: string;
  speciesFeatureKey?: string;
  equipmentStorageKey?: string;
  classFeatureKey?: string;
}

export interface CompanionSummonPayment {
  spellKey: string;
  slotLevel: number;
  freeCastSourceId: string | null;
  slotPool: CastSlotPool;
  castAsRitual?: boolean;
}

export function canCastSpellAsRitual(spellKey: string, ritualEligibleSpellKeys: readonly string[]): boolean {
  return isPreparedRitualSpell(spellKey) && ritualEligibleSpellKeys.includes(spellKey);
}

export interface CastSpellAvailabilityInput {
  spellKey: string;
  canCastAsRitual: boolean;
  slotsByLevel: Record<number, number>;
  spellSlotRemaining: Record<number, number>;
  pactMagic: PactMagicPool | null;
  pactSlotRemaining: { count: number; slotLevel: number } | null;
  activeFeatKeys: string[];
  featChoicesFor: (featKey: string, slotIndex?: number) => FeatChoices;
  featSpellUses: Record<string, number>;
  speciesData: SpeciesData | null;
  speciesLineageKey: string | null;
  level: number;
  abilityModifiers: Record<AbilityId, number>;
  speciesFeatureUses: Record<string, number>;
  adventuringGear: readonly { key: string }[];
  weapons: readonly { id: string; variantKey?: string }[];
  armor: readonly { id: string; variantKey?: string }[];
  equipmentRestUsesRemaining: Record<string, number>;
  classFeatureUses: Record<string, number>;
  activeClassFeatures: ClassFeatureData[];
  featNameFor?: (featKey: string) => string;
  speciesFeatureNameFor?: (featureKey: string, fallback: string) => string;
  equipmentLabelFor?: (storageKey: string, fallback: string) => string;
  classFeatureNameFor?: (featureKey: string, fallback: string) => string;
}

export interface CastSlotLevelSummary {
  spellSlotsMax: number;
  spellSlotsRemaining: number;
  pactSlotsMax: number;
  pactSlotsRemaining: number;
  canPayWithSpellSlot: boolean;
  canPayWithPactSlot: boolean;
}

export const CAST_SLOT_LEVEL_MAX = 9;

export function spellSlotMaxAtLevel(slotsByLevel: Record<number, number>, level: number): number {
  return slotsByLevel[level] ?? 0;
}

export function spellSlotRemainingAtLevel(
  slotsByLevel: Record<number, number>,
  spellSlotRemaining: Record<number, number>,
  level: number,
): number {
  const max = spellSlotMaxAtLevel(slotsByLevel, level);
  if (max <= 0) return 0;
  return spellSlotRemaining[level] ?? max;
}

export function pactSlotRemainingCount(
  pactMagic: PactMagicPool | null,
  pactSlotRemaining: { count: number; slotLevel: number } | null,
): number {
  if (!pactMagic || pactMagic.count <= 0) return 0;
  if (pactSlotRemaining?.slotLevel === pactMagic.slotLevel) {
    return pactSlotRemaining.count;
  }
  return pactMagic.count;
}

export function canPayCastLevelWithSpellSlot(
  slotsByLevel: Record<number, number>,
  spellSlotRemaining: Record<number, number>,
  level: number,
): boolean {
  return spellSlotRemainingAtLevel(slotsByLevel, spellSlotRemaining, level) > 0;
}

export function canPayCastLevelWithPactSlot(
  pactMagic: PactMagicPool | null,
  pactSlotRemaining: { count: number; slotLevel: number } | null,
  level: number,
): boolean {
  if (!pactMagic || pactMagic.slotLevel !== level) return false;
  return pactSlotRemainingCount(pactMagic, pactSlotRemaining) > 0;
}

export function canPayCastAtLevel(
  input: Pick<
    CastSpellAvailabilityInput,
    "slotsByLevel" | "spellSlotRemaining" | "pactMagic" | "pactSlotRemaining"
  >,
  level: number,
): boolean {
  return (
    canPayCastLevelWithSpellSlot(input.slotsByLevel, input.spellSlotRemaining, level) ||
    canPayCastLevelWithPactSlot(input.pactMagic, input.pactSlotRemaining, level)
  );
}

export function initialCastSlotLevel(
  spellLevel: number,
  input: Pick<
    CastSpellAvailabilityInput,
    "slotsByLevel" | "spellSlotRemaining" | "pactMagic" | "pactSlotRemaining"
  >,
): number {
  const minLevel = Math.max(1, spellLevel);
  if (canPayCastAtLevel(input, minLevel)) return minLevel;
  for (let level = minLevel + 1; level <= CAST_SLOT_LEVEL_MAX; level++) {
    if (canPayCastAtLevel(input, level)) return level;
  }
  return minLevel;
}

export function castSlotLevelSummary(
  input: Pick<
    CastSpellAvailabilityInput,
    "slotsByLevel" | "spellSlotRemaining" | "pactMagic" | "pactSlotRemaining"
  >,
  level: number,
): CastSlotLevelSummary {
  const spellSlotsMax = spellSlotMaxAtLevel(input.slotsByLevel, level);
  const spellSlotsRemaining = spellSlotRemainingAtLevel(
    input.slotsByLevel,
    input.spellSlotRemaining,
    level,
  );
  const pactSlotsMax =
    input.pactMagic?.slotLevel === level ? (input.pactMagic?.count ?? 0) : 0;
  const pactSlotsRemaining =
    pactSlotsMax > 0 ? pactSlotRemainingCount(input.pactMagic, input.pactSlotRemaining) : 0;

  return {
    spellSlotsMax,
    spellSlotsRemaining,
    pactSlotsMax,
    pactSlotsRemaining,
    canPayWithSpellSlot: spellSlotsRemaining > 0,
    canPayWithPactSlot: pactSlotsRemaining > 0,
  };
}

function speciesGrantsSpell(feature: SpeciesFeatureData, spellKey: string): boolean {
  return feature.effects.some(
    (effect) =>
      effect.type === "always_prepared_spell" && spellKeyFromName(effect.spellName) === spellKey,
  );
}

function classFeatureGrantsSpell(feature: ClassFeatureData, spellKey: string): boolean {
  return feature.effects?.some(
    (effect) =>
      effect.type === "always_prepared_spells" &&
      effect.spellNames.some((name) => spellKeyFromName(name) === spellKey),
  );
}

function equipmentFreeCastSourcesForSpell(
  input: CastSpellAvailabilityInput,
  spellKey: string,
): SpellFreeCastSource[] {
  const sources: SpellFreeCastSource[] = [];

  for (const gear of input.adventuringGear) {
    for (const pool of equipmentRestUsePoolsForMagicItem(gear.key)) {
      if (pool.id !== spellKey) continue;
      const storageKey = gearRestUsesStorageKey(gear.key, pool.id);
      const remaining = currentEquipmentRestUses(
        input.equipmentRestUsesRemaining,
        storageKey,
        pool.maxUses,
      );
      sources.push({
        id: `equipment:${storageKey}`,
        kind: "equipment",
        label: input.equipmentLabelFor?.(storageKey, gear.key) ?? gear.key,
        remaining,
        maxUses: pool.maxUses,
        equipmentStorageKey: storageKey,
      });
    }
  }

  for (const piece of [...input.weapons, ...input.armor]) {
    if (!piece.variantKey) continue;
    for (const pool of equipmentRestUsePoolsForVariant(piece.variantKey)) {
      if (pool.id !== spellKey) continue;
      const storageKey = armoryRestUsesStorageKey(piece.id, pool.id);
      const remaining = currentEquipmentRestUses(
        input.equipmentRestUsesRemaining,
        storageKey,
        pool.maxUses,
      );
      sources.push({
        id: `equipment:${storageKey}`,
        kind: "equipment",
        label: input.equipmentLabelFor?.(storageKey, piece.variantKey) ?? piece.variantKey,
        remaining,
        maxUses: pool.maxUses,
        equipmentStorageKey: storageKey,
      });
    }
  }

  return sources;
}

export function buildSpellFreeCastSources(input: CastSpellAvailabilityInput): SpellFreeCastSource[] {
  const { spellKey } = input;
  const sources: SpellFreeCastSource[] = [];

  const featTrackers = buildFeatSpellUseTrackers({
    activeFeatKeys: input.activeFeatKeys,
    featChoicesFor: input.featChoicesFor,
  }).filter((tracker) => tracker.spellKey === spellKey);

  for (const tracker of featTrackers) {
    const remaining = readFeatSpellUseCount(
      input.featSpellUses,
      tracker.featKey,
      tracker.spellKey,
      tracker.maxUses,
    );
    const feat = findByKey(FEATS, tracker.featKey);
    sources.push({
      id: `feat:${tracker.storageKey}`,
      kind: "feat",
      label: input.featNameFor?.(tracker.featKey) ?? feat?.name ?? tracker.featKey,
      remaining,
      maxUses: tracker.maxUses,
      featStorageKey: tracker.storageKey,
    });
  }

  if (input.speciesData) {
    const limitedContext = { level: input.level, abilityModifiers: input.abilityModifiers };
    for (const feature of activeLimitedUseSpeciesFeatures(
      input.speciesData,
      input.speciesLineageKey,
      input.level,
    )) {
      if (!speciesGrantsSpell(feature, spellKey)) continue;
      const maxUses = resolveLimitedUses(feature.limitedUses!, limitedContext);
      const remaining = input.speciesFeatureUses[feature.key] ?? maxUses;
      sources.push({
        id: `species:${feature.key}`,
        kind: "species",
        label: input.speciesFeatureNameFor?.(feature.key, feature.name) ?? feature.name,
        remaining,
        maxUses,
        speciesFeatureKey: feature.key,
      });
    }
  }

  sources.push(...equipmentFreeCastSourcesForSpell(input, spellKey));

  for (const feature of input.activeClassFeatures) {
    if (!feature.limitedUses || !classFeatureGrantsSpell(feature, spellKey)) continue;
    const maxUses = resolveLimitedUses(feature.limitedUses, {
      level: input.level,
      abilityModifiers: input.abilityModifiers,
    });
    const remaining = input.classFeatureUses[feature.key] ?? maxUses;
    sources.push({
      id: `class:${feature.key}`,
      kind: "class",
      label: input.classFeatureNameFor?.(feature.key, feature.name) ?? feature.name,
      remaining,
      maxUses,
      classFeatureKey: feature.key,
    });
  }

  return sources;
}

export function defaultCastSlotPool(
  input: Pick<
    CastSpellAvailabilityInput,
    "slotsByLevel" | "spellSlotRemaining" | "pactMagic" | "pactSlotRemaining"
  >,
  level: number,
): CastSlotPool {
  const summary = castSlotLevelSummary(input, level);
  if (summary.canPayWithSpellSlot) return "spell";
  if (summary.canPayWithPactSlot) return "pact";
  return "spell";
}

export function showCastSlotPoolChoice(
  input: Pick<
    CastSpellAvailabilityInput,
    "slotsByLevel" | "spellSlotRemaining" | "pactMagic" | "pactSlotRemaining"
  >,
  level: number,
): boolean {
  const summary = castSlotLevelSummary(input, level);
  return summary.canPayWithSpellSlot && summary.canPayWithPactSlot;
}

export function isCastConfirmEnabled(options: {
  freeCastSourceId: string | null;
  castAsRitual: boolean;
  slotLevel: number;
  slotPool: CastSlotPool;
  input: CastSpellAvailabilityInput;
}): boolean {
  if (options.castAsRitual) {
    return options.input.canCastAsRitual;
  }

  if (options.freeCastSourceId) {
    const source = buildSpellFreeCastSources(options.input).find(
      (entry) => entry.id === options.freeCastSourceId,
    );
    return source != null && source.remaining > 0;
  }

  const summary = castSlotLevelSummary(options.input, options.slotLevel);
  if (options.slotPool === "pact") return summary.canPayWithPactSlot;
  return summary.canPayWithSpellSlot;
}

function appendConcentrationOnSuccessfulCast(
  spellKey: string,
  actions: CharacterAction[],
): CharacterAction[] {
  const spell = findSpellByKey(spellKey);
  if (!spell?.concentration) return actions;
  return [...actions, { type: "SET_CONCENTRATION_SPELL", spellKey }];
}

export function buildCastConfirmActions(options: {
  freeCastSourceId: string | null;
  castAsRitual: boolean;
  slotLevel: number;
  slotPool: CastSlotPool;
  input: CastSpellAvailabilityInput;
}): CharacterAction[] {
  const { spellKey } = options.input;

  if (options.castAsRitual && options.input.canCastAsRitual) {
    return appendConcentrationOnSuccessfulCast(spellKey, []);
  }

  if (options.freeCastSourceId) {
    const source = buildSpellFreeCastSources(options.input).find(
      (entry) => entry.id === options.freeCastSourceId,
    );
    if (!source || source.remaining <= 0) return [];

    if (source.kind === "feat" && source.featStorageKey) {
      return appendConcentrationOnSuccessfulCast(spellKey, [
        { type: "SET_FEAT_SPELL_USES", featKey: source.featStorageKey, value: source.remaining - 1 },
      ]);
    }
    if (source.kind === "species" && source.speciesFeatureKey) {
      return appendConcentrationOnSuccessfulCast(spellKey, [
        {
          type: "SET_SPECIES_FEATURE_USES",
          featureKey: source.speciesFeatureKey,
          value: source.remaining - 1,
        },
      ]);
    }
    if (source.kind === "equipment" && source.equipmentStorageKey) {
      return appendConcentrationOnSuccessfulCast(spellKey, [
        {
          type: "SET_EQUIPMENT_REST_USES",
          storageKey: source.equipmentStorageKey,
          value: source.remaining - 1,
        },
      ]);
    }
    if (source.kind === "class" && source.classFeatureKey) {
      return appendConcentrationOnSuccessfulCast(spellKey, [
        {
          type: "SET_CLASS_FEATURE_USES",
          featureKey: source.classFeatureKey,
          value: source.remaining - 1,
        },
      ]);
    }
    return [];
  }

  const summary = castSlotLevelSummary(options.input, options.slotLevel);
  const usePact = options.slotPool === "pact" && summary.canPayWithPactSlot;
  if (usePact && options.input.pactMagic) {
    const current = pactSlotRemainingCount(options.input.pactMagic, options.input.pactSlotRemaining);
    return appendConcentrationOnSuccessfulCast(spellKey, [
      {
        type: "SET_PACT_SLOT_REMAINING",
        count: current - 1,
        slotLevel: options.input.pactMagic.slotLevel,
      },
    ]);
  }

  if (!summary.canPayWithSpellSlot) return [];
  const current = spellSlotRemainingAtLevel(
    options.input.slotsByLevel,
    options.input.spellSlotRemaining,
    options.slotLevel,
  );
  return appendConcentrationOnSuccessfulCast(spellKey, [
    { type: "SET_SPELL_SLOT_REMAINING", spellLevel: options.slotLevel, value: current - 1 },
  ]);
}

export function buildCastConfirmResult(options: {
  freeCastSourceId: string | null;
  castAsRitual: boolean;
  slotLevel: number;
  slotPool: CastSlotPool;
  input: CastSpellAvailabilityInput;
}): { actions: CharacterAction[]; payment: CompanionSummonPayment } | null {
  const actions = buildCastConfirmActions(options);
  const ritual = options.castAsRitual && options.input.canCastAsRitual;
  if (!ritual && actions.length === 0) return null;
  const spellMin = castSpellMinimumLevel(options.input.spellKey) ?? 1;
  const slotLevel = options.freeCastSourceId || ritual ? spellMin : options.slotLevel;
  return {
    actions,
    payment: {
      spellKey: options.input.spellKey,
      slotLevel,
      freeCastSourceId: options.freeCastSourceId,
      slotPool: options.slotPool,
      ...(ritual ? { castAsRitual: true } : {}),
    },
  };
}

export function applyCompanionSummonPaymentRefund(
  character: {
    spellSlotRemaining: Record<number, number>;
    pactSlotRemaining: { count: number; slotLevel: number } | null;
    featSpellUses: Record<string, number>;
    speciesFeatureUses: Record<string, number>;
    classFeatureUses: Record<string, number>;
    equipmentRestUsesRemaining: Record<string, number>;
  },
  payment: CompanionSummonPayment,
  input: CastSpellAvailabilityInput,
): typeof character {
  if (payment.castAsRitual) return character;

  if (payment.freeCastSourceId) {
    const source = buildSpellFreeCastSources(input).find((entry) => entry.id === payment.freeCastSourceId);
    if (!source) return character;

    if (source.kind === "feat" && source.featStorageKey) {
      const current = input.featSpellUses[source.featStorageKey] ?? source.maxUses;
      return {
        ...character,
        featSpellUses: {
          ...character.featSpellUses,
          [source.featStorageKey]: Math.min(source.maxUses, current + 1),
        },
      };
    }
    if (source.kind === "species" && source.speciesFeatureKey) {
      const current = input.speciesFeatureUses[source.speciesFeatureKey] ?? source.maxUses;
      const restored = Math.min(source.maxUses, current + 1);
      const speciesFeatureUses = { ...character.speciesFeatureUses };
      if (restored >= source.maxUses) delete speciesFeatureUses[source.speciesFeatureKey];
      else speciesFeatureUses[source.speciesFeatureKey] = restored;
      return { ...character, speciesFeatureUses };
    }
    if (source.kind === "equipment" && source.equipmentStorageKey) {
      const current = input.equipmentRestUsesRemaining[source.equipmentStorageKey] ?? source.maxUses;
      return {
        ...character,
        equipmentRestUsesRemaining: {
          ...character.equipmentRestUsesRemaining,
          [source.equipmentStorageKey]: Math.min(source.maxUses, current + 1),
        },
      };
    }
    if (source.kind === "class" && source.classFeatureKey) {
      const current = input.classFeatureUses[source.classFeatureKey] ?? source.maxUses;
      const restored = Math.min(source.maxUses, current + 1);
      const classFeatureUses = { ...character.classFeatureUses };
      if (restored >= source.maxUses) delete classFeatureUses[source.classFeatureKey];
      else classFeatureUses[source.classFeatureKey] = restored;
      return { ...character, classFeatureUses };
    }
    return character;
  }

  const summary = castSlotLevelSummary(input, payment.slotLevel);
  const usePact = payment.slotPool === "pact" && summary.canPayWithPactSlot;
  if (usePact && input.pactMagic) {
    const current = pactSlotRemainingCount(input.pactMagic, input.pactSlotRemaining);
    return {
      ...character,
      pactSlotRemaining: {
        count: Math.min(input.pactMagic.count, current + 1),
        slotLevel: input.pactMagic.slotLevel,
      },
    };
  }

  const max = spellSlotMaxAtLevel(input.slotsByLevel, payment.slotLevel);
  const current = spellSlotRemainingAtLevel(
    input.slotsByLevel,
    input.spellSlotRemaining,
    payment.slotLevel,
  );
  const spellSlotRemaining = { ...character.spellSlotRemaining };
  const restored = Math.min(max, current + 1);
  if (restored >= max) delete spellSlotRemaining[payment.slotLevel];
  else spellSlotRemaining[payment.slotLevel] = restored;
  return { ...character, spellSlotRemaining };
}

export function castSpellMinimumLevel(spellKey: string): number | null {
  const spell = findSpellByKey(spellKey);
  if (!spell || spell.level < 1) return null;
  return spell.level;
}

export function buildCastSpellAvailabilityInputFromCharacter(
  character: {
    spellSlotRemaining: Record<number, number>;
    pactSlotRemaining: { count: number; slotLevel: number } | null;
    featSpellUses: Record<string, number>;
    speciesKey: string | null;
    speciesLineageKey: string | null;
    level: number;
    speciesFeatureUses: Record<string, number>;
    classFeatureUses: Record<string, number>;
    adventuringGear: readonly { key: string }[];
    weapons: readonly { id: string; variantKey?: string }[];
    armor: readonly { id: string; variantKey?: string }[];
    equipmentRestUsesRemaining: Record<string, number>;
  },
  derived: {
    spellcasting?: { slotsByLevel: Record<number, number> } | null;
    pactMagic: PactMagicPool | null;
    abilityModifiers: Record<AbilityId, number>;
    activeClassFeatures?: ClassFeatureData[];
  },
  spellKey: string,
  activeFeatKeys: string[],
  featChoicesFor: (featKey: string, slotIndex?: number) => FeatChoices,
  speciesData: SpeciesData | null,
  ritualEligibleSpellKeys: readonly string[] = [],
): CastSpellAvailabilityInput {
  return {
    spellKey,
    canCastAsRitual: canCastSpellAsRitual(spellKey, ritualEligibleSpellKeys),
    slotsByLevel: derived.spellcasting?.slotsByLevel ?? {},
    spellSlotRemaining: character.spellSlotRemaining,
    pactMagic: derived.pactMagic,
    pactSlotRemaining: character.pactSlotRemaining,
    activeFeatKeys,
    featChoicesFor,
    featSpellUses: character.featSpellUses,
    speciesData,
    speciesLineageKey: character.speciesLineageKey,
    level: character.level,
    abilityModifiers: derived.abilityModifiers,
    speciesFeatureUses: character.speciesFeatureUses,
    adventuringGear: character.adventuringGear,
    weapons: character.weapons,
    armor: character.armor,
    equipmentRestUsesRemaining: character.equipmentRestUsesRemaining,
    classFeatureUses: character.classFeatureUses,
    activeClassFeatures: derived.activeClassFeatures ?? [],
  };
}