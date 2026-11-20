import { ARMOR, WEAPONS, findByKey } from "../data";
import type { ArmorData, GenericVariantData, GenericVariantEffect, WeaponData } from "../data/types";
import { variantDisplayName } from "./genericVariantDisplay";
import { findGenericVariant } from "./genericVariantMatcher";

export interface ArmoryPieceRef {
  id: string;
  key: string;
  variantKey?: string;
  attuned?: boolean;
  worn?: boolean;
}

export const ARMORY_CHARGE_STORAGE_PREFIX = "armory:";

export function armoryChargeStorageKey(instanceId: string): string {
  return `${ARMORY_CHARGE_STORAGE_PREFIX}${instanceId}`;
}

export function effectsIfActive(
  variant: GenericVariantData | null | undefined,
  attuned?: boolean,
): GenericVariantEffect[] {
  if (!variant) return [];
  if (variant.requiresAttunement && !attuned) return [];
  return variant.effects;
}

export function activeEffectsForPiece(piece: {
  variantKey?: string;
  attuned?: boolean;
}): GenericVariantEffect[] {
  return effectsIfActive(findGenericVariant(piece.variantKey), piece.attuned);
}

export function hasActiveEffect(
  piece: { variantKey?: string; attuned?: boolean },
  type: GenericVariantEffect["type"],
): boolean {
  return activeEffectsForPiece(piece).some((effect) => effect.type === type);
}

function amountOf(
  effects: GenericVariantEffect[],
  type: "bonusWeapon" | "bonusAc" | "charges",
): number {
  let total = 0;
  for (const effect of effects) {
    if (effect.type === type) total += effect.amount;
  }
  return total;
}

export function bonusWeaponAmount(piece: { variantKey?: string; attuned?: boolean }): number {
  return amountOf(activeEffectsForPiece(piece), "bonusWeapon");
}

export function bonusAcAmount(piece: { variantKey?: string; attuned?: boolean }): number {
  return amountOf(activeEffectsForPiece(piece), "bonusAc");
}

function stripLoadingProperties(properties: string[]): string[] {
  return properties.filter(
    (entry) => entry !== "Loading" && !entry.startsWith("Loading (") && !entry.startsWith("Loading "),
  );
}

export function effectiveWeapon(
  weapon: WeaponData,
  variant: GenericVariantData | null | undefined,
  attuned?: boolean,
): WeaponData {
  const effects = effectsIfActive(variant, attuned);
  const next: WeaponData = {
    ...weapon,
    name: variantDisplayName(weapon.name, variant),
    properties: [...weapon.properties],
  };
  if (effects.some((effect) => effect.type === "ignoreLoading")) {
    next.properties = stripLoadingProperties(next.properties);
  }
  return next;
}

export function effectiveArmor(
  armor: ArmorData,
  variant: GenericVariantData | null | undefined,
  attuned?: boolean,
): ArmorData {
  const effects = effectsIfActive(variant, attuned);
  const next: ArmorData = {
    ...armor,
    name: variantDisplayName(armor.name, variant),
  };
  const acBonus = amountOf(effects, "bonusAc");
  if (acBonus !== 0) next.acBase = armor.acBase + acBonus;
  if (effects.some((effect) => effect.type === "ignoreStrengthRequirement")) {
    next.strengthScoreRequired = null;
  }
  if (effects.some((effect) => effect.type === "ignoreStealthDisadvantage")) {
    next.grantsStealthDisadvantage = false;
  }
  return next;
}

export function resolveEffectiveWeapon(piece: ArmoryPieceRef): WeaponData | null {
  const weapon = findByKey(WEAPONS, piece.key);
  if (!weapon) return null;
  return effectiveWeapon(weapon, findGenericVariant(piece.variantKey), piece.attuned);
}

export function resolveEffectiveArmor(piece: ArmoryPieceRef): ArmorData | null {
  const armor = findByKey(ARMOR, piece.key);
  if (!armor) return null;
  return effectiveArmor(armor, findGenericVariant(piece.variantKey), piece.attuned);
}

export function weaponInstanceGrantsProficiency(piece: {
  variantKey?: string;
  attuned?: boolean;
}): boolean {
  return hasActiveEffect(piece, "grantsProficiency");
}

export function ignoresAmmoConsumption(piece: { variantKey?: string; attuned?: boolean }): boolean {
  return hasActiveEffect(piece, "ignoreAmmoConsumption");
}

export function ignoresThrownQuantitySpend(piece: { variantKey?: string; attuned?: boolean }): boolean {
  return hasActiveEffect(piece, "returningThrown");
}

export interface ArmoryChargeTracker {
  instanceId: string;
  storageKey: string;
  maxUses: number;
  recharge: "dawn";
  kind: "weapon" | "armor";
}

function chargeTrackerForPiece(
  piece: ArmoryPieceRef,
  kind: "weapon" | "armor",
): ArmoryChargeTracker | null {
  const effects = activeEffectsForPiece(piece);
  const charges = effects.find((effect) => effect.type === "charges");
  if (!charges || charges.type !== "charges") return null;
  if (charges.recharge !== "dawn") return null;
  return {
    instanceId: piece.id,
    storageKey: armoryChargeStorageKey(piece.id),
    maxUses: charges.amount,
    recharge: charges.recharge,
    kind,
  };
}

export function collectArmoryChargeTrackers(input: {
  weapons: readonly ArmoryPieceRef[];
  armor: readonly ArmoryPieceRef[];
}): ArmoryChargeTracker[] {
  const trackers: ArmoryChargeTracker[] = [];
  for (const weapon of input.weapons) {
    const tracker = chargeTrackerForPiece(weapon, "weapon");
    if (tracker) trackers.push(tracker);
  }
  for (const armor of input.armor) {
    const tracker = chargeTrackerForPiece(armor, "armor");
    if (tracker) trackers.push(tracker);
  }
  return trackers;
}

export function armoryChargeStorageKeys(
  weapons: readonly ArmoryPieceRef[],
  armor: readonly ArmoryPieceRef[],
): string[] {
  return collectArmoryChargeTrackers({ weapons, armor }).map((tracker) => tracker.storageKey);
}

export function armoryChargeMaxForStorageKey(
  storageKey: string,
  weapons: readonly ArmoryPieceRef[],
  armor: readonly ArmoryPieceRef[],
): number | null {
  const tracker = collectArmoryChargeTrackers({ weapons, armor }).find(
    (entry) => entry.storageKey === storageKey,
  );
  return tracker?.maxUses ?? null;
}

export function wornArmorProficiencyPieces(
  armor: readonly ArmoryPieceRef[],
): { key: string; variantKey?: string }[] {
  const pieces: { key: string; variantKey?: string }[] = [];
  for (const piece of armor) {
    if (!piece.worn) continue;
    if (!hasActiveEffect(piece, "grantsProficiency")) continue;
    pieces.push({ key: piece.key, ...(piece.variantKey ? { variantKey: piece.variantKey } : {}) });
  }
  return pieces;
}
