import { describe, expect, it } from "vitest";
import { findByKey, WEAPONS } from "../data";
import { INITIAL_CHARACTER } from "../state/characterState";
import {
  ammoBonusForType,
  ammunitionRemaining,
  ammunitionTypeForWeapon,
  ammoStackValueCp,
  ammoStackWeightLb,
  isThrownWeapon,
  magicAmmoBonusForVariant,
  ownedAmmoTypes,
  parseAmmunitionTypeFromProperties,
  type MagicAmmunitionStack,
  weaponCarriedWeightLb,
  weaponQuantity,
} from "./ammunition";

function magicAmmoStack(
  id: string,
  ammoType: MagicAmmunitionStack["ammoType"],
  variantKey: string,
  remaining: number,
): MagicAmmunitionStack {
  return { id, ammoType, variantKey, remaining };
}

describe("ammunitionTypeForWeapon", () => {
  it("maps arrow, bolt, and needle weapons", () => {
    expect(ammunitionTypeForWeapon(findByKey(WEAPONS, "longbow")!)).toBe("arrows");
    expect(ammunitionTypeForWeapon(findByKey(WEAPONS, "light-crossbow")!)).toBe("bolts");
    expect(ammunitionTypeForWeapon(findByKey(WEAPONS, "blowgun")!)).toBe("needles");
  });

  it("distinguishes sling bullets from firearm bullets", () => {
    expect(ammunitionTypeForWeapon(findByKey(WEAPONS, "sling")!)).toBe("sling-bullets");
    expect(ammunitionTypeForWeapon(findByKey(WEAPONS, "pistol")!)).toBe("firearm-bullets");
    expect(ammunitionTypeForWeapon(findByKey(WEAPONS, "musket")!)).toBe("firearm-bullets");
  });

  it("returns null for melee weapons", () => {
    expect(ammunitionTypeForWeapon(findByKey(WEAPONS, "longsword")!)).toBeNull();
  });
});

describe("isThrownWeapon", () => {
  it("treats thrown-only weapons as thrown inventory", () => {
    expect(isThrownWeapon(findByKey(WEAPONS, "javelin")!)).toBe(true);
    expect(isThrownWeapon(findByKey(WEAPONS, "dart")!)).toBe(true);
  });

  it("does not treat ammunition weapons as thrown inventory", () => {
    expect(isThrownWeapon(findByKey(WEAPONS, "longbow")!)).toBe(false);
  });
});

describe("parseAmmunitionTypeFromProperties", () => {
  it("extracts the ammo noun from the property string", () => {
    expect(parseAmmunitionTypeFromProperties(["Ammunition (Range 150/600; Arrow)"])).toBe("Arrow");
  });
});

describe("ammo stacks", () => {
  it("scales weight and value by remaining pieces", () => {
    const remaining = { arrows: 10 };
    expect(ammoStackWeightLb(remaining)).toBeCloseTo(0.5);
    expect(ammoStackValueCp(remaining)).toBeCloseTo(50);
    expect(ammunitionRemaining(remaining, "arrows")).toBe(10);
    expect(ammunitionRemaining(remaining, "bolts")).toBe(0);
  });
});

describe("thrown weapon quantity", () => {
  it("defaults missing quantity to 1", () => {
    expect(weaponQuantity({ id: "w1", key: "javelin" })).toBe(1);
  });

  it("scales carried weight for thrown weapons", () => {
    const javelin = findByKey(WEAPONS, "javelin")!;
    const characterWeapon = { id: "w1", key: "javelin", quantity: 8 };
    expect(weaponCarriedWeightLb(characterWeapon, javelin)).toBe(javelin.weightLb * 8);
  });
});

describe("ownedAmmoTypes", () => {
  it("includes ammo types from owned weapons and remaining stacks", () => {
    const character = {
      ...INITIAL_CHARACTER,
      weapons: [{ id: "w1", key: "longbow" }],
      ammunitionRemaining: { bolts: 5 },
    };
    expect(ownedAmmoTypes(character, WEAPONS).sort()).toEqual(["arrows", "bolts"]);
  });

  it("includes ammo types from magic ammunition stacks", () => {
    const character = {
      ...INITIAL_CHARACTER,
      magicAmmunition: [magicAmmoStack("m1", "arrows", "ammunition-plus-1", 10)],
    };
    expect(ownedAmmoTypes(character, WEAPONS)).toEqual(["arrows"]);
  });
});

describe("magic ammunition", () => {
  it("adds magic stack weight and value using mundane per-piece rates", () => {
    const magicStacks = [magicAmmoStack("m1", "arrows", "ammunition-plus-1", 10)];
    expect(ammoStackWeightLb({}, magicStacks)).toBeCloseTo(0.5);
    expect(ammoStackValueCp({}, magicStacks)).toBeCloseTo(50);
  });

  it("resolves bonusWeapon from ammunition variant keys", () => {
    expect(magicAmmoBonusForVariant("ammunition-plus-1")).toBe(1);
    expect(magicAmmoBonusForVariant("ammunition-of-slaying")).toBe(0);
  });

  it("applies preferred magic stack bonus by ammo type", () => {
    const stacks = [magicAmmoStack("m1", "arrows", "ammunition-plus-1", 5)];
    const preferred = { arrows: "m1" };
    expect(ammoBonusForType(stacks, preferred, "arrows")).toBe(1);
    expect(ammoBonusForType(stacks, {}, "arrows")).toBe(0);
    expect(ammoBonusForType(stacks, preferred, "bolts")).toBe(0);
  });
});
