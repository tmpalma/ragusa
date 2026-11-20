import { describe, expect, it } from "vitest";
import { ARMOR, findByKey, MAGIC_ITEMS } from "../data";
import { computeDerivedStats } from "./deriveCharacter";
import { isCombatMagicItemArmor, mergeWornArmorWithAdventuringMagicArmor } from "./magicItemArmor";
import { INITIAL_CHARACTER } from "../state/characterState";

describe("magicItemArmor", () => {
  it("identifies common/uncommon non-attunement armor magic items", () => {
    const shield = findByKey(MAGIC_ITEMS, "sentinel-shield");
    expect(shield).toBeTruthy();
    expect(isCombatMagicItemArmor(shield!)).toBe(true);
  });

  it("adds adventuring-gear magic shield when Armory has no worn shield", () => {
    const merged = mergeWornArmorWithAdventuringMagicArmor([], [
      { key: "sentinel-shield", quantity: 1 },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.key).toBe("shield");
  });

  it("prefers Armory worn shield over adventuring-gear magic shield", () => {
    const armoryShield = findByKey(ARMOR, "shield");
    const merged = mergeWornArmorWithAdventuringMagicArmor([armoryShield!], [
      { key: "sentinel-shield", quantity: 1 },
    ]);
    expect(merged).toEqual([armoryShield]);
  });
});

describe("deriveCharacter magic item armor", () => {
  it("applies Shield of Expression to barbarian AC on Combat stats", () => {
    const character = {
      ...INITIAL_CHARACTER,
      classKey: "barbarian",
      level: 1,
      abilityScores: { str: 15, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
      adventuringGear: [{ key: "sentinel-shield", quantity: 1 }],
    };
    const derived = computeDerivedStats(character);
    expect(derived.armorClassWithoutShield).toBe(14);
    expect(derived.armorClassWithShield).toBe(16);
    expect(derived.armorClass).toBe(16);
  });

  it("uses the worn +1 shield bonus when splitting shield and no-shield AC", () => {
    const character = {
      ...INITIAL_CHARACTER,
      classKey: "fighter",
      level: 1,
      abilityScores: { str: 15, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
      armor: [
        { id: "body", key: "chain-mail", worn: true },
        { id: "shield", key: "shield", worn: true, variantKey: "shield-plus-1" },
      ],
    };
    const derived = computeDerivedStats(character);
    expect(derived.armorClassWithoutShield).toBe(16);
    expect(derived.armorClassWithShield).toBe(19);
    expect(derived.armorClassWithShield - derived.armorClassWithoutShield).toBe(3);
  });
});
