import { describe, expect, it } from "vitest";
import { CLASSES, findByKey } from "../data";
import type { SpeciesData, SpeciesFeatureData } from "../data/types";
import { EMPTY_FEAT_CHOICES } from "./featEffects";
import {
  buildCastConfirmActions,
  buildCastSpellAvailabilityInputFromCharacter,
  buildSpellFreeCastSources,
  canPayCastAtLevel,
  initialCastSlotLevel,
  isCastConfirmEnabled,
  spellSlotRemainingAtLevel,
} from "./castSpell";
import type { CastSpellAvailabilityInput } from "./castSpell";
import { characterReducer, INITIAL_CHARACTER } from "../state/characterState";
import { spellKeyFromName } from "./spellSelection";
import { activeLimitedUseSpeciesFeatures } from "./speciesFeatures";

function baseInput(
  overrides: Partial<CastSpellAvailabilityInput> = {},
): CastSpellAvailabilityInput {
  return {
    spellKey: "command",
    canCastAsRitual: false,
    slotsByLevel: { 1: 2, 2: 1 },
    spellSlotRemaining: {},
    pactMagic: null,
    pactSlotRemaining: null,
    activeFeatKeys: [],
    featChoicesFor: () => EMPTY_FEAT_CHOICES,
    featSpellUses: {},
    speciesData: null,
    speciesLineageKey: null,
    level: 3,
    abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 2 },
    speciesFeatureUses: {},
    adventuringGear: [],
    weapons: [],
    armor: [],
    equipmentRestUsesRemaining: {},
    classFeatureUses: {},
    activeClassFeatures: [],
    ...overrides,
  };
}

describe("castSpell availability", () => {
  it("treats missing spell slot remaining as full", () => {
    expect(spellSlotRemainingAtLevel({ 1: 2 }, {}, 1)).toBe(2);
  });

  it("picks the lowest payable slot level above the spell when the spell level is empty", () => {
    const input = baseInput({
      spellKey: "command",
      slotsByLevel: { 1: 0, 2: 2 },
      spellSlotRemaining: {},
    });
    expect(initialCastSlotLevel(1, input)).toBe(2);
  });

  it("starts on the spell level when it can be paid", () => {
    const input = baseInput({ slotsByLevel: { 2: 2 }, spellSlotRemaining: { 2: 2 } });
    expect(initialCastSlotLevel(2, input)).toBe(2);
  });

  it("defaults warlocks to pact slot level when normal slots at spell level are empty", () => {
    const input = baseInput({
      spellKey: "hex",
      slotsByLevel: { 1: 0, 2: 0 },
      pactMagic: { count: 2, slotLevel: 2 },
      pactSlotRemaining: null,
    });
    expect(initialCastSlotLevel(1, input)).toBe(2);
    expect(canPayCastAtLevel(input, 2)).toBe(true);
    expect(canPayCastAtLevel(input, 1)).toBe(false);
  });

  it("disables slot cast when every slot at the level is spent", () => {
    const input = baseInput({ slotsByLevel: { 1: 2 }, spellSlotRemaining: { 1: 0 } });
    expect(
      isCastConfirmEnabled({
        freeCastSourceId: null,
        castAsRitual: false,
        slotLevel: 1,
        slotPool: "spell",
        input,
      }),
    ).toBe(false);
  });
});

describe("class feature free casts", () => {
  it("lists faithful steed for find-steed", () => {
    let paladin = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    for (let i = 0; i < 4; i += 1) paladin = characterReducer(paladin, { type: "LEVEL_UP" });
    const paladinClass = findByKey(CLASSES, "paladin")!;
    const derived = {
      spellcasting: { slotsByLevel: { 1: 4, 2: 2 } },
      pactMagic: null,
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 2 },
      activeClassFeatures: paladinClass.features.filter((f) => f.grantedAtLevel <= 5),
    };
    const input = buildCastSpellAvailabilityInputFromCharacter(
      paladin,
      derived,
      "find-steed",
      [],
      () => EMPTY_FEAT_CHOICES,
      null,
    );
    const sources = buildSpellFreeCastSources(input);
    expect(sources.some((entry) => entry.id === "class:faithful-steed")).toBe(true);
  });
});

