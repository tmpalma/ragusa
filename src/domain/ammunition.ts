import { AMMUNITION_STATS, type AmmoType } from "../data/ammunitionStats";
import type { WeaponData } from "../data/types";
import type { Character, CharacterWeapon, MagicAmmunitionStack } from "../state/characterState";
import { costToCopper } from "./carryingCapacity";
import { bonusWeaponAmount, ignoresAmmoConsumption, ignoresThrownQuantitySpend } from "./genericVariantResolve";
import { weaponHasProperty } from "./weaponAttack";

export type { AmmoType };
export type { MagicAmmunitionStack };

const PROPERTY_AMMO_MAP: Record<string, AmmoType> = {
  Arrow: "arrows",
  Bolt: "bolts",
  Needle: "needles",
};

const FIREARM_WEAPON_KEYS = new Set(["pistol", "musket"]);

export function weaponQuantity(weapon: CharacterWeapon): number {
  const quantity = weapon.quantity ?? 1;
  return Number.isFinite(quantity) && quantity >= 0 ? Math.floor(quantity) : 1;
}

export function isThrownWeapon(weapon: WeaponData): boolean {
  return weaponHasProperty(weapon, "Thrown") && !weaponHasProperty(weapon, "Ammunition");
}

export function parseAmmunitionTypeFromProperties(properties: string[]): string | null {
  for (const entry of properties) {
    if (!entry.startsWith("Ammunition (")) continue;
    const match = entry.match(/;\s*([^)]+)\)$/);
    if (match) return match[1].trim();
  }
  return null;
}

export function ammunitionTypeForWeapon(weapon: WeaponData): AmmoType | null {
  if (!weaponHasProperty(weapon, "Ammunition")) return null;

  const rawType = parseAmmunitionTypeFromProperties(weapon.properties);
  if (!rawType) return null;

  if (rawType === "Bullet") {
    return weapon.key === "sling" ? "sling-bullets" : "firearm-bullets";
  }

  const mapped = PROPERTY_AMMO_MAP[rawType];
  if (mapped) return mapped;

  if (FIREARM_WEAPON_KEYS.has(weapon.key)) return "firearm-bullets";
  if (weapon.key === "sling") return "sling-bullets";

  return null;
}

