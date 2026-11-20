import { describe, expect, it } from "vitest";
import {
  CHARACTER_FILE_FORMAT,
  CHARACTER_FILE_SCHEMA_VERSION,
  CharacterFileParseError,
  characterForSave,
  hydrateCharacter,
  isInitialCharacter,
  parseCharacterFile,
  serializeCharacterFile,
} from "./characterFile";
import type { SkillId } from "../data/types";
import { characterReducer, INITIAL_CHARACTER, type Character } from "../state/characterState";
import type { MagicAmmunitionStack } from "./ammunition";
import { gearEquipmentActionKey } from "./equipmentActions";

describe("characterFile", () => {
  it("round-trips INITIAL_CHARACTER", () => {
    const json = serializeCharacterFile(INITIAL_CHARACTER);
    const parsed = parseCharacterFile(json);
    expect(parsed).toEqual(characterForSave(INITIAL_CHARACTER));
  });

  it("round-trips a character built through the reducer", () => {
    let character = characterReducer(INITIAL_CHARACTER, { type: "SET_NAME", value: "Aldric" });
    character = characterReducer(character, { type: "SET_CLASS", key: "paladin" });
    character = characterReducer(character, { type: "SET_FEAT", key: "magic-initiate" });
    character = characterReducer(character, { type: "SET_DEITY", key: "torm" });
    character = characterReducer(character, { type: "SET_CURRENT_HIT_POINTS", value: 7 });

    const json = serializeCharacterFile(character);
    const parsed = parseCharacterFile(json);

    expect(parsed.name).toBe("Aldric");
    expect(parsed.classKey).toBe("paladin");
    expect(parsed.featKey).toBe("magic-initiate");
    expect(parsed.deityKey).toBe("torm");
    expect(parsed.currentHitPoints).toBe(7);
    expect(parsed.skillConflictNotice).toBeNull();
  });

  it("hydrates deityKey with fallback to null", () => {
    expect(hydrateCharacter({ deityKey: "anubis" }).deityKey).toBe("anubis");
    expect(hydrateCharacter({}).deityKey).toBeNull();
  });

  it("ignores extra unknown fields on the envelope and character", () => {
    const json = serializeCharacterFile(INITIAL_CHARACTER);
    const envelope = JSON.parse(json) as Record<string, unknown>;
    envelope.unknownEnvelopeField = "ignore me";
    (envelope.character as Record<string, unknown>).unknownCharacterField = { nested: true };

    const parsed = parseCharacterFile(JSON.stringify(envelope));
    expect(parsed).toEqual(characterForSave(INITIAL_CHARACTER));
  });

  it("falls back to INITIAL_CHARACTER defaults for missing fields", () => {
    const minimal = {
      format: CHARACTER_FILE_FORMAT,
      schemaVersion: CHARACTER_FILE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      character: {
        name: "Legacy",
        classKey: "fighter",
      },
    };

    const parsed = parseCharacterFile(JSON.stringify(minimal));
    expect(parsed.name).toBe("Legacy");
    expect(parsed.classKey).toBe("fighter");
    expect(parsed.level).toBe(INITIAL_CHARACTER.level);
    expect(parsed.weapons).toEqual(INITIAL_CHARACTER.weapons);
    expect(parsed.spellSlotRemaining).toEqual(INITIAL_CHARACTER.spellSlotRemaining);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseCharacterFile("{not json")).toThrow(CharacterFileParseError);
    try {
      parseCharacterFile("{not json");
    } catch (error) {
      expect(error).toMatchObject({ code: "invalid_json" });
    }
  });

  it("rejects unsupported format", () => {
    const payload = JSON.stringify({
      format: "other-format",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      character: {},
    });
    expect(() => parseCharacterFile(payload)).toThrow(CharacterFileParseError);
    try {
      parseCharacterFile(payload);
    } catch (error) {
      expect(error).toMatchObject({ code: "unsupported_format" });
    }
  });

  it("rejects unsupported schema version", () => {
    const payload = JSON.stringify({
      format: CHARACTER_FILE_FORMAT,
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      character: {},
    });
    expect(() => parseCharacterFile(payload)).toThrow(CharacterFileParseError);
    try {
      parseCharacterFile(payload);
    } catch (error) {
      expect(error).toMatchObject({ code: "unsupported_schema_version" });
    }
  });

  it("does not include derived-only fields in the saved envelope", () => {
    const json = serializeCharacterFile(INITIAL_CHARACTER);
    const envelope = JSON.parse(json) as Record<string, unknown>;
    expect(envelope.format).toBe(CHARACTER_FILE_FORMAT);
    expect(envelope.schemaVersion).toBe(CHARACTER_FILE_SCHEMA_VERSION);
    expect(envelope).not.toHaveProperty("armorClass");
    expect(envelope).not.toHaveProperty("hitPoints");
    expect(envelope.character).not.toHaveProperty("armorClass");
    expect(envelope.character).not.toHaveProperty("hitPoints");
  });

  it("clears skillConflictNotice on save", () => {
    const withNotice = {
      ...INITIAL_CHARACTER,
      skillConflictNotice: ["athletics" as SkillId],
    };
    const saved = characterForSave(withNotice);
    expect(saved.skillConflictNotice).toBeNull();
  });

  it("hydrates nested feat choices and equipment", () => {
    const hydrated = hydrateCharacter({
      name: "Nested",
      featChoices: {
        proficiencyPicks: [{ kind: "skill", id: "athletics" }],
        abilityIncreases: { str: 1 },
        spellcastingAbility: "wis",
        cantripPicks: ["light"],
        spellPicks: [null],
        damageTypePick: null,
        weaponMasteryPick: null,
      },
      weapons: [{ id: "w1", key: "longsword", quantity: 1 }],
      armor: [{ id: "a1", key: "leather-armor", worn: true }],
      currency: { pp: 0, gp: 15, ep: 0, sp: 0, cp: 0 },
    });

    expect(hydrated.name).toBe("Nested");
    expect(hydrated.featChoices.proficiencyPicks[0]).toEqual({ kind: "skill", id: "athletics" });
    expect(hydrated.weapons).toEqual([{ id: "w1", key: "longsword", quantity: 1 }]);
    expect(hydrated.armor).toEqual([{ id: "a1", key: "leather-armor", worn: true }]);
    expect(hydrated.currency.gp).toBe(15);
  });

  it("round-trips optional weapon and armor variantKey and attuned", () => {
    const withVariants = {
      ...INITIAL_CHARACTER,
      weapons: [{ id: "w1", key: "longsword", quantity: 1, variantKey: "weapon-plus-1", attuned: true }],
      armor: [{ id: "a1", key: "chain-mail", worn: true, variantKey: "elven-chain" }],
    };
    const json = serializeCharacterFile(withVariants);
    const parsed = parseCharacterFile(json);
    expect(parsed.weapons).toEqual([
      { id: "w1", key: "longsword", quantity: 1, variantKey: "weapon-plus-1", attuned: true },
    ]);
    expect(parsed.armor).toEqual([{ id: "a1", key: "chain-mail", worn: true, variantKey: "elven-chain" }]);

    const mundane = hydrateCharacter({
      weapons: [{ id: "w2", key: "dagger", quantity: 1 }],
      armor: [{ id: "a2", key: "leather-armor", worn: false, attuned: false, variantKey: "" }],
    });
    expect(mundane.weapons).toEqual([{ id: "w2", key: "dagger", quantity: 1 }]);
    expect(mundane.armor).toEqual([{ id: "a2", key: "leather-armor", worn: false }]);
  });

  it("hydrates attuned magic items into adventuring gear on load", () => {
    const json = serializeCharacterFile({
      ...INITIAL_CHARACTER,
      attunedMagicItemKeys: ["cloak-of-protection"],
      adventuringGear: [],
    });
    const parsed = parseCharacterFile(json);
    expect(parsed.adventuringGear).toEqual([{ key: "cloak-of-protection", quantity: 1 }]);
    expect(parsed.attunedMagicItemKeys).toEqual(["cloak-of-protection"]);
  });

  it("round-trips equipment action pins", () => {
    const withPins = {
      ...INITIAL_CHARACTER,
      equipmentActionKeys: [gearEquipmentActionKey("bag-of-holding")],
    };
    const parsed = parseCharacterFile(serializeCharacterFile(withPins));
    expect(parsed.equipmentActionKeys).toEqual(withPins.equipmentActionKeys);
  });

  it("round-trips magic item charge remaining", () => {
    const withCharges = {
      ...INITIAL_CHARACTER,
      magicItemChargeRemaining: { "wand-of-magic-missiles": 3 },
      equipmentRestUsesRemaining: { "gear:javelin-of-lightning:lightning-bolt": 0 },
    };
    const parsed = parseCharacterFile(serializeCharacterFile(withCharges));
    expect(parsed.magicItemChargeRemaining).toEqual(withCharges.magicItemChargeRemaining);
    expect(parsed.equipmentRestUsesRemaining).toEqual(withCharges.equipmentRestUsesRemaining);
  });

  it("round-trips pack remaining on adventuring gear", () => {
    const withPack = {
      ...INITIAL_CHARACTER,
      adventuringGear: [{ key: "explorers-pack", quantity: 1, packRemaining: { oil: 1, rations: 8, torch: 10 } }],
    };
    const parsed = parseCharacterFile(serializeCharacterFile(withPack));
    expect(parsed.adventuringGear).toEqual(withPack.adventuringGear);
  });

  it("round-trips magic ammunition stacks and preferred ammo source", () => {
    const withMagic: Character = {
      ...INITIAL_CHARACTER,
      magicAmmunition: [
        { id: "m1", ammoType: "arrows", variantKey: "ammunition-plus-1", remaining: 15 } satisfies MagicAmmunitionStack,
      ],
      preferredAmmoSource: { arrows: "m1" },
    };
    const parsed = parseCharacterFile(serializeCharacterFile(withMagic));
    expect(parsed.magicAmmunition).toEqual(withMagic.magicAmmunition);
    expect(parsed.preferredAmmoSource).toEqual(withMagic.preferredAmmoSource);
  });

  it("detects whether the current character is still initial", () => {
    expect(isInitialCharacter(INITIAL_CHARACTER)).toBe(true);
    const edited = characterReducer(INITIAL_CHARACTER, { type: "SET_NAME", value: "Test" });
    expect(isInitialCharacter(edited)).toBe(false);
  });

  it("round-trips alwaysPreparedSpellPicks", () => {
    const withPicks = {
      ...INITIAL_CHARACTER,
      alwaysPreparedSpellPicks: ["burning-hands", "shield"],
    };
    const parsed = parseCharacterFile(serializeCharacterFile(withPicks));
    expect(parsed.alwaysPreparedSpellPicks).toEqual(["burning-hands", "shield"]);
  });
});
