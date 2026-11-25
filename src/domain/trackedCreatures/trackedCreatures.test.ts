import { describe, expect, it } from "vitest";
import { BEASTS } from "../../data";
import { resolveCharacterViewId, visibleCharacterViews } from "../../components/nav/characterViews";
import { hydrateCharacter, serializeCharacterFile } from "../characterFile";
import { applyRest } from "../rest";
import { availableCompanions } from "../companions";
import { buildCastConfirmResult, buildCastSpellAvailabilityInputFromCharacter } from "../castSpell";
import { EMPTY_FEAT_CHOICES } from "../featEffects";
import { computeDerivedStats } from "../deriveCharacter";
import {
  FIND_FAMILIAR_SOURCE_KEY,
  FIND_STEED_SOURCE_KEY,
  PRIMAL_COMPANION_SOURCE_KEY,
  STEEL_DEFENDER_SOURCE_KEY,
} from "./shared";
import { wildShapeEligibleBeasts } from "../wildShape";
import { characterReducer, INITIAL_CHARACTER } from "../../state/characterState";

function levelUp(character: typeof INITIAL_CHARACTER, times: number) {
  let next = character;
  for (let i = 0; i < times; i += 1) next = characterReducer(next, { type: "LEVEL_UP" });
  return next;
}

describe("tracked creatures integration", () => {
  it("shows no companion slots for a fighter", () => {
    const fighter = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" });
    expect(availableCompanions(fighter)).toHaveLength(0);
    expect(visibleCharacterViews(fighter).some((view) => view.id === "companions")).toBe(false);
  });

  it("syncs find-familiar when the spell is prepared", () => {
    let wizard = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" });
    wizard = characterReducer(wizard, { type: "ADD_SPELLBOOK_PICK", spellKey: "find-familiar" });
    wizard = characterReducer(wizard, { type: "ADD_SPELL_PICK", spellKey: "find-familiar" });
    const companions = availableCompanions(wizard);
    expect(companions.map((entry) => entry.definition.sourceKey)).toEqual([FIND_FAMILIAR_SOURCE_KEY]);
    const instance = wizard.trackedCreatures.find((row) => row.sourceKey === FIND_FAMILIAR_SOURCE_KEY);
    expect(instance?.summoned).not.toBe(true);
    expect(instance?.formKey).toBeNull();
  });

  it("requires form and spirit before summoning find familiar", () => {
    let wizard = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" });
    wizard = characterReducer(wizard, { type: "ADD_SPELLBOOK_PICK", spellKey: "find-familiar" });
    wizard = characterReducer(wizard, { type: "ADD_SPELL_PICK", spellKey: "find-familiar" });
    const blocked = characterReducer(wizard, {
      type: "SET_TRACKED_CREATURE_SUMMONED",
      id: FIND_FAMILIAR_SOURCE_KEY,
      summoned: true,
    });
    expect(blocked.trackedCreatures.find((row) => row.id === FIND_FAMILIAR_SOURCE_KEY)?.summoned).not.toBe(true);
    let ready = characterReducer(wizard, {
      type: "SET_TRACKED_CREATURE_FORM",
      id: FIND_FAMILIAR_SOURCE_KEY,
      formKey: "cat",
    });
    ready = characterReducer(ready, {
      type: "SET_TRACKED_CREATURE_SPIRIT_TYPE",
      id: FIND_FAMILIAR_SOURCE_KEY,
      spiritType: "fey",
    });
    const derived = computeDerivedStats(ready);
    const input = buildCastSpellAvailabilityInputFromCharacter(
      ready,
      derived,
      "find-familiar",
      [],
      () => EMPTY_FEAT_CHOICES,
      null,
    );
    const cast = buildCastConfirmResult({
      freeCastSourceId: null,
      castAsRitual: false,
      slotLevel: 1,
      slotPool: "spell",
      input: { ...input, slotsByLevel: { 1: 2 }, spellSlotRemaining: {} },
    });
    expect(cast).not.toBeNull();
    for (const action of cast!.actions) ready = characterReducer(ready, action);
    ready = characterReducer(ready, {
      type: "SET_TRACKED_CREATURE_SUMMONED",
      id: FIND_FAMILIAR_SOURCE_KEY,
      summoned: true,
      payment: cast!.payment,
    });
    expect(ready.trackedCreatures.find((row) => row.id === FIND_FAMILIAR_SOURCE_KEY)?.summoned).toBe(true);
  });

  it("paladin summons steed via faithful steed free cast and refunds on unsummon", () => {
    let paladin = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    for (let i = 0; i < 4; i += 1) paladin = characterReducer(paladin, { type: "LEVEL_UP" });
    paladin = characterReducer(paladin, {
      type: "SET_TRACKED_CREATURE_SPIRIT_TYPE",
      id: FIND_STEED_SOURCE_KEY,
      spiritType: "celestial",
    });
    const derived = computeDerivedStats(paladin);
    const input = buildCastSpellAvailabilityInputFromCharacter(
      paladin,
      derived,
      "find-steed",
      [],
      () => EMPTY_FEAT_CHOICES,
      null,
    );
    const freeId = `class:faithful-steed`;
    const cast = buildCastConfirmResult({
      freeCastSourceId: freeId,
      castAsRitual: false,
      slotLevel: 2,
      slotPool: "spell",
      input,
    });
    expect(cast).not.toBeNull();
    for (const action of cast!.actions) paladin = characterReducer(paladin, action);
    paladin = characterReducer(paladin, {
      type: "SET_TRACKED_CREATURE_SUMMONED",
      id: FIND_STEED_SOURCE_KEY,
      summoned: true,
      payment: cast!.payment,
    });
    expect(paladin.classFeatureUses["faithful-steed"]).toBe(0);
    paladin = characterReducer(paladin, {
      type: "SET_TRACKED_CREATURE_SUMMONED",
      id: FIND_STEED_SOURCE_KEY,
      summoned: false,
    });
    expect(paladin.classFeatureUses["faithful-steed"]).toBeUndefined();
    expect(paladin.trackedCreatures.find((row) => row.id === FIND_STEED_SOURCE_KEY)?.summoned).not.toBe(true);
  });

  it("does not auto-pick primal companion form at beast master 3", () => {
    let ranger = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "ranger" });
    ranger = levelUp(ranger, 2);
    ranger = characterReducer(ranger, { type: "SET_SUBCLASS", key: "beast-master" });
    const instance = ranger.trackedCreatures.find((row) => row.sourceKey === PRIMAL_COMPANION_SOURCE_KEY);
    expect(instance).toBeDefined();
    expect(instance?.formKey).toBeNull();
    expect(instance?.summoned).not.toBe(true);
  });

  it("multiclass beast master 3 and battle smith 3 yields two companions", () => {
    const loaded = {
      ...INITIAL_CHARACTER,
      classKey: "ranger",
      level: 6,
      levelPath: ["ranger", "ranger", "ranger", "artificer", "artificer", "artificer"],
      subclassKey: "beast-master",
      subclassByClass: { ranger: "beast-master", artificer: "battle-smith" },
      abilityScores: { str: 10, dex: 10, con: 10, int: 16, wis: 16, cha: 10 },
    };
    const synced = characterReducer(loaded, { type: "SET_NAME", value: "Multi" });
    const keys = availableCompanions(synced).map((entry) => entry.definition.sourceKey);
    expect(keys).toEqual(expect.arrayContaining([PRIMAL_COMPANION_SOURCE_KEY, STEEL_DEFENDER_SOURCE_KEY]));
    expect(keys).toHaveLength(2);
  });

  it("drops primal companion when subclass is reverted", () => {
    let ranger = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "ranger" });
    ranger = levelUp(ranger, 2);
    ranger = characterReducer(ranger, { type: "SET_SUBCLASS", key: "beast-master" });
    expect(availableCompanions(ranger).some((entry) => entry.definition.sourceKey === PRIMAL_COMPANION_SOURCE_KEY)).toBe(
      true,
    );
    const reverted = characterReducer(
      { ...ranger, subclassKey: null, subclassByClass: {} },
      { type: "SET_NAME", value: "Reverted" },
    );
    expect(availableCompanions(reverted)).toHaveLength(0);
    expect(reverted.trackedCreatures).toHaveLength(0);
  });

  it("long rest restores companion hp and repair uses", () => {
    let artificer = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "artificer" });
    artificer = levelUp(artificer, 2);
    artificer = characterReducer(artificer, { type: "SET_SUBCLASS", key: "battle-smith" });
    artificer = characterReducer(artificer, {
      type: "SET_TRACKED_CREATURE_SUMMONED",
      id: STEEL_DEFENDER_SOURCE_KEY,
      summoned: true,
    });
    artificer = characterReducer(artificer, {
      type: "SET_TRACKED_CREATURE_CURRENT_HP",
      id: STEEL_DEFENDER_SOURCE_KEY,
      value: 1,
    });
    artificer = characterReducer(artificer, {
      type: "SET_TRACKED_CREATURE_FEATURE_USE",
      id: STEEL_DEFENDER_SOURCE_KEY,
      useKey: "repair",
      value: 0,
    });
    const rested = applyRest(artificer, "long");
    const instance = rested.trackedCreatures.find((row) => row.sourceKey === STEEL_DEFENDER_SOURCE_KEY);
    expect(instance?.currentHitPoints).toBeNull();
    expect(instance?.featureUses.repair).toBe(3);
  });

  it("excludes companion templates from wild shape", () => {
    const land = BEASTS.find((beast) => beast.key === "beast-of-the-land");
    expect(land?.wildShape).toBe(false);
    expect(wildShapeEligibleBeasts(10, "circle-of-the-moon").some((beast) => beast.key === "beast-of-the-land")).toBe(
      false,
    );
  });

  it("hydrates tracked creatures from character files", () => {
    let artificer = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "artificer" });
    artificer = levelUp(artificer, 2);
    artificer = characterReducer(artificer, { type: "SET_SUBCLASS", key: "battle-smith" });
    const raw = JSON.parse(serializeCharacterFile(artificer));
    const hydrated = hydrateCharacter(raw.character);
    expect(hydrated.trackedCreatures.length).toBeGreaterThan(0);
  });

  it("resolves companions view segment", () => {
    expect(resolveCharacterViewId("companions")).toBe("companions");
  });
});