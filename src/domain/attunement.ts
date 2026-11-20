import { ARMOR, MAGIC_ITEMS, WEAPONS, findByKey } from "../data";
import type { MagicItemRarity } from "../data/types";
import { localizedVariantDisplayName, variantDisplayName } from "./genericVariantDisplay";
import type { EntityNameTranslate } from "./genericVariantDisplay";
import { findGenericVariant } from "./genericVariantMatcher";

/** Shared 5e attunement cap: wondrous picks + attuned Armory weapons/armor. */
export const ATTUNED_SLOT_MAX = 3;

export type AttunedWondrousDisplayItem = {
  source: "wondrous";
  key: string;
  weightLb: number;
};

export type AttunedArmoryDisplayItem = {
  source: "armory";
  instanceId: string;
  pieceKind: "weapon" | "armor";
  baseKey: string;
  variantKey: string;
  rarity: MagicItemRarity;
};

export type AttunedDisplayItem = AttunedWondrousDisplayItem | AttunedArmoryDisplayItem;

type EntityNameFn = (catalog: string, key: string | null | undefined, fallback?: string) => string;

export interface AttunementSlotSources {
  attunedMagicItemKeys: readonly string[];
  weapons: readonly { id: string; key: string; variantKey?: string; attuned?: boolean }[];
  armor: readonly { id: string; key: string; variantKey?: string; attuned?: boolean }[];
}

export function countAttunedSlots(sources: AttunementSlotSources): number {
  const fromWondrous = sources.attunedMagicItemKeys.length;
  const fromWeapons = sources.weapons.filter((weapon) => weapon.attuned).length;
  const fromArmor = sources.armor.filter((armor) => armor.attuned).length;
  return fromWondrous + fromWeapons + fromArmor;
}

export function hasFreeAttunementSlot(sources: AttunementSlotSources): boolean {
  return countAttunedSlots(sources) < ATTUNED_SLOT_MAX;
}

/**
 * Whether an Armory piece with this variant may occupy an attunement slot.
 * Unknown keys (catalog missing the variant) allow a toggle so the cap can be tested before extract lands.
 */
export function armoryVariantCanAttune(variantKey: string | undefined): boolean {
  if (!variantKey) return false;
  const variant = findGenericVariant(variantKey);
  if (!variant) return true;
  return variant.requiresAttunement;
}

export function armoryVariantAutoAttunes(variantKey: string | undefined): boolean {
  const variant = findGenericVariant(variantKey);
  return Boolean(variant?.requiresAttunement);
}

export function remainingAttunementSlots(sources: AttunementSlotSources): number {
  return Math.max(0, ATTUNED_SLOT_MAX - countAttunedSlots(sources));
}

/** Max wondrous picks allowed while Armory rows occupy the shared cap. */
export function maxWondrousAttunementPicks(sources: AttunementSlotSources): number {
  return sources.attunedMagicItemKeys.length + remainingAttunementSlots(sources);
}

export function listAttunedDisplayItems(sources: AttunementSlotSources): AttunedDisplayItem[] {
  const items: AttunedDisplayItem[] = [];

  for (const key of sources.attunedMagicItemKeys) {
    const item = findByKey(MAGIC_ITEMS, key);
    items.push({ source: "wondrous", key, weightLb: item?.weightLb ?? 0 });
  }

  for (const weapon of sources.weapons) {
    if (!weapon.attuned || !weapon.variantKey) continue;
    const variant = findGenericVariant(weapon.variantKey);
    if (!variant) continue;
    items.push({
      source: "armory",
      instanceId: weapon.id,
      pieceKind: "weapon",
      baseKey: weapon.key,
      variantKey: weapon.variantKey,
      rarity: variant.rarity,
    });
  }

  for (const armor of sources.armor) {
    if (!armor.attuned || !armor.variantKey) continue;
    const variant = findGenericVariant(armor.variantKey);
    if (!variant) continue;
    items.push({
      source: "armory",
      instanceId: armor.id,
      pieceKind: "armor",
      baseKey: armor.key,
      variantKey: armor.variantKey,
      rarity: variant.rarity,
    });
  }

  return items;
}

export function attunedDisplayItemName(
  item: AttunedDisplayItem,
  entityName: EntityNameFn,
  tEntity?: EntityNameTranslate,
): string {
  if (item.source === "wondrous") {
    const data = findByKey(MAGIC_ITEMS, item.key);
    return entityName("catalog.magicItems", item.key, data?.name ?? item.key);
  }

  const catalog = item.pieceKind === "weapon" ? "catalog.weapons" : "catalog.armor";
  const catalogData =
    item.pieceKind === "weapon"
      ? findByKey(WEAPONS, item.baseKey)
      : findByKey(ARMOR, item.baseKey);
  const baseName = entityName(catalog, item.baseKey, catalogData?.name ?? item.baseKey);
  const variant = findGenericVariant(item.variantKey);
  if (tEntity) return localizedVariantDisplayName(baseName, variant, tEntity);
  return variantDisplayName(baseName, variant);
}
