import { describe, expect, it } from "vitest";
import { computeDerivedStats } from "./deriveCharacter";
import {
  buildBeastAttackCards,
  enterWildShapeState,
  isInWildShape,
  MOON_DRUID_SUBCLASS_KEY,
  overlayAbilityScores,
  parseChallengeRating,
  wildShapeEffectiveAc,
  wildShapeEligibleBeasts,
  wildShapeMaxCr,
  WILD_SHAPE_FEATURE_KEY,
} from "./wildShape";
import { INITIAL_CHARACTER, characterReducer } from "../state/characterState";
import { BEASTS } from "../data";

const wolf = BEASTS.find((beast) => beast.key === "wolf")!;
const direWolf = BEASTS.find((beast) => beast.key === "dire-wolf")!;

describe("wildShape", () => {
  it("overlays physical abilities but keeps mental scores", () => {
    const base = { str: 10, dex: 10, con: 10, int: 14, wis: 16, cha: 12 };
    const overlaid = overlayAbilityScores(base, wolf);
    expect(overlaid.str).toBe(wolf.abilities.str);
    expect(overlaid.dex).toBe(wolf.abilities.dex);
    expect(overlaid.con).toBe(wolf.abilities.con);
    expect(overlaid.int).toBe(14);
    expect(overlaid.wis).toBe(16);
    expect(overlaid.cha).toBe(12);
  });

  it("builds wolf bite attack card", () => {
    const cards = buildBeastAttackCards(wolf);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.attackMeta?.bonus).toBe("+4");
    expect(cards[0]?.attackMeta?.damage).toContain("1d6+2");
  });

  it("enter grants temp HP equal to druid level and spends a use", () => {
    const druid = {
      ...INITIAL_CHARACTER,
      classKey: "druid",
      level: 2,
      wildShapeKnownForms: ["wolf", "rat", "spider", "riding-horse"],
    };
    const entered = enterWildShapeState(druid, "wolf", 2);
    expect(entered.wildShapeActiveFormKey).toBe("wolf");
    expect(entered.temporaryHitPointsRemaining).toBe(2);
    expect(entered.classFeatureUses[WILD_SHAPE_FEATURE_KEY]).toBe(1);
  });

  it("Moon druid enter grants 3× level temp HP", () => {
    const moonDruid = {
      ...INITIAL_CHARACTER,
      classKey: "druid",
      level: 3,
      subclassKey: MOON_DRUID_SUBCLASS_KEY,
      wildShapeKnownForms: ["dire-wolf", "wolf", "rat", "spider"],
    };
    const entered = enterWildShapeState(moonDruid, "dire-wolf", 2);
    expect(entered.temporaryHitPointsRemaining).toBe(9);
  });
});

describe("wildShapeEligibleBeasts", () => {
  it("limits non-Moon druids to CR 0, 1/8, and 1/4", () => {
    const eligible = wildShapeEligibleBeasts(3);
    expect(eligible.every((beast) => ["0", "1/8", "1/4"].includes(beast.cr))).toBe(true);
    expect(eligible.some((beast) => beast.key === "dire-wolf")).toBe(false);
    expect(eligible.some((beast) => beast.key === "brown-bear")).toBe(false);
  });

  it("Moon druid at L3 allows CR 1/2 and 1 beasts", () => {
    const eligible = wildShapeEligibleBeasts(3, MOON_DRUID_SUBCLASS_KEY);
    expect(eligible.some((beast) => beast.key === "dire-wolf")).toBe(true);
    expect(eligible.some((beast) => beast.key === "brown-bear")).toBe(true);
    expect(eligible.some((beast) => beast.key === "wolf")).toBe(true);
  });

  it("Moon druid max CR is floor(level/3)", () => {
    expect(wildShapeMaxCr(3, MOON_DRUID_SUBCLASS_KEY)).toBe(1);
    expect(wildShapeMaxCr(6, MOON_DRUID_SUBCLASS_KEY)).toBe(2);
    expect(wildShapeMaxCr(2, MOON_DRUID_SUBCLASS_KEY)).toBe(0);
  });

  it("parseChallengeRating handles fractional CR strings", () => {
    expect(parseChallengeRating("1/8")).toBe(0.125);
    expect(parseChallengeRating("1/2")).toBe(0.5);
    expect(parseChallengeRating("1")).toBe(1);
  });
});

describe("wildShapeEffectiveAc", () => {
  it("Moon druid uses max of beast AC and 13 + WIS mod", () => {
    expect(wildShapeEffectiveAc(wolf, 3, MOON_DRUID_SUBCLASS_KEY)).toBe(16);
    expect(wildShapeEffectiveAc(direWolf, 3, MOON_DRUID_SUBCLASS_KEY)).toBe(16);
  });

  it("non-Moon druid keeps beast AC", () => {
    expect(wildShapeEffectiveAc(wolf, 3, null)).toBe(12);
    expect(wildShapeEffectiveAc(wolf, 3, "circle-of-the-land")).toBe(12);
  });
});

