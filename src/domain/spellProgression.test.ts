import { describe, expect, it } from "vitest";
import { CLASSES, findByKey } from "../data";
import type { SubclassData } from "../data/types";
import {
  firstLevelSpellSlotCount,
  pactMagicSlotLevel,
  spellProgressionRowForLevel,
  spellSlotCount,
  spellSlotRow,
  spellSlotsByLevel,
} from "./spellProgression";
import type { ClassData } from "../data/types";
import { spellPickLimitsForClass } from "./spellSelection";
import { effectiveSpellSlotRow, slotsByLevelFromRow } from "./spellcasting";

const ZERO_MODS = { int: 0, str: 0, dex: 0, con: 0, wis: 0, cha: 0 };

const MOCK_EK_SUBCLASS: SubclassData = {
  key: "eldritch-knight",
  classKey: "fighter",
  name: "Eldritch Knight",
  desc: "Test fixture",
  srd: false,
  book: "XPHB",
  features: [
    {
      key: "spellcasting",
      name: "Spellcasting",
      desc: "Test fixture",
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
          spellsPrepared: { kind: "abilityModPlusLevel", ability: "int", minimum: 1 },
        },
      ],
    },
  ],
};

describe("spellProgression at level 2", () => {
  it("gives full casters a third first-level slot and one more prepared spell", () => {
    for (const key of ["bard", "cleric", "druid", "wizard"] as const) {
      const cls = findByKey(CLASSES, key)!;
      expect(firstLevelSpellSlotCount(cls, 2)).toBe(3);
      expect(spellPickLimitsForClass(cls, ZERO_MODS, 2).spellSlots).toBe(5);
    }
  });

  it("grows the wizard spellbook at level 2", () => {
    const wizard = findByKey(CLASSES, "wizard")!;
    expect(spellPickLimitsForClass(wizard, ZERO_MODS, 2).spellbookSlots).toBe(8);
  });

  it("gives sorcerers four prepared-known spells and three slots at level 2", () => {
    const sorcerer = findByKey(CLASSES, "sorcerer")!;
    expect(spellPickLimitsForClass(sorcerer, ZERO_MODS, 2)).toMatchObject({
      spellSlots: 4,
      listMode: "known",
    });
    expect(firstLevelSpellSlotCount(sorcerer, 2)).toBe(3);
  });

  it("gives warlocks two pact slots and three prepared spells at level 2", () => {
    const warlock = findByKey(CLASSES, "warlock")!;
    expect(spellPickLimitsForClass(warlock, ZERO_MODS, 2).spellSlots).toBe(3);
    expect(firstLevelSpellSlotCount(warlock, 2)).toBe(2);
  });

  it("gives half casters one more prepared spell but keeps two slots", () => {
    for (const key of ["paladin", "ranger"] as const) {
      const cls = findByKey(CLASSES, key)!;
      expect(firstLevelSpellSlotCount(cls, 2)).toBe(2);
      expect(spellPickLimitsForClass(cls, ZERO_MODS, 2).spellSlots).toBe(3);
    }
  });
});

