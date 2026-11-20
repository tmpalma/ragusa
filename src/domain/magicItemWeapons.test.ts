import { describe, expect, it } from "vitest";
import { findByKey, MAGIC_ITEMS } from "../data";
import { buildCombatActions } from "./combatActions";
import { isCombatMagicItemWeapon, ownedMagicItemWeapons } from "./magicItemWeapons";

describe("magicItemWeapons", () => {
  it("identifies common/uncommon non-attunement weapon magic items", () => {
    const javelin = findByKey(MAGIC_ITEMS, "javelin-of-lightning");
    expect(javelin).toBeTruthy();
    expect(isCombatMagicItemWeapon(javelin!)).toBe(true);

    const trident = findByKey(MAGIC_ITEMS, "trident-of-fish-command");
    expect(trident).toBeTruthy();
    expect(isCombatMagicItemWeapon(trident!)).toBe(false);
  });

  it("resolves owned magic item weapons from adventuring gear", () => {
    const owned = ownedMagicItemWeapons([{ key: "javelin-of-lightning", quantity: 1 }]);
    expect(owned).toHaveLength(1);
    expect(owned[0]?.magicItemKey).toBe("javelin-of-lightning");
    expect(owned[0]?.baseWeapon.key).toBe("javelin");
  });
});

describe("buildCombatActions magic item weapons", () => {
  it("adds Javelin of Lightning to attack cards", () => {
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [],
      abilityModifiers: { str: 2, dex: 2, con: 0, int: 0, wis: 0, cha: 0 },
      feats: [],
      magicItemWeapons: ownedMagicItemWeapons([{ key: "javelin-of-lightning", quantity: 1 }]),
    });

    const javelinCard = lists.actions.find((card) => card.id === "magic-item-weapon-javelin-of-lightning");
    expect(javelinCard).toBeTruthy();
    expect(javelinCard?.name).toBe("Javelin of Lightning");
    expect(javelinCard?.entityKey).toBe("javelin");
    expect(javelinCard?.magicItemKey).toBe("javelin-of-lightning");
    expect(javelinCard?.attackMeta?.damage).toContain("Piercing");
  });
});
