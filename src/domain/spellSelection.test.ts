import { describe, expect, it } from "vitest";
import { CLASSES, findByKey } from "../data";
import type { SubclassData } from "../data/types";
import { INITIAL_CHARACTER, characterReducer, type Character } from "../state/characterState";
import { PACT_OF_THE_TOME_SPELL_PICKS_KEY } from "./classFeatures";
import { effectiveLevelPath, resolvedClassLevels } from "./classLevels";
import {
  addUncappedCompactSpellPick,
  allCharacterSpellbookKeys,
  allSpellbookKeys,
  applySpellPick,
  buildAllGrantedSpells,
  buildCharacterSpellEntries,
  buildFeatGrantedSpells,
  buildGrantedSpells,
  characterConcentrationSpellKeys,
  characterOwnedSpellKeys,
  characterRitualSpellKeys,
  filterOwnedSpellPickOptions,
  isPreparedRitualSpell,
  preparedRitualSpellKeys,
  classSpellListFor,
  filterSpellKeysByLevel,
  findSpellByKey,
  preparedSpellListKeys,
  preparedSpellPickOptions,
  spellbookListKeys,
  spellPicksForClass,
  resolvePreparedSpellCount,
  retainValidSpellPicks,
  spellKeyFromName,
  spellPickLimitsForClass,
  localizedSpellPickerLabel,
  spellPickerLabel,
  preparedConcentrationSpellKeys,
  isPreparedConcentrationSpell,
  spellDurationToRounds,
  concentrationSpellMaxRounds,
  uniqueSpellLevels,
} from "./spellSelection";
import { computeEffectiveSpellcasting } from "./spellcasting";
import { EMPTY_FEAT_CHOICES } from "./featEffects";

function concentrationOptionsFor(character: Character): string[] {
  const classLevels = resolvedClassLevels(effectiveLevelPath(character));
  return characterConcentrationSpellKeys({
    character,
    classLevels,
    speciesCantrips: [],
    speciesPreparedSpells: [],
    activeFeatKeys: [],
    featChoicesFor: () => EMPTY_FEAT_CHOICES,
  });
}

function ritualOptionsFor(character: Character): string[] {
  const classLevels = resolvedClassLevels(effectiveLevelPath(character));
  return characterRitualSpellKeys({
    character,
    classLevels,
    speciesCantrips: [],
    speciesPreparedSpells: [],
    activeFeatKeys: [],
    featChoicesFor: () => EMPTY_FEAT_CHOICES,
  });
}

const THIRD_CASTER_GRANT = {
  type: "grant_spellcasting" as const,
  ability: "int" as const,
  listClassKey: "wizard",
  gainedAtLevel: 3,
  listMode: "prepared" as const,
  slotsByLevel: { 3: [2, 0, 0, 0, 0, 0, 0, 0, 0] },
  cantripsKnownByLevel: { 3: 2 },
  spellsPrepared: { kind: "abilityModPlusLevel" as const, ability: "int" as const, minimum: 1 },
};

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
      effects: [THIRD_CASTER_GRANT],
    },
  ],
};

const MOCK_AT_SUBCLASS: SubclassData = {
  key: "arcane-trickster",
  classKey: "rogue",
  name: "Arcane Trickster",
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
      effects: [THIRD_CASTER_GRANT],
    },
    {
      key: "mage-hand-ledgerdemain",
      name: "Mage Hand Ledgerdemain",
      desc: "Test fixture",
      grantedAtLevel: 3,
      combatSurface: false,
      effects: [{ type: "always_prepared_spells", spellNames: ["Mage Hand"] }],
    },
  ],
};