describe("spellProgression at level 3", () => {
  it("gives bard six prepared spells, four first-level slots, and two second-level slots", () => {
    const bard = findByKey(CLASSES, "bard")!;
    expect(spellPickLimitsForClass(bard, ZERO_MODS, 3).spellSlots).toBe(6);
    expect(spellSlotRow(bard.spellSlots, 3)).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0]);
    expect(spellSlotsByLevel(bard, 3)).toEqual({ 1: 4, 2: 2 });
    expect(spellSlotCount(bard, 3, 2)).toBe(2);
  });

  it("gives half casters four prepared spells and three first-level slots", () => {
    for (const key of ["paladin", "ranger"] as const) {
      const cls = findByKey(CLASSES, key)!;
      expect(spellPickLimitsForClass(cls, ZERO_MODS, 3).spellSlots).toBe(4);
      expect(spellSlotRow(cls.spellSlots, 3)).toEqual([3, 0, 0, 0, 0, 0, 0, 0, 0]);
    }
  });

  it("does not add level 3 rows for non-casters", () => {
    const fighter = findByKey(CLASSES, "fighter")!;
    expect(spellSlotRow(fighter.spellSlots, 3)).toEqual([]);
  });

  it("gives full casters six prepared spells and second-level slots at level 3", () => {
    for (const key of ["cleric", "druid", "wizard"] as const) {
      const cls = findByKey(CLASSES, key)!;
      expect(spellPickLimitsForClass(cls, ZERO_MODS, 3).spellSlots).toBe(6);
      expect(spellSlotRow(cls.spellSlots, 3)).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0]);
    }
  });

  it("gives sorcerer six known spells and second-level slots at level 3", () => {
    const sorcerer = findByKey(CLASSES, "sorcerer")!;
    expect(spellPickLimitsForClass(sorcerer, ZERO_MODS, 3).spellSlots).toBe(6);
    expect(spellSlotRow(sorcerer.spellSlots, 3)).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("gives warlock two second-level pact slots and four known spells at level 3", () => {
    const warlock = findByKey(CLASSES, "warlock")!;
    expect(spellPickLimitsForClass(warlock, ZERO_MODS, 3).spellSlots).toBe(4);
    expect(spellSlotRow(warlock.spellSlots, 3)).toEqual([0, 2, 0, 0, 0, 0, 0, 0, 0]);
    expect(pactMagicSlotLevel(warlock, 3)).toBe(2);
    expect(pactMagicSlotLevel(warlock, 1)).toBe(1);
  });

  it("grows the wizard spellbook to ten spells at level 3", () => {
    const wizard = findByKey(CLASSES, "wizard")!;
    expect(spellPickLimitsForClass(wizard, ZERO_MODS, 3).spellbookSlots).toBe(10);
  });

  it("gives Eldritch Knight two first-level slots at level 3 via grant_spellcasting overlay", () => {
    const fighter = findByKey(CLASSES, "fighter")!;
    expect(spellPickLimitsForClass(fighter, ZERO_MODS, 3, {}, MOCK_EK_SUBCLASS).spellSlots).toBe(3);
    expect(slotsByLevelFromRow(effectiveSpellSlotRow(fighter, MOCK_EK_SUBCLASS, 3))).toEqual({ 1: 2 });
    expect(spellPickLimitsForClass(fighter, ZERO_MODS, 3, {}, MOCK_EK_SUBCLASS).cantripSlots).toBe(2);
    expect(spellPickLimitsForClass(fighter, ZERO_MODS, 2, {}, MOCK_EK_SUBCLASS).spellSlots).toBe(0);
  });
});

