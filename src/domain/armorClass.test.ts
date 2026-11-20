import { describe, expect, it } from "vitest";
import type { ArmorData } from "../data/types";
import {
  computeArmorClass,
  computeArmorClassVariants,
  computeMageArmorClass,
  computeMageArmorClassVariants,
} from "./armorClass";

function armor(overrides: Partial<ArmorData> = {}): ArmorData {
  return {
    key: "test-armor",
    name: "Test Armor",
    category: "light",
    acBase: 11,
    acAddDexMod: true,
    acCapDexMod: null,
    strengthScoreRequired: null,
    grantsStealthDisadvantage: false,
    weightLb: 10,
    cost: { amount: 10, denomination: "gp" },
    srd: true,
    book: "XPHB",
    ...overrides,
  };
}

describe("computeArmorClass", () => {
  it("uses 10 plus DEX when unarmored", () => {
    expect(computeArmorClass(2, [])).toBe(12);
    expect(computeArmorClass(-1, [])).toBe(9);
  });

  it("adds the full DEX modifier to light armor", () => {
    expect(computeArmorClass(3, [armor({ acBase: 11 })])).toBe(14);
  });

  it("caps positive DEX for medium armor but retains negative DEX", () => {
    const mediumArmor = armor({ category: "medium", acBase: 14, acCapDexMod: 2 });

    expect(computeArmorClass(4, [mediumArmor])).toBe(16);
    expect(computeArmorClass(-1, [mediumArmor])).toBe(13);
  });

  it("ignores DEX for heavy armor", () => {
    const heavyArmor = armor({ category: "heavy", acBase: 18, acAddDexMod: false });

    expect(computeArmorClass(4, [heavyArmor])).toBe(18);
    expect(computeArmorClass(-2, [heavyArmor])).toBe(18);
  });

  it("adds DEX and CHA for dual-stat unarmored defense without double-counting DEX", () => {
    expect(
      computeArmorClass(2, [], 0, ["dex", "cha"], { str: 0, dex: 2, con: 0, int: 0, wis: 0, cha: 2 }),
    ).toBe(14);
  });

  it("adds one worn shield to body armor or unarmored AC", () => {
    const shield = armor({ key: "shield", name: "Shield", category: "heavy", acBase: 2, acAddDexMod: false });
    const leather = armor({ key: "leather-armor", name: "Leather Armor", acBase: 11 });

    expect(computeArmorClass(2, [leather, shield])).toBe(15);
    expect(computeArmorClass(2, [shield])).toBe(14);
    expect(computeArmorClass(2, [shield, shield])).toBe(14);
  });
});

describe("computeArmorClassVariants", () => {
  it("returns without-shield and with-shield AC from body armor only", () => {
    const leather = armor({ key: "leather-armor", name: "Leather Armor", acBase: 11 });
    const shield = armor({ key: "shield", name: "Shield", category: "heavy", acBase: 2, acAddDexMod: false });

    expect(computeArmorClassVariants(2, [])).toEqual({ withoutShield: 12, withShield: 12 });
    expect(computeArmorClassVariants(2, [leather])).toEqual({ withoutShield: 13, withShield: 13 });
    expect(computeArmorClassVariants(2, [leather, shield])).toEqual({ withoutShield: 13, withShield: 15 });
    expect(computeArmorClassVariants(2, [shield])).toEqual({ withoutShield: 12, withShield: 14 });
  });

  it("uses the equipped shield's actual AC bonus for magical shields", () => {
    const leather = armor({ key: "leather-armor", name: "Leather Armor", acBase: 11 });
    const shieldPlus1 = armor({
      key: "shield",
      name: "+1 Shield",
      category: "heavy",
      acBase: 3,
      acAddDexMod: false,
    });
    const shieldPlus3 = armor({
      key: "shield",
      name: "+3 Shield",
      category: "heavy",
      acBase: 5,
      acAddDexMod: false,
    });

    expect(computeArmorClassVariants(2, [leather, shieldPlus1])).toEqual({
      withoutShield: 13,
      withShield: 16,
    });
    expect(computeArmorClassVariants(2, [leather, shieldPlus3])).toEqual({
      withoutShield: 13,
      withShield: 18,
    });
    expect(
      computeArmorClassVariants(2, [leather, shieldPlus3]).withShield -
        computeArmorClassVariants(2, [leather, shieldPlus3]).withoutShield,
    ).toBe(5);
  });
});

describe("computeMageArmorClass", () => {
  const shield = armor({ key: "shield", name: "Shield", category: "heavy", acBase: 2, acAddDexMod: false });
  const leather = armor({ key: "leather-armor", name: "Leather Armor", acBase: 11 });
  const heavyArmor = armor({ category: "heavy", acBase: 18, acAddDexMod: false });

  it("returns 13 plus DEX when unarmored", () => {
    expect(computeMageArmorClass(2, [])).toBe(15);
    expect(computeMageArmorClass(-1, [])).toBe(12);
  });

  it("adds shield bonus when a shield is worn", () => {
    expect(computeMageArmorClass(2, [shield])).toBe(17);
  });

  it("returns mage armor with-shield and without-shield variants", () => {
    const shieldPlus1 = armor({
      key: "shield",
      name: "+1 Shield",
      category: "heavy",
      acBase: 3,
      acAddDexMod: false,
    });

    expect(computeMageArmorClassVariants(2, [])).toEqual({ withoutShield: 15, withShield: 15 });
    expect(computeMageArmorClassVariants(2, [shield])).toEqual({ withoutShield: 15, withShield: 17 });
    expect(computeMageArmorClassVariants(2, [shieldPlus1])).toEqual({
      withoutShield: 15,
      withShield: 18,
    });
  });

  it("returns null when body armor is worn", () => {
    expect(computeMageArmorClass(2, [leather])).toBeNull();
    expect(computeMageArmorClass(2, [heavyArmor])).toBeNull();
    expect(computeMageArmorClass(2, [leather, shield])).toBeNull();
  });
});
