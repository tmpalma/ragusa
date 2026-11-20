import { AMMO_TYPES, ARMOR, MAGIC_ITEMS, WEAPONS, findByKey } from "../data";
import type { AmmoType } from "../data/ammunitionStats";
import type { Character, CharacterWeapon } from "../state/characterState";
import { artificerCreatedItemLabel, listArtificerCreatedItemKeys } from "./artificerCreatedItems";
import { ammunitionRemaining, isThrownWeapon, weaponQuantity } from "./ammunition";
import { variantDisplayName } from "./genericVariantDisplay";
import { findGenericVariant } from "./genericVariantMatcher";

export interface OverviewGearNameFns {
  weaponName: (key: string) => string;
  armorName: (key: string) => string;
  /** Localized base + variant affixes; falls back to English JSON affixes when omitted. */
  variantGearName?: (baseName: string, variantKey?: string) => string;
  gearPickName: (key: string) => string;
  magicItemName: (key: string) => string;
  artificerCreatedItemName?: (key: string) => string;
  ammoTypeName: (type: AmmoType) => string;
  magicAmmoName?: (variantKey: string, ammoType: AmmoType) => string;
}

/** Optional magic ammunition stacks (slice 5); absent until implemented. */
export interface MagicAmmunitionStack {
  id: string;
  ammoType: AmmoType;
  variantKey: string;
  remaining: number;
}

type CharacterWithMagicAmmo = Character & {
  magicAmmunition?: MagicAmmunitionStack[];
};

function quantitySuffix(quantity: number): string {
  return quantity > 1 ? ` ×${quantity}` : "";
}

function gearVariantName(baseName: string, variantKey: string | undefined, names: OverviewGearNameFns): string {
  if (names.variantGearName) return names.variantGearName(baseName, variantKey);
  return variantDisplayName(baseName, findGenericVariant(variantKey));
}

function weaponLine(entry: CharacterWeapon, names: OverviewGearNameFns): string | null {
  const weapon = findByKey(WEAPONS, entry.key);
  if (!weapon) return null;
  const name = gearVariantName(names.weaponName(entry.key), entry.variantKey, names);
  const qty = isThrownWeapon(weapon) ? quantitySuffix(weaponQuantity(entry)) : "";
  return `${name}${qty}`;
}

/** Flat owned-gear labels for the Overview tab, in stable display order. */
export function overviewGearLines(character: Character, names: OverviewGearNameFns): string[] {
  const lines: string[] = [];

  for (const entry of character.weapons) {
    const line = weaponLine(entry, names);
    if (line) lines.push(line);
  }

  for (const entry of character.armor) {
    const armor = findByKey(ARMOR, entry.key);
    if (!armor) continue;
    const name = gearVariantName(names.armorName(entry.key), entry.variantKey, names);
    lines.push(name);
  }

  const carriedGearKeys = new Set<string>();
  for (const entry of character.adventuringGear) {
    carriedGearKeys.add(entry.key);
    const label = names.gearPickName(entry.key);
    lines.push(entry.quantity > 1 ? `${label} ×${entry.quantity}` : label);
  }

  for (const key of character.attunedMagicItemKeys) {
    if (carriedGearKeys.has(key)) continue;
    const item = findByKey(MAGIC_ITEMS, key);
    if (item) lines.push(names.magicItemName(key));
  }

  for (const key of listArtificerCreatedItemKeys(character)) {
    lines.push(
      names.artificerCreatedItemName?.(key) ??
        artificerCreatedItemLabel(key, {
          magicItemName: names.magicItemName,
          variantName: (variantKey) =>
            findGenericVariant(variantKey)?.name ?? variantKey,
          planName: (planKey) => planKey,
        }),
    );
  }

  for (const item of character.inventoryItems) {
    lines.push(item.name);
  }

  for (const type of AMMO_TYPES) {
    const remaining = ammunitionRemaining(character.ammunitionRemaining, type);
    if (remaining > 0) {
      lines.push(`${names.ammoTypeName(type)} ×${remaining}`);
    }
  }

  const magicStacks = (character as CharacterWithMagicAmmo).magicAmmunition;
  if (magicStacks?.length) {
    for (const stack of magicStacks) {
      if (stack.remaining <= 0) continue;
      const label = names.magicAmmoName
        ? names.magicAmmoName(stack.variantKey, stack.ammoType)
        : stack.variantKey;
      lines.push(`${label} ×${stack.remaining}`);
    }
  }

  return lines;
}
