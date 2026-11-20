import { describe, expect, it } from "vitest";
import { findGenericVariant } from "./genericVariantMatcher";
import { INITIAL_CHARACTER } from "../state/characterState";
import {
  ATTUNED_SLOT_MAX,
  armoryVariantAutoAttunes,
  armoryVariantCanAttune,
  attunedDisplayItemName,
  countAttunedSlots,
  hasFreeAttunementSlot,
  listAttunedDisplayItems,
  maxWondrousAttunementPicks,
  remainingAttunementSlots,
} from "./attunement";

describe("countAttunedSlots", () => {
  it("sums wondrous picks with attuned weapons and armor", () => {
    expect(
      countAttunedSlots({
        attunedMagicItemKeys: ["cloak-of-protection", "bracers-of-archery"],
        weapons: [
          { id: "w1", key: "longsword", attuned: true },
          { id: "w2", key: "longsword", variantKey: "weapon-plus-1" },
        ],
        armor: [
          { id: "a1", key: "plate-armor", attuned: true },
          { id: "a2", key: "leather-armor", attuned: false },
        ],
      }),
    ).toBe(4);
  });

  it("ignores unattuned Armory rows", () => {
    expect(
      countAttunedSlots({
        attunedMagicItemKeys: ["cloak-of-protection"],
        weapons: [{ id: "w1", key: "longsword", variantKey: "dazzling-weapon" }],
        armor: [{ id: "a1", key: "chain-mail", variantKey: "elven-chain" }],
      }),
    ).toBe(1);
  });

  it("has a free slot below the shared cap of three", () => {
    const full = {
      attunedMagicItemKeys: ["cloak-of-protection", "bracers-of-archery"],
      weapons: [{ id: "w1", key: "longsword", attuned: true }],
      armor: [] as { id: string; key: string; variantKey?: string; attuned?: boolean }[],
    };
    expect(countAttunedSlots(full)).toBe(ATTUNED_SLOT_MAX);
    expect(hasFreeAttunementSlot(full)).toBe(false);
    expect(hasFreeAttunementSlot({ ...full, weapons: [] })).toBe(true);
  });
});

describe("armory variant attunement lookup", () => {
  it("does not auto-attune when the catalog entry is missing", () => {
    const missing = findGenericVariant("dazzling-weapon");
    if (missing) {
      expect(armoryVariantAutoAttunes("dazzling-weapon")).toBe(missing.requiresAttunement);
      return;
    }
    expect(armoryVariantAutoAttunes("dazzling-weapon")).toBe(false);
    expect(armoryVariantCanAttune("dazzling-weapon")).toBe(true);
  });

  it("never attunes a mundane piece", () => {
    expect(armoryVariantCanAttune(undefined)).toBe(false);
    expect(armoryVariantAutoAttunes(undefined)).toBe(false);
  });
});

describe("listAttunedDisplayItems", () => {
  const entityName = (_catalog: string, _key: string | null | undefined, fallback?: string) =>
    fallback ?? "";

  it("merges wondrous picks with attuned Armory weapons and armor", () => {
    const character = {
      ...INITIAL_CHARACTER,
      attunedMagicItemKeys: ["cloak-of-protection"],
      weapons: [{ id: "w1", key: "longsword", variantKey: "defender", attuned: true }],
      armor: [{ id: "a1", key: "plate-armor", worn: true, variantKey: "armor-plus-1", attuned: true }],
    };

    const items = listAttunedDisplayItems(character);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ source: "wondrous", key: "cloak-of-protection" });
    expect(items[1]).toMatchObject({
      source: "armory",
      instanceId: "w1",
      pieceKind: "weapon",
      variantKey: "defender",
    });
    expect(items[2]).toMatchObject({
      source: "armory",
      instanceId: "a1",
      pieceKind: "armor",
      variantKey: "armor-plus-1",
    });

    const names = items.map((item) => attunedDisplayItemName(item, entityName));
    expect(names).toEqual(["Cloak of Protection", "Defender Longsword", "+1 Plate Armor"]);
  });

  it("limits wondrous picker capacity when Armory rows occupy shared slots", () => {
    const character = {
      ...INITIAL_CHARACTER,
      attunedMagicItemKeys: ["cloak-of-protection"],
      weapons: [
        { id: "w1", key: "longsword", variantKey: "defender", attuned: true },
        { id: "w2", key: "longsword", variantKey: "weapon-plus-1", attuned: true },
      ],
      armor: [],
    };

    expect(countAttunedSlots(character)).toBe(3);
    expect(remainingAttunementSlots(character)).toBe(0);
    expect(maxWondrousAttunementPicks(character)).toBe(1);
  });
});
