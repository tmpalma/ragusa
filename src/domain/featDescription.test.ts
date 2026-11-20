import { describe, expect, it } from "vitest";
import { FEATS, MAGIC_ITEMS, findByKey } from "../data";
import { findGenericVariant } from "./genericVariantMatcher";
import {
  featDescriptionReference,
  parseFeatDescriptionReference,
  parseFeatReferenceTable,
} from "./featDescription";

describe("parseFeatDescriptionReference", () => {
  it("parses bold benefit blocks", () => {
    const parsed = parseFeatDescriptionReference(
      "You gain the following benefits.\n\n**Cantrip.** You learn Minor Illusion.\n\n**Inspiring Magic.** You inspire.",
    );
    expect(parsed?.intro).toBe("You gain the following benefits.");
    expect(parsed?.options.map((option) => option.name)).toEqual(["Cantrip", "Inspiring Magic"]);
    expect(parsed?.options[0]?.desc).toContain("Minor Illusion");
  });

  it("parses colon-header benefit blocks", () => {
    const parsed = parseFeatDescriptionReference(
      [
        "Tool Proficiency:",
        "You gain a tool.",
        "Discount:",
        "You pay less.",
        "Fast Crafting:",
        "Finish during a Long Rest.",
      ].join("\n\n"),
    );
    expect(parsed?.options.map((option) => option.name)).toEqual([
      "Tool Proficiency",
      "Discount",
      "Fast Crafting",
    ]);
    expect(parsed?.options[2]?.desc).toContain("Long Rest");
  });

  it("parses colon-header blocks after a prerequisite", () => {
    const parsed = parseFeatDescriptionReference(
      [
        "Prerequisite: Charisma 13 or higher.",
        "You gain the following benefits.",
        "Impersonation:",
        "You impersonate.",
        "Mimicry:",
        "You mimic.",
      ].join("\n\n"),
    );
    expect(parsed?.intro).toBe("You gain the following benefits.");
    expect(parsed?.options.map((option) => option.name)).toEqual(["Impersonation", "Mimicry"]);
  });

  it("keeps spell tables as trailing text", () => {
    const parsed = parseFeatDescriptionReference(
      [
        "Additional Spells:",
        "You learn more.",
        "Protective Ward:",
        "A ward.",
        "Abjuration Adept Spells\nSpell Slot Level | Spells\n1 | Shield",
      ].join("\n\n"),
    );
    expect(parsed?.options.map((option) => option.name)).toEqual(["Additional Spells", "Protective Ward"]);
    expect(parsed?.trailing).toContain("Abjuration Adept Spells");
    expect(parsed?.trailing).toContain("Shield");
  });

  it("returns null when there are no named benefit blocks", () => {
    const asi = findByKey(FEATS, "ability-score-improvement");
    expect(asi).toBeTruthy();
    expect(parseFeatDescriptionReference(asi!.desc)).toBeNull();
  });

  it("parses javelin-of-lightning named ability blocks", () => {
    const javelin = findByKey(MAGIC_ITEMS, "javelin-of-lightning");
    expect(javelin).toBeTruthy();
    const parsed = parseFeatDescriptionReference(javelin!.desc);
    expect(parsed?.intro).toContain("Lightning damage");
    expect(parsed?.options.map((option) => option.name)).toEqual(["Lightning Bolt"]);
  });

  it("parses a leading spell table before the first named section (Staff of Healing shape)", () => {
    const parsed = parseFeatDescriptionReference(
      [
        "This staff has 10 charges. While holding the staff, you can cast one of the spells on the following table from it.",
        "Spell | Charge Cost\nCure Wounds | 1 charge per spell level (maximum 4 for a level 4 spell)\nLesser Restoration | 2\nMass Cure Wounds | 5",
        "**Regaining Charges.** The staff regains 1d6 + 4 expended charges daily at dawn.",
      ].join("\n\n"),
    );
    expect(parsed?.intro).toContain("10 charges");
    expect(parsed?.intro).not.toContain("|");
    expect(parsed?.options[0]?.name).toBe("");
    expect(parsed?.options[0]?.table?.headers).toEqual(["Spell", "Charge Cost"]);
    expect(parsed?.options[1]?.name).toBe("Regaining Charges");
    expect(parsed?.trailing).toBeUndefined();
  });

  it("parses a trailing spell table after the last named section (Wand of Slumber shape)", () => {
    const parsed = parseFeatDescriptionReference(
      [
        "This wand has 7 charges. While holding it, you can cast one of the spells on the following table from it.",
        "**Regaining Charges.** The wand regains 1d6 + 1 expended charges daily at dawn.",
        "Spell | Charge Cost\nCatnap | 3\nSleep (save DC 15) | 1",
      ].join("\n\n"),
    );
    expect(parsed?.options.map((option) => option.name)).toEqual(["Regaining Charges", ""]);
    expect(parsed?.options[1]?.table?.headers).toEqual(["Spell", "Charge Cost"]);
    expect(parsed?.trailing).toBeUndefined();
  });

  it("parses embedded pipe tables under a named section when more sections follow", () => {
    const parsed = parseFeatDescriptionReference(
      [
        "This staff has 6 charges and can be wielded as a magic Quarterstaff.",
        "**Spells.** While holding the staff, you can cast spells from the table.",
        "Spell | Charge Cost\nAnimal Friendship | 1\nAwaken | 5",
        "**Tree Form.** You plant the staff.",
        "**Regaining Charges.** The staff regains 1d6 expended charges daily at dawn.",
      ].join("\n\n"),
    );
    expect(parsed?.intro).toContain("6 charges");
    expect(parsed?.options.map((option) => option.name)).toEqual(["Spells", "Tree Form", "Regaining Charges"]);
    expect(parsed?.options[0]?.table?.headers).toEqual(["Spell", "Charge Cost"]);
    expect(parsed?.options[0]?.table?.rows[0]).toEqual(["Animal Friendship", "1"]);
    expect(parsed?.trailing).toBeUndefined();
  });

  it("parses hammer-of-thunderbolts nested bullet ability blocks", () => {
    const hammer = findGenericVariant("hammer-of-thunderbolts");
    expect(hammer).toBeTruthy();
    const parsed = parseFeatDescriptionReference(hammer!.desc);
    expect(parsed?.intro).toContain("+1 bonus");
    expect(parsed?.options.map((option) => option.name)).toEqual([
      "Giant's Bane",
      "Giants' Bane",
      "Might of Giants",
    ]);
  });
});

describe("parseFeatReferenceTable", () => {
  it("parses d20 effect rows from trailing text", () => {
    const trailing = [
      "Mythal-Touched Magic",
      "1d20 | Effect",
      "1-2 | Alpha",
      "3-4 | Beta",
      "5-6 | Gamma",
      "7-8 | Delta",
      "9-10 | Epsilon",
      "11-19 | Zeta",
      "20 | Omega",
    ].join("\n");
    const table = parseFeatReferenceTable(trailing);
    expect(table?.title).toBe("Mythal-Touched Magic");
    expect(table?.options.length).toBeGreaterThanOrEqual(7);
    expect(table?.options[0]?.name).toBe("1-2");
    expect(table?.options.at(-1)?.name).toBe("20");
  });
});

describe("featDescriptionReference", () => {
  it("prefers mechanics reference options over catalog parsing", () => {
    const reference = featDescriptionReference("ignored", {
      options: [
        { key: "heavy-weapon-mastery", name: "Heavy Weapon Mastery", desc: "..." },
        { key: "hew", name: "Hew", desc: "..." },
      ],
    });
    expect(reference?.options.map((option) => option.key)).toEqual(["heavy-weapon-mastery", "hew"]);
  });
});