describe("spellSelection", () => {
  it("resolves spell keys from display names", () => {
    expect(spellKeyFromName("Acid Splash")).toBe("acid-splash");
    expect(spellKeyFromName("Hunter's Mark")).toBe("hunters-mark");
    expect(spellKeyFromName("Cure Wounds")).toBe("cure-wounds");
  });

  it("lists druidcraft effect options without markdown in the intro", () => {
    const druidcraft = findSpellByKey("druidcraft");
    expect(druidcraft?.desc).not.toMatch(/\*\*/);
    expect(druidcraft?.effectOptions?.map((option) => option.key)).toEqual([
      "weather-sensor",
      "bloom",
      "sensory-effect",
      "fire-play",
    ]);
  });

  it("lists thaumaturgy effect options without markdown in the intro", () => {
    const spell = findSpellByKey("thaumaturgy");
    expect(spell?.desc).not.toMatch(/\*\*/);
    expect(spell?.effectOptions?.map((option) => option.key)).toEqual([
      "altered-eyes",
      "booming-voice",
      "fire-play",
      "invisible-hand",
      "phantom-sound",
      "tremors",
    ]);
  });

  it("lists alarm effect options without markdown in the intro", () => {
    const alarm = findSpellByKey("alarm");
    expect(alarm?.desc).not.toMatch(/\*\*/);
    expect(alarm?.effectOptions?.map((option) => option.key)).toEqual(["audible-alarm", "mental-alarm"]);
  });

  it("lists minor illusion and command effect options without markdown in the intro", () => {
    const minorIllusion = findSpellByKey("minor-illusion");
    expect(minorIllusion?.desc).not.toMatch(/\*\*/);
    expect(minorIllusion?.effectOptions?.map((option) => option.key)).toEqual(["sound", "image"]);

    const command = findSpellByKey("command");
    expect(command?.desc).not.toMatch(/\*\*/);
    expect(command?.effectOptions?.map((option) => option.key)).toEqual([
      "approach",
      "drop",
      "flee",
      "grovel",
      "halt",
    ]);
  });

  it("computes prepared spell count from ability mod plus level", () => {
    expect(
      resolvePreparedSpellCount({ kind: "abilityModPlusLevel", ability: "wis", minimum: 1 }, { wis: 3, str: 0, dex: 0, con: 0, int: 0, cha: 0 }, 1),
    ).toBe(4);
    expect(
      resolvePreparedSpellCount({ kind: "abilityModPlusLevel", ability: "wis", minimum: 1 }, { wis: -1, str: 0, dex: 0, con: 0, int: 0, cha: 0 }, 1),
    ).toBe(1);
  });

  it("uses the srd-2024 class table for bard cantrips and prepared spells", () => {
    const bard = findByKey(CLASSES, "bard");
    const limits = spellPickLimitsForClass(bard, { int: 0, str: 0, dex: 0, con: 0, wis: 0, cha: 4 }, 1);
    expect(limits).toEqual({
      cantripSlots: 2,
      spellSlots: 4,
      spellbookSlots: 0,
      listMode: "prepared",
    });
  });

  it("uses the srd-2024 class table for cleric and druid prepared spells", () => {
    const mods = { int: 0, str: 0, dex: 0, con: 0, wis: 1, cha: 0 };
    expect(spellPickLimitsForClass(findByKey(CLASSES, "cleric"), mods, 1).spellSlots).toBe(4);
    expect(spellPickLimitsForClass(findByKey(CLASSES, "druid"), mods, 1).spellSlots).toBe(4);
  });

  it("gives paladins and rangers two prepared spells at level 1", () => {
    const paladin = spellPickLimitsForClass(findByKey(CLASSES, "paladin"), { int: 0, str: 0, dex: 0, con: 0, wis: 0, cha: 2 }, 1);
    const ranger = spellPickLimitsForClass(findByKey(CLASSES, "ranger"), { int: 0, str: 0, dex: 0, con: 0, wis: 2, cha: 0 }, 1);
    expect(paladin).toEqual({ cantripSlots: 0, spellSlots: 2, spellbookSlots: 0, listMode: "prepared" });
    expect(ranger).toEqual({ cantripSlots: 0, spellSlots: 2, spellbookSlots: 0, listMode: "prepared" });
  });

  it("returns wizard spellbook limits for wizards", () => {
    const wizard = findByKey(CLASSES, "wizard");
    const limits = spellPickLimitsForClass(wizard, { int: 3, str: 0, dex: 0, con: 0, wis: 0, cha: 0 }, 1);
    expect(limits).toEqual({
      cantripSlots: 3,
      spellSlots: 4,
      spellbookSlots: 6,
      listMode: "spellbook",
    });
  });

  it("gives fighter and rogue no spell picks without a third-caster subclass", () => {
    const fighter = findByKey(CLASSES, "fighter");
    const rogue = findByKey(CLASSES, "rogue");
    const mods = { int: 2, str: 0, dex: 0, con: 0, wis: 0, cha: 0 };
    expect(spellPickLimitsForClass(fighter, mods, 3)).toEqual({
      cantripSlots: 0,
      spellSlots: 0,
      spellbookSlots: 0,
      listMode: null,
    });
    expect(spellPickLimitsForClass(rogue, mods, 3)).toEqual({
      cantripSlots: 0,
      spellSlots: 0,
      spellbookSlots: 0,
      listMode: null,
    });
  });

  it("applies grant_spellcasting overlay for Eldritch Knight at level 3", () => {
    const fighter = findByKey(CLASSES, "fighter");
    const mods = { int: 0, str: 0, dex: 0, con: 0, wis: 0, cha: 0 };
    const limits = spellPickLimitsForClass(fighter, mods, 3, {}, MOCK_EK_SUBCLASS);
    expect(limits).toEqual({
      cantripSlots: 2,
      spellSlots: 3,
      spellbookSlots: 0,
      listMode: "prepared",
    });

    const wizardLevel1 = classSpellListFor("fighter", "wizard").level1;
    expect(preparedSpellListKeys(fighter, 3, MOCK_EK_SUBCLASS)).toEqual(wizardLevel1);

    const summary = computeEffectiveSpellcasting(fighter, MOCK_EK_SUBCLASS, 3, mods, 2);
    expect(summary).toMatchObject({
      ability: "int",
      level1Slots: 2,
      cantripsKnown: 2,
      spellsPreparedOrKnown: 3,
      listMode: "prepared",
    });
  });

  it("applies grant_spellcasting overlay for Arcane Trickster with granted Mage Hand", () => {
    const rogue = findByKey(CLASSES, "rogue");
    const mods = { int: 1, str: 0, dex: 0, con: 0, wis: 0, cha: 0 };
    const limits = spellPickLimitsForClass(rogue, mods, 3, {}, MOCK_AT_SUBCLASS);
    expect(limits).toEqual({
      cantripSlots: 2,
      spellSlots: 4,
      spellbookSlots: 0,
      listMode: "prepared",
    });

    const overlayOptions = preparedSpellListKeys(rogue, 3, MOCK_AT_SUBCLASS);
    expect(overlayOptions.length).toBeGreaterThan(0);
    expect(overlayOptions).not.toContain("mage-hand");

    const mageHandFeature = MOCK_AT_SUBCLASS.features.find((feature) => feature.key === "mage-hand-ledgerdemain");
    expect(mageHandFeature?.effects[0]).toMatchObject({
      type: "always_prepared_spells",
      spellNames: ["Mage Hand"],
    });
    expect(spellKeyFromName("Mage Hand")).toBe("mage-hand");
  });

  it("clears spell picks when a fighter reverts below third-caster level", () => {
    let fighter = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" });
    fighter = characterReducer(fighter, { type: "LEVEL_UP" });
    fighter = characterReducer(fighter, { type: "LEVEL_UP" });
    fighter = {
      ...fighter,
      cantripPicks: ["acid-splash"],
      spellPicks: ["burning-hands", "shield", "magic-missile"],
    };
    const reverted = characterReducer(fighter, { type: "REVERT_LAST_LEVEL" });
    expect(reverted.cantripPicks).toEqual([]);
    expect(reverted.spellPicks).toEqual([]);
  });

  it("prevents duplicate spell picks", () => {
    expect(applySpellPick(["acid-splash", null], 1, "acid-splash", ["acid-splash", "blade-ward"])).toBeNull();
    expect(applySpellPick(["acid-splash", null], 1, "blade-ward", ["acid-splash", "blade-ward"])).toEqual([
      "acid-splash",
      "blade-ward",
    ]);
  });

  it("marks pact of the tome picks as removable class feature spell picks", () => {
    const granted = buildGrantedSpells({
      speciesCantrips: [],
      speciesPreparedSpells: [],
      classKey: "warlock",
      level: 2,
      classFeatureSpellPicks: {
        [PACT_OF_THE_TOME_SPELL_PICKS_KEY]: {
          cantrips: ["guidance", null, null],
          rituals: ["alarm", null],
        },
      },
    });
    expect(granted.find((entry) => entry.spellKey === "guidance")).toEqual({
      spellKey: "guidance",
      locked: false,
      source: "classFeature",
      classFeatureSpellPick: {
        featureKey: PACT_OF_THE_TOME_SPELL_PICKS_KEY,
        kind: "cantrip",
      },
    });
    expect(granted.find((entry) => entry.spellKey === "alarm")?.classFeatureSpellPick).toEqual({
      featureKey: PACT_OF_THE_TOME_SPELL_PICKS_KEY,
      kind: "ritual",
    });

    const entries = buildCharacterSpellEntries({
      cantripPicks: [],
      spellPicks: [],
      granted,
    });
    expect(entries.find((entry) => entry.spellKey === "guidance")?.classFeatureSpellPick?.kind).toBe(
      "cantrip",
    );
  });

  it("only includes pact of the tome picks when building warlock granted spells", () => {
    const granted = buildGrantedSpells({
      speciesCantrips: [],
      speciesPreparedSpells: [],
      classKey: "sorcerer",
      level: 2,
      classFeatureSpellPicks: {
        [PACT_OF_THE_TOME_SPELL_PICKS_KEY]: {
          cantrips: ["guidance", null, null],
          rituals: [null, null],
        },
      },
    });
    expect(granted.some((entry) => entry.spellKey === "guidance")).toBe(false);
  });

  it("merges granted and chosen spells for cards", () => {
    const entries = buildCharacterSpellEntries({
      cantripPicks: ["acid-splash"],
      spellPicks: ["burning-hands"],
      granted: [{ spellKey: "hunters-mark", locked: true, source: "classFeature" }],
    });
    expect(entries.map((entry) => entry.spellKey)).toEqual(["acid-splash", "burning-hands", "hunters-mark"]);
    expect(entries.find((entry) => entry.spellKey === "acid-splash")?.pickKind).toBe("cantrip");
    expect(entries.find((entry) => entry.spellKey === "burning-hands")?.pickKind).toBe("spell");
    expect(entries.find((entry) => entry.spellKey === "hunters-mark")?.pickKind).toBeUndefined();
  });

  it("includes always prepared picks in character spell entries", () => {
    const entries = buildCharacterSpellEntries({
      cantripPicks: [],
      spellPicks: [],
      granted: [],
      alwaysPreparedPicks: ["burning-hands"],
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      spellKey: "burning-hands",
      source: "alwaysPrepared",
      locked: false,
    });
  });

  it("prefers class spell picks over duplicate always prepared keys", () => {
    const entries = buildCharacterSpellEntries({
      cantripPicks: [],
      spellPicks: ["burning-hands"],
      granted: [],
      alwaysPreparedPicks: ["burning-hands"],
    });
    expect(entries.filter((entry) => entry.spellKey === "burning-hands")).toHaveLength(1);
    expect(entries.find((entry) => entry.spellKey === "burning-hands")?.source).toBe("pick");
  });

  it("includes ranger hunter's mark as a granted spell", () => {
    const granted = buildGrantedSpells({
      speciesCantrips: [],
      speciesPreparedSpells: [],
      classKey: "ranger",
      level: 1,
    });
    expect(granted.some((entry) => entry.spellKey === "hunters-mark")).toBe(true);
  });

  it("excludes hunter's mark from ranger prepared pick options", () => {
    expect(preparedSpellPickOptions("ranger")).not.toContain("hunters-mark");
    expect(preparedSpellPickOptions("paladin")).toContain("bless");
  });

  it("includes paladin divine smite as a granted spell at level 2", () => {
    expect(
      buildGrantedSpells({
        speciesCantrips: [],
        speciesPreparedSpells: [],
        classKey: "paladin",
        level: 1,
      }).some((entry) => entry.spellKey === "divine-smite"),
    ).toBe(false);

    const granted = buildGrantedSpells({
      speciesCantrips: [],
      speciesPreparedSpells: [],
      classKey: "paladin",
      level: 2,
    });
    expect(granted.some((entry) => entry.spellKey === "divine-smite")).toBe(true);
    expect(preparedSpellPickOptions("paladin", 2)).not.toContain("divine-smite");
  });

  it("grants life domain spells at level 3 and not before the subclass feature", () => {
    expect(
      buildGrantedSpells({
        speciesCantrips: [],
        speciesPreparedSpells: [],
        classKey: "cleric",
        subclassKey: "life-domain",
        level: 2,
      }).map((entry) => entry.spellKey),
    ).not.toContain("bless");

    const granted = buildGrantedSpells({
      speciesCantrips: [],
      speciesPreparedSpells: [],
      classKey: "cleric",
      subclassKey: "life-domain",
      level: 3,
    });
    expect(granted.map((entry) => entry.spellKey)).toEqual(
      expect.arrayContaining(["aid", "bless", "cure-wounds", "lesser-restoration"]),
    );
    expect(granted.find((entry) => entry.spellKey === "bless")?.combatActionTiming).toBeUndefined();
  });

  it("adds 2nd-level bard spells to prepared options at level 3", () => {
    expect(preparedSpellPickOptions("bard", 1)).not.toContain("invisibility");
    expect(preparedSpellPickOptions("bard", 3)).toContain("invisibility");
    expect(preparedSpellPickOptions("bard", 3)).toContain("charm-person");
  });

  it("includes 3rd-level class list spells in pick options at character level 5", () => {
    for (const classKey of ["bard", "cleric", "druid", "sorcerer", "warlock"] as const) {
      expect(uniqueSpellLevels(preparedSpellPickOptions(classKey, 5))).toContain(3);
    }
    const wizard = findByKey(CLASSES, "wizard");
    expect(wizard).toBeDefined();
    expect(uniqueSpellLevels(spellbookListKeys(wizard!, 5))).toContain(3);
    expect(uniqueSpellLevels(preparedSpellPickOptions("paladin", 5))).toEqual([1, 2]);
    expect(uniqueSpellLevels(preparedSpellPickOptions("ranger", 5))).toEqual([1, 2]);
  });

  it("filters prepared options by spell level and labels with school", () => {
    const bardLevel3 = preparedSpellPickOptions("bard", 3);
    expect(uniqueSpellLevels(bardLevel3)).toEqual([1, 2]);
    expect(filterSpellKeysByLevel(bardLevel3, 2)).toContain("invisibility");
    expect(filterSpellKeysByLevel(bardLevel3, 2)).not.toContain("charm-person");
    expect(spellPickerLabel("Charm Person", "Enchantment")).toBe("Charm Person (Enchantment)");
    expect(spellPickerLabel("Minor Illusion", "Illusion")).toBe("Minor Illusion (Illusion)");
    expect(
      localizedSpellPickerLabel("sleep", () => "Sleep", () => "Illusion"),
    ).toBe("Sleep (Illusion)");
  });

  it("resizes retained picks to the new class count", () => {
    expect(retainValidSpellPicks(["acid-splash"], 3, ["acid-splash", "blade-ward"])).toEqual([
      "acid-splash",
      null,
      null,
    ]);
  });

  it("merges feat granted spells into all granted spells", () => {
    const granted = buildAllGrantedSpells({
      speciesCantrips: [],
      speciesPreparedSpells: [],
      classKey: "fighter",
      level: 1,
      activeFeatKeys: ["magic-initiate-wizard"],
      featChoicesFor: () => ({
        ...EMPTY_FEAT_CHOICES,
        cantripPicks: ["fire-bolt", "light"],
        spellPicks: ["burning-hands"],
      }),
    });
    expect(granted).toHaveLength(3);
    expect(granted.every((entry) => entry.source === "feat")).toBe(true);
  });

  it("includes feat spells in character spell entries for non-casters", () => {
    const granted = buildFeatGrantedSpells({
      activeFeatKeys: ["magic-initiate-cleric"],
      featChoicesFor: () => ({
        ...EMPTY_FEAT_CHOICES,
        cantripPicks: ["guidance", "sacred-flame"],
        spellPicks: ["bless"],
      }),
    });
    const entries = buildCharacterSpellEntries({
      cantripPicks: [],
      spellPicks: [],
      granted,
    });
    expect(entries).toHaveLength(3);
    expect(entries.every((entry) => entry.locked && entry.source === "feat")).toBe(true);
  });
});

