import { describe, expect, it } from "vitest";
import { ARMOR, GENERIC_VARIANTS, WEAPONS, findByKey } from "../data";
import type { GenericVariantData } from "../data/types";
import { INITIAL_CHARACTER, characterReducer, type Character } from "../state/characterState";
import {
  ammoBonusForType,
  shouldConsumeAmmunition,
  shouldConsumeThrownQuantity,
  type MagicAmmunitionStack,
} from "./ammunition";
import { buildCombatActions } from "./combatActions";
import { computeDerivedStats } from "./deriveCharacter";
import { variantDisplayName } from "./genericVariantDisplay";
import {
  bonusWeaponAmount,
  effectiveArmor,
  effectiveWeapon,
  effectsIfActive,
  resolveEffectiveArmor,
  resolveEffectiveWeapon,
  wornArmorProficiencyPieces,
} from "./genericVariantResolve";
import { applyRest } from "./rest";
import { buildTrainingSummary, formatTrainingArmorLine } from "./training";
import { EMPTY_FEAT_CHOICES, collectFeatContributions } from "./featEffects";
import { computeWeaponAttack } from "./weaponAttack";

const FIGHTER_MODS = { str: 3, dex: 2, con: 2, int: 0, wis: 1, cha: -1 };
const MARTIAL = [{ kind: "martial" as const }, { kind: "simple" as const }];

function variant(key: string) {
  const row = findByKey(GENERIC_VARIANTS, key);
  expect(row, key).toBeTruthy();
  return row!;
}

function weapon(key: string) {
  return findByKey(WEAPONS, key)!;
}

function armor(key: string) {
  return findByKey(ARMOR, key)!;
}

function inlineVariant(partial: Pick<GenericVariantData, "key" | "effects"> & Partial<GenericVariantData>): GenericVariantData {
  return {
    name: partial.key,
    desc: "Inline variant fixture.",
    srd: false,
    book: "XDMG",
    rarity: "rare",
    appliesTo: "weapon",
    requiresAttunement: true,
    requires: [],
    ...partial,
  };
}

describe("effectsIfActive", () => {
  it("applies non-attunement variants without attuned", () => {
    const plusOne = variant("weapon-plus-1");
    expect(effectsIfActive(plusOne, false).some((effect) => effect.type === "bonusWeapon")).toBe(true);
  });

  it("hides attunement bonuses until the instance is attuned", () => {
    const dazzling = variant("defender");
    expect(effectsIfActive(dazzling, false)).toEqual([]);
    expect(effectsIfActive(dazzling, true).some((effect) => effect.type === "bonusWeapon")).toBe(true);
  });
});

describe("effective overlays", () => {
  it("adds +1 to longsword attack and damage", () => {
    const longsword = weapon("longsword");
    const mundane = computeWeaponAttack(longsword, FIGHTER_MODS, undefined, 0, true);
    const piece = { id: "w1", key: "longsword", variantKey: "weapon-plus-1" };
    const bonus = bonusWeaponAmount(piece);
    const magic = computeWeaponAttack(longsword, FIGHTER_MODS, undefined, bonus, true, null, bonus);
    expect(mundane.attackBonus).toBe(5);
    expect(mundane.damage).toBe("1d8+3 Slashing");
    expect(magic.attackBonus).toBe(6);
    expect(magic.damage).toBe("1d8+4 Slashing");

    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [piece],
      abilityModifiers: FIGHTER_MODS,
      feats: [],
      weaponProficiencyGrants: MARTIAL,
    });
    const card = lists.actions.find((entry) => entry.id === "weapon-w1");
    expect(card?.name).toBe("+1 Longsword");
    expect(card?.attackMeta?.bonus).toBe("+6");
    expect(card?.attackMeta?.damage).toBe("1d8+4 Slashing");
  });

  it("does not grant the bonus from an unattuned Defender", () => {
    const piece = { id: "w1", key: "longsword", variantKey: "defender" };
    expect(bonusWeaponAmount(piece)).toBe(0);
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [piece],
      abilityModifiers: FIGHTER_MODS,
      feats: [],
      weaponProficiencyGrants: MARTIAL,
    });
    const card = lists.actions.find((entry) => entry.id === "weapon-w1");
    expect(card?.name).toBe("Defender Longsword");
    expect(card?.attackMeta?.bonus).toBe("+5");
    expect(card?.attackMeta?.damage).toBe("1d8+3 Slashing");
    expect(card?.chargeUses).toBeUndefined();
  });

  it("strips Loading when an attuned variant ignores it", () => {
    const crossbow = weapon("light-crossbow");
    expect(crossbow.properties).toContain("Loading");
    const repeating = inlineVariant({
      key: "ignore-loading-fixture",
      namePrefix: "Repeating ",
      effects: [{ type: "ignoreLoading" }, { type: "ignoreAmmoConsumption" }],
    });
    const overlay = effectiveWeapon(crossbow, repeating, true);
    expect(overlay.properties).not.toContain("Loading");
    expect(overlay.name).toBe("Repeating Light Crossbow");
    expect(effectsIfActive(repeating, false)).toEqual([]);
    expect(effectiveWeapon(crossbow, repeating, false).properties).toContain("Loading");
  });

  it("clears Mithral STR and stealth flags on the worn row", () => {
    const plate = armor("plate-armor");
    expect(plate.strengthScoreRequired).toBe(15);
    expect(plate.grantsStealthDisadvantage).toBe(true);
    const overlay = effectiveArmor(plate, variant("mithral-armor"), false);
    expect(overlay.strengthScoreRequired).toBeNull();
    expect(overlay.grantsStealthDisadvantage).toBe(false);
    expect(overlay.name).toBe("Mithral Plate Armor");
  });
});