export function ammunitionRemaining(
  remaining: Partial<Record<AmmoType, number>> | undefined,
  type: AmmoType,
): number {
  const value = remaining?.[type] ?? 0;
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function pieceWeightLb(type: AmmoType, count: number): number {
  const stats = AMMUNITION_STATS[type];
  return count * (stats.packWeightLb / stats.packSize);
}

function pieceValueCp(type: AmmoType, count: number): number {
  const stats = AMMUNITION_STATS[type];
  const packCp = costToCopper(stats.packCost);
  return (count * packCp) / stats.packSize;
}

export function magicAmmoStackRemaining(
  stacks: readonly MagicAmmunitionStack[] | undefined,
  id: string,
): number {
  const stack = stacks?.find((entry) => entry.id === id);
  if (!stack) return 0;
  const value = stack.remaining;
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export function magicAmmoStacksForType(
  stacks: readonly MagicAmmunitionStack[] | undefined,
  type: AmmoType,
): MagicAmmunitionStack[] {
  return (stacks ?? []).filter((stack) => stack.ammoType === type);
}

export function magicAmmoBonusForVariant(variantKey: string): number {
  return bonusWeaponAmount({ variantKey });
}

export function ammoStackWeightLb(
  remaining: Partial<Record<AmmoType, number>> | undefined,
  magicStacks: readonly MagicAmmunitionStack[] | undefined = [],
): number {
  const mundaneWeight = (Object.keys(AMMUNITION_STATS) as AmmoType[]).reduce((total, type) => {
    return total + pieceWeightLb(type, ammunitionRemaining(remaining, type));
  }, 0);
  const magicWeight = (magicStacks ?? []).reduce(
    (total, stack) => total + pieceWeightLb(stack.ammoType, magicAmmoStackRemaining(magicStacks, stack.id)),
    0,
  );
  return mundaneWeight + magicWeight;
}

export function ammoStackValueCp(
  remaining: Partial<Record<AmmoType, number>> | undefined,
  magicStacks: readonly MagicAmmunitionStack[] | undefined = [],
): number {
  const mundaneValue = (Object.keys(AMMUNITION_STATS) as AmmoType[]).reduce((total, type) => {
    return total + pieceValueCp(type, ammunitionRemaining(remaining, type));
  }, 0);
  const magicValue = (magicStacks ?? []).reduce(
    (total, stack) => total + pieceValueCp(stack.ammoType, magicAmmoStackRemaining(magicStacks, stack.id)),
    0,
  );
  return mundaneValue + magicValue;
}

export function resolvePreferredMagicAmmoId(
  stacks: readonly MagicAmmunitionStack[] | undefined,
  preferred: Partial<Record<AmmoType, string | null>> | undefined,
  type: AmmoType,
): string | null {
  const preferredId = preferred?.[type];
  if (!preferredId) return null;
  const stack = stacks?.find((entry) => entry.id === preferredId && entry.ammoType === type);
  if (!stack || magicAmmoStackRemaining(stacks, preferredId) <= 0) return null;
  return preferredId;
}

export function ammoBonusForType(
  stacks: readonly MagicAmmunitionStack[] | undefined,
  preferred: Partial<Record<AmmoType, string | null>> | undefined,
  type: AmmoType,
): number {
  const stackId = resolvePreferredMagicAmmoId(stacks, preferred, type);
  if (!stackId) return 0;
  const stack = stacks?.find((entry) => entry.id === stackId);
  return stack ? magicAmmoBonusForVariant(stack.variantKey) : 0;
}

export function thrownWeaponWeightLb(weaponData: WeaponData, quantity: number): number {
  return weaponData.weightLb * quantity;
}

export function thrownWeaponValueCp(weaponData: WeaponData, quantity: number): number {
  return costToCopper(weaponData.cost) * quantity;
}

export function weaponCarriedWeightLb(weapon: CharacterWeapon, weaponData: WeaponData): number {
  if (isThrownWeapon(weaponData)) {
    return thrownWeaponWeightLb(weaponData, weaponQuantity(weapon));
  }
  return weaponData.weightLb;
}

export function weaponGearValueCp(weapon: CharacterWeapon, weaponData: WeaponData): number {
  if (isThrownWeapon(weaponData)) {
    return thrownWeaponValueCp(weaponData, weaponQuantity(weapon));
  }
  return costToCopper(weaponData.cost);
}

export function ownedAmmoTypes(character: Character, weapons: WeaponData[]): AmmoType[] {
  const types = new Set<AmmoType>();
  for (const weapon of character.weapons) {
    const data = weapons.find((entry) => entry.key === weapon.key);
    if (!data) continue;
    const ammoType = ammunitionTypeForWeapon(data);
    if (ammoType) types.add(ammoType);
  }
  for (const type of Object.keys(character.ammunitionRemaining ?? {}) as AmmoType[]) {
    if (ammunitionRemaining(character.ammunitionRemaining, type) > 0) {
      types.add(type);
    }
  }
  for (const stack of character.magicAmmunition ?? []) {
    if (magicAmmoStackRemaining(character.magicAmmunition, stack.id) > 0) {
      types.add(stack.ammoType);
    }
  }
  return [...types];
}

/** Repeating Shot (attuned) produces its own ammo; do not spend packs. */
export function shouldConsumeAmmunition(weapon: CharacterWeapon): boolean {
  return !ignoresAmmoConsumption(weapon);
}

/** Returning Weapon returns after a throw; do not reduce remaining quantity. */
export function shouldConsumeThrownQuantity(weapon: CharacterWeapon): boolean {
  return !ignoresThrownQuantitySpend(weapon);
}