describe("characterReducer spell actions", () => {
  function bard() {
    return characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "bard" });
  }

  it("initializes pick slots when class is set", () => {
    const next = bard();
    expect(next.cantripPicks).toEqual([]);
    expect(next.spellPicks).toEqual([]);
    expect(spellPickLimitsForClass(findByKey(CLASSES, "bard"), { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, 1).cantripSlots).toBe(2);
    expect(spellPickLimitsForClass(findByKey(CLASSES, "bard"), { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, 1).spellSlots).toBe(4);
    expect(next.spellSlotRemaining).toEqual({});
  });

  it("adds and removes always prepared spell picks", () => {
    let next = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_ALWAYS_PREPARED_SPELL_PICK",
      spellKey: "burning-hands",
    });
    expect(next.alwaysPreparedSpellPicks).toEqual(["burning-hands"]);
    next = characterReducer(next, {
      type: "ADD_ALWAYS_PREPARED_SPELL_PICK",
      spellKey: "burning-hands",
    });
    expect(next.alwaysPreparedSpellPicks).toEqual(["burning-hands"]);
    next = characterReducer(next, {
      type: "REMOVE_ALWAYS_PREPARED_SPELL_PICK",
      spellKey: "burning-hands",
    });
    expect(next.alwaysPreparedSpellPicks).toEqual([]);
  });

  it("rejects unknown always prepared spell keys", () => {
    const next = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_ALWAYS_PREPARED_SPELL_PICK",
      spellKey: "not-a-spell",
    });
    expect(next.alwaysPreparedSpellPicks).toEqual([]);
  });

  it("initializes paladin spell picks and ranger hunter's mark at level 1", () => {
    const paladin = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    expect(paladin.cantripPicks).toEqual([]);
    expect(spellPickLimitsForClass(findByKey(CLASSES, "paladin"), { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, 1).spellSlots).toBe(2);

    const rangerLimits = spellPickLimitsForClass(findByKey(CLASSES, "ranger"), { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, 1);
    expect(rangerLimits.spellSlots).toBe(2);
  });

  it("clamps spell slot remaining to max and clears at-max storage", () => {
    const withClass = bard();
    const spent = characterReducer(withClass, { type: "SET_SPELL_SLOT_REMAINING", spellLevel: 1, value: 1 });
    expect(spent.spellSlotRemaining[1]).toBe(1);
    const restored = characterReducer(spent, { type: "SET_SPELL_SLOT_REMAINING", spellLevel: 1, value: 2 });
    expect(restored.spellSlotRemaining[1]).toBeUndefined();
  });

  it("tracks 2nd-level bard slots at level 3", () => {
    let bard = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "bard" });
    expect(characterReducer(bard, { type: "SET_SPELL_SLOT_REMAINING", spellLevel: 2, value: 1 })).toBe(bard);

    bard = characterReducer(bard, { type: "LEVEL_UP" });
    bard = characterReducer(bard, { type: "LEVEL_UP" });
    const spent = characterReducer(bard, { type: "SET_SPELL_SLOT_REMAINING", spellLevel: 2, value: 1 });
    expect(spent.spellSlotRemaining[2]).toBe(1);
    const restored = characterReducer(spent, { type: "SET_SPELL_SLOT_REMAINING", spellLevel: 2, value: 2 });
    expect(restored.spellSlotRemaining[2]).toBeUndefined();
  });

  it("clears prepared picks when wizard removes a spellbook entry", () => {
    const wizard = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" });
    const withBook = characterReducer(wizard, { type: "ADD_SPELLBOOK_PICK", spellKey: "burning-hands" });
    const withPrepared = characterReducer(withBook, { type: "ADD_SPELL_PICK", spellKey: "burning-hands" });
    const cleared = characterReducer(withPrepared, { type: "REMOVE_SPELLBOOK_PICK", spellKey: "burning-hands" });
    expect(cleared.spellPicks).toEqual([]);
  });

  it("allows copied spellbook picks beyond the progression cap", () => {
    let wizard = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" });
    for (const spellKey of ["burning-hands", "magic-missile", "shield", "sleep", "charm-person", "detect-magic"]) {
      wizard = characterReducer(wizard, { type: "ADD_SPELLBOOK_PICK", spellKey });
    }
    expect(wizard.spellbookPicks).toHaveLength(6);
    const withCopy = characterReducer(wizard, { type: "ADD_SPELLBOOK_EXTRA_PICK", spellKey: "feather-fall" });
    expect(withCopy.spellbookExtraPicks).toEqual(["feather-fall"]);
    const withPrepared = characterReducer(withCopy, { type: "ADD_SPELL_PICK", spellKey: "feather-fall" });
    expect(withPrepared.spellPicks).toContain("feather-fall");
  });

  it("rejects duplicate spells across spellbook buckets", () => {
    let wizard = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" });
    wizard = characterReducer(wizard, { type: "ADD_SPELLBOOK_PICK", spellKey: "burning-hands" });
    expect(characterReducer(wizard, { type: "ADD_SPELLBOOK_EXTRA_PICK", spellKey: "burning-hands" })).toBe(wizard);
  });

  it("merges all spellbook buckets for prepared options", () => {
    const buckets = {
      spellbookPicks: ["burning-hands"],
      spellbookExtraPicks: ["feather-fall"],
      subclassSpellbookPicks: ["shield"],
    };
    expect(allSpellbookKeys(buckets)).toEqual(["burning-hands", "shield", "feather-fall"]);
    expect(
      addUncappedCompactSpellPick([], "sleep", ["sleep"], buckets),
    ).toEqual(["sleep"]);
    expect(addUncappedCompactSpellPick([], "burning-hands", ["burning-hands"], buckets)).toBeNull();
  });

  it("keeps spellbook keys in wizard prepared options even when they are already owned", () => {
    const bookKeys = ["burning-hands", "magic-missile"];
    const owned = new Set(["guidance", "sacred-flame", "bless", ...bookKeys]);
    expect(filterOwnedSpellPickOptions(bookKeys, owned, [])).toEqual([]);
    expect(filterOwnedSpellPickOptions(bookKeys, owned, [...bookKeys])).toEqual(bookKeys);
  });

  it("grants draconic spells at level 3 without a combat timing override", () => {
    const granted = buildGrantedSpells({
      speciesCantrips: [],
      speciesPreparedSpells: [],
      classKey: "sorcerer",
      subclassKey: "draconic-sorcery",
      level: 3,
    });
    const chromaticOrb = granted.find((entry) => entry.spellKey === "chromatic-orb");
    expect(chromaticOrb).toBeDefined();
    expect(chromaticOrb?.combatActionTiming).toBeUndefined();
  });
});