describe("castSpell confirm actions", () => {
  it("spends only the chosen slot level", () => {
    let character = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "bard" });
    character = characterReducer(character, { type: "LEVEL_UP" });
    character = characterReducer(character, { type: "LEVEL_UP" });

    const derivedSlots = { 1: 2, 2: 2, 3: 2 };
    const input = baseInput({
      spellKey: "command",
      slotsByLevel: derivedSlots,
      spellSlotRemaining: character.spellSlotRemaining,
    });
    const actions = buildCastConfirmActions({
      freeCastSourceId: null,
      castAsRitual: false,
      slotLevel: 2,
      slotPool: "spell",
      input,
    });
    expect(actions).toEqual([{ type: "SET_SPELL_SLOT_REMAINING", spellLevel: 2, value: 1 }]);

    const next = actions.reduce((state, action) => characterReducer(state, action), character);
    expect(next.spellSlotRemaining[1]).toBeUndefined();
    expect(next.spellSlotRemaining[2]).toBe(1);
  });

  it("does not set concentration for non-concentration spells", () => {
    const input = baseInput({
      spellKey: "command",
      slotsByLevel: { 1: 2 },
    });
    const actions = buildCastConfirmActions({
      freeCastSourceId: null,
      castAsRitual: false,
      slotLevel: 1,
      slotPool: "spell",
      input,
    });
    expect(actions).toEqual([{ type: "SET_SPELL_SLOT_REMAINING", spellLevel: 1, value: 1 }]);
  });

  it("sets concentration when the cast spell requires it", () => {
    let character = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "cleric" });
    character = characterReducer(character, { type: "ADD_SPELL_PICK", spellKey: "bless" });

    const input = baseInput({
      spellKey: "bless",
      slotsByLevel: { 1: 2 },
      spellSlotRemaining: character.spellSlotRemaining,
    });
    const actions = buildCastConfirmActions({
      freeCastSourceId: null,
      castAsRitual: false,
      slotLevel: 1,
      slotPool: "spell",
      input,
    });
    expect(actions).toEqual([
      { type: "SET_SPELL_SLOT_REMAINING", spellLevel: 1, value: 1 },
      { type: "SET_CONCENTRATION_SPELL", spellKey: "bless" },
    ]);

    const next = actions.reduce((state, action) => characterReducer(state, action), character);
    expect(next.concentrationSpellKey).toBe("bless");
    expect(next.concentrationRoundsRemaining).toBeNull();
  });

  it("spends feat free cast without touching spell slots", () => {
    const choices = {
      ...EMPTY_FEAT_CHOICES,
      spellcastingAbility: "int" as const,
      cantripPicks: ["fire-bolt", "light"],
      spellPicks: ["burning-hands"],
    };
    const input = baseInput({
      spellKey: "burning-hands",
      activeFeatKeys: ["magic-initiate-wizard"],
      featChoicesFor: () => choices,
      featSpellUses: {},
      slotsByLevel: { 1: 2 },
      spellSlotRemaining: { 1: 2 },
    });
    const sources = buildSpellFreeCastSources(input);
    expect(sources).toHaveLength(1);
    const freeCastId = sources[0]!.id;

    const actions = buildCastConfirmActions({
      freeCastSourceId: freeCastId,
      castAsRitual: false,
      slotLevel: 1,
      slotPool: "spell",
      input,
    });
    expect(actions).toEqual([
      { type: "SET_FEAT_SPELL_USES", featKey: "magic-initiate-wizard:burning-hands", value: 0 },
    ]);
    expect(buildCastConfirmActions({
      freeCastSourceId: null,
      castAsRitual: false,
      slotLevel: 1,
      slotPool: "spell",
      input,
    })).toEqual([{ type: "SET_SPELL_SLOT_REMAINING", spellLevel: 1, value: 1 }]);
  });

  it("casts as ritual without spending spell slots", () => {
    let cleric = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "cleric" });
    cleric = characterReducer(cleric, { type: "ADD_SPELL_PICK", spellKey: "detect-magic" });

    const input = baseInput({
      spellKey: "detect-magic",
      canCastAsRitual: true,
      slotsByLevel: { 1: 2 },
      spellSlotRemaining: { 1: 2 },
    });
    const actions = buildCastConfirmActions({
      freeCastSourceId: null,
      castAsRitual: true,
      slotLevel: 1,
      slotPool: "spell",
      input,
    });
    expect(actions).toEqual([{ type: "SET_CONCENTRATION_SPELL", spellKey: "detect-magic" }]);

    const next = actions.reduce((state, action) => characterReducer(state, action), cleric);
    expect(next.spellSlotRemaining[1]).toBeUndefined();
    expect(next.concentrationSpellKey).toBe("detect-magic");
  });
});