describe("derived AC", () => {
  it("adds +1 AC for worn +1 plate", () => {
    const character = {
      ...INITIAL_CHARACTER,
      armor: [{ id: "a1", key: "plate-armor", worn: true, variantKey: "armor-plus-1" }],
    };
    expect(computeDerivedStats(character).armorClass).toBe(19);
  });

  it("adds Elven Chain AC +1 without attunement", () => {
    const character = {
      ...INITIAL_CHARACTER,
      armor: [{ id: "a1", key: "chain-mail", worn: true, variantKey: "elven-chain" }],
    };
    expect(computeDerivedStats(character).armorClass).toBe(17);
    expect(wornArmorProficiencyPieces(character.armor)).toEqual([
      { key: "chain-mail", variantKey: "elven-chain" },
    ]);
    const summary = buildTrainingSummary({
      classData: null,
      level: 1,
      classFeatureChoices: {},
      subclassKey: null,
      featContributions: collectFeatContributions([], () => EMPTY_FEAT_CHOICES, {} as never, []),
      grantedArmorPieceLabels: ["Elven Chain Mail"],
    });
    expect(formatTrainingArmorLine(summary, (key) => key)).toContain("Elven Chain Mail");
  });
});

describe("ammunition and thrown spend", () => {
  it("still consumes ammunition for SRD weapon variants", () => {
    expect(shouldConsumeAmmunition({ id: "w1", key: "light-crossbow", variantKey: "weapon-plus-1", attuned: true })).toBe(
      true,
    );
    expect(shouldConsumeAmmunition({ id: "w2", key: "longbow" })).toBe(true);
    const repeating = inlineVariant({
      key: "ignore-ammo-fixture",
      effects: [{ type: "ignoreAmmoConsumption" }],
    });
    expect(effectsIfActive(repeating, true).some((effect) => effect.type === "ignoreAmmoConsumption")).toBe(true);
    expect(effectsIfActive(repeating, false).some((effect) => effect.type === "ignoreAmmoConsumption")).toBe(false);
  });

  it("does not treat a mundane handaxe as returning", () => {
    expect(shouldConsumeThrownQuantity({ id: "w2", key: "handaxe", quantity: 4 })).toBe(true);
    const returning = inlineVariant({
      key: "returning-fixture",
      effects: [{ type: "returningThrown" }],
    });
    expect(effectsIfActive(returning, true).some((effect) => effect.type === "returningThrown")).toBe(true);
    expect(effectsIfActive(returning, false).some((effect) => effect.type === "returningThrown")).toBe(false);
  });
});

describe("charges", () => {
  it("tracks Hammer of Thunderbolts charges by instance id and restores them on a Long Rest", () => {
    let character: Character = {
      ...INITIAL_CHARACTER,
      weapons: [{ id: "w1", key: "warhammer", variantKey: "hammer-of-thunderbolts", attuned: true }],
    };
    character = characterReducer(character, { type: "SET_FEAT_SPELL_USES", featKey: "armory:w1", value: 1 });
    expect(character.featSpellUses["armory:w1"]).toBe(1);

    const afterShort = applyRest(character, "short");
    expect(afterShort.featSpellUses["armory:w1"]).toBe(1);

    const afterLong = applyRest(character, "long");
    expect(afterLong.featSpellUses["armory:w1"]).toBeUndefined();
  });
});

describe("resolveEffective pieces", () => {
  it("clones catalog rows and overlays display names", () => {
    const plusSword = resolveEffectiveWeapon({ id: "w1", key: "longsword", variantKey: "weapon-plus-1" });
    expect(plusSword?.name).toBe(variantDisplayName("Longsword", variant("weapon-plus-1")));
    const gleaming = resolveEffectiveArmor({
      id: "a1",
      key: "plate-armor",
      variantKey: "armor-of-acid-resistance",
    });
    expect(gleaming?.acBase).toBe(armor("plate-armor").acBase);
  });
});

describe("magic ammunition combat", () => {
  it("adds +1 from preferred magic arrows to longbow attack and damage", () => {
    const magicStacks: MagicAmmunitionStack[] = [
      { id: "m1", ammoType: "arrows", variantKey: "ammunition-plus-1", remaining: 10 },
    ];
    const preferred = { arrows: "m1" };
    const ammoBonus = ammoBonusForType(magicStacks, preferred, "arrows");
    expect(ammoBonus).toBe(1);

    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [{ id: "w1", key: "longbow" }],
      abilityModifiers: FIGHTER_MODS,
      feats: [],
      weaponProficiencyGrants: MARTIAL,
      ammoBonusesByType: { arrows: ammoBonus },
    });
    const card = lists.actions.find((entry) => entry.id === "weapon-w1");
    expect(card?.attackMeta?.bonus).toBe("+5");
    expect(card?.attackMeta?.damage).toBe("1d8+3 Piercing");
  });

  it("spends magic arrow stacks through the reducer", () => {
    let character = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_MAGIC_AMMUNITION_PACK",
      id: "m1",
      ammoType: "arrows",
      variantKey: "ammunition-plus-1",
    });
    character = characterReducer(character, {
      type: "SET_PREFERRED_AMMO_SOURCE",
      ammoType: "arrows",
      magicStackId: "m1",
    });
    character = characterReducer(character, { type: "SET_MAGIC_AMMUNITION_REMAINING", id: "m1", value: 19 });
    expect(character.magicAmmunition[0].remaining).toBe(19);
  });

  it("still consumes ammunition for an attuned +1 weapon", () => {
    const piece = { id: "w1", key: "light-crossbow", variantKey: "weapon-plus-1", attuned: true };
    expect(shouldConsumeAmmunition(piece)).toBe(true);
  });
});
