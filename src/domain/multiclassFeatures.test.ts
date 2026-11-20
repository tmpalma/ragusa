import { describe, expect, it } from "vitest";
import { CLASSES, findByKey } from "../data";
import type { AbilityId } from "../data/types";
import {
  buildMulticlassClassFeatureUseTrackers,
  collectArmorClassFormulaOptions,
  collectMulticlassClassFeatureContributions,
  needsArmorClassFormulaPick,
  resolveArmorClassFormulaSelection,
  resolveMulticlassExtraAttackCount,
} from "./classFeatures/contributions";
import { classHasFeatGrantAtLevel } from "./classGrantedFeats";
import { resolvedClassLevels } from "./classLevels";
import { RAW_TABLE_RULES } from "./tableRules";

describe("collectMulticlassClassFeatureContributions", () => {
  it("sums weapon mastery counts from each class at class level", () => {
    const classLevels = resolvedClassLevels(["fighter", "barbarian"]);
    const contributions = collectMulticlassClassFeatureContributions({ classLevels });
    expect(contributions.weaponMasteryCount).toBe(5);
  });

  it("does not melee-lock all slots when only one mastery class is melee-only", () => {
    const classLevels = resolvedClassLevels(["fighter", "barbarian"]);
    const contributions = collectMulticlassClassFeatureContributions({ classLevels });
    expect(contributions.weaponMasteryMeleeOnly).toBe(false);
  });

  it("melee-locks merged flag when every mastery class is melee-only", () => {
    const contributions = collectMulticlassClassFeatureContributions({
      classLevels: resolvedClassLevels(["barbarian"]),
    });
    expect(contributions.weaponMasteryMeleeOnly).toBe(true);
  });

  it("uses rogue class level for sneak attack dice", () => {
    const classLevels = resolvedClassLevels(["rogue", "fighter", "fighter", "fighter"]);
    const contributions = collectMulticlassClassFeatureContributions({ classLevels });
    expect(contributions.sneakAttackDice).toBe("1d6");
  });

  it("uses barbarian class level for rage uses", () => {
    const classLevels = resolvedClassLevels(["barbarian", "cleric", "cleric"]);
    const trackers = buildMulticlassClassFeatureUseTrackers(classLevels, {
      str: 2,
      dex: 0,
      con: 1,
      int: 0,
      wis: 1,
      cha: 0,
    });
    const rage = trackers.find((tracker) => tracker.featureKey === "rage");
    expect(rage?.maxUses).toBe(2);
  });

  it("requires an armor class formula pick when two unarmored defenses apply", () => {
    const classLevels = resolvedClassLevels(["barbarian", "monk"]);
    const formulas = collectArmorClassFormulaOptions(classLevels);
    expect(formulas).toHaveLength(2);
    expect(needsArmorClassFormulaPick(formulas)).toBe(true);

    const withoutPick = collectMulticlassClassFeatureContributions({ classLevels });
    expect(withoutPick.unarmoredDefenseAbilities).toBeNull();

    const withPick = collectMulticlassClassFeatureContributions({
      classLevels,
      armorClassFormulaKey: formulas[0]!.key,
    });
    expect(withPick.unarmoredDefenseAbilities).toEqual(formulas[0]!.abilities);
  });

  it("auto-applies a single unarmored defense formula", () => {
    const classLevels = resolvedClassLevels(["barbarian"]);
    const formulas = collectArmorClassFormulaOptions(classLevels);
    expect(needsArmorClassFormulaPick(formulas)).toBe(false);
    expect(
      collectMulticlassClassFeatureContributions({ classLevels }).unarmoredDefenseAbilities,
    ).toEqual(["con"]);
  });
});

describe("resolveArmorClassFormulaSelection", () => {
  it("returns the sole formula without a stored pick", () => {
    const option = {
      key: "barbarian.feature.unarmored-defense",
      classKey: "barbarian",
      featureKey: "unarmored-defense",
      name: "Unarmored Defense",
      abilities: ["con"] as AbilityId[],
      disallowShield: false,
    };
    expect(resolveArmorClassFormulaSelection([option], null)).toEqual(option);
  });
});

describe("multiclass feat grants at class level", () => {
  it("does not grant ASI at character level 4 on a 2/2 split", () => {
    const classLevels = resolvedClassLevels(["fighter", "fighter", "wizard", "wizard"]);
    for (const { classKey, classLevel } of classLevels) {
      const classData = findByKey(CLASSES, classKey)!;
      expect(classHasFeatGrantAtLevel(classData, classLevel)).toBe(false);
    }
  });

  it("grants ASI only when that class reaches level 4", () => {
    const fighter = findByKey(CLASSES, "fighter")!;
    expect(classHasFeatGrantAtLevel(fighter, 4)).toBe(true);
    expect(classHasFeatGrantAtLevel(fighter, 2)).toBe(false);
  });
});

describe("resolveMulticlassExtraAttackCount", () => {
  it("returns zero before any class gains Extra Attack", () => {
    const classLevels = resolvedClassLevels(["fighter", "fighter", "fighter", "fighter"]);
    expect(resolveMulticlassExtraAttackCount(classLevels, RAW_TABLE_RULES)).toBe(0);
  });

  it("counts Battle Smith Extra Attack at artificer level 5", () => {
    const classLevels = resolvedClassLevels(Array(5).fill("artificer"));
    expect(
      resolveMulticlassExtraAttackCount(classLevels, RAW_TABLE_RULES, { artificer: "battle-smith" }),
    ).toBe(2);
  });
});
