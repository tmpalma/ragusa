import { describe, expect, it } from "vitest";
import { CLASSES, findByKey } from "../data";
import type { ClassData } from "../data/types";
import { resolvedClassLevels } from "./classLevels";
import { EMPTY_FEAT_CHOICES, collectFeatContributions } from "./featEffects";
import {
  buildTrainingSummary,
  formatTrainingArmorLine,
  formatTrainingWeaponsLine,
  mergedClassSaveProficiencies,
  mergedClassSkillChoiceGrants,
  multiclassSkillChoiceGrantForClass,
} from "./training";
import { RAW_TABLE_RULES } from "./tableRules";

const label = (key: string) => key;

describe("buildTrainingSummary", () => {
  it("includes class armor, shields, and weapon proficiencies", () => {
    const fighter = findByKey(CLASSES, "fighter");
    expect(fighter).toBeTruthy();
    const summary = buildTrainingSummary({
      classData: fighter,
      level: 1,
      classFeatureChoices: {},
      subclassKey: null,
      featContributions: collectFeatContributions([], () => EMPTY_FEAT_CHOICES, {} as never, []),
    });
    expect(summary.armorCategories).toEqual(["light", "medium", "heavy"]);
    expect(summary.shieldProficiency).toBe(true);
    expect(summary.weaponKinds).toEqual(["simple", "martial"]);
  });

  it("adds lightly armored light armor and shields from feats", () => {
    const wizard = findByKey(CLASSES, "wizard");
    expect(wizard).toBeTruthy();
    const contributions = collectFeatContributions(
      ["lightly-armored"],
      () => EMPTY_FEAT_CHOICES,
      {} as never,
      [],
    );
    const summary = buildTrainingSummary({
      classData: wizard,
      level: 4,
      classFeatureChoices: {},
      subclassKey: null,
      featContributions: contributions,
    });
    expect(summary.armorCategories).toEqual(["light"]);
    expect(summary.shieldProficiency).toBe(true);
    expect(formatTrainingArmorLine(summary, label)).toContain("sheet.training.armor.light");
    expect(formatTrainingArmorLine(summary, label)).toContain("sheet.training.shields");
  });

  it("adds martial weapon training from feats", () => {
    const contributions = collectFeatContributions(
      ["martial-weapon-training"],
      () => EMPTY_FEAT_CHOICES,
      {} as never,
      [],
    );
    const summary = buildTrainingSummary({
      classData: findByKey(CLASSES, "wizard"),
      level: 4,
      classFeatureChoices: {},
      subclassKey: null,
      featContributions: contributions,
    });
    expect(summary.weaponKinds).toContain("martial");
    expect(formatTrainingWeaponsLine(summary, label)).toContain("sheet.training.weapons.martial");
  });

  it("includes martial weapon training for a level 3 ranger", () => {
    const ranger = findByKey(CLASSES, "ranger");
    expect(ranger).toBeTruthy();
    const summary = buildTrainingSummary({
      classData: ranger,
      level: 3,
      classFeatureChoices: {},
      subclassKey: "hunter",
      featContributions: collectFeatContributions([], () => EMPTY_FEAT_CHOICES, {} as never, []),
    });
    expect(summary.weaponKinds).toContain("martial");
  });
});

function resolveCatalogClass(classKey: string): ClassData | null {
  return findByKey(CLASSES, classKey) ?? null;
}

