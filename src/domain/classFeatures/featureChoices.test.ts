import { describe, expect, it } from "vitest";
import { CLASSES, findByKey } from "../../data";
import {
  classFeatureChoiceGrantsAtLevel,
  classFeatureChoicesAfterParentChange,
  extraCantripSlotsFromClassFeatureChoices,
  isValidClassFeatureChoice,
  skillBonusesFromClassFeatureChoices,
  weaponProficienciesFromClassFeatureChoices,
} from "./featureChoices";

describe("class feature choices", () => {
  it("offers Divine Order at cleric level 1", () => {
    const cleric = findByKey(CLASSES, "cleric")!;
    const grants = classFeatureChoiceGrantsAtLevel(cleric, 1);
    expect(grants.some((grant) => grant.choiceKey === "divine-order")).toBe(true);
  });

  it("grants Thaumaturge an extra cantrip slot", () => {
    const cleric = findByKey(CLASSES, "cleric")!;
    expect(extraCantripSlotsFromClassFeatureChoices(cleric, 1, {})).toBe(0);
    expect(extraCantripSlotsFromClassFeatureChoices(cleric, 1, { "divine-order": "thaumaturge" })).toBe(1);
    expect(extraCantripSlotsFromClassFeatureChoices(cleric, 1, { "divine-order": "protector" })).toBe(0);
  });

  it("grants Protector martial weapon proficiency", () => {
    const cleric = findByKey(CLASSES, "cleric")!;
    const grants = weaponProficienciesFromClassFeatureChoices(cleric, 1, { "divine-order": "protector" });
    expect(grants).toEqual([{ kind: "martial" }]);
  });

  it("adds Thaumaturge skill bonus from Wisdom for the chosen skill only", () => {
    const cleric = findByKey(CLASSES, "cleric")!;
    const choices = { "divine-order": "thaumaturge", "divine-order-skill": "arcana" };
    const modifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 3, cha: 0 };
    const bonuses = skillBonusesFromClassFeatureChoices(cleric, 1, choices, modifiers);
    expect(bonuses.arcana).toBe(3);
    expect(bonuses.religion).toBeUndefined();
  });

  it("adds no Thaumaturge skill bonus until a skill is chosen", () => {
    const cleric = findByKey(CLASSES, "cleric")!;
    const bonuses = skillBonusesFromClassFeatureChoices(
      cleric,
      1,
      { "divine-order": "thaumaturge" },
      { str: 0, dex: 0, con: 0, int: 0, wis: 3, cha: 0 },
    );
    expect(bonuses.arcana).toBeUndefined();
    expect(bonuses.religion).toBeUndefined();
  });

  it("floors Thaumaturge skill bonuses at +1", () => {
    const cleric = findByKey(CLASSES, "cleric")!;
    const bonuses = skillBonusesFromClassFeatureChoices(
      cleric,
      1,
      { "divine-order": "thaumaturge", "divine-order-skill": "religion" },
      { str: 0, dex: 0, con: 0, int: 0, wis: -2, cha: 0 },
    );
    expect(bonuses.religion).toBe(1);
    expect(bonuses.arcana).toBeUndefined();
  });

  it("clears Thaumaturge skill pick when switching Divine Order away from Thaumaturge", () => {
    const cleric = findByKey(CLASSES, "cleric")!;
    const choices = classFeatureChoicesAfterParentChange(
      cleric,
      "divine-order",
      "protector",
      { "divine-order": "protector", "divine-order-skill": "arcana" },
    );
    expect(choices).toEqual({ "divine-order": "protector" });
  });

  it("rejects Thaumaturge skill picks unless Thaumaturge is selected", () => {
    const cleric = findByKey(CLASSES, "cleric")!;
    expect(
      isValidClassFeatureChoice(cleric, { "divine-order": "protector" }, "divine-order-skill", "arcana"),
    ).toBe(false);
    expect(
      isValidClassFeatureChoice(cleric, { "divine-order": "thaumaturge" }, "divine-order-skill", "arcana"),
    ).toBe(true);
  });

  it("catalogs Primal Order for druid level 1", () => {
    const druid = findByKey(CLASSES, "druid")!;
    const grants = classFeatureChoiceGrantsAtLevel(druid, 1);
    expect(grants.some((grant) => grant.choiceKey === "primal-order")).toBe(true);
  });

  it("grants Magician an extra cantrip slot", () => {
    const druid = findByKey(CLASSES, "druid")!;
    expect(extraCantripSlotsFromClassFeatureChoices(druid, 1, {})).toBe(0);
    expect(extraCantripSlotsFromClassFeatureChoices(druid, 1, { "primal-order": "magician" })).toBe(1);
    expect(extraCantripSlotsFromClassFeatureChoices(druid, 1, { "primal-order": "warden" })).toBe(0);
  });

  it("grants Warden martial weapon proficiency", () => {
    const druid = findByKey(CLASSES, "druid")!;
    const grants = weaponProficienciesFromClassFeatureChoices(druid, 1, { "primal-order": "warden" });
    expect(grants).toEqual([{ kind: "martial" }]);
  });

  it("adds Magician skill bonus from Wisdom for the chosen skill only", () => {
    const druid = findByKey(CLASSES, "druid")!;
    const choices = { "primal-order": "magician", "primal-order-skill": "nature" };
    const modifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 3, cha: 0 };
    const bonuses = skillBonusesFromClassFeatureChoices(druid, 1, choices, modifiers);
    expect(bonuses.nature).toBe(3);
    expect(bonuses.arcana).toBeUndefined();
  });

  it("adds no Magician skill bonus until a skill is chosen", () => {
    const druid = findByKey(CLASSES, "druid")!;
    const bonuses = skillBonusesFromClassFeatureChoices(
      druid,
      1,
      { "primal-order": "magician" },
      { str: 0, dex: 0, con: 0, int: 3, wis: 0, cha: 0 },
    );
    expect(bonuses.arcana).toBeUndefined();
    expect(bonuses.nature).toBeUndefined();
  });

  it("floors Magician skill bonuses at +1", () => {
    const druid = findByKey(CLASSES, "druid")!;
    const bonuses = skillBonusesFromClassFeatureChoices(
      druid,
      1,
      { "primal-order": "magician", "primal-order-skill": "arcana" },
      { str: 0, dex: 0, con: 0, int: 0, wis: -2, cha: 0 },
    );
    expect(bonuses.arcana).toBe(1);
    expect(bonuses.nature).toBeUndefined();
  });

  it("clears Magician skill pick when switching Primal Order away from Magician", () => {
    const druid = findByKey(CLASSES, "druid")!;
    const choices = classFeatureChoicesAfterParentChange(
      druid,
      "primal-order",
      "warden",
      { "primal-order": "warden", "primal-order-skill": "nature" },
    );
    expect(choices).toEqual({ "primal-order": "warden" });
  });

  it("rejects Magician skill picks unless Magician is selected", () => {
    const druid = findByKey(CLASSES, "druid")!;
    expect(
      isValidClassFeatureChoice(druid, { "primal-order": "warden" }, "primal-order-skill", "nature"),
    ).toBe(false);
    expect(
      isValidClassFeatureChoice(druid, { "primal-order": "magician" }, "primal-order-skill", "nature"),
    ).toBe(true);
  });
});
