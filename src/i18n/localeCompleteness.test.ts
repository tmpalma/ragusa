import { describe, expect, it } from "vitest";
import { ALIGNMENTS, ARMOR, BACKGROUNDS, BEASTS, CLASSES, CONDITIONS, DEITIES, FEATS, SPECIES, WEAPONS } from "../data";
import type { WeaponMasteryProperty } from "../data/types";
import { getMessages } from "./loadLocales";

const WEAPON_MASTERY_PROPERTIES: WeaponMasteryProperty[] = [
  "Cleave",
  "Graze",
  "Nick",
  "Push",
  "Sap",
  "Slow",
  "Topple",
  "Vex",
];

describe("locale catalog completeness", () => {
  const messages = getMessages("en");

  it("has a display name for every species, class, background, feat, weapon, armor, and alignment", () => {
    for (const species of SPECIES) {
      expect(messages[`catalog.species.${species.key}.name`]).toBe(species.name);
    }
    for (const cls of CLASSES) {
      expect(messages[`catalog.classes.${cls.key}.name`]).toBe(cls.name);
    }
    for (const bg of BACKGROUNDS) {
      expect(messages[`catalog.backgrounds.${bg.key}.name`]).toBe(bg.name);
    }
    for (const feat of FEATS) {
      expect(messages[`catalog.feats.${feat.key}.name`]).toBe(feat.name);
    }
    for (const weapon of WEAPONS) {
      expect(messages[`catalog.weapons.${weapon.key}.name`]).toBe(weapon.name);
    }
    for (const armor of ARMOR) {
      expect(messages[`catalog.armor.${armor.key}.name`]).toBe(armor.name);
    }
    for (const alignment of ALIGNMENTS) {
      expect(messages[`catalog.alignments.${alignment.key}.name`]).toBe(alignment.name);
    }
    for (const deity of DEITIES) {
      expect(messages[`catalog.deities.${deity.key}.name`]).toBe(deity.name);
    }
    for (const beast of BEASTS) {
      expect(messages[`catalog.beasts.${beast.key}.name`]).toBe(beast.name);
    }
    for (const condition of CONDITIONS) {
      expect(messages[`catalog.conditions.${condition.key}.name`]).toBe(condition.name);
    }
  });

  it("has weapon mastery descriptions in English", () => {
    for (const mastery of WEAPON_MASTERY_PROPERTIES) {
      const description = messages[`catalog.glossary.weaponMasteryDesc.${mastery}`];
      expect(description).toBeTruthy();
      expect(description).not.toBe(mastery);
    }
  });
});