describe("species lineage free cast", () => {
  const highElfDetectMagicFeature: SpeciesFeatureData = {
    key: "high-elf-spell-3",
    name: "Detect Magic",
    desc: "test",
    grantedAtLevel: 3,
    combatSurface: true,
    limitedUses: { kind: "fixed", uses: 1 },
    restRecovery: "long",
    effects: [{ type: "always_prepared_spell", spellName: "Detect Magic", minLevel: 3 }],
  };

  const inlineElfSpecies: SpeciesData = {
    key: "elf",
    srd: true,
    book: "XPHB",
    name: "Elf",
    size: "medium",
    speeds: [{ type: "walk", feet: 30 }],
    traits: [],
    features: [],
    choice: {
      key: "elven-lineage",
      options: [
        {
          key: "high-elf",
          name: "High Elf",
          features: [highElfDetectMagicFeature],
        },
      ],
    },
  };

  it("spends species feature uses for lineage free cast", () => {
    expect(spellKeyFromName("Detect Magic")).toBe("detect-magic");
    const limited = activeLimitedUseSpeciesFeatures(inlineElfSpecies, "high-elf", 3);
    expect(limited.map((feature) => feature.key)).toContain("high-elf-spell-3");

    const input = baseInput({
      spellKey: "detect-magic",
      speciesData: inlineElfSpecies,
      speciesLineageKey: "high-elf",
      level: 3,
      slotsByLevel: {},
      speciesFeatureUses: {},
    });
    const sources = buildSpellFreeCastSources(input);
    expect(sources.some((entry) => entry.speciesFeatureKey === "high-elf-spell-3")).toBe(true);

    const sourceId = sources.find((entry) => entry.speciesFeatureKey === "high-elf-spell-3")!.id;
    const actions = buildCastConfirmActions({
      freeCastSourceId: sourceId,
      castAsRitual: false,
      slotLevel: 1,
      slotPool: "spell",
      input,
    });
    expect(actions).toEqual([
      { type: "SET_SPECIES_FEATURE_USES", featureKey: "high-elf-spell-3", value: 0 },
      { type: "SET_CONCENTRATION_SPELL", spellKey: "detect-magic" },
    ]);
  });
});

describe("pact slot spend", () => {
  it("decreases pact slots when pool is pact", () => {
    const warlock = findByKey(CLASSES, "warlock");
    expect(warlock).toBeTruthy();
    let character = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "warlock" });

    const input = baseInput({
      spellKey: "hex",
      slotsByLevel: {},
      pactMagic: { count: 1, slotLevel: 1 },
      pactSlotRemaining: character.pactSlotRemaining,
    });
    const actions = buildCastConfirmActions({
      freeCastSourceId: null,
      castAsRitual: false,
      slotLevel: 1,
      slotPool: "pact",
      input,
    });
    const next = actions.reduce((state, action) => characterReducer(state, action), character);
    expect(next.pactSlotRemaining).toEqual({ count: 0, slotLevel: 1 });
  });
});