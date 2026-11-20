import { CLASSES, findByKey } from "../data";
import type { ClassFeatureData, RestRecovery, SpeciesFeatureData } from "../data/types";
import type { Character } from "../state/characterState";
import { effectiveLevelPath, resolvedClassLevels } from "./classLevels";
import { featKeysRecoveringOnShortRest } from "./featEffects";
import { pactMagicPool } from "./spellProgression";
import { buildClassFeatureUseTrackers } from "./classFeatures";
import { computeDerivedStats } from "./deriveCharacter";
import { findSubclass, initialSubclassFeatureOptionPicks, subclassFeatureOptionPickCount } from "./subclasses";
import { buildSpeciesFeatureUseTrackers } from "./speciesFeatures";
import { activeSpeciesCantripChoiceKeys } from "./speciesFeatures/contributions";
import { restoreEquipmentRestUsesOnShortRest } from "./equipmentRestUses";
import { reduceExhaustionAfterLongRest } from "./conditions";
import { clearDeathSaves, hasDeathSaveMarks } from "./deathSaves";
import { activeFeatKeysFromSlots, activeFeatSlots } from "./featSlots";
import { applyTrackedCreaturesRest } from "./trackedCreatures";

export type RestKind = "short" | "long";

interface UseTracker {
  featureKey: string;
  maxUses: number;
}

type LimitedUseFeature = Pick<ClassFeatureData | SpeciesFeatureData, "key" | "limitedUses" | "restRecovery">;

function effectiveRestRecovery(recovery?: RestRecovery): RestRecovery {
  return recovery ?? "long";
}

function limitedUseRestRecovery(
  feature: LimitedUseFeature,
  activeFeatures: LimitedUseFeature[],
): RestRecovery {
  if (
    feature.key === "bardic-inspiration" &&
    activeFeatures.some((entry) => entry.key === "font-of-inspiration")
  ) {
    return "short";
  }
  return effectiveRestRecovery(feature.restRecovery);
}

function restoreUsesOnShortRest(
  uses: Record<string, number>,
  trackers: UseTracker[],
  features: LimitedUseFeature[],
): Record<string, number> {
  const featureByKey = new Map(features.map((feature) => [feature.key, feature]));
  let next = uses;
  let changed = false;

  for (const tracker of trackers) {
    const feature = featureByKey.get(tracker.featureKey);
    if (!feature?.limitedUses) continue;

    const recovery = limitedUseRestRecovery(feature, features);
    if (recovery === "long") continue;

    const currentRemaining = next[tracker.featureKey] ?? tracker.maxUses;

    if (recovery === "short") {
      if (tracker.featureKey in next) {
        if (!changed) {
          next = { ...uses };
          changed = true;
        }
        const { [tracker.featureKey]: _removed, ...rest } = next;
        next = rest;
      }
      continue;
    }

    const newRemaining = Math.min(tracker.maxUses, currentRemaining + 1);
    if (newRemaining === tracker.maxUses) {
      if (tracker.featureKey in next) {
        if (!changed) {
          next = { ...uses };
          changed = true;
        }
        const { [tracker.featureKey]: _removed, ...rest } = next;
        next = rest;
      }
    } else if (next[tracker.featureKey] !== newRemaining) {
      if (!changed) {
        next = { ...uses };
        changed = true;
      }
      next = { ...next, [tracker.featureKey]: newRemaining };
    }
  }

  return next;
}

function resetExperimentalElixirPicks(character: Character): Partial<Character> | null {
  if (character.classKey !== "artificer" || character.subclassKey !== "alchemist") return null;
  const subclass = findSubclass(character.classKey, character.subclassKey);
  if (!subclass) return null;
  const count = subclassFeatureOptionPickCount(subclass, "experimental-elixir", character.level);
  if (count <= 0) return null;
  const current = character.subclassFeatureOptionPicks["experimental-elixir"];
  if (!current?.some((pick) => pick != null)) return null;
  return {
    subclassFeatureOptionPicks: {
      ...character.subclassFeatureOptionPicks,
      "experimental-elixir": initialSubclassFeatureOptionPicks(subclass, character.level)["experimental-elixir"] ?? Array.from({ length: count }, () => null),
    },
  };
}

function activeFeatKeys(character: Character): string[] {
  return activeFeatKeysFromSlots(activeFeatSlots(character));
}

function hasPactMagic(character: Character): boolean {
  const classLevels = resolvedClassLevels(effectiveLevelPath(character));
  const warlock = classLevels.find((entry) => entry.classKey === "warlock");
  if (!warlock) return false;
  const classData = findByKey(CLASSES, "warlock");
  return pactMagicPool(classData, warlock.classLevel) !== null;
}

function restorePactSlotsOnShortRest(character: Character): Partial<Character> | null {
  if (!hasPactMagic(character)) return null;
  if (character.pactSlotRemaining === null) return null;
  return { pactSlotRemaining: null };
}

function restoreFeatUsesOnShortRest(character: Character): Record<string, number> {
  const recoverKeys = featKeysRecoveringOnShortRest(activeFeatKeys(character));
  if (recoverKeys.size === 0 || Object.keys(character.featSpellUses).length === 0) {
    return character.featSpellUses;
  }

  let next = character.featSpellUses;
  let changed = false;
  for (const storageKey of Object.keys(next)) {
    const featKey = storageKey.includes(":") ? storageKey.split(":")[0]! : storageKey;
    if (!recoverKeys.has(featKey)) continue;
    if (!changed) {
      next = { ...character.featSpellUses };
      changed = true;
    }
    const { [storageKey]: _removed, ...rest } = next;
    next = rest;
  }
  return changed ? next : character.featSpellUses;
}

