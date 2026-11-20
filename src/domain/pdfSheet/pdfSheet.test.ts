/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { INITIAL_CHARACTER, type ProficiencyState } from "../../state/characterState";
import { computeDerivedStats } from "../deriveCharacter";
import { formatModifier } from "../modifiers";
import { buildSheetPayload } from "./buildSheetPayload";
import { EN_FIELD_MAP } from "./fieldMaps/en";
import { PT_BR_FIELD_MAP } from "./fieldMaps/pt-BR";
import { allMappedFieldNames } from "./fieldMaps/index";
import { fillCharacterSheetPdf } from "./fillCharacterSheetPdf";

const projectRoot = resolve(import.meta.dirname, "../../..");

function loadTemplate(name: string): Uint8Array {
  return readFileSync(resolve(projectRoot, "public/character-sheets", name));
}

const t = (key: string, params?: Record<string, string | number>, fallback?: string) => {
  const templates: Record<string, string> = {
    "sheet.classLevelSegment": "{className} {level}",
  };
  const base = templates[key] ?? fallback ?? key;
  if (params) {
    return Object.entries(params).reduce(
      (acc, [name, value]) => acc.replace(`{${name}}`, String(value)),
      base,
    );
  }
  return base;
};

const entityName = (_catalog: string, _key: string | null | undefined, fallback?: string) =>
  fallback ?? "";

describe("buildSheetPayload", () => {
  it("fills core combat and identity slots from a sample character", () => {
    const character = {
      ...INITIAL_CHARACTER,
      name: "Aldric",
      classKey: "fighter",
      level: 1,
      speciesKey: "human",
      backgroundKey: "soldier",
      abilityScores: {
        str: 16,
        dex: 14,
        con: 15,
        int: 10,
        wis: 12,
        cha: 8,
      },
      skills: {
        ...INITIAL_CHARACTER.skills,
        athletics: "proficient" as ProficiencyState,
        perception: "proficient" as ProficiencyState,
      },
      weapons: [{ id: "w1", key: "longsword" }],
      currency: { pp: 0, gp: 15, ep: 0, sp: 0, cp: 0 },
    };

    const derived = computeDerivedStats(character);
    const payload = buildSheetPayload(character, derived, t, entityName);

    expect(payload.text.characterName).toBe("Aldric");
    expect(payload.text.strScore).toBe("16");
    expect(payload.text.strMod).toBe("+3");
    expect(payload.text.armorClass).toBe(String(derived.armorClass));
    expect(payload.text.currencyGp).toBe("15");
    expect(payload.checkboxes.skillProf_athletics).toBe(true);
    expect(payload.text.attack1Name).toContain("Longsword");
    expect(payload.text.hitDiceSpent).toBe("0");
  });

  it("uses variant display names and +1 attack/damage on the sheet", () => {
    const character = {
      ...INITIAL_CHARACTER,
      name: "Aldric",
      classKey: "fighter",
      abilityScores: {
        ...INITIAL_CHARACTER.abilityScores,
        str: 16,
        dex: 14,
        con: 15,
      },
      weapons: [{ id: "w1", key: "longsword", variantKey: "weapon-plus-1" }],
      armor: [{ id: "a1", key: "plate-armor", worn: true, variantKey: "armor-plus-1" }],
    };
    const derived = computeDerivedStats(character);
    const payload = buildSheetPayload(character, derived, t, entityName);
    expect(payload.text.attack1Name).toContain("+1 Longsword");
    expect(payload.text.attack1Bonus).toBe("+6");
    expect(payload.text.attack1Damage).toBe("1d8+4 Slashing");
    expect(payload.text.equipment).toContain("+1 Plate Armor");
    expect(payload.text.armorClass).toBe("19");
  });

  it("fills attunement slots from merged wondrous and Armory display names", () => {
    const character = {
      ...INITIAL_CHARACTER,
      attunedMagicItemKeys: ["cloak-of-protection"],
      weapons: [{ id: "w1", key: "longsword", variantKey: "defender", attuned: true }],
    };
    const payload = buildSheetPayload(character, computeDerivedStats(character), t, entityName);
    expect(payload.text.attunement1).toBe("Cloak of Protection");
    expect(payload.text.attunement2).toBe("Defender Longsword");
    expect(payload.text.attunement3).toBeUndefined();
  });

  it("uses magic item display names for non-attunement picks in adventuring gear", () => {
    const character = {
      ...INITIAL_CHARACTER,
      adventuringGear: [
        { key: "bag-of-holding", quantity: 1 },
        { key: "quiver-of-ehlonna", quantity: 1 },
      ],
    };
    const payload = buildSheetPayload(character, computeDerivedStats(character), t, entityName);
    expect(payload.text.equipment).toContain("Bag of Holding");
    expect(payload.text.equipment).toContain("Quiver of Ehlonna");
    expect(payload.text.equipment).not.toContain("bag-of-holding");
    expect(payload.text.equipment).not.toContain("quiver-of-ehlonna");
  });

  it("exports alignment to its own slot and keeps backstory empty without player text", () => {
    const character = {
      ...INITIAL_CHARACTER,
      alignmentKey: "neutral-good",
      alignmentDescription: "Neutral Good characters do the best they can.",
      backstory: "",
    };
    const payload = buildSheetPayload(character, computeDerivedStats(character), t, entityName);
    expect(payload.text.alignment).toBe("Neutral Good");
    expect(payload.text.backstory).toBeUndefined();
  });

  it("formats multiclass class line and per-class spell save DCs", () => {
    const character = {
      ...INITIAL_CHARACTER,
      name: "Elara",
      classKey: "wizard",
      level: 4,
      levelPath: ["wizard", "wizard", "wizard", "cleric"],
      subclassByClass: {},
      abilityScores: {
        str: 8,
        dex: 14,
        con: 12,
        int: 16,
        wis: 15,
        cha: 10,
      },
    };
    const derived = computeDerivedStats(character);
    const payload = buildSheetPayload(character, derived, t, entityName);

    expect(payload.text.class).toBe("Wizard 3 / Cleric 1");
    expect(payload.text.enBackgroundClassRow).toContain("Wizard 3 / Cleric 1");
    expect(payload.text.spellSaveDc).toBe("Wizard 13 / Cleric 12");
  });
});