describe("spellDurationToRounds", () => {
  it("converts catalog duration strings to combat rounds", () => {
    expect(spellDurationToRounds("1 minute")).toBe(10);
    expect(spellDurationToRounds("10 minutes")).toBe(100);
    expect(spellDurationToRounds("1 hour")).toBe(600);
    expect(spellDurationToRounds("1 day")).toBe(14_400);
    expect(spellDurationToRounds("6 rounds")).toBe(6);
    expect(spellDurationToRounds("instantaneous")).toBeNull();
    expect(spellDurationToRounds("until dispelled")).toBeNull();
  });

  it("reads max rounds from spell keys", () => {
    expect(concentrationSpellMaxRounds("bless")).toBe(10);
    expect(concentrationSpellMaxRounds("tsunami")).toBe(6);
    expect(concentrationSpellMaxRounds("missing-spell")).toBeNull();
  });
});

describe("preparedConcentrationSpellKeys", () => {
  it("includes prepared leveled spells that require concentration", () => {
    expect(isPreparedConcentrationSpell("bless")).toBe(true);
    expect(isPreparedConcentrationSpell("fire-bolt")).toBe(false);
    expect(
      preparedConcentrationSpellKeys(["bless", "fire-bolt"], ["hold-person"]),
    ).toEqual(["bless", "hold-person"]);
  });

  it("includes concentration cantrips from cantrip picks", () => {
    expect(isPreparedConcentrationSpell("guidance")).toBe(true);
    expect(preparedConcentrationSpellKeys(["guidance", "fire-bolt"])).toEqual(["guidance"]);
  });

  it("returns no options until a concentration spell is known or prepared", () => {
    for (const classKey of ["cleric", "druid", "wizard", "sorcerer", "bard", "warlock"]) {
      let character = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: classKey });
      character = characterReducer(character, { type: "ADD_CANTRIP_PICK", spellKey: "fire-bolt" });
      expect(concentrationOptionsFor(character)).toEqual([]);
    }
  });

  it("includes concentration spells for all spellcasting classes", () => {
    const cases: Array<{
      classKey: string;
      spellKey: string;
      setup?: (character: Character) => Character;
      add: { type: "ADD_CANTRIP_PICK" | "ADD_SPELL_PICK"; spellKey: string };
    }> = [
      { classKey: "cleric", spellKey: "guidance", add: { type: "ADD_CANTRIP_PICK", spellKey: "guidance" } },
      { classKey: "druid", spellKey: "guidance", add: { type: "ADD_CANTRIP_PICK", spellKey: "guidance" } },
      { classKey: "bard", spellKey: "faerie-fire", add: { type: "ADD_SPELL_PICK", spellKey: "faerie-fire" } },
      { classKey: "sorcerer", spellKey: "detect-magic", add: { type: "ADD_SPELL_PICK", spellKey: "detect-magic" } },
      { classKey: "warlock", spellKey: "hex", add: { type: "ADD_SPELL_PICK", spellKey: "hex" } },
      {
        classKey: "wizard",
        spellKey: "fog-cloud",
        setup: (character) => characterReducer(character, { type: "ADD_SPELLBOOK_PICK", spellKey: "fog-cloud" }),
        add: { type: "ADD_SPELL_PICK", spellKey: "fog-cloud" },
      },
    ];

    for (const { classKey, spellKey, setup, add } of cases) {
      let character = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: classKey });
      if (setup) character = setup(character);
      character = characterReducer(character, add);
      expect(concentrationOptionsFor(character)).toContain(spellKey);
    }
  });

  it("excludes spells already known from another class when multiclassing", () => {
    let druid = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "druid" });
    druid = characterReducer(druid, { type: "ADD_SPELL_PICK", spellKey: "goodberry" });
    druid = characterReducer(druid, { type: "LEVEL_UP_CLASS", classKey: "ranger" });

    const owned = characterOwnedSpellKeys({
      character: druid,
      classLevels: resolvedClassLevels(effectiveLevelPath(druid)),
      speciesCantrips: [],
      speciesPreparedSpells: [],
      activeFeatKeys: [],
      featChoicesFor: () => EMPTY_FEAT_CHOICES,
    });
    expect(owned.has("goodberry")).toBe(true);

    const rangerOptions = filterOwnedSpellPickOptions(
      preparedSpellPickOptions("ranger", 1, null),
      owned,
    );
    expect(rangerOptions).not.toContain("goodberry");

    const blocked = characterReducer(druid, {
      type: "ADD_CLASS_SPELL_PICK",
      classKey: "ranger",
      spellKey: "goodberry",
    });
    expect(spellPicksForClass(blocked, "ranger")).not.toContain("goodberry");
  });

  it("includes prepared ritual spells for spellcasting classes", () => {
    expect(isPreparedRitualSpell("detect-magic")).toBe(true);
    expect(isPreparedRitualSpell("fire-bolt")).toBe(false);
    expect(preparedRitualSpellKeys(["detect-magic", "fire-bolt"], ["find-familiar"])).toEqual([
      "detect-magic",
      "find-familiar",
    ]);

    let cleric = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "cleric" });
    cleric = characterReducer(cleric, { type: "ADD_SPELL_PICK", spellKey: "detect-magic" });
    expect(ritualOptionsFor(cleric)).toContain("detect-magic");
  });

  it("stores and clears concentration spell selection", () => {
    let bard = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "bard" });
    bard = characterReducer(bard, { type: "ADD_SPELL_PICK", spellKey: "faerie-fire" });
    expect(bard.spellPicks).toEqual(["faerie-fire"]);
    const concentrating = characterReducer(bard, { type: "SET_CONCENTRATION_SPELL", spellKey: "faerie-fire" });
    expect(concentrating.concentrationSpellKey).toBe("faerie-fire");
    expect(concentrating.concentrationRoundsRemaining).toBeNull();
    const cleared = characterReducer(concentrating, { type: "SET_CONCENTRATION_SPELL", spellKey: null });
    expect(cleared.concentrationSpellKey).toBeNull();
    expect(cleared.concentrationRoundsRemaining).toBeNull();
    const removed = characterReducer(concentrating, { type: "REMOVE_SPELL_PICK", spellKey: "faerie-fire" });
    expect(removed.concentrationSpellKey).toBeNull();
    expect(removed.concentrationRoundsRemaining).toBeNull();
  });

  it("tracks concentration rounds remaining", () => {
    let bard = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "bard" });
    bard = characterReducer(bard, { type: "ADD_SPELL_PICK", spellKey: "faerie-fire" });
    const concentrating = characterReducer(bard, { type: "SET_CONCENTRATION_SPELL", spellKey: "faerie-fire" });
    expect(concentrationSpellMaxRounds("faerie-fire")).toBe(10);

    const steppedDown = characterReducer(concentrating, { type: "SET_CONCENTRATION_ROUNDS", value: 7 });
    expect(steppedDown.concentrationRoundsRemaining).toBe(7);

    const restored = characterReducer(steppedDown, { type: "SET_CONCENTRATION_ROUNDS", value: 10 });
    expect(restored.concentrationRoundsRemaining).toBeNull();

    let cleric = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "cleric" });
    cleric = characterReducer(cleric, { type: "ADD_SPELL_PICK", spellKey: "bless" });
    cleric = characterReducer(cleric, { type: "ADD_SPELL_PICK", spellKey: "shield-of-faith" });
    cleric = characterReducer(cleric, { type: "SET_CONCENTRATION_SPELL", spellKey: "bless" });
    const switched = characterReducer(
      characterReducer(cleric, { type: "SET_CONCENTRATION_ROUNDS", value: 4 }),
      { type: "SET_CONCENTRATION_SPELL", spellKey: "shield-of-faith" },
    );
    expect(switched.concentrationSpellKey).toBe("shield-of-faith");
    expect(switched.concentrationRoundsRemaining).toBeNull();
  });

  it("includes spellbook-known entries for wizard spell descriptions", () => {
    const entries = buildCharacterSpellEntries({
      cantripPicks: ["fire-bolt"],
      spellPicks: ["magic-missile"],
      granted: [],
      spellbookKnownKeys: ["burning-hands", "magic-missile"],
    });

    expect(entries.map((entry) => entry.spellKey)).toEqual([
      "fire-bolt",
      "burning-hands",
      "magic-missile",
    ]);
    expect(entries.find((entry) => entry.spellKey === "burning-hands")).toMatchObject({
      source: "spellbook",
    });
    expect(entries.find((entry) => entry.spellKey === "magic-missile")).toMatchObject({
      source: "pick",
      pickKind: "spell",
    });
  });

  it("merges wizard spellbook buckets for description keys", () => {
    let wizard = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" });
    wizard = characterReducer(wizard, { type: "ADD_SPELLBOOK_PICK", spellKey: "burning-hands" });
    wizard = characterReducer(wizard, { type: "ADD_SPELLBOOK_EXTRA_PICK", spellKey: "feather-fall" });
    expect(allCharacterSpellbookKeys(wizard, [{ classKey: "wizard", classLevel: 1 }])).toEqual([
      "burning-hands",
      "feather-fall",
    ]);
  });
});