describe("multiclass training merge", () => {
  const emptyFeatContributions = collectFeatContributions(
    [],
    () => EMPTY_FEAT_CHOICES,
    {} as never,
    [],
  );

  it("Fighter dip does not grant Heavy armor or new save proficiencies", () => {
    const levelPath = ["wizard", "fighter"];
    expect(resolvedClassLevels(levelPath)).toEqual([
      { classKey: "wizard", classLevel: 1 },
      { classKey: "fighter", classLevel: 1 },
    ]);

    const summary = buildTrainingSummary({
      classData: null,
      level: 2,
      classFeatureChoices: {},
      subclassKey: null,
      featContributions: emptyFeatContributions,
      multiclass: {
        rules: RAW_TABLE_RULES,
        levelPath,
        resolveClass: resolveCatalogClass,
      },
    });

    expect(summary.armorCategories).toEqual(["light", "medium"]);
    expect(summary.armorCategories).not.toContain("heavy");
    expect(summary.weaponKinds).toContain("martial");
    expect(summary.weaponKinds).toContain("simple");

    const saves = mergedClassSaveProficiencies(RAW_TABLE_RULES, levelPath, resolveCatalogClass);
    expect(saves).toEqual(["int", "wis"]);
    expect(saves).not.toContain("str");
    expect(saves).not.toContain("con");
  });

  it("Cleric Protector still grants Heavy armor when Cleric is not the first class", () => {
    const levelPath = ["wizard", "cleric"];
    const summary = buildTrainingSummary({
      classData: null,
      level: 2,
      classFeatureChoices: {},
      subclassKey: null,
      featContributions: emptyFeatContributions,
      multiclass: {
        rules: RAW_TABLE_RULES,
        levelPath,
        resolveClass: resolveCatalogClass,
        classFeatureChoicesByClass: {
          cleric: { "divine-order": "protector" },
        },
      },
    });

    expect(summary.armorCategories).toEqual(["light", "medium", "heavy"]);
    expect(summary.weaponKinds).toContain("martial");
  });

  it("grants full Fighter starting proficiencies on dip when grantFullStartingProficienciesOnNewClass is on", () => {
    const levelPath = ["wizard", "fighter"];
    const rules = { ...RAW_TABLE_RULES, grantFullStartingProficienciesOnNewClass: true };

    const summary = buildTrainingSummary({
      classData: null,
      level: 2,
      classFeatureChoices: {},
      subclassKey: null,
      featContributions: emptyFeatContributions,
      multiclass: {
        rules,
        levelPath,
        resolveClass: resolveCatalogClass,
      },
    });

    expect(summary.armorCategories).toEqual(["light", "medium", "heavy"]);
    expect(summary.weaponKinds).toEqual(["simple", "martial"]);
  });

  it("grants Fighter save proficiencies on dip when grantStartingSavesOnNewClass is on", () => {
    const levelPath = ["wizard", "fighter"];
    const rules = { ...RAW_TABLE_RULES, grantStartingSavesOnNewClass: true };

    const saves = mergedClassSaveProficiencies(rules, levelPath, resolveCatalogClass);
    expect(saves).toEqual(["int", "wis", "str", "con"]);
  });

  it("grants multiclass skill picks for Ranger but not for Fighter dip", () => {
    const rangerDip = mergedClassSkillChoiceGrants(RAW_TABLE_RULES, ["rogue", "ranger"], resolveCatalogClass);
    expect(rangerDip).toEqual([
      {
        classKey: "rogue",
        count: 4,
        options: expect.arrayContaining(["stealth", "perception"]),
      },
      {
        classKey: "ranger",
        count: 1,
        options: expect.arrayContaining(["survival", "nature"]),
      },
    ]);

    const fighterDip = mergedClassSkillChoiceGrants(RAW_TABLE_RULES, ["wizard", "fighter"], resolveCatalogClass);
    expect(fighterDip.map((grant) => grant.classKey)).toEqual(["wizard"]);

    expect(
      multiclassSkillChoiceGrantForClass(RAW_TABLE_RULES, ["rogue", "ranger"], "ranger", resolveCatalogClass),
    ).toMatchObject({ classKey: "ranger", count: 1 });
    expect(
      multiclassSkillChoiceGrantForClass(RAW_TABLE_RULES, ["rogue", "ranger"], "rogue", resolveCatalogClass),
    ).toBeNull();
  });
});
