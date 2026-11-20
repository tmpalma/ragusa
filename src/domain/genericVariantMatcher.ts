import { ARMOR, GENERIC_VARIANTS, WEAPONS, findByKey } from "../data";
import type { ArmorData, GenericVariantData, GenericVariantRequire, WeaponData } from "../data/types";
import { weaponHasProperty } from "./weaponAttack";

const SWORD_WEAPON_KEYS = new Set(["greatsword", "longsword", "rapier", "scimitar", "shortsword"]);

const PROPERTY_ABBREV: Record<string, string> = {
  A: "Ammunition",
  T: "Thrown",
  LD: "Loading",
  F: "Finesse",
  H: "Heavy",
  L: "Light",
  "2H": "Two-Handed",
  R: "Reach",
  V: "Versatile",
};

function slugifyCatalogName(name: string): string {
  const plus = name.match(/^\+(\d+)\s+(.+)$/);
  const base = plus ? `${plus[2]} plus ${plus[1]}` : name;
  return base
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function asList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function isBodyArmor(armor: ArmorData): boolean {
  return armor.key !== "shield";
}

function isRangedCatalogWeapon(weapon: WeaponData): boolean {
  return weapon.key === "dart" || weaponHasProperty(weapon, "Ammunition");
}

function weaponMatchesType(weapon: WeaponData, type: string): boolean {
  if (type === "M") return !isRangedCatalogWeapon(weapon);
  if (type === "R") return isRangedCatalogWeapon(weapon);
  return false;
}

function armorMatchesType(armor: ArmorData, type: string): boolean {
  if (type === "S") return armor.key === "shield";
  if (type === "LA") return isBodyArmor(armor) && armor.category === "light";
  if (type === "MA") return isBodyArmor(armor) && armor.category === "medium";
  if (type === "HA") return isBodyArmor(armor) && armor.category === "heavy";
  return false;
}

function weaponHasAbbrevProperty(weapon: WeaponData, abbrev: string): boolean {
  const label = PROPERTY_ABBREV[abbrev] ?? abbrev;
  return weaponHasProperty(weapon, label);
}

function nameMatchesKey(name: string, key: string): boolean {
  return slugifyCatalogName(name) === key;
}

function excludedByName(variant: GenericVariantData, key: string): boolean {
  return asList(variant.excludes?.name).some((name) => nameMatchesKey(name, key));
}

function clauseMatchesWeapon(clause: GenericVariantRequire, weapon: WeaponData): boolean {
  if (clause.name && !nameMatchesKey(clause.name, weapon.key)) return false;
  if (clause.weaponCategory === "simple" && !weapon.isSimple) return false;
  if (clause.weaponCategory === "martial" && weapon.isSimple) return false;
  if (clause.sword && !SWORD_WEAPON_KEYS.has(weapon.key)) return false;
  const types = asList(clause.type);
  if (types.length > 0 && !types.some((type) => weaponMatchesType(weapon, type))) return false;
  const properties = asList(clause.property);
  if (properties.length > 0 && !properties.every((property) => weaponHasAbbrevProperty(weapon, property))) {
    return false;
  }
  if (
    types.some((type) => type === "LA" || type === "MA" || type === "HA" || type === "S") &&
    !types.some((type) => type === "M" || type === "R" || type === "A" || type === "AF")
  ) {
    return false;
  }
  return true;
}

function clauseMatchesArmor(clause: GenericVariantRequire, armor: ArmorData): boolean {
  if (clause.weapon || clause.weaponCategory || clause.sword) return false;
  if (clause.name && !nameMatchesKey(clause.name, armor.key)) return false;
  const types = asList(clause.type);
  if (types.length > 0 && !types.some((type) => armorMatchesType(armor, type))) return false;
  if (asList(clause.property).length > 0) return false;
  if (types.some((type) => type === "M" || type === "R" || type === "A" || type === "AF")) return false;
  return true;
}

function anyClauseMatches<T>(
  variant: GenericVariantData,
  item: T,
  match: (clause: GenericVariantRequire, item: T) => boolean,
): boolean {
  if (variant.requires.length === 0) return true;
  return variant.requires.some((clause) => match(clause, item));
}

/** Mundane Armory rows omit `variantKey`. */
export function isMundaneVariantKey(variantKey: string | null | undefined): boolean {
  return variantKey == null || variantKey === "";
}

export function findGenericVariant(variantKey: string | null | undefined): GenericVariantData | null {
  if (isMundaneVariantKey(variantKey)) return null;
  return findByKey(GENERIC_VARIANTS, variantKey);
}

export function variantMatchesAmmunition(variant: GenericVariantData | null | undefined): boolean {
  if (!variant) return true;
  return variant.appliesTo === "ammunition";
}

export function variantsForAmmunition(
  variants: GenericVariantData[] = GENERIC_VARIANTS,
): GenericVariantData[] {
  return variants.filter((variant) => variant.appliesTo === "ammunition");
}

export function variantMatchesWeapon(
  variant: GenericVariantData | null | undefined,
  weapon: WeaponData,
): boolean {
  if (!variant) return true;
  if (variant.appliesTo !== "weapon") return false;
  if (excludedByName(variant, weapon.key)) return false;
  return anyClauseMatches(variant, weapon, clauseMatchesWeapon);
}

export function variantMatchesArmor(variant: GenericVariantData | null | undefined, armor: ArmorData): boolean {
  if (!variant) return true;
  if (variant.appliesTo !== "armor") return false;
  if (excludedByName(variant, armor.key)) return false;
  return anyClauseMatches(variant, armor, clauseMatchesArmor);
}

export function weaponsForVariant(
  variant: GenericVariantData | null | undefined,
  weapons: WeaponData[] = WEAPONS,
): WeaponData[] {
  return weapons.filter((weapon) => variantMatchesWeapon(variant, weapon));
}

export function armorForVariant(
  variant: GenericVariantData | null | undefined,
  armor: ArmorData[] = ARMOR,
): ArmorData[] {
  return armor.filter((row) => variantMatchesArmor(variant, row));
}

export function variantsForWeapon(
  weapon: WeaponData | null | undefined,
  variants: GenericVariantData[] = GENERIC_VARIANTS,
): GenericVariantData[] {
  if (!weapon) return variants.filter((variant) => variant.appliesTo === "weapon");
  return variants.filter((variant) => variantMatchesWeapon(variant, weapon));
}

export function variantsForArmor(
  armor: ArmorData | null | undefined,
  variants: GenericVariantData[] = GENERIC_VARIANTS,
): GenericVariantData[] {
  if (!armor) return variants.filter((variant) => variant.appliesTo === "armor");
  return variants.filter((variant) => variantMatchesArmor(variant, armor));
}
