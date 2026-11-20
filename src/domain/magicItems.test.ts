import { describe, expect, it } from "vitest";
import { MAGIC_ITEMS } from "../data";
import { computeDerivedStats } from "./deriveCharacter";
import {
  ATTUNED_MAGIC_ITEM_MAX,
  addAttunedMagicItem,
  applySetAbilityScores,
  attunementEligibleCarriedKeys,
  attunementEligibleKeys,
  collectMagicItemContributions,
  removeAttunedMagicItem,
} from "./magicItems";
import { computeWeaponAttack } from "./weaponAttack";
import { INITIAL_CHARACTER } from "../state/characterState";
import { WEAPONS, findByKey } from "../data";

describe("attuned magic item picks", () => {
  it("limits attunement eligibility to carried gear when a carried list is supplied", () => {
    const attuneKey = attunementEligibleKeys()[0];
    expect(attuneKey).toBeTruthy();
    expect(attunementEligibleCarriedKeys([{ key: attuneKey!, quantity: 1 }])).toEqual([attuneKey]);
    expect(attunementEligibleCarriedKeys([])).toEqual([]);
    expect(addAttunedMagicItem([], attuneKey!, [attuneKey!])).toEqual([attuneKey]);
    expect(addAttunedMagicItem([], attuneKey!, [])).toBeNull();
  });

  it("rejects duplicates, over-cap, and non-attunement keys", () => {
    const attuneKey = attunementEligibleKeys()[0];
    expect(attuneKey).toBeTruthy();
    const bag = MAGIC_ITEMS.find((item) => item.key === "bag-of-holding");
    expect(bag?.requiresAttunement).toBe(false);

    const one = addAttunedMagicItem([], attuneKey!);
    expect(one).toEqual([attuneKey]);
    expect(addAttunedMagicItem(one!, attuneKey!)).toBeNull();
    expect(addAttunedMagicItem([], "bag-of-holding")).toBeNull();

    const three = attunementEligibleKeys().slice(0, ATTUNED_MAGIC_ITEM_MAX);
    expect(addAttunedMagicItem(three, attunementEligibleKeys()[ATTUNED_MAGIC_ITEM_MAX])).toBeNull();
    expect(removeAttunedMagicItem(three, three[0])).toEqual(three.slice(1));
  });
});

describe("collectMagicItemContributions", () => {
  it("applies Cloak of Protection AC and save bonuses", () => {
    const contributions = collectMagicItemContributions(["cloak-of-protection"]);
    expect(contributions.acBonus).toBe(1);
    expect(contributions.saveBonus).toBe(1);
  });

  it("sets Strength to 19 from Gauntlets of Ogre Power unless already higher", () => {
    const contributions = collectMagicItemContributions(["gauntlets-of-ogre-power"]);
    expect(applySetAbilityScores({ str: 14, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, contributions.setAbilityScores).str).toBe(19);
    expect(applySetAbilityScores({ str: 20, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, contributions.setAbilityScores).str).toBe(20);
  });

  it("adds Wand of the War Mage spell attack", () => {
    expect(collectMagicItemContributions(["wand-of-the-war-mage-plus-1"]).spellAttackBonus).toBe(1);
  });

  it("adds Stone of Good Luck to checks and saves", () => {
    const contributions = collectMagicItemContributions(["stone-of-good-luck"]);
    expect(contributions.abilityCheckBonus).toBe(1);
    expect(contributions.saveBonus).toBe(1);
  });

  it("floors walk speed from Boots of Striding and Springing", () => {
    expect(collectMagicItemContributions(["boots-of-striding-and-springing"]).walkSpeedFloor).toBe(30);
  });

  it("adds Bracers of Archery damage to longbow and shortbow only", () => {
    const contributions = collectMagicItemContributions(["bracers-of-archery"]);
    expect(contributions.weaponDamageBonuses).toEqual({ longbow: 2, shortbow: 2 });
    const longbow = findByKey(WEAPONS, "longbow")!;
    const dagger = findByKey(WEAPONS, "dagger")!;
    const mods = { str: 2, dex: 3, con: 0, int: 0, wis: 0, cha: 0 };
    expect(computeWeaponAttack(longbow, mods, 2, 0, true, null, 2).damage).toContain("+5");
    expect(computeWeaponAttack(dagger, mods, 2, 0, true, null, 0).damage).not.toContain("+5");
  });
});

describe("computeDerivedStats magic items", () => {
  it("raises AC and saves when a Cloak of Protection is attuned", () => {
    const base = computeDerivedStats({ ...INITIAL_CHARACTER, classKey: "fighter" });
    const cloaked = computeDerivedStats({
      ...INITIAL_CHARACTER,
      classKey: "fighter",
      attunedMagicItemKeys: ["cloak-of-protection"],
    });
    expect(cloaked.armorClass).toBe(base.armorClass + 1);
    expect(cloaked.savingThrows.str.modifier).toBe(base.savingThrows.str.modifier + 1);
  });

  it("sets Intelligence to 19 from Headband of Intellect", () => {
    const derived = computeDerivedStats({
      ...INITIAL_CHARACTER,
      attunedMagicItemKeys: ["headband-of-intellect"],
    });
    expect(derived.abilityScores.int).toBe(19);
  });
});
