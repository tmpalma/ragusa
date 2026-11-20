import { describe, expect, it } from "vitest";
import { INITIAL_CHARACTER } from "../state/characterState";
import {
  carriedWeightLb,
  carryingLimits,
  computeCarryingSummary,
  copperToCoinBreakdown,
  costToCopper,
  effectiveCarryingSizeCategory,
  gearValueCp,
} from "./carryingCapacity";

describe("carryingLimits", () => {
  it("uses SRD multipliers for Small/Medium and drag/lift/push", () => {
    expect(carryingLimits(10, "smallMedium")).toEqual({ carryLb: 150, dragLiftPushLb: 300 });
  });

  it("supports Tiny for rules completeness", () => {
    expect(carryingLimits(10, "tiny")).toEqual({ carryLb: 75, dragLiftPushLb: 150 });
  });

  it("doubles carry limit for Large (Powerful Build)", () => {
    expect(carryingLimits(10, "large")).toEqual({ carryLb: 300, dragLiftPushLb: 600 });
  });
});

describe("effectiveCarryingSizeCategory", () => {
  it("starts at Small/Medium and steps up with Powerful Build", () => {
    expect(effectiveCarryingSizeCategory("medium", 0)).toBe("smallMedium");
    expect(effectiveCarryingSizeCategory("small", 0)).toBe("smallMedium");
    expect(effectiveCarryingSizeCategory("medium", 1)).toBe("large");
  });
});

describe("carriedWeightLb", () => {
  it("sums weapons, armor, misc items, coin weight, and ammunition", () => {
    const character = {
      ...INITIAL_CHARACTER,
      weapons: [{ id: "w1", key: "longsword" }],
      armor: [{ id: "a1", key: "leather-armor", worn: true }],
      inventoryItems: [{ id: "i1", name: "Rope", weightLb: 5, cost: { amount: 1, denomination: "gp" as const } }],
      currency: { pp: 0, gp: 50, ep: 0, sp: 0, cp: 0 },
      ammunitionRemaining: { arrows: 10 },
    };

    // longsword 3 + leather 10 + rope 5 + 50 coins / 50 + 10 arrows at 0.05 lb = 19.5
    expect(carriedWeightLb(character)).toBeCloseTo(19.5);
  });

  it("includes attuned magic items and catalog adventuring gear without double-counting", () => {
    const character = {
      ...INITIAL_CHARACTER,
      adventuringGear: [{ key: "backpack", quantity: 1 }],
      attunedMagicItemKeys: ["wand-of-the-war-mage-plus-1"],
    };
    expect(carriedWeightLb(character)).toBe(6);

    const carriedAndAttuned = {
      ...INITIAL_CHARACTER,
      adventuringGear: [{ key: "wand-of-the-war-mage-plus-1", quantity: 1 }],
      attunedMagicItemKeys: ["wand-of-the-war-mage-plus-1"],
    };
    expect(carriedWeightLb(carriedAndAttuned)).toBe(1);
  });

  it("scales catalog adventuring gear weight and value by quantity", () => {
    const character = {
      ...INITIAL_CHARACTER,
      adventuringGear: [{ key: "rope", quantity: 3 }],
    };
    expect(carriedWeightLb(character)).toBe(15);
    expect(gearValueCp(character)).toBe(300);
  });

  it("subtracts spent pack supplies from carried weight and gear value", () => {
    const fullPack = {
      ...INITIAL_CHARACTER,
      adventuringGear: [{ key: "explorers-pack", quantity: 1 }],
    };
    const spentOil = {
      ...INITIAL_CHARACTER,
      adventuringGear: [{ key: "explorers-pack", quantity: 1, packRemaining: { oil: 1, rations: 10, torch: 10 } }],
    };

    expect(carriedWeightLb(fullPack)).toBe(55);
    expect(carriedWeightLb(spentOil)).toBe(54);
    expect(gearValueCp(fullPack)).toBe(1000);
    expect(gearValueCp(spentOil)).toBe(990);
  });

  it("includes non-attunement magic items picked as adventuring gear", () => {
    const character = {
      ...INITIAL_CHARACTER,
      adventuringGear: [{ key: "bag-of-holding", quantity: 1 }],
    };
    expect(carriedWeightLb(character)).toBe(5);
  });

  it("scales thrown weapon weight by quantity", () => {
    const character = {
      ...INITIAL_CHARACTER,
      weapons: [{ id: "w1", key: "javelin", quantity: 8 }],
    };
    expect(carriedWeightLb(character)).toBe(16);
  });

  it("counts attuned Armory weapon weight once alongside wondrous attunement picks", () => {
    const character = {
      ...INITIAL_CHARACTER,
      attunedMagicItemKeys: ["cloak-of-protection"],
      weapons: [{ id: "w1", key: "heavy-crossbow", variantKey: "repeating-shot", attuned: true }],
    };
    // heavy crossbow 18 lb + cloak 0 lb — not a second crossbow from the attuned list merge
    expect(carriedWeightLb(character)).toBe(18);
  });
});

describe("gearValueCp", () => {
  it("sums catalog gear, misc costs, and ammunition in copper, ignoring the purse", () => {
    const character = {
      ...INITIAL_CHARACTER,
      weapons: [{ id: "w1", key: "dagger" }], // 2 GP = 200 CP
      armor: [{ id: "a1", key: "shield", worn: true }], // 10 GP = 1000 CP
      inventoryItems: [{ id: "i1", name: "Rope", weightLb: 5, cost: { amount: 1, denomination: "sp" as const } }], // 10 CP
      currency: { pp: 0, gp: 999, ep: 0, sp: 0, cp: 0 },
      ammunitionRemaining: { arrows: 10 }, // 50 CP
    };

    expect(gearValueCp(character)).toBe(1260);
  });

  it("converts mixed denominations", () => {
    expect(costToCopper({ amount: 1, denomination: "gp" })).toBe(100);
    expect(costToCopper({ amount: 1, denomination: "sp" })).toBe(10);
    expect(costToCopper({ amount: 1, denomination: "cp" })).toBe(1);
  });
});

describe("copperToCoinBreakdown", () => {
  it("formats compact coin strings from copper", () => {
    expect(copperToCoinBreakdown(1210)).toEqual({ gp: 12, sp: 1 });
  });
});

describe("computeCarryingSummary", () => {
  it("uses derived strength and goliath Powerful Build", () => {
    const character = {
      ...INITIAL_CHARACTER,
      speciesKey: "goliath",
    };

    const summary = computeCarryingSummary(character, 10, 1);
    expect(summary.carryLb).toBe(300);
    expect(summary.dragLiftPushLb).toBe(600);
    expect(summary.currentLb).toBe(0);
  });
});