describe("spellProgression at level 4", () => {
  it("gives full casters seven prepared spells, four first-level slots, and three second-level slots", () => {
    for (const key of ["bard", "cleric", "druid", "wizard"] as const) {
      const cls = findByKey(CLASSES, key)!;
      expect(spellPickLimitsForClass(cls, ZERO_MODS, 4).spellSlots).toBe(7);
      expect(spellSlotRow(cls.spellSlots, 4)).toEqual([4, 3, 0, 0, 0, 0, 0, 0, 0]);
    }
  });

  it("grows the wizard spellbook to twelve spells at level 4", () => {
    const wizard = findByKey(CLASSES, "wizard")!;
    expect(spellPickLimitsForClass(wizard, ZERO_MODS, 4).spellbookSlots).toBe(12);
    expect(spellPickLimitsForClass(wizard, ZERO_MODS, 4).cantripSlots).toBe(4);
  });

  it("gives sorcerer seven known spells and five cantrips at level 4", () => {
    const sorcerer = findByKey(CLASSES, "sorcerer")!;
    expect(spellPickLimitsForClass(sorcerer, ZERO_MODS, 4)).toMatchObject({
      spellSlots: 7,
      cantripSlots: 5,
      listMode: "known",
    });
  });

  it("gives half casters five prepared spells and three first-level slots", () => {
    for (const key of ["paladin", "ranger"] as const) {
      const cls = findByKey(CLASSES, key)!;
      expect(spellPickLimitsForClass(cls, ZERO_MODS, 4).spellSlots).toBe(5);
      expect(spellSlotRow(cls.spellSlots, 4)).toEqual([3, 0, 0, 0, 0, 0, 0, 0, 0]);
    }
  });

  it("gives warlock two second-level pact slots, three cantrips, and five known spells at level 4", () => {
    const warlock = findByKey(CLASSES, "warlock")!;
    expect(spellPickLimitsForClass(warlock, ZERO_MODS, 4).spellSlots).toBe(5);
    expect(spellPickLimitsForClass(warlock, ZERO_MODS, 4).cantripSlots).toBe(3);
    expect(spellSlotRow(warlock.spellSlots, 4)).toEqual([0, 2, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe("spellProgression at level 5", () => {
  it("gives full casters nine prepared spells and two third-level slots", () => {
    for (const key of ["bard", "cleric", "druid", "wizard"] as const) {
      const cls = findByKey(CLASSES, key)!;
      expect(spellPickLimitsForClass(cls, ZERO_MODS, 5).spellSlots).toBe(9);
      expect(spellSlotRow(cls.spellSlots, 5)).toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
    }
  });

  it("gives half casters six prepared spells and two second-level slots without third-level slots", () => {
    const paladin = findByKey(CLASSES, "paladin")!;
    expect(spellPickLimitsForClass(paladin, ZERO_MODS, 5).spellSlots).toBe(6);
    expect(spellSlotRow(paladin.spellSlots, 5)).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("gives warlock two third-level pact slots at level 5", () => {
    const warlock = findByKey(CLASSES, "warlock")!;
    expect(spellSlotRow(warlock.spellSlots, 5)).toEqual([0, 0, 2, 0, 0, 0, 0, 0, 0]);
    expect(spellPickLimitsForClass(warlock, ZERO_MODS, 5).spellSlots).toBe(6);
  });
});

describe("spellProgressionRowForLevel fallback", () => {
  it("reuses the highest row below a missing cap level", () => {
    const bard = findByKey(CLASSES, "bard")!;
    const clone = structuredClone(bard) as ClassData;
  const progression = clone.spellProgression!;
    delete progression.byCharacterLevel[6];
    expect(spellPickLimitsForClass(clone, ZERO_MODS, 6).spellSlots).toBe(9);
    expect(spellProgressionRowForLevel(progression, 6)?.spellsPrepared).toEqual(
      progression.byCharacterLevel[5]?.spellsPrepared,
    );
  });
});

describe("effectiveSpellSlotRow fallback", () => {
  it("reuses the highest slot row below a missing cap level", () => {
    const bard = findByKey(CLASSES, "bard")!;
    const clone = structuredClone(bard) as ClassData;
    delete clone.spellSlots!.byCharacterLevel[6];
    expect(effectiveSpellSlotRow(clone, null, 6)).toEqual(bard.spellSlots!.byCharacterLevel[5]);
    expect(slotsByLevelFromRow(effectiveSpellSlotRow(clone, null, 6))).toEqual(spellSlotsByLevel(bard, 5));
  });
});

describe("spellProgression at level 6", () => {
  it("gives full casters ten prepared spells and three third-level slots", () => {
    for (const key of ["bard", "cleric", "druid", "wizard"] as const) {
      const cls = findByKey(CLASSES, key)!;
      expect(spellPickLimitsForClass(cls, ZERO_MODS, 6).spellSlots).toBe(10);
      expect(spellSlotsByLevel(cls, 6)).toEqual({ 1: 4, 2: 3, 3: 3 });
    }
  });

  it("gives bard three cantrips at level 6", () => {
    const bard = findByKey(CLASSES, "bard")!;
    expect(spellPickLimitsForClass(bard, ZERO_MODS, 6).cantripSlots).toBe(3);
  });

  it("gives half casters and artificer the same prepared counts and slots as level 5", () => {
    for (const key of ["artificer", "paladin", "ranger"] as const) {
      const cls = findByKey(CLASSES, key)!;
      expect(spellPickLimitsForClass(cls, ZERO_MODS, 6).spellSlots).toBe(6);
      expect(spellSlotRow(cls.spellSlots, 6)).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0]);
      expect(spellPickLimitsForClass(cls, ZERO_MODS, 5).spellSlots).toBe(6);
    }
  });

  it("gives sorcerer ten known spells and warlock seven known with third-level pact slots", () => {
    const sorcerer = findByKey(CLASSES, "sorcerer")!;
    expect(spellPickLimitsForClass(sorcerer, ZERO_MODS, 6).spellSlots).toBe(10);
    const warlock = findByKey(CLASSES, "warlock")!;
    expect(spellPickLimitsForClass(warlock, ZERO_MODS, 6).spellSlots).toBe(7);
    expect(spellSlotRow(warlock.spellSlots, 6)).toEqual([0, 0, 2, 0, 0, 0, 0, 0, 0]);
  });

  it("grows the wizard spellbook to sixteen spells at level 6", () => {
    const wizard = findByKey(CLASSES, "wizard")!;
    expect(spellPickLimitsForClass(wizard, ZERO_MODS, 6).spellbookSlots).toBe(16);
  });
});
