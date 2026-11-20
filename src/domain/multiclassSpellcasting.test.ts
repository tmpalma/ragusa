import { describe, expect, it } from "vitest";
import { CLASSES, SUBCLASSES, findByKey } from "../data";
import type { ClassData, SubclassData } from "../data/types";
import { resolvedClassLevels } from "./classLevels";
import {
  characterSpellcastingSlots,
  pactMagicPool,
  pactMagicPoolFromClassLevels,
} from "./spellProgression";
import { computeMulticlassSpellcasting, computePerClassSpellcasting } from "./spellcasting";
import {
  allPerClassSpellPicks,
  isMulticlassCharacter,
  multiclassCantripSlotTotal,
  spellPicksForClass,
  spellPickLimitsByClass,
} from "./spellSelection";
import { applyRest } from "./rest";
import { characterReducer, INITIAL_CHARACTER } from "../state/characterState";
import { RAW_TABLE_RULES } from "./tableRules";

const ZERO_MODS = { int: 0, str: 0, dex: 0, con: 0, wis: 0, cha: 0 };

function catalogContext(subclassByClass: Record<string, string | null> = {}) {
  return {
    subclassByClass,
    getClassData: (classKey: string): ClassData | null => findByKey(CLASSES, classKey) ?? null,
    getSubclassData: (subclassKey: string): SubclassData | null => findByKey(SUBCLASSES, subclassKey) ?? null,
    abilityModifiers: ZERO_MODS,
    proficiencyBonus: 2,
  };
}

describe("multiclass spell slots", () => {
  it("Ranger 1 / Sorcerer 3 uses multiclass table 4/3", () => {
    const classLevels = resolvedClassLevels(["ranger", "sorcerer", "sorcerer", "sorcerer"]);
    const ctx = catalogContext();

    expect(characterSpellcastingSlots(classLevels, ctx)).toEqual({ 1: 4, 2: 3 });
    expect(computeMulticlassSpellcasting(classLevels, ctx).spellcastingSlots).toEqual({ 1: 4, 2: 3 });
  });

  it("Warlock 1 / Wizard 3 uses Wizard table 4/2 plus 1 Pact L1 slot", () => {
    const classLevels = resolvedClassLevels(["warlock", "wizard", "wizard", "wizard"]);
    const ctx = catalogContext();

    expect(characterSpellcastingSlots(classLevels, ctx)).toEqual({ 1: 4, 2: 2 });
    expect(pactMagicPoolFromClassLevels(classLevels, ctx.getClassData)).toEqual({
      count: 1,
      slotLevel: 1,
    });

    const result = computeMulticlassSpellcasting(classLevels, ctx);
    expect(result.spellcastingSlots).toEqual({ 1: 4, 2: 2 });
    expect(result.pactMagic).toEqual({ count: 1, slotLevel: 1 });
  });

  it("pactMagicPool uses Warlock class level, not character level", () => {
    const warlock = findByKey(CLASSES, "warlock")!;
    expect(pactMagicPool(warlock, 1)).toEqual({ count: 1, slotLevel: 1 });
    expect(pactMagicPool(warlock, 3)).toEqual({ count: 2, slotLevel: 2 });
  });
});

describe("multiclass prepared/known counts per class", () => {
  it("Ranger 1 / Sorcerer 3 keeps per-class pick limits", () => {
    const classLevels = resolvedClassLevels(["ranger", "sorcerer", "sorcerer", "sorcerer"]);
    const limits = spellPickLimitsByClass(classLevels, catalogContext());

    expect(limits.ranger?.spellSlots).toBe(2);
    expect(limits.sorcerer?.spellSlots).toBe(6);
    expect(limits.ranger?.listMode).toBe("prepared");
    expect(limits.sorcerer?.listMode).toBe("known");
  });

  it("per-class spellcasting summaries use class level", () => {
    const classLevels = resolvedClassLevels(["ranger", "sorcerer", "sorcerer", "sorcerer"]);
    const perClass = computePerClassSpellcasting(classLevels, catalogContext());

    const ranger = perClass.find((entry) => entry.classKey === "ranger");
    const sorcerer = perClass.find((entry) => entry.classKey === "sorcerer");

    expect(ranger?.summary?.spellsPreparedOrKnown).toBe(2);
    expect(sorcerer?.summary?.spellsPreparedOrKnown).toBe(6);
    expect(ranger?.summary?.slotsByLevel).toEqual({});
    expect(sorcerer?.summary?.slotsByLevel).toEqual({});
  });
});

