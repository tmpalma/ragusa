import { describe, expect, it } from "vitest";
import { ARMOR, GENERIC_VARIANTS, WEAPONS, findByKey } from "../data";
import {
  armorForVariant,
  variantMatchesAmmunition,
  variantsForAmmunition,
  variantMatchesArmor,
  variantMatchesWeapon,
  weaponsForVariant,
} from "./genericVariantMatcher";

function variant(key: string) {
  const row = findByKey(GENERIC_VARIANTS, key);
  expect(row, key).toBeTruthy();
  return row!;
}

function weapon(key: string) {
  const row = findByKey(WEAPONS, key);
  expect(row, key).toBeTruthy();
  return row!;
}

function armor(key: string) {
  const row = findByKey(ARMOR, key);
  expect(row, key).toBeTruthy();
  return row!;
}

describe("generic variant matcher", () => {
  it("always allows a mundane (null) variant on any weapon or armor", () => {
    for (const row of WEAPONS) expect(variantMatchesWeapon(null, row)).toBe(true);
    for (const row of ARMOR) expect(variantMatchesArmor(null, row)).toBe(true);
    expect(weaponsForVariant(null)).toHaveLength(WEAPONS.length);
    expect(armorForVariant(null)).toHaveLength(ARMOR.length);
  });

  it("matches Elven Chain to chain mail and chain shirt only", () => {
    const elven = variant("elven-chain");
    expect(armorForVariant(elven).map((row) => row.key).sort()).toEqual(["chain-mail", "chain-shirt"]);
    expect(variantMatchesArmor(elven, armor("plate-armor"))).toBe(false);
    expect(variantMatchesArmor(elven, armor("shield"))).toBe(false);
    expect(variantMatchesWeapon(elven, weapon("longsword"))).toBe(false);
  });

  it("matches +1 Armor to body armor and not shields", () => {
    const gleaming = variant("armor-plus-1");
    const keys = armorForVariant(gleaming).map((row) => row.key).sort();
    expect(keys).toContain("hide-armor");
    expect(keys).toContain("plate-armor");
    expect(keys).toContain("leather-armor");
    expect(keys).not.toContain("shield");
    expect(keys).toHaveLength(ARMOR.length - 1);
    expect(variantMatchesWeapon(gleaming, weapon("longsword"))).toBe(false);
  });

  it("matches +1 Weapon to weapons and not armor", () => {
    const dazzling = variant("weapon-plus-1");
    expect(weaponsForVariant(dazzling)).toHaveLength(WEAPONS.length);
    expect(variantMatchesWeapon(dazzling, weapon("club"))).toBe(true);
    expect(variantMatchesWeapon(dazzling, weapon("longbow"))).toBe(true);
    expect(variantMatchesArmor(dazzling, armor("chain-mail"))).toBe(false);
    expect(variantMatchesArmor(dazzling, armor("shield"))).toBe(false);
  });

  it("extracts ammunition-only variants with appliesTo ammunition", () => {
    const keys = variantsForAmmunition()
      .map((row) => row.key)
      .sort();
    expect(keys).toEqual(
      ["ammunition-of-slaying", "ammunition-plus-1", "ammunition-plus-2", "ammunition-plus-3"].sort(),
    );
    for (const row of variantsForAmmunition()) {
      expect(row.appliesTo).toBe("ammunition");
      expect(variantMatchesAmmunition(row)).toBe(true);
      expect(variantMatchesWeapon(row, weapon("longbow"))).toBe(false);
      expect(variantMatchesArmor(row, armor("leather-armor"))).toBe(false);
    }
  });

  it("matches Energy Bow to longbows and shortbows only", () => {
    const repeating = variant("energy-bow");
    const keys = weaponsForVariant(repeating).map((row) => row.key).sort();
    expect(keys).toEqual(["longbow", "shortbow"]);
    expect(variantMatchesWeapon(repeating, weapon("longsword"))).toBe(false);
    expect(variantMatchesWeapon(repeating, weapon("handaxe"))).toBe(false);
    expect(variantMatchesArmor(repeating, armor("leather-armor"))).toBe(false);
  });
});
