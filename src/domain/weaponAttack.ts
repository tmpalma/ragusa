import type { AbilityId, WeaponData } from "../data/types";
import { formatModifier } from "./modifiers";
import { PROFICIENCY_BONUS } from "./proficiency";

export interface WeaponAttack {
  ability: AbilityId;
  attackBonus: number;
  damage: string;
  offHandDamage: string;
}

export function offHandDamageModifier(abilityModifier: number): number {
  return Math.min(abilityModifier, 0);
}

export function weaponHasProperty(weapon: WeaponData, property: string): boolean {
  return weapon.properties.some((entry) => entry === property || entry.startsWith(`${property} (`) || entry.startsWith(`${property} `));
}

export function attackAbilityForWeapon(weapon: WeaponData, strModifier: number, dexModifier: number): AbilityId {
  if (weaponHasProperty(weapon, "Finesse")) return strModifier >= dexModifier ? "str" : "dex";
  if (weaponHasProperty(weapon, "Ammunition")) return "dex";
  return "str";
}

export function formatWeaponDamage(
  damageDice: string,
  abilityModifier: number,
  damageType: string,
  extraDamage = 0,
): string {
  const total = abilityModifier + extraDamage;
  const bonus = total === 0 ? "" : formatModifier(total);
  return `${damageDice}${bonus} ${damageType}`;
}

export function isSimpleMeleeWeapon(weapon: WeaponData): boolean {
  if (!weapon.isSimple) return false;
  if (weaponHasProperty(weapon, "Ammunition")) return false;
  // Dart is Simple Ranged in srd-2024 but uses Thrown instead of Ammunition in Open5e data.
  if (weapon.key === "dart") return false;
  return true;
}

/** Martial Melee weapons with the Light property (PHB Monk weapons). */
export function isLightMartialMeleeWeapon(weapon: WeaponData): boolean {
  if (weapon.isSimple) return false;
  if (weaponHasProperty(weapon, "Ammunition")) return false;
  return weaponHasProperty(weapon, "Light");
}

/** Monk weapons: all Simple Melee weapons and Light Martial Melee weapons. */
export function isMonkWeapon(weapon: WeaponData): boolean {
  return isSimpleMeleeWeapon(weapon) || isLightMartialMeleeWeapon(weapon);
}

export function usesIntelligenceForMagicWeaponAttack(
  classKey: string | null,
  subclassKey: string | null,
  level: number,
): boolean {
  return classKey === "artificer" && subclassKey === "battle-smith" && level >= 3;
}

export function isMagicWeaponAttack(input: {
  variantKey?: string | null;
  magicItemKey?: string;
}): boolean {
  return Boolean(input.variantKey || input.magicItemKey);
}

export function computeWeaponAttack(
  weapon: WeaponData,
  abilityModifiers: Record<AbilityId, number>,
  proficiencyBonus = PROFICIENCY_BONUS,
  extraAttackBonus = 0,
  proficient = true,
  martialArtsDie?: string | null,
  extraDamageBonus = 0,
  attackAbilityOverride?: AbilityId,
): WeaponAttack {
  const monkWeapon = martialArtsDie != null && isMonkWeapon(weapon);
  const ability = monkWeapon
    ? "dex"
    : attackAbilityOverride ??
      attackAbilityForWeapon(weapon, abilityModifiers.str, abilityModifiers.dex);
  const modifier = abilityModifiers[ability];
  const profPart = proficient ? proficiencyBonus : 0;
  const damageDice = monkWeapon ? martialArtsDie : weapon.damageDice;
  return {
    ability,
    attackBonus: modifier + profPart + extraAttackBonus,
    damage: formatWeaponDamage(damageDice, modifier, weapon.damageType, extraDamageBonus),
    offHandDamage: formatWeaponDamage(damageDice, offHandDamageModifier(modifier), weapon.damageType, extraDamageBonus),
  };
}

export function computeUnarmedStrike(
  abilityModifiers: Record<AbilityId, number>,
  proficiencyBonus = PROFICIENCY_BONUS,
  martialArtsDie?: string | null,
  featUnarmedDie?: string | null,
): WeaponAttack {
  const useMartialArts = martialArtsDie != null;
  const ability: AbilityId = useMartialArts ? "dex" : "str";
  const modifier = abilityModifiers[ability];
  const damageDice = useMartialArts ? martialArtsDie : (featUnarmedDie ?? "1");
  return {
    ability,
    attackBonus: modifier + proficiencyBonus,
    damage: formatWeaponDamage(damageDice, modifier, "Bludgeoning"),
    offHandDamage: formatWeaponDamage(damageDice, offHandDamageModifier(modifier), "Bludgeoning"),
  };
}
