import { describe, expect, it } from "vitest";
import { CLASSES, SUBCLASSES, findByKey } from "../data";
import type { ClassData, SubclassData } from "../data/types";
import {
  casterLevelContribution,
  extraAttackCount,
  multiclassCasterLevel,
  resolveSpellcastingSlots,
  usesMulticlassSpellSlotTable,
} from "./multiclassCasterLevel";
import { RAW_TABLE_RULES } from "./tableRules";

const THIRD_CASTER_SUBCLASS: SubclassData = {
  key: "third-caster-fixture",
  classKey: "fighter",
  name: "Third Caster Fixture",
  desc: "Inline subclass used to test third-caster multiclass math.",
  srd: false,
  book: "XPHB",
  features: [
    {
      key: "spellcasting",
      name: "Spellcasting",
      desc: "Fixture grant.",
      grantedAtLevel: 3,
      combatSurface: false,
      effects: [
        {
          type: "grant_spellcasting",
          ability: "int",
          listClassKey: "wizard",
          gainedAtLevel: 3,
          listMode: "prepared",
          slotsByLevel: { 3: [2, 0, 0, 0, 0, 0, 0, 0, 0] },
          cantripsKnownByLevel: { 3: 2 },
          spellsPrepared: { kind: "fixed", count: 3 },
        },
      ],
    },
  ],
};

function catalogContext(
  subclassByClass: Record<string, string | null> = {},
  extraSubclasses: SubclassData[] = [],
) {
  return {
    subclassByClass,
    getClassData: (classKey: string): ClassData | null => findByKey(CLASSES, classKey) ?? null,
    getSubclassData: (subclassKey: string): SubclassData | null =>
      extraSubclasses.find((subclass) => subclass.key === subclassKey) ??
      findByKey(SUBCLASSES, subclassKey) ??
      null,
  };
}

describe("multiclassCasterLevel", () => {
  it("sums Ranger half (round up) and full Sorcerer levels", () => {
    const ctx = catalogContext();
    const classLevels = [
      { classKey: "ranger", classLevel: 1 },
      { classKey: "sorcerer", classLevel: 3 },
    ];

    expect(casterLevelContribution("ranger", 1, ctx)).toBe(1);
    expect(casterLevelContribution("sorcerer", 3, ctx)).toBe(3);
    expect(multiclassCasterLevel(classLevels, ctx)).toBe(4);
    expect(usesMulticlassSpellSlotTable(classLevels, ctx)).toBe(true);
    expect(resolveSpellcastingSlots(classLevels, ctx)).toEqual({ 1: 4, 2: 3 });
  });

  it("excludes Warlock Pact Magic from caster level", () => {
    const ctx = catalogContext();
    const classLevels = [
      { classKey: "warlock", classLevel: 2 },
      { classKey: "wizard", classLevel: 3 },
    ];

    expect(casterLevelContribution("warlock", 2, ctx)).toBe(0);
    expect(multiclassCasterLevel(classLevels, ctx)).toBe(3);
    expect(usesMulticlassSpellSlotTable(classLevels, ctx)).toBe(false);
    expect(resolveSpellcastingSlots(classLevels, ctx)).toEqual({ 1: 4, 2: 2 });
  });

  it("counts a half caster rounded up", () => {
    const ctx = catalogContext();
    expect(casterLevelContribution("paladin", 1, ctx)).toBe(1);
    expect(casterLevelContribution("paladin", 3, ctx)).toBe(2);
  });

  it("counts a third-caster subclass as one-third Fighter levels rounded down", () => {
    const ctx = catalogContext({ fighter: "third-caster-fixture" }, [THIRD_CASTER_SUBCLASS]);
    expect(casterLevelContribution("fighter", 3, ctx)).toBe(1);
    expect(casterLevelContribution("fighter", 4, ctx)).toBe(1);
    expect(casterLevelContribution("fighter", 6, ctx)).toBe(2);
  });

  it("uses multiclass table when EK and another spellcasting class both apply", () => {
    const ctx = catalogContext({ fighter: "third-caster-fixture" }, [THIRD_CASTER_SUBCLASS]);
    const classLevels = [
      { classKey: "fighter", classLevel: 3 },
      { classKey: "wizard", classLevel: 1 },
    ];

    expect(multiclassCasterLevel(classLevels, ctx)).toBe(2);
    expect(usesMulticlassSpellSlotTable(classLevels, ctx)).toBe(true);
    expect(resolveSpellcastingSlots(classLevels, ctx)).toEqual({ 1: 3 });
  });

  it("uses a single spellcasting class table when only one class casts", () => {
    const ctx = catalogContext();
    const classLevels = [{ classKey: "wizard", classLevel: 3 }];

    expect(usesMulticlassSpellSlotTable(classLevels, ctx)).toBe(false);
    expect(resolveSpellcastingSlots(classLevels, ctx)).toEqual({ 1: 4, 2: 2 });
  });
});

describe("extraAttackCount", () => {
  it("caps at two attacks when extraAttackStacks is false", () => {
    expect(extraAttackCount([1, 2], RAW_TABLE_RULES)).toBe(2);
    expect(extraAttackCount([1, 1], RAW_TABLE_RULES)).toBe(1);
    expect(extraAttackCount([3], RAW_TABLE_RULES)).toBe(2);
  });

  it("returns the maximum source count when extraAttackStacks is true", () => {
    const rules = { ...RAW_TABLE_RULES, extraAttackStacks: true };
    expect(extraAttackCount([1, 3], rules)).toBe(3);
    expect(extraAttackCount([2, 2], rules)).toBe(2);
  });
});
