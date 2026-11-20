import type { AbilityId, ArmorData } from "../data/types";

const SHIELD_KEY = "shield";
const SHIELD_BONUS = 2;
const MAGE_ARMOR_BASE = 13;
const BODY_ARMOR_CATEGORIES = new Set(["light", "medium", "heavy"]);

export function hasWornBodyArmor(wornArmor: ArmorData[]): boolean {
  return wornArmor.some(
    (armor) => armor.key !== SHIELD_KEY && BODY_ARMOR_CATEGORIES.has(armor.category),
  );
}

export interface ArmorClassVariants {
  withoutShield: number;
  withShield: number;
}

function unarmoredDefenseAc(
  dexModifier: number,
  unarmoredDefenseAbilities: AbilityId[],
  abilityModifiers: Record<AbilityId, number>,
): number {
  const extra = unarmoredDefenseAbilities.reduce((sum, ability) => sum + abilityModifiers[ability], 0);
  if (unarmoredDefenseAbilities.includes("dex")) {
    return 10 + extra;
  }
  return 10 + dexModifier + extra;
}

function baseArmorClass(
  dexModifier: number,
  wornArmor: ArmorData[],
  unarmoredDefenseAbilities: AbilityId[] | null,
  abilityModifiers: Record<AbilityId, number>,
  unarmoredDefenseDisallowShield = false,
  mediumArmorDexCapOverride: number | null = null,
): number {
  const bodyArmor = wornArmor.find((armor) => armor.key !== SHIELD_KEY);
  const hasShield = wornArmor.some((armor) => armor.key === SHIELD_KEY);

  if (bodyArmor) {
    return bodyArmor.acBase + dexContribution(bodyArmor, dexModifier, mediumArmorDexCapOverride);
  }

  const shieldBlocksUnarmored = unarmoredDefenseDisallowShield && hasShield;
  if (unarmoredDefenseAbilities && unarmoredDefenseAbilities.length > 0 && !shieldBlocksUnarmored) {
    return unarmoredDefenseAc(dexModifier, unarmoredDefenseAbilities, abilityModifiers);
  }

  return 10 + dexModifier;
}

export function shieldAcBonus(wornArmor: ArmorData[]): number {
  const shield = wornArmor.find((armor) => armor.key === SHIELD_KEY);
  if (!shield) return 0;
  return shield.acBase > 0 ? shield.acBase : SHIELD_BONUS;
}

export function computeArmorClassVariants(
  dexModifier: number,
  wornArmor: ArmorData[],
  acBonus = 0,
  unarmoredDefenseAbilities: AbilityId[] | null = null,
  abilityModifiers: Record<AbilityId, number> = { str: 0, dex: dexModifier, con: 0, int: 0, wis: 0, cha: 0 },
  unarmoredDefenseDisallowShield = false,
  mediumArmorDexCapOverride: number | null = null,
): ArmorClassVariants {
  const hasShield = wornArmor.some((armor) => armor.key === SHIELD_KEY);
  const bodyArmorOnly = wornArmor.filter((armor) => armor.key !== SHIELD_KEY);
  const withoutShield = baseArmorClass(
    dexModifier,
    bodyArmorOnly,
    unarmoredDefenseAbilities,
    abilityModifiers,
    false,
    mediumArmorDexCapOverride,
  ) + acBonus;
  const withShield = hasShield
    ? baseArmorClass(
        dexModifier,
        wornArmor,
        unarmoredDefenseAbilities,
        abilityModifiers,
        unarmoredDefenseDisallowShield,
        mediumArmorDexCapOverride,
      ) + acBonus + shieldAcBonus(wornArmor)
    : withoutShield;

  return { withoutShield, withShield };
}

export function computeArmorClass(
  dexModifier: number,
  wornArmor: ArmorData[],
  acBonus = 0,
  unarmoredDefenseAbilities: AbilityId[] | null = null,
  abilityModifiers: Record<AbilityId, number> = { str: 0, dex: dexModifier, con: 0, int: 0, wis: 0, cha: 0 },
  unarmoredDefenseDisallowShield = false,
  mediumArmorDexCapOverride: number | null = null,
): number {
  const shield = wornArmor.find((armor) => armor.key === SHIELD_KEY);
  const { withoutShield, withShield } = computeArmorClassVariants(
    dexModifier,
    wornArmor,
    acBonus,
    unarmoredDefenseAbilities,
    abilityModifiers,
    unarmoredDefenseDisallowShield,
    mediumArmorDexCapOverride,
  );

  return shield ? withShield : withoutShield;
}

export interface MageArmorClassVariants {
  withoutShield: number;
  withShield: number;
}

export function computeMageArmorClassVariants(
  dexModifier: number,
  wornArmor: ArmorData[],
): MageArmorClassVariants | null {
  if (hasWornBodyArmor(wornArmor)) return null;

  const withoutShield = MAGE_ARMOR_BASE + dexModifier;
  const hasShield = wornArmor.some((armor) => armor.key === SHIELD_KEY);
  const withShield = withoutShield + (hasShield ? shieldAcBonus(wornArmor) : 0);

  return { withoutShield, withShield };
}

export function computeMageArmorClass(dexModifier: number, wornArmor: ArmorData[]): number | null {
  const variants = computeMageArmorClassVariants(dexModifier, wornArmor);
  if (!variants) return null;

  const hasShield = wornArmor.some((armor) => armor.key === SHIELD_KEY);
  return hasShield ? variants.withShield : variants.withoutShield;
}

function dexContribution(
  armor: ArmorData,
  dexModifier: number,
  mediumArmorDexCapOverride: number | null = null,
): number {
  if (!armor.acAddDexMod) return 0;
  if (armor.acCapDexMod === null) return dexModifier;
  const cap =
    armor.category === "medium" && mediumArmorDexCapOverride != null
      ? Math.max(armor.acCapDexMod, mediumArmorDexCapOverride)
      : armor.acCapDexMod;
  return Math.min(dexModifier, cap);
}
