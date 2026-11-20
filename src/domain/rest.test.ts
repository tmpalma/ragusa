import { describe, expect, it } from "vitest";
import { PACT_OF_THE_TOME_SPELL_PICKS_KEY } from "./classFeatures";
import { computeDerivedStats } from "./deriveCharacter";
import { applyRest } from "./rest";
import { RAW_TABLE_RULES } from "./tableRules";
import { INITIAL_CHARACTER, characterReducer } from "../state/characterState";

function withClass(classKey: string) {
  return characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: classKey });
}

function withSpecies(speciesKey: string) {
  return characterReducer(INITIAL_CHARACTER, { type: "SET_SPECIES", key: speciesKey });
}

describe("applyRest", () => {
  it("clears concentration on short or long rest", () => {
    let character = withClass("cleric");
    character = characterReducer(character, { type: "ADD_SPELL_PICK", spellKey: "bless" });
    character = characterReducer(character, { type: "SET_CONCENTRATION_SPELL", spellKey: "bless" });
    character = characterReducer(character, { type: "SET_CONCENTRATION_ROUNDS", value: 6 });

    const afterShort = applyRest(character, "short");
    expect(afterShort.concentrationSpellKey).toBeNull();
    expect(afterShort.concentrationRoundsRemaining).toBeNull();

    let concentrating = characterReducer(character, {
      type: "SET_CONCENTRATION_SPELL",
      spellKey: "bless",
    });
    concentrating = characterReducer(concentrating, { type: "SET_CONCENTRATION_ROUNDS", value: 6 });
    const afterLong = applyRest(concentrating, "long");
    expect(afterLong.concentrationSpellKey).toBeNull();
    expect(afterLong.concentrationRoundsRemaining).toBeNull();
  });

  it("short rest restores one Rage use for a Barbarian", () => {
    let character = withClass("barbarian");
    character = characterReducer(character, {
      type: "SET_CLASS_FEATURE_USES",
      featureKey: "rage",
      value: 0,
    });

    const afterShort = applyRest(character, "short");
    expect(afterShort.classFeatureUses.rage).toBe(1);

    const afterLong = applyRest(afterShort, "long");
    expect(afterLong.classFeatureUses.rage).toBeUndefined();
  });

  it("short rest fully restores Hunter's Prey for a Hunter ranger", () => {
    let character = withClass("ranger");
    character = characterReducer(character, { type: "LEVEL_UP" });
    character = characterReducer(character, { type: "LEVEL_UP" });
    character = characterReducer(character, { type: "SET_SUBCLASS", key: "hunter" });
    character = characterReducer(character, {
      type: "SET_CLASS_FEATURE_USES",
      featureKey: "hunters-prey",
      value: 0,
    });

    const afterShort = applyRest(character, "short");
    expect(afterShort.classFeatureUses["hunters-prey"]).toBeUndefined();
  });

  it("short rest does not restore Bardic Inspiration", () => {
    let character = withClass("bard");
    character = {
      ...character,
      abilityScores: { ...character.abilityScores, cha: 14 },
    };
    character = characterReducer(character, {
      type: "SET_CLASS_FEATURE_USES",
      featureKey: "bardic-inspiration",
      value: 0,
    });

    const afterShort = applyRest(character, "short");
    expect(afterShort.classFeatureUses["bardic-inspiration"]).toBe(0);

    const afterLong = applyRest(character, "long");
    expect(afterLong.classFeatureUses["bardic-inspiration"]).toBeUndefined();
  });

  it("short rest restores Bardic Inspiration at bard level 5 (Font of Inspiration)", () => {
    let character = withClass("bard");
    character = {
      ...character,
      abilityScores: { ...character.abilityScores, cha: 14 },
    };
    for (let i = 0; i < 4; i += 1) {
      character = characterReducer(character, { type: "LEVEL_UP" });
    }
    expect(character.level).toBe(5);
    character = characterReducer(character, {
      type: "SET_CLASS_FEATURE_USES",
      featureKey: "bardic-inspiration",
      value: 0,
    });

    const afterShort = applyRest(character, "short");
    expect(afterShort.classFeatureUses["bardic-inspiration"]).toBeUndefined();
  });

  it("short rest fully restores Orc Adrenaline Rush", () => {
    let character = withSpecies("orc");
    character = characterReducer(character, {
      type: "SET_SPECIES_FEATURE_USES",
      featureKey: "adrenaline-rush",
      value: 0,
    });

    const afterShort = applyRest(character, "short");
    expect(afterShort.speciesFeatureUses["adrenaline-rush"]).toBeUndefined();
  });

  it("short rest does not restore Relentless Endurance", () => {
    let character = withSpecies("orc");
    character = characterReducer(character, {
      type: "SET_SPECIES_FEATURE_USES",
      featureKey: "relentless-endurance",
      value: 0,
    });

    const afterShort = applyRest(character, "short");
    expect(afterShort.speciesFeatureUses["relentless-endurance"]).toBe(0);

    const afterLong = applyRest(character, "long");
    expect(afterLong.speciesFeatureUses["relentless-endurance"]).toBeUndefined();
  });

  it("long rest restores HP and spell slots but short rest leaves them unchanged", () => {
    let character = withClass("cleric");
    character = characterReducer(character, {
      type: "SET_CURRENT_HIT_POINTS",
      value: 1,
    });
    character = characterReducer(character, {
      type: "SET_SPELL_SLOT_REMAINING",
      spellLevel: 1,
      value: 0,
    });

    const afterShort = applyRest(character, "short");
    expect(afterShort.currentHitPoints).toBe(1);
    expect(afterShort.spellSlotRemaining[1]).toBe(0);

    const afterLong = applyRest(character, "long");
    expect(afterLong.currentHitPoints).toBeNull();
    expect(afterLong.spellSlotRemaining[1]).toBeUndefined();
  });

  it("long rest clears max HP bonus and restores HP to the base maximum", () => {
    let character = withClass("paladin");
    character = characterReducer(character, { type: "SET_CURRENT_HIT_POINTS", value: 7 });
    character = characterReducer(character, { type: "APPLY_HIT_POINT_MAX_BONUS", amount: 5 });
    expect(character.hitPointMaxBonus).toBe(5);
    expect(character.currentHitPoints).toBe(12);

    const afterLong = applyRest(character, "long");
    expect(afterLong.hitPointMaxBonus).toBe(0);
    expect(afterLong.currentHitPoints).toBeNull();
  });

  it("long rest clears death saving throw marks", () => {
    let character = withClass("cleric");
    character = characterReducer(character, { type: "SET_CURRENT_HIT_POINTS", value: 0 });
    character = characterReducer(character, {
      type: "SET_DEATH_SAVES",
      successes: 2,
      failures: 1,
    });

    const afterShort = applyRest(character, "short");
    expect(afterShort.deathSaveSuccesses).toBe(2);
    expect(afterShort.deathSaveFailures).toBe(1);

    const afterLong = applyRest(character, "long");
    expect(afterLong.deathSaveSuccesses).toBe(0);
    expect(afterLong.deathSaveFailures).toBe(0);
  });

  it("short and long rest do not restore Heroic Inspiration", () => {
    let character = characterReducer(INITIAL_CHARACTER, {
      type: "SET_HEROIC_INSPIRATION",
      value: 1,
    });

    const afterShort = applyRest(character, "short");
    expect(afterShort.heroicInspiration).toBe(1);

    character = characterReducer(character, {
      type: "SET_HEROIC_INSPIRATION",
      value: 0,
    });
    const afterLong = applyRest(character, "long");
    expect(afterLong.heroicInspiration).toBe(0);
  });

  it("long rest restores feat spell free casts but short rest does not", () => {
    let character = characterReducer(INITIAL_CHARACTER, { type: "SET_FEAT", key: "magic-initiate-wizard" });
    character = characterReducer(character, {
      type: "SET_FEAT_SPELL_PICK",
      index: 0,
      spellKey: "burning-hands",
    });
    const storageKey = "magic-initiate-wizard:burning-hands";
    character = characterReducer(character, {
      type: "SET_FEAT_SPELL_USES",
      featKey: storageKey,
      value: 0,
    });
    expect(character.featSpellUses[storageKey]).toBe(0);

    const afterShort = applyRest(character, "short");
    expect(afterShort.featSpellUses[storageKey]).toBe(0);

    const afterLong = applyRest(character, "long");
    expect(afterLong.featSpellUses[storageKey]).toBeUndefined();
  });

  it("does not reset pact of the tome spell picks on short or long rest", () => {
    let character = withClass("warlock");
    const bookPicks = {
      cantrips: ["guidance", "mending", "message"],
      rituals: ["alarm", "detect-magic"],
    };
    character = {
      ...character,
      classFeatureOptionPicks: {
        "eldritch-invocations": ["pact-of-the-tome"],
      },
      classFeatureSpellPicks: {
        [PACT_OF_THE_TOME_SPELL_PICKS_KEY]: bookPicks,
      },
    };

    const afterShort = applyRest(character, "short");
    expect(afterShort.classFeatureSpellPicks[PACT_OF_THE_TOME_SPELL_PICKS_KEY]).toEqual(bookPicks);

    const afterLong = applyRest(character, "long");
    expect(afterLong.classFeatureSpellPicks[PACT_OF_THE_TOME_SPELL_PICKS_KEY]).toEqual(bookPicks);
  });

  it("short rest restores expended pact magic slots for a warlock", () => {
    let character = withClass("warlock");
    character = characterReducer(character, { type: "LEVEL_UP" });
    character = characterReducer(character, { type: "LEVEL_UP" });
    character = {
      ...character,
      pactSlotRemaining: { count: 0, slotLevel: 2 },
    };

    const afterShort = applyRest(character, "short");
    expect(afterShort.pactSlotRemaining).toBeNull();
  });

  it("long rest zeros class feature pool remaining", () => {
    let character = withClass("wizard");
    character = {
      ...character,
      classFeaturePoolRemaining: { "arcane-ward": 4 },
    };

    const afterShort = applyRest(character, "short");
    expect(afterShort.classFeaturePoolRemaining["arcane-ward"]).toBe(4);

    const afterLong = applyRest(character, "long");
    expect(afterLong.classFeaturePoolRemaining).toEqual({});
  });

  it("enables high elf cantrip swap after a long rest", () => {
    let character = characterReducer(INITIAL_CHARACTER, { type: "SET_SPECIES", key: "elf" });
    character = characterReducer(character, { type: "SET_SPECIES_LINEAGE", key: "high-elf" });
    expect(character.speciesCantripSwapAvailable).toEqual({});

    const afterLong = applyRest(character, "long");
    expect(afterLong.speciesCantripSwapAvailable).toEqual({ "high-elf-cantrip": true });
  });

  describe("hit dice on long rest", () => {
    function fighterLevel5() {
      let character = withClass("fighter");
      character = characterReducer(character, { type: "LEVEL_UP" });
      character = characterReducer(character, { type: "LEVEL_UP" });
      character = characterReducer(character, { type: "LEVEL_UP" });
      character = characterReducer(character, { type: "LEVEL_UP" });
      return character;
    }

    it("restores all spent hit dice on a long rest", () => {
      let character = fighterLevel5();
      character = characterReducer(character, { type: "SET_CURRENT_HIT_DICE", value: 2 });
      expect(character.currentHitDice).toBe(2);

      const afterLong = applyRest(character, "long");
      expect(afterLong.currentHitDice).toBeNull();
      expect(afterLong.hitDiceRemaining).toEqual({});
      const pools = computeDerivedStats(afterLong).hitDicePools;
      expect(pools.find((p) => p.die === 10)?.current).toBe(5);
    });

    it("clears stored hit dice when the last die is restored to max", () => {
      let character = withClass("fighter");
      character = characterReducer(character, { type: "SET_CURRENT_HIT_DICE", value: 0 });

      const afterLong = applyRest(character, "long");
      expect(afterLong.currentHitDice).toBeNull();
      expect(afterLong.hitDiceRemaining).toEqual({});
    });

    it("does not change hit dice when already at max", () => {
      const character = fighterLevel5();
      const afterLong = applyRest(character, "long");
      expect(afterLong.currentHitDice).toBeNull();
      expect(afterLong.hitDiceRemaining).toEqual({});
    });

    it("does not restore hit dice on a short rest", () => {
      let character = fighterLevel5();
      character = characterReducer(character, { type: "SET_CURRENT_HIT_DICE", value: 2 });

      const afterShort = applyRest(character, "short");
      expect(afterShort.currentHitDice).toBe(2);
    });

    it("restores every depleted die pool when multiclassed", () => {
      let character = withClass("wizard");
      character = characterReducer(character, { type: "SET_ABILITY_SCORE", ability: "int", value: 14 });
      character = characterReducer(character, { type: "SET_ABILITY_SCORE", ability: "dex", value: 13 });
      character = characterReducer(character, { type: "LEVEL_UP_CLASS", classKey: "fighter" }, RAW_TABLE_RULES);
      character = {
        ...character,
        hitDiceRemaining: { 6: 0, 10: 0 },
      };

      const before = computeDerivedStats(character).hitDicePools;
      expect(before.find((p) => p.die === 6)?.current).toBe(0);
      expect(before.find((p) => p.die === 10)?.current).toBe(0);

      const afterLong = applyRest(character, "long");
      expect(afterLong.hitDiceRemaining).toEqual({});
      const afterPools = computeDerivedStats(afterLong).hitDicePools;
      expect(afterPools.find((p) => p.die === 6)?.current).toBe(1);
      expect(afterPools.find((p) => p.die === 10)?.current).toBe(1);
    });
  });
});
