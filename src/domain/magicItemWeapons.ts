import { MAGIC_ITEMS, WEAPONS, findByKey } from "../data";
import type { MagicItemData, WeaponData } from "../data/types";
import type { AdventuringGearEntry } from "./adventuringGear";

/** Base weapon stats for standalone magic weapons picked via Adventuring Gear. */
const MAGIC_ITEM_WEAPON_BASE_KEY: Record<string, string> = {
  "javelin-of-lightning": "javelin",
  "staff-of-adornment": "quarterstaff",
  "staff-of-birdcalls": "quarterstaff",
  "staff-of-flowers": "quarterstaff",
};

export interface OwnedMagicItemWeapon {
  magicItemKey: string;
  name: string;
  baseWeapon: WeaponData;
}

export function isCombatMagicItemWeapon(item: MagicItemData): boolean {
  return (
    item.category === "weapon" &&
    !item.requiresAttunement &&
    (item.rarity === "common" || item.rarity === "uncommon")
  );
}

export function baseWeaponKeyForMagicItem(magicItemKey: string): string | null {
  return MAGIC_ITEM_WEAPON_BASE_KEY[magicItemKey] ?? null;
}

export function ownedMagicItemWeapons(adventuringGear: readonly AdventuringGearEntry[]): OwnedMagicItemWeapon[] {
  const owned: OwnedMagicItemWeapon[] = [];

  for (const entry of adventuringGear) {
    if (entry.quantity <= 0) continue;
    const item = findByKey(MAGIC_ITEMS, entry.key);
    if (!item || !isCombatMagicItemWeapon(item)) continue;
    const baseKey = baseWeaponKeyForMagicItem(entry.key);
    if (!baseKey) continue;
    const baseWeapon = findByKey(WEAPONS, baseKey);
    if (!baseWeapon) continue;
    owned.push({ magicItemKey: entry.key, name: item.name, baseWeapon });
  }

  return owned;
}
