import { describe, expect, it } from "vitest";
import type { AbilityId, WeaponData } from "../data/types";
import { attackAbilityForWeapon, computeUnarmedStrike, computeWeaponAttack, isMonkWeapon, offHandDamageModifier } from "./weaponAttack";

const MODIFIERS: Record<AbilityId, number> = { str: 3, dex: 1, con: 0, int: 0, wis: 0, cha: 0 };
const DEX_FOCUSED: Record<AbilityId, number> = { str: 1, dex: 4, con: 0, int: 0, wis: 0, cha: 0 };

function weapon(overrides: Partial<WeaponData> = {}): WeaponData {
  return {
    key: "test-weapon",
    name: "Test Weapon",
    damageDice: "1d8",
    damageType: "Slashing",
    isSimple: false,
    properties: [],
    mastery: null,
    weightLb: 3,
    cost: { amount: 15, denomination: "gp" },
    srd: true,
    book: "XPHB",
    ...overrides,
  };
}

describe("attackAbilityForWeapon", () => {
  it("uses Strength for melee weapons", () => {
    expect(attackAbilityForWeapon(weapon(), 3, 4)).toBe("str");
  });

  it("uses Dexterity for ammunition weapons", () => {
    expect(attackAbilityForWeapon(weapon({ properties: ["Ammunition (Range 150/600; Arrow)"] }), 5, 1)).toBe("dex");
  });

  it("uses the better of Strength and Dexterity for Finesse weapons", () => {
    expect(attackAbilityForWeapon(weapon({ properties: ["Finesse", "Light"] }), 3, 1)).toBe("str");
    expect(attackAbilityForWeapon(weapon({ properties: ["Finesse", "Light"] }), 1, 3)).toBe("dex");
  });
});

describe("offHandDamageModifier", () => {
  it("drops positive modifiers", () => {
    expect(offHandDamageModifier(3)).toBe(0);
  });

  it("keeps zero and negative modifiers", () => {
    expect(offHandDamageModifier(0)).toBe(0);
    expect(offHandDamageModifier(-1)).toBe(-1);
  });
});

