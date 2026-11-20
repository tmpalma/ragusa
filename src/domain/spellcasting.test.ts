import { describe, expect, it } from "vitest";
import { CLASSES, findByKey } from "../data";
import type { SubclassData } from "../data/types";
import { computeEffectiveSpellcasting, computeSpellcasting, effectiveSpellcasting } from "./spellcasting";

const baseInput = {
  spellcastingAbility: "int" as const,
  spellcastingGainedAtLevel: 1,
  level1Slots: 2,
  abilityModifierValue: 3,
  proficiencyBonus: 2,
  characterLevel: 1,
};

describe("computeSpellcasting", () => {
  it("returns null for a non-caster (no spellcasting ability)", () => {
    expect(computeSpellcasting({ ...baseInput, spellcastingAbility: null })).toBeNull();
  });

  it("returns null when the class hasn't gained spellcasting yet at this level", () => {
    expect(computeSpellcasting({ ...baseInput, spellcastingGainedAtLevel: 2, characterLevel: 1 })).toBeNull();
  });

  it("computes attack bonus, save DC, and slot count for an eligible caster", () => {
    expect(computeSpellcasting(baseInput)).toEqual({
      ability: "int",
      abilityModifier: 3,
      attackBonus: 5,
      saveDc: 13,
      slotsByLevel: { 1: 2 },
      level1Slots: 2,
      cantripsKnown: 0,
      spellsPreparedOrKnown: 0,
      listMode: null,
    });
  });

  it("returns null for fighter without a third-caster subclass overlay", () => {
    const fighter = findByKey(CLASSES, "fighter");
    expect(effectiveSpellcasting(fighter, null, 3, { int: 2, str: 0, dex: 0, con: 0, wis: 0, cha: 0 })).toBeNull();
  });

  it("merges grant_spellcasting for Eldritch Knight at level 3", () => {
    const fighter = findByKey(CLASSES, "fighter");
    const subclass: SubclassData = {
      key: "eldritch-knight",
      classKey: "fighter",
      name: "Eldritch Knight",
      desc: "Test",
      srd: false,
      book: "XPHB",
      features: [
        {
          key: "spellcasting",
          name: "Spellcasting",
          desc: "Test",
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
    const mods = { int: 0, str: 0, dex: 0, con: 0, wis: 0, cha: 0 };
    expect(effectiveSpellcasting(fighter, subclass, 3, mods)).toMatchObject({
      ability: "int",
      gainedAtLevel: 3,
      listClassKey: "wizard",
      cantripsKnown: 2,
      spellsPreparedOrKnown: 3,
      slotRow: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    expect(computeEffectiveSpellcasting(fighter, subclass, 3, mods, 2)).toMatchObject({
      ability: "int",
      attackBonus: 2,
      saveDc: 10,
      level1Slots: 2,
    });
  });
});