/** Long Rest restores all spent Hit Dice to maximum. */
function restoreAllHitDiceOnLongRest(character: Character): Partial<Character> | null {
  const derived = computeDerivedStats(character);
  const depleted = derived.hitDicePools.some((pool) => pool.current < pool.max);
  if (!depleted) return null;

  const updates: Partial<Character> = { hitDiceRemaining: {} };
  if (derived.hitDicePools.length === 1 || character.currentHitDice != null) {
    updates.currentHitDice = null;
  }
  return updates;
}

export function applyRest(input: Character, kind: RestKind): Character {
  let character = input;
  if (character.concentrationSpellKey != null) {
    character = { ...character, concentrationSpellKey: null, concentrationRoundsRemaining: null };
  }

  if (kind === "long") {
    const updates: Partial<Character> = {};
    let changed = false;

    if (Object.keys(character.classFeatureUses).length > 0) {
      updates.classFeatureUses = {};
      changed = true;
    }
    if (Object.keys(character.speciesFeatureUses).length > 0) {
      updates.speciesFeatureUses = {};
      changed = true;
    }
    if (character.currentHitPoints != null) {
      updates.currentHitPoints = null;
      changed = true;
    }
    if (character.hitPointMaxBonus > 0) {
      updates.hitPointMaxBonus = 0;
      changed = true;
    }
    if (character.wildShapeActiveFormKey != null) {
      updates.wildShapeActiveFormKey = null;
      changed = true;
    }
    if (character.temporaryHitPointsMax != null || character.temporaryHitPointsRemaining != null) {
      updates.temporaryHitPointsMax = null;
      updates.temporaryHitPointsRemaining = null;
      changed = true;
    }
    const hitDiceRestore = restoreAllHitDiceOnLongRest(character);
    if (hitDiceRestore) {
      Object.assign(updates, hitDiceRestore);
      changed = true;
    }
    if (hasDeathSaveMarks(character)) {
      Object.assign(updates, clearDeathSaves());
      changed = true;
    }
    const exhaustionUpdate = reduceExhaustionAfterLongRest(character);
    if (exhaustionUpdate) {
      Object.assign(updates, exhaustionUpdate);
      changed = true;
    }
    if (Object.keys(character.spellSlotRemaining).length > 0) {
      updates.spellSlotRemaining = {};
      changed = true;
    }
    if (character.pactSlotRemaining !== null) {
      updates.pactSlotRemaining = null;
      changed = true;
    }
    if (Object.keys(character.createdSpellSlots).length > 0) {
      updates.createdSpellSlots = {};
      changed = true;
    }
    if (Object.keys(character.featSpellUses).length > 0) {
      updates.featSpellUses = {};
      changed = true;
    }
    if (Object.keys(character.equipmentRestUsesRemaining).length > 0) {
      updates.equipmentRestUsesRemaining = {};
      changed = true;
    }
    if (Object.keys(character.classFeaturePoolRemaining).length > 0) {
      updates.classFeaturePoolRemaining = {};
      changed = true;
    }
    const elixirReset = resetExperimentalElixirPicks(character);
    if (elixirReset) {
      Object.assign(updates, elixirReset);
      changed = true;
    }

    const derived = computeDerivedStats(character);
    const cantripChoiceKeys = activeSpeciesCantripChoiceKeys(
      derived.speciesData,
      character.speciesLineageKey,
      character.level,
    );
    if (cantripChoiceKeys.length > 0) {
      const speciesCantripSwapAvailable = { ...character.speciesCantripSwapAvailable };
      for (const key of cantripChoiceKeys) {
        speciesCantripSwapAvailable[key] = true;
      }
      updates.speciesCantripSwapAvailable = speciesCantripSwapAvailable;
      changed = true;
    }

    const rested = changed ? { ...character, ...updates } : character;
    return applyTrackedCreaturesRest(rested, kind);
  }

  if (kind === "short") {
    const derived = computeDerivedStats(character);
    const classTrackers = derived.classData
      ? buildClassFeatureUseTrackers(
          derived.classData,
          character.level,
          derived.abilityModifiers,
          findSubclass(character.classKey, character.subclassKey),
        )
      : [];
    const speciesTrackers = derived.speciesData
      ? buildSpeciesFeatureUseTrackers(
          derived.speciesData,
          character.speciesLineageKey,
          character.level,
          derived.abilityModifiers,
        )
      : [];

    const nextClassUses = restoreUsesOnShortRest(
      character.classFeatureUses,
      classTrackers,
      derived.activeClassFeatures,
    );
    const nextSpeciesUses = restoreUsesOnShortRest(
      character.speciesFeatureUses,
      speciesTrackers,
      derived.activeSpeciesFeatures,
    );

    const pactSlotsRestore = restorePactSlotsOnShortRest(character);
    const nextFeatUses = restoreFeatUsesOnShortRest(character);
    const nextEquipmentRestUses = restoreEquipmentRestUsesOnShortRest(character);

    if (
      nextClassUses === character.classFeatureUses &&
      nextSpeciesUses === character.speciesFeatureUses &&
      !pactSlotsRestore &&
      nextFeatUses === character.featSpellUses &&
      nextEquipmentRestUses === character.equipmentRestUsesRemaining
    ) {
      return applyTrackedCreaturesRest(character, kind);
    }

    const rested = {
      ...character,
      classFeatureUses: nextClassUses,
      speciesFeatureUses: nextSpeciesUses,
      ...(nextFeatUses !== character.featSpellUses ? { featSpellUses: nextFeatUses } : {}),
      ...(nextEquipmentRestUses !== character.equipmentRestUsesRemaining
        ? { equipmentRestUsesRemaining: nextEquipmentRestUses }
        : {}),
      ...(pactSlotsRestore ?? {}),
    };
    return applyTrackedCreaturesRest(rested, kind);
  }

  return character;
}
