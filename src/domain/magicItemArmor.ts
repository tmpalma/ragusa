import { ARMOR, MAGIC_ITEMS, findByKey } from "../data";
import type { ArmorData, MagicItemData } from "../data/types";
import type { AdventuringGearEntry } from "./adventuringGear";

const SHIELD_KEY = "shield";

/** Base armor stats for standalone magic armor picked via Adventuring Gear. */
const MAGIC_ITEM_ARMOR_BASE_KEY: Record<string, string> = {
  "sentinel-shield": "shield",
  "shield-of-expression": "shield",
};

export function isCombatMagicItemArmor(item: MagicItemData): boolean {
  return (
    item.category === "armor" &&
    !item.requiresAttunement &&
    (item.rarity === "common" || item.rarity === "uncommon")
  );
}

export function baseArmorKeyForMagicItem(magicItemKey: string): string | null {
  return MAGIC_ITEM_ARMOR_BASE_KEY[magicItemKey] ?? null;
}

export function ownedMagicItemArmor(adventuringGear: readonly AdventuringGearEntry[]): ArmorData[] {
  const armor: ArmorData[] = [];

  for (const entry of adventuringGear) {
    if (entry.quantity <= 0) continue;
    const item = findByKey(MAGIC_ITEMS, entry.key);
    if (!item || !isCombatMagicItemArmor(item)) continue;
    const baseKey = baseArmorKeyForMagicItem(entry.key);
    if (!baseKey) continue;
    const baseArmor = findByKey(ARMOR, baseKey);
    if (!baseArmor) continue;
    armor.push(baseArmor);
  }

  return armor;
}

/** Merge Armory worn pieces with adventuring-gear magic armor when no Armory piece covers that slot. */
export function mergeWornArmorWithAdventuringMagicArmor(
  armoryWorn: ArmorData[],
  adventuringGear: readonly AdventuringGearEntry[],
): ArmorData[] {
  const magicArmor = ownedMagicItemArmor(adventuringGear);
  if (magicArmor.length === 0) return armoryWorn;

  const hasArmoryShield = armoryWorn.some((armor) => armor.key === SHIELD_KEY);
  const bodyArmor = armoryWorn.filter((armor) => armor.key !== SHIELD_KEY);
  const magicShield = hasArmoryShield ? null : magicArmor.find((armor) => armor.key === SHIELD_KEY);

  const merged = [...bodyArmor];
  const armoryBody = armoryWorn.find((armor) => armor.key !== SHIELD_KEY);
  const magicBody = magicArmor.find((armor) => armor.key !== SHIELD_KEY);
  if (!armoryBody && magicBody) merged.unshift(magicBody);

  const armoryShield = armoryWorn.find((armor) => armor.key === SHIELD_KEY);
  if (armoryShield) merged.push(armoryShield);
  else if (magicShield) merged.push(magicShield);

  return merged;
}