describe("wild shape derived stats", () => {
  it("uses beast AC and speeds while shifted", () => {
    const character = {
      ...INITIAL_CHARACTER,
      classKey: "druid",
      level: 2,
      abilityScores: { str: 10, dex: 10, con: 14, int: 10, wis: 16, cha: 10 },
      wildShapeKnownForms: ["wolf", "rat", "spider", "riding-horse"],
      wildShapeActiveFormKey: "wolf",
    };
    const derived = computeDerivedStats(character);
    expect(derived.armorClass).toBe(12);
    expect(derived.speeds).toEqual([{ type: "walk", feet: 40 }]);
    expect(derived.wildShapeForm?.key).toBe("wolf");
    expect(derived.hitPoints).toBeGreaterThan(0);
  });

  it("Moon druid uses 13 + WIS mod floor while shifted", () => {
    const character = {
      ...INITIAL_CHARACTER,
      classKey: "druid",
      level: 3,
      subclassKey: MOON_DRUID_SUBCLASS_KEY,
      abilityScores: { str: 10, dex: 10, con: 14, int: 10, wis: 16, cha: 10 },
      wildShapeKnownForms: ["dire-wolf", "wolf", "rat", "spider"],
      wildShapeActiveFormKey: "dire-wolf",
    };
    const derived = computeDerivedStats(character);
    expect(derived.armorClass).toBe(16);
  });

  it("Moon druid keeps higher beast AC when above floor", () => {
    const character = {
      ...INITIAL_CHARACTER,
      classKey: "druid",
      level: 3,
      subclassKey: MOON_DRUID_SUBCLASS_KEY,
      abilityScores: { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 10 },
      wildShapeKnownForms: ["dire-wolf", "wolf", "rat", "spider"],
      wildShapeActiveFormKey: "dire-wolf",
    };
    const derived = computeDerivedStats(character);
    expect(derived.armorClass).toBe(14);
  });

  it("keeps max HP based on character Constitution", () => {
    const unshifted = {
      ...INITIAL_CHARACTER,
      classKey: "druid",
      level: 2,
      abilityScores: { str: 10, dex: 10, con: 16, int: 10, wis: 16, cha: 10 },
    };
    const shifted = { ...unshifted, wildShapeActiveFormKey: "wolf" };
    expect(computeDerivedStats(unshifted).hitPoints).toBe(computeDerivedStats(shifted).hitPoints);
  });
});

describe("wild shape character reducer", () => {
  const druidL2 = {
    ...INITIAL_CHARACTER,
    classKey: "druid",
    level: 2,
    wildShapeKnownForms: ["wolf", "rat", "spider", "riding-horse"],
  };

  it("enters and exits wild shape", () => {
    const entered = characterReducer(druidL2, { type: "ENTER_WILD_SHAPE", formKey: "wolf" });
    expect(isInWildShape(entered)).toBe(true);
    const exited = characterReducer(entered, { type: "EXIT_WILD_SHAPE" });
    expect(exited.wildShapeActiveFormKey).toBeNull();
    expect(exited.temporaryHitPointsRemaining).toBe(2);
  });

  it("clears wild shape on class change", () => {
    const entered = characterReducer(druidL2, { type: "ENTER_WILD_SHAPE", formKey: "wolf" });
    const switched = characterReducer(entered, { type: "SET_CLASS", key: "fighter" });
    expect(switched.wildShapeActiveFormKey).toBeNull();
    expect(switched.wildShapeKnownForms).toEqual([]);
  });

  it("exits form at 0 HP", () => {
    const entered = characterReducer(druidL2, { type: "ENTER_WILD_SHAPE", formKey: "wolf" });
    const max = computeDerivedStats(entered).hitPoints!;
    const temp = entered.temporaryHitPointsRemaining ?? 0;
    const damaged = characterReducer(entered, { type: "APPLY_DAMAGE", amount: max + temp });
    expect(damaged.wildShapeActiveFormKey).toBeNull();
    expect(damaged.currentHitPoints).toBe(0);
  });

  it("adds and removes known forms", () => {
    const empty = { ...INITIAL_CHARACTER, classKey: "druid", level: 2 };
    const withWolf = characterReducer(empty, { type: "ADD_WILD_SHAPE_KNOWN_FORM", formKey: "wolf" });
    expect(withWolf.wildShapeKnownForms).toEqual(["wolf"]);
    const withRat = characterReducer(withWolf, { type: "ADD_WILD_SHAPE_KNOWN_FORM", formKey: "rat" });
    expect(withRat.wildShapeKnownForms).toEqual(["wolf", "rat"]);
    const duplicate = characterReducer(withRat, { type: "ADD_WILD_SHAPE_KNOWN_FORM", formKey: "wolf" });
    expect(duplicate.wildShapeKnownForms).toEqual(withRat.wildShapeKnownForms);
    const removed = characterReducer(withRat, { type: "REMOVE_WILD_SHAPE_KNOWN_FORM", formKey: "wolf" });
    expect(removed.wildShapeKnownForms).toEqual(["rat"]);
  });

  it("rejects ineligible or over-cap known forms", () => {
    const druid = { ...INITIAL_CHARACTER, classKey: "druid", level: 2 };
    const ineligible = characterReducer(druid, { type: "ADD_WILD_SHAPE_KNOWN_FORM", formKey: "not-a-beast" });
    expect(ineligible.wildShapeKnownForms).toEqual([]);
    const full = {
      ...INITIAL_CHARACTER,
      classKey: "druid",
      level: 2,
      wildShapeKnownForms: ["wolf", "rat", "spider", "riding-horse"],
    };
    const overCap = characterReducer(full, { type: "ADD_WILD_SHAPE_KNOWN_FORM", formKey: "bat" });
    expect(overCap.wildShapeKnownForms).toEqual(full.wildShapeKnownForms);
  });

  it("clears active form when removing that known form", () => {
    const entered = characterReducer(druidL2, { type: "ENTER_WILD_SHAPE", formKey: "wolf" });
    const removed = characterReducer(entered, { type: "REMOVE_WILD_SHAPE_KNOWN_FORM", formKey: "wolf" });
    expect(removed.wildShapeActiveFormKey).toBeNull();
    expect(removed.wildShapeKnownForms).not.toContain("wolf");
  });
});