describe("computeWeaponAttack", () => {
  it("adds proficiency to the melee ability modifier", () => {
    const attack = computeWeaponAttack(weapon(), MODIFIERS);
    expect(attack.ability).toBe("str");
    expect(attack.attackBonus).toBe(5);
    expect(attack.damage).toBe("1d8+3 Slashing");
    expect(attack.offHandDamage).toBe("1d8 Slashing");
  });

  it("uses Dexterity for a longbow even when Strength is higher", () => {
    const longbow = weapon({
      name: "Longbow",
      damageDice: "1d8",
      damageType: "Piercing",
      properties: ["Ammunition (Range 150/600; Arrow)", "Heavy"],
    });
    const attack = computeWeaponAttack(longbow, MODIFIERS);
    expect(attack.ability).toBe("dex");
    expect(attack.attackBonus).toBe(3);
    expect(attack.damage).toBe("1d8+1 Piercing");
    expect(attack.offHandDamage).toBe("1d8 Piercing");
  });

  it("uses Dexterity for a finesse weapon when Dexterity is higher", () => {
    const dagger = weapon({
      name: "Dagger",
      damageDice: "1d4",
      damageType: "Piercing",
      properties: ["Finesse", "Light"],
    });
    const attack = computeWeaponAttack(dagger, DEX_FOCUSED);
    expect(attack.ability).toBe("dex");
    expect(attack.attackBonus).toBe(6);
    expect(attack.damage).toBe("1d4+4 Piercing");
    expect(attack.offHandDamage).toBe("1d4 Piercing");
  });

  it("includes negative ability modifiers on off-hand damage", () => {
    const dagger = weapon({
      name: "Dagger",
      damageDice: "1d4",
      damageType: "Piercing",
      properties: ["Finesse", "Light"],
    });
    const lowDex: Record<AbilityId, number> = { str: -2, dex: -1, con: 0, int: 0, wis: 0, cha: 0 };
    const attack = computeWeaponAttack(dagger, lowDex);
    expect(attack.damage).toBe("1d4-1 Piercing");
    expect(attack.offHandDamage).toBe("1d4-1 Piercing");
  });

  it("uses Intelligence when Battle Smith attacks with a magic weapon", () => {
    const crossbow = weapon({
      name: "Heavy Crossbow",
      damageDice: "1d10",
      damageType: "Piercing",
      properties: ["Ammunition (Range 100/400; Bolt)", "Heavy", "Loading", "Two-Handed"],
    });
    const mods: Record<AbilityId, number> = { str: 0, dex: 2, con: 0, int: 4, wis: 0, cha: 0 };
    const mundane = computeWeaponAttack(crossbow, mods);
    const magic = computeWeaponAttack(crossbow, mods, undefined, 0, true, null, 0, "int");
    expect(mundane.ability).toBe("dex");
    expect(mundane.attackBonus).toBe(4);
    expect(magic.ability).toBe("int");
    expect(magic.attackBonus).toBe(6);
    expect(magic.damage).toBe("1d10+4 Piercing");
  });

  it("omits proficiency when the character is not proficient", () => {
    const battleaxe = weapon({
      name: "Battleaxe",
      damageDice: "1d8",
      damageType: "Slashing",
      isSimple: false,
    });
    const attack = computeWeaponAttack(battleaxe, { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, 2, 0, false);
    expect(attack.attackBonus).toBe(0);
  });
});

describe("computeUnarmedStrike", () => {
  it("uses Strength and 1 plus the Strength modifier for damage", () => {
    const attack = computeUnarmedStrike(MODIFIERS);
    expect(attack.ability).toBe("str");
    expect(attack.attackBonus).toBe(5);
    expect(attack.damage).toBe("1+3 Bludgeoning");
    expect(attack.offHandDamage).toBe("1 Bludgeoning");
  });

  it("uses Dexterity and the martial arts die for monks", () => {
    const attack = computeUnarmedStrike({ str: 3, dex: 2, con: 0, int: 0, wis: 0, cha: 0 }, 2, "1d6");
    expect(attack.ability).toBe("dex");
    expect(attack.attackBonus).toBe(4);
    expect(attack.damage).toBe("1d6+2 Bludgeoning");
    expect(attack.offHandDamage).toBe("1d6 Bludgeoning");
  });
});

describe("isMonkWeapon", () => {
  it("includes simple melee weapons", () => {
    expect(isMonkWeapon(weapon({ isSimple: true }))).toBe(true);
    expect(
      isMonkWeapon(weapon({ key: "quarterstaff", isSimple: true, properties: ["Versatile (1d8)"] })),
    ).toBe(true);
  });

  it("includes light martial melee weapons", () => {
    expect(isMonkWeapon(weapon({ key: "scimitar", isSimple: false, properties: ["Finesse", "Light"] }))).toBe(
      true,
    );
  });

  it("excludes simple ranged, heavy martial, and light martial ranged weapons", () => {
    expect(isMonkWeapon(weapon({ key: "dart", isSimple: true, properties: ["Finesse", "Thrown (Range 20/60)"] }))).toBe(
      false,
    );
    expect(isMonkWeapon(weapon({ key: "battleaxe", isSimple: false }))).toBe(false);
    expect(
      isMonkWeapon(
        weapon({ key: "hand-crossbow", isSimple: false, properties: ["Ammunition (Range 30/120)", "Light", "Loading"] }),
      ),
    ).toBe(false);
  });
});

describe("computeWeaponAttack with martial arts", () => {
  it("uses Dexterity and the martial arts die for monk weapons", () => {
    const attack = computeWeaponAttack(
      weapon({
        key: "quarterstaff",
        isSimple: true,
        damageType: "Bludgeoning",
        properties: ["Versatile (1d8)"],
      }),
      { str: 3, dex: 2, con: 0, int: 0, wis: 0, cha: 0 },
      2,
      0,
      true,
      "1d6",
    );
    expect(attack.ability).toBe("dex");
    expect(attack.damage).toBe("1d6+2 Bludgeoning");
  });

  it("keeps normal weapon stats for non-monk weapons", () => {
    const attack = computeWeaponAttack(
      weapon({ key: "battleaxe", isSimple: false }),
      { str: 3, dex: 2, con: 0, int: 0, wis: 0, cha: 0 },
      2,
      0,
      true,
      "1d6",
    );
    expect(attack.ability).toBe("str");
    expect(attack.damage).toBe("1d8+3 Slashing");
  });
});