const EN_SPELL_TABLE_FIELDS = new Set(
  Array.from({ length: 60 }, (_, index) => `text_${276 + index}`),
);

const PT_SPELL_TABLE_FIELDS = new Set(
  Array.from({ length: 30 }, (_, index) => `text_${288 + index}`),
);

function fieldBaseName(fieldName: string): string {
  return fieldName.match(/^(text_\d+)/)?.[1] ?? fieldName;
}

describe("field maps", () => {
  it("pins English save/skill widgets to page-1 small boxes, not the spell table", () => {
    expect(EN_FIELD_MAP.saveBonus_str.field).toBe("text_60zpuk");
    expect(EN_FIELD_MAP.saveBonus_int.field).toBe("text_54bfgy");
    expect(EN_FIELD_MAP.saveBonus_cha.field).toBe("text_73cwxt");
    expect(EN_FIELD_MAP.skillBonus_arcana.field).toBe("text_55nptn");
    expect(EN_FIELD_MAP.skillBonus_athletics.field).toBe("text_61knsn");
    expect(EN_FIELD_MAP.skillBonus_persuasion.field).toBe("text_77nads");
    expect(EN_FIELD_MAP.spellRow0.field).toBe("text_306noh");
    expect(EN_FIELD_MAP.spellRow29.field).toBe("text_335znlw");

    for (const [slot, binding] of Object.entries(EN_FIELD_MAP)) {
      if (!slot.startsWith("saveBonus_") && !slot.startsWith("skillBonus_")) continue;
      const base = fieldBaseName(binding.field);
      expect(
        EN_SPELL_TABLE_FIELDS.has(base),
        `${slot} must not map to spell-table widget ${binding.field}`,
      ).toBe(false);
    }
  });

  it("pins pt-BR save/skill widgets to page-1 small boxes, not the spell table", () => {
    expect(PT_BR_FIELD_MAP.saveBonus_int.field).toBe("text_25jyjb");
    expect(PT_BR_FIELD_MAP.saveBonus_str.field).toBe("text_31muji");
    expect(PT_BR_FIELD_MAP.skillBonus_arcana.field).toBe("text_26tliz");
    expect(PT_BR_FIELD_MAP.skillBonus_persuasion.field).toBe("text_48njog");
    expect(PT_BR_FIELD_MAP.spellRow0.field).toBe("text_288qujt");
    expect(PT_BR_FIELD_MAP.spellRow29.field).toBe("text_317qlqa");

    for (const [slot, binding] of Object.entries(PT_BR_FIELD_MAP)) {
      if (!slot.startsWith("saveBonus_") && !slot.startsWith("skillBonus_")) continue;
      const base = fieldBaseName(binding.field);
      expect(
        PT_SPELL_TABLE_FIELDS.has(base),
        `${slot} must not map to spell-table widget ${binding.field}`,
      ).toBe(false);
    }
  });

  it("maps only to fields that exist in the English template", async () => {
    const pdf = await PDFDocument.load(loadTemplate("en.pdf"));
    const names = new Set(pdf.getForm().getFields().map((field) => field.getName()));
    for (const field of allMappedFieldNames("en")) {
      expect(names.has(field), `missing EN field ${field}`).toBe(true);
    }
  });

  it("maps only to fields that exist in the pt-BR template", async () => {
    const pdf = await PDFDocument.load(loadTemplate("pt-BR.pdf"));
    const names = new Set(pdf.getForm().getFields().map((field) => field.getName()));
    for (const field of allMappedFieldNames("pt-BR")) {
      expect(names.has(field), `missing PT field ${field}`).toBe(true);
    }
  });
});

