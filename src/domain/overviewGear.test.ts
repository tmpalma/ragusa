import { describe, expect, it } from "vitest";
import { INITIAL_CHARACTER } from "../state/characterState";
import { overviewGearLines } from "./overviewGear";

const names = {
  weaponName: (key: string) =>
    ({ longsword: "Longsword", dagger: "Dagger" })[key] ?? key,
  armorName: (key: string) => ({ "leather-armor": "Leather Armor" })[key] ?? key,
  gearPickName: (key: string) =>
    ({ backpack: "Backpack", rope: "Rope", "cloak-of-protection": "Cloak of Protection" })[key] ?? key,
  magicItemName: (key: string) =>
    ({ "cloak-of-protection": "Cloak of Protection" })[key] ?? key,
  ammoTypeName: (type: string) => ({ arrows: "Arrows" })[type] ?? type,
};

describe("overviewGearLines", () => {
  it("includes variant display names on weapons and armor", () => {
    const lines = overviewGearLines(
      {
        ...INITIAL_CHARACTER,
        weapons: [{ id: "w1", key: "longsword", variantKey: "weapon-plus-1" }],
        armor: [{ id: "a1", key: "leather-armor", worn: true, variantKey: "armor-of-acid-resistance" }],
      },
      names,
    );

    expect(lines).toEqual(["+1 Longsword", "Leather Armor of Acid Resistance"]);
  });

  it("appends thrown quantity when greater than one", () => {
    const lines = overviewGearLines(
      {
        ...INITIAL_CHARACTER,
        weapons: [{ id: "w1", key: "dagger", quantity: 3 }],
      },
      names,
    );

    expect(lines).toEqual(["Dagger ×3"]);
  });

  it("lists mundane ammo with remaining count", () => {
    const lines = overviewGearLines(
      {
        ...INITIAL_CHARACTER,
        ammunitionRemaining: { arrows: 20 },
      },
      names,
    );

    expect(lines).toEqual(["Arrows ×20"]);
  });

  it("lists attuned wondrous items without duplicating armory weapons", () => {
    const lines = overviewGearLines(
      {
        ...INITIAL_CHARACTER,
        weapons: [{ id: "w1", key: "longsword", variantKey: "weapon-plus-1", attuned: true }],
        attunedMagicItemKeys: ["cloak-of-protection"],
        adventuringGear: [{ key: "cloak-of-protection", quantity: 1 }],
      },
      names,
    );

    expect(lines).toEqual(["+1 Longsword", "Cloak of Protection"]);
    expect(lines.filter((line) => line.includes("Longsword"))).toHaveLength(1);
    expect(lines.filter((line) => line.includes("Cloak"))).toHaveLength(1);
  });

  it("includes artificer replicated magic items", () => {
    const lines = overviewGearLines(
      {
        ...INITIAL_CHARACTER,
        classKey: "artificer",
        level: 3,
        artificerCreatedItemKeys: ["bag-of-holding", "repeating-shot"],
      },
      {
        ...names,
        artificerCreatedItemName: (key) =>
          key === "bag-of-holding" ? "Bag of Holding" : "Repeating Shot",
      },
    );

    expect(lines).toEqual(["Bag of Holding", "Repeating Shot"]);
  });

  it("includes adventuring gear, misc items, and magic ammo stacks when present", () => {
    const lines = overviewGearLines(
      {
        ...INITIAL_CHARACTER,
        adventuringGear: [{ key: "backpack", quantity: 1 }, { key: "rope", quantity: 3 }],
        inventoryItems: [{ id: "i1", name: "Lucky charm", weightLb: 0, cost: { amount: 0, denomination: "cp" } }],
        magicAmmunition: [
          { id: "m1", ammoType: "arrows", variantKey: "ammunition-plus-1", remaining: 10 },
        ],
      } as typeof INITIAL_CHARACTER & {
        magicAmmunition: { id: string; ammoType: "arrows"; variantKey: string; remaining: number }[];
      },
      {
        ...names,
        magicAmmoName: (variantKey, ammoType) =>
          variantKey === "ammunition-plus-1" ? `+1 ${names.ammoTypeName(ammoType)}` : variantKey,
      },
    );

    expect(lines).toEqual(["Backpack", "Rope ×3", "Lucky charm", "+1 Arrows ×10"]);
  });
});