describe("multiclass cantrip union", () => {
  it("sums cantrip slots from each spellcasting class", () => {
    const classLevels = resolvedClassLevels(["bard", "wizard", "wizard", "wizard"]);
    const limits = spellPickLimitsByClass(classLevels, catalogContext());

    expect(limits.bard?.cantripSlots).toBe(2);
    expect(limits.wizard?.cantripSlots).toBe(3);
    expect(multiclassCantripSlotTotal(limits)).toBe(5);
  });

  it("Ranger 1 / Sorcerer 3 contributes only Sorcerer cantrips", () => {
    const classLevels = resolvedClassLevels(["ranger", "sorcerer", "sorcerer", "sorcerer"]);
    const limits = spellPickLimitsByClass(classLevels, catalogContext());

    expect(limits.ranger?.cantripSlots).toBe(0);
    expect(limits.sorcerer?.cantripSlots).toBe(4);
    expect(multiclassCantripSlotTotal(limits)).toBe(4);
  });
});

describe("multiclass spell pick helpers", () => {
  it("detects multiclass from level path", () => {
    expect(
      isMulticlassCharacter({
        ...INITIAL_CHARACTER,
        levelPath: ["ranger", "sorcerer"],
        classKey: "ranger",
        level: 2,
      }),
    ).toBe(true);
    expect(
      isMulticlassCharacter({
        ...INITIAL_CHARACTER,
        levelPath: ["wizard", "wizard", "wizard", "wizard"],
        classKey: "wizard",
        level: 4,
      }),
    ).toBe(false);
  });

  it("reads per-class spell picks with legacy fallback", () => {
    const character = {
      ...INITIAL_CHARACTER,
      classKey: "ranger",
      spellPicks: ["hunters-mark"],
      spellPicksByClass: { sorcerer: ["burning-hands"] },
    };
    expect(spellPicksForClass(character, "ranger")).toEqual(["hunters-mark"]);
    expect(spellPicksForClass(character, "sorcerer")).toEqual(["burning-hands"]);
    expect(
      allPerClassSpellPicks(character, resolvedClassLevels(["ranger", "sorcerer", "sorcerer", "sorcerer"])),
    ).toEqual(["hunters-mark", "burning-hands"]);
  });
});

describe("multiclass spell pick reducer", () => {
  it("stores prepared spells per class", () => {
    const base = {
      ...INITIAL_CHARACTER,
      levelPath: ["ranger", "sorcerer", "sorcerer", "sorcerer"],
      level: 4,
      classKey: "ranger",
    };
    const after = characterReducer(
      base,
      { type: "ADD_CLASS_SPELL_PICK", classKey: "sorcerer", spellKey: "burning-hands" },
      RAW_TABLE_RULES,
    );
    expect(after.spellPicksByClass.sorcerer).toEqual(["burning-hands"]);
  });

  it("stores cantrips per class with per-class cap", () => {
    const base = {
      ...INITIAL_CHARACTER,
      levelPath: ["bard", "sorcerer"],
      level: 2,
      classKey: "bard",
      cantripPicksByClass: {
        bard: ["dancing-lights", "mage-hand"],
      },
    };
    const rejected = characterReducer(
      base,
      { type: "ADD_CLASS_CANTRIP_PICK", classKey: "bard", spellKey: "vicious-mockery" },
      RAW_TABLE_RULES,
    );
    expect(rejected.cantripPicksByClass.bard).toEqual(["dancing-lights", "mage-hand"]);
    const accepted = characterReducer(
      base,
      { type: "ADD_CLASS_CANTRIP_PICK", classKey: "sorcerer", spellKey: "fire-bolt" },
      RAW_TABLE_RULES,
    );
    expect(accepted.cantripPicksByClass.sorcerer).toEqual(["fire-bolt"]);
  });
});

describe("multiclass rest recovery", () => {
  it("short rest restores pact slots without wiping Wizard spellcasting slots", () => {
    const character = {
      ...INITIAL_CHARACTER,
      levelPath: ["warlock", "wizard", "wizard", "wizard"],
      level: 4,
      classKey: "warlock",
      pactSlotRemaining: { count: 0, slotLevel: 1 },
      spellSlotRemaining: { 1: 2, 2: 1 },
    };

    const afterShort = applyRest(character, "short");
    expect(afterShort.pactSlotRemaining).toBeNull();
    expect(afterShort.spellSlotRemaining).toEqual({ 1: 2, 2: 1 });
  });

  it("long rest clears both spellcasting and pact slot pools", () => {
    const character = {
      ...INITIAL_CHARACTER,
      levelPath: ["warlock", "wizard", "wizard", "wizard"],
      level: 4,
      classKey: "warlock",
      pactSlotRemaining: { count: 0, slotLevel: 1 },
      spellSlotRemaining: { 1: 2, 2: 1 },
    };

    const afterLong = applyRest(character, "long");
    expect(afterLong.pactSlotRemaining).toBeNull();
    expect(afterLong.spellSlotRemaining).toEqual({});
  });

  it("short rest does not restore spellcasting slots", () => {
    const character = {
      ...INITIAL_CHARACTER,
      levelPath: ["ranger", "sorcerer", "sorcerer", "sorcerer"],
      level: 4,
      classKey: "ranger",
      spellSlotRemaining: { 1: 1, 2: 0 },
    };

    const afterShort = applyRest(character, "short");
    expect(afterShort.spellSlotRemaining).toEqual({ 1: 1, 2: 0 });
  });
});