describe("fillCharacterSheetPdf", () => {
  const bardCharacter = {
    ...INITIAL_CHARACTER,
    name: "Test Hero",
    classKey: "bard",
    level: 1,
    speciesKey: "human",
    backgroundKey: "soldier",
    abilityScores: {
      str: 8,
      dex: 14,
      con: 12,
      int: 10,
      wis: 13,
      cha: 16,
    },
  };

  it("writes the character name into the English PDF", async () => {
    const payload = buildSheetPayload(
      { ...INITIAL_CHARACTER, name: "Test Hero" },
      computeDerivedStats(INITIAL_CHARACTER),
      t,
      entityName,
    );
    const filled = await fillCharacterSheetPdf(loadTemplate("en.pdf"), payload, EN_FIELD_MAP);
    const pdf = await PDFDocument.load(filled);
    expect(pdf.getForm().getTextField(EN_FIELD_MAP.characterName.field).getText()).toBe("Test Hero");
  });

  it("writes combat and identity values to the correct English fields", async () => {
    const derived = computeDerivedStats(bardCharacter);
    const payload = buildSheetPayload(bardCharacter, derived, t, entityName);
    const filled = await fillCharacterSheetPdf(loadTemplate("en.pdf"), payload, EN_FIELD_MAP);
    const form = (await PDFDocument.load(filled)).getForm();

    expect(form.getTextField(EN_FIELD_MAP.level.field).getText()).toBe("1");
    expect(form.getTextField(EN_FIELD_MAP.armorClass.field).getText()).toBe(String(derived.armorClass));
    expect(form.getTextField(EN_FIELD_MAP.proficiencyBonus.field).getText()).toBe("+2");
    expect(form.getTextField(EN_FIELD_MAP.hitDiceMax.field).getText()).toBe("1");
    expect(form.getTextField(EN_FIELD_MAP.hitDiceSpent.field).getText()).toBe("0");
    expect(form.getTextField(EN_FIELD_MAP.enBackgroundClassRow.field).getText()).toBe(
      payload.text.enBackgroundClassRow,
    );
    expect(form.getTextField(EN_FIELD_MAP.enSpeciesSubclassRow.field).getText()).toBe("Human");
    expect(payload.text.enBackgroundClassRow).toContain("Soldier");
    expect(payload.text.enBackgroundClassRow).toContain("Bard");
    expect(form.getTextField(EN_FIELD_MAP.spellSaveDc.field).getText()).toBe(
      String(derived.spellcasting?.saveDc),
    );
    expect(form.getTextField(EN_FIELD_MAP.spellAttackBonus.field).getText()).toBe(
      payload.text.spellAttackBonus,
    );
  });

  it("writes combat and identity values to the correct pt-BR fields", async () => {
    const derived = computeDerivedStats(bardCharacter);
    const payload = buildSheetPayload(bardCharacter, derived, t, entityName);
    const filled = await fillCharacterSheetPdf(loadTemplate("pt-BR.pdf"), payload, PT_BR_FIELD_MAP);
    const form = (await PDFDocument.load(filled)).getForm();

    expect(form.getTextField(PT_BR_FIELD_MAP.level.field).getText()).toBe("1");
    expect(form.getTextField(PT_BR_FIELD_MAP.class.field).getText()).toBe("Bard 1");
    expect(form.getTextField(PT_BR_FIELD_MAP.species.field).getText()).toBe("Human");
    expect(form.getTextField(PT_BR_FIELD_MAP.armorClass.field).getText()).toBe(String(derived.armorClass));
    expect(form.getTextField(PT_BR_FIELD_MAP.proficiencyBonus.field).getText()).toBe("+2");
    expect(form.getTextField(PT_BR_FIELD_MAP.hitDiceMax.field).getText()).toBe("1");
    expect(form.getTextField(PT_BR_FIELD_MAP.hitDiceSpent.field).getText()).toBe("0");
    expect(form.getTextField(PT_BR_FIELD_MAP.spellSaveDc.field).getText()).toBe(
      String(derived.spellcasting?.saveDc),
    );
    expect(form.getTextField(PT_BR_FIELD_MAP.spellAttackBonus.field).getText()).toBe(
      payload.text.spellAttackBonus,
    );
  });

  it("writes cantrips into the English spell table name column", async () => {
    const character = {
      ...INITIAL_CHARACTER,
      name: "Caster",
      classKey: "wizard",
      level: 1,
      cantripPicks: ["fire-bolt"],
      spellPicks: ["magic-missile"],
    };
    const payload = buildSheetPayload(character, computeDerivedStats(character), t, entityName);
    expect(payload.text.spellRow0).toBeTruthy();
    const filled = await fillCharacterSheetPdf(loadTemplate("en.pdf"), payload, EN_FIELD_MAP);
    const pdf = await PDFDocument.load(filled);
    expect(pdf.getForm().getTextField(EN_FIELD_MAP.spellRow0.field).getText()).toBe(
      payload.text.spellRow0,
    );
    expect(EN_FIELD_MAP.spellRow0.field).toBe("text_306noh");
    expect(pdf.getForm().getTextField("text_276tnnb").getText() ?? "").toBe("");
  });

  it("writes the character name into the pt-BR PDF", async () => {
    const payload = buildSheetPayload(
      { ...INITIAL_CHARACTER, name: "Herói Teste" },
      computeDerivedStats(INITIAL_CHARACTER),
      t,
      entityName,
    );
    const filled = await fillCharacterSheetPdf(loadTemplate("pt-BR.pdf"), payload, PT_BR_FIELD_MAP);
    const pdf = await PDFDocument.load(filled);
    expect(pdf.getForm().getTextField(PT_BR_FIELD_MAP.characterName.field).getText()).toBe(
      "Herói Teste",
    );
  });

  it("writes saves, skills, currency, and alignment to visible English fields", async () => {
    const character = {
      ...INITIAL_CHARACTER,
      name: "Export Test",
      classKey: "bard",
      level: 1,
      alignmentKey: "neutral-good",
      alignmentDescription: "Neutral Good characters do the best they can.",
      backstory: "",
      abilityScores: {
        str: 10,
        dex: 16,
        con: 12,
        int: 14,
        wis: 10,
        cha: 18,
      },
      skills: {
        ...INITIAL_CHARACTER.skills,
        athletics: "proficient" as ProficiencyState,
        arcana: "proficient" as ProficiencyState,
        persuasion: "expert" as ProficiencyState,
      },
      currency: { pp: 0, gp: 71, ep: 6, sp: 0, cp: 0 },
    };
    const derived = computeDerivedStats(character);
    const payload = buildSheetPayload(character, derived, t, entityName);
    const filled = await fillCharacterSheetPdf(loadTemplate("en.pdf"), payload, EN_FIELD_MAP);
    const form = (await PDFDocument.load(filled)).getForm();

    expect(form.getTextField("text_60zpuk").getText()).toBe(
      formatModifier(derived.savingThrows.str.modifier),
    );
    expect(form.getTextField("text_73cwxt").getText()).toBe(
      formatModifier(derived.savingThrows.cha.modifier),
    );
    expect(form.getTextField("text_61knsn").getText()).toBe(
      formatModifier(derived.skillBonuses.athletics),
    );
    expect(form.getTextField("text_55nptn").getText()).toBe(
      formatModifier(derived.skillBonuses.arcana),
    );
    expect(form.getTextField("text_77nads").getText()).toBe(
      formatModifier(derived.skillBonuses.persuasion),
    );
    expect(form.getTextField("text_306noh").getText() ?? "").toBe("");
    expect(form.getTextField("text_276tnnb").getText() ?? "").toBe("");
    expect(form.getTextField(EN_FIELD_MAP.currencyCp.field).getText() ?? "").toBe("");
    expect(form.getTextField(EN_FIELD_MAP.currencySp.field).getText() ?? "").toBe("");
    expect(form.getTextField(EN_FIELD_MAP.currencyEp.field).getText()).toBe("6");
    expect(form.getTextField(EN_FIELD_MAP.currencyGp.field).getText()).toBe("71");
    expect(form.getTextField(EN_FIELD_MAP.currencyPp.field).getText() ?? "").toBe("");
    expect(form.getTextField(EN_FIELD_MAP.alignment.field).getText()).toBe("Neutral Good");
    expect(form.getTextField(EN_FIELD_MAP.backstory.field).getText() ?? "").toBe("");
  });
});
