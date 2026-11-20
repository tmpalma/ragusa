import { describe, expect, it } from "vitest";
import type { AbilityId } from "../data/types";
import { CLASSES, SUBCLASSES, findByKey } from "../data";
import { classHasFeatGrantAtLevel } from "./classGrantedFeats";
import { resolvedClassLevels } from "./classLevels";
import {
  characterForSave,
  hydrateCharacter,
  parseCharacterFile,
  serializeCharacterFile,
} from "./characterFile";
import { computeDerivedStats } from "./deriveCharacter";
import { evaluateMulticlassAction, primaryAbilityFromCatalog } from "./multiclass";
import {
  multiclassCantripSlotTotal,
  spellPickLimitsByClass,
} from "./spellSelection";
import { EMPTY_FEAT_CHOICES, collectFeatContributions } from "./featEffects";
import { buildTrainingSummary, mergedClassSaveProficiencies } from "./training";
import { RAW_TABLE_RULES, type TableRules } from "./tableRules";
import { characterReducer, INITIAL_CHARACTER } from "../state/characterState";

function defaultScores(overrides: Partial<Record<AbilityId, number>> = {}): Record<AbilityId, number> {
  return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...overrides };
}

function withScores(
  state: ReturnType<typeof characterReducer>,
  overrides: Partial<Record<AbilityId, number>>,
) {
  let next = state;
  for (const [ability, value] of Object.entries(defaultScores(overrides))) {
    next = characterReducer(next, { type: "SET_ABILITY_SCORE", ability: ability as AbilityId, value });
  }
  return next;
}

function resolveCatalogClass(classKey: string) {
  return findByKey(CLASSES, classKey) ?? null;
}

function resolveMulticlassClassRecord(classKey: string, minimum = 13) {
  const classData = resolveCatalogClass(classKey);
  if (!classData?.primaryAbility) return null;
  return {
    key: classData.key,
    primaryAbility: primaryAbilityFromCatalog(classData.primaryAbility, minimum),
  };
}

function evaluatePrereq(
  rules: TableRules,
  targetClassKey: string,
  currentLevelPath: string[],
  abilityScores: Record<AbilityId, number>,
) {
  return evaluateMulticlassAction(rules, {
    targetClassKey,
    currentLevelPath,
    abilityScores,
    resolveClass: (classKey) =>
      resolveMulticlassClassRecord(classKey, rules.abilityPrerequisite.minimum),
  });
}

function levelUpPath(
  state: ReturnType<typeof characterReducer>,
  classKeys: string[],
  rules: TableRules = RAW_TABLE_RULES,
) {
  let next = state;
  for (const classKey of classKeys) {
    next = characterReducer(next, { type: "LEVEL_UP_CLASS", classKey }, rules);
  }
  return next;
}

const emptyFeatContributions = collectFeatContributions(
  [],
  () => EMPTY_FEAT_CHOICES,
  {} as never,
  [],
);

describe("multiclass integration", () => {
  describe("prerequisites and TableRules policy", () => {
    it("blocks Barbarian dipping Druid under RAW enforce and allows Fighter on DEX 13", () => {
      const barbarianScores = defaultScores({ str: 15, wis: 12 });
      expect(
        evaluatePrereq(RAW_TABLE_RULES, "druid", ["barbarian"], barbarianScores).ok,
      ).toBe(false);

      let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "barbarian" }), {
        str: 15,
        wis: 12,
      });
      const before = state;
      state = characterReducer(state, { type: "LEVEL_UP_CLASS", classKey: "druid" });
      expect(state).toBe(before);

      const wizardScores = defaultScores({ int: 14, dex: 13, str: 10 });
      expect(evaluatePrereq(RAW_TABLE_RULES, "fighter", ["wizard"], wizardScores).ok).toBe(true);

      state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" }), {
        int: 14,
        dex: 13,
        str: 10,
      });
      state = characterReducer(state, { type: "LEVEL_UP_CLASS", classKey: "fighter" });
      expect(state.levelPath).toEqual(["wizard", "fighter"]);
    });

    it("allows a Druid dip when abilityPrerequisite mode is warn or ignore", () => {
      const scores = defaultScores({ str: 15, wis: 12 });
      const warnRules: TableRules = {
        ...RAW_TABLE_RULES,
        abilityPrerequisite: { mode: "warn", minimum: 13 },
      };
      const ignoreRules: TableRules = {
        ...RAW_TABLE_RULES,
        abilityPrerequisite: { mode: "ignore", minimum: 13 },
      };

      expect(evaluatePrereq(warnRules, "druid", ["barbarian"], scores).ok).toBe(true);
      expect(evaluatePrereq(ignoreRules, "druid", ["barbarian"], scores).ok).toBe(true);

      let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "barbarian" }), {
        str: 15,
        wis: 12,
      });
      state = characterReducer(state, { type: "LEVEL_UP_CLASS", classKey: "druid" }, ignoreRules);
      expect(state.levelPath).toEqual(["barbarian", "druid"]);
    });

    it("rejects a third distinct class at maxDistinctClasses 2 and allows it when null", () => {
      const scores = defaultScores({ int: 14, dex: 14, str: 14 });
      expect(evaluatePrereq(RAW_TABLE_RULES, "rogue", ["fighter", "wizard"], scores).ok).toBe(false);

      let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" }), {
        int: 14,
        dex: 14,
        str: 14,
      });
      state = levelUpPath(state, ["fighter"]);
      const before = state;
      state = characterReducer(state, { type: "LEVEL_UP_CLASS", classKey: "rogue" });
      expect(state).toBe(before);

      const unlimitedRules: TableRules = { ...RAW_TABLE_RULES, maxDistinctClasses: null };
      expect(evaluatePrereq(unlimitedRules, "rogue", ["fighter", "wizard"], scores).ok).toBe(true);

      state = levelUpPath(
        withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" }), {
          int: 14,
          dex: 14,
          str: 14,
        }),
        ["fighter", "rogue"],
        unlimitedRules,
      );
      expect(state.levelPath).toEqual(["wizard", "fighter", "rogue"]);
    });
  });

  describe("training through reducer and deriveCharacter", () => {
    it("Fighter dip skips Heavy armor and new saves; Cleric Protector still grants Heavy", () => {
      const wizardFighter = {
        ...withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" }), {
          int: 14,
          dex: 13,
        }),
        levelPath: ["wizard", "fighter"] as string[],
        level: 2,
      };

      const fighterDipTraining = buildTrainingSummary({
        classData: null,
        level: wizardFighter.level,
        classFeatureChoices: {},
        subclassKey: null,
        featContributions: emptyFeatContributions,
        multiclass: {
          rules: RAW_TABLE_RULES,
          levelPath: wizardFighter.levelPath,
          resolveClass: resolveCatalogClass,
        },
      });
      expect(fighterDipTraining.armorCategories).toEqual(["light", "medium"]);
      expect(fighterDipTraining.armorCategories).not.toContain("heavy");

      const derivedSaves = computeDerivedStats(wizardFighter).savingThrows;
      expect(derivedSaves.int.proficient).toBe(true);
      expect(derivedSaves.wis.proficient).toBe(true);
      expect(derivedSaves.str.proficient).toBe(false);
      expect(derivedSaves.con.proficient).toBe(false);

      const protectorCleric = buildTrainingSummary({
        classData: null,
        level: 2,
        classFeatureChoices: {},
        subclassKey: null,
        featContributions: emptyFeatContributions,
        multiclass: {
          rules: RAW_TABLE_RULES,
          levelPath: ["wizard", "cleric"],
          resolveClass: resolveCatalogClass,
          classFeatureChoicesByClass: { cleric: { "divine-order": "protector" } },
        },
      });
      expect(protectorCleric.armorCategories).toEqual(["light", "medium", "heavy"]);

      const saves = mergedClassSaveProficiencies(
        RAW_TABLE_RULES,
        ["wizard", "cleric"],
        resolveCatalogClass,
      );
      expect(saves).toEqual(["int", "wis"]);
    });
  });

  describe("hit points through deriveCharacter", () => {
    it("Wizard 1 then Fighter 1 uses 6+CON then average d10+CON", () => {
      const character = {
        ...withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" }), {
          int: 14,
          con: 14,
        }),
        levelPath: ["wizard", "fighter"],
        level: 2,
      };

      const derived = computeDerivedStats(character);
      expect(derived.hitPoints).toBe(16);
      expect(derived.hitDiceMaxByDie).toEqual({ 6: 1, 10: 1 });
    });
  });

  describe("spellcasting through deriveCharacter", () => {
    const spellCtx = {
      subclassByClass: {} as Record<string, string | null>,
      getClassData: resolveCatalogClass,
      getSubclassData: (subclassKey: string) => findByKey(SUBCLASSES, subclassKey) ?? null,
      abilityModifiers: { int: 0, str: 0, dex: 0, con: 0, wis: 0, cha: 0 },
      proficiencyBonus: 2,
    };

    it("Ranger 1 / Sorcerer 3 yields multiclass slots 4/3 with per-class prepared counts", () => {
      const classLevels = resolvedClassLevels(["ranger", "sorcerer", "sorcerer", "sorcerer"]);
      const character = {
        ...INITIAL_CHARACTER,
        levelPath: ["ranger", "sorcerer", "sorcerer", "sorcerer"],
        classKey: "ranger",
        level: 4,
      };

      const derived = computeDerivedStats(character);
      expect(derived.spellcasting?.slotsByLevel).toEqual({ 1: 4, 2: 3 });

      const limits = spellPickLimitsByClass(classLevels, spellCtx);
      expect(limits.ranger?.spellSlots).toBe(2);
      expect(limits.sorcerer?.spellSlots).toBe(6);
      expect(multiclassCantripSlotTotal(limits)).toBe(4);
    });

    it("Warlock 1 / Wizard 3 yields Wizard 4/2 slots plus one Pact L1 slot", () => {
      const character = {
        ...INITIAL_CHARACTER,
        levelPath: ["warlock", "wizard", "wizard", "wizard"],
        classKey: "warlock",
        level: 4,
      };

      const derived = computeDerivedStats(character);
      expect(derived.spellcasting?.slotsByLevel).toEqual({ 1: 4, 2: 2 });
      expect(derived.pactMagic).toEqual({ count: 1, slotLevel: 1 });
    });
  });

  describe("subclass and ASI at class level", () => {
    it("accepts subclass only when that class reaches level 3", () => {
      let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" }), {
        int: 14,
        dex: 13,
      });
      state = levelUpPath(state, ["fighter", "fighter"]);
      const beforeSubclass = state;
      state = characterReducer(state, { type: "SET_SUBCLASS", key: "champion", classKey: "fighter" });
      expect(state).toBe(beforeSubclass);

      state = characterReducer(state, { type: "LEVEL_UP_CLASS", classKey: "fighter" });
      state = characterReducer(state, { type: "SET_SUBCLASS", key: "champion", classKey: "fighter" });
      expect(state.subclassByClass.fighter).toBe("champion");
    });

    it("keeps fighter subclass locked when leveling another class", () => {
      let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" }), {
        str: 14,
        int: 14,
      });
      state = levelUpPath(state, ["fighter", "fighter"]);
      state = characterReducer(state, { type: "SET_SUBCLASS", key: "champion", classKey: "fighter" });
      state = levelUpPath(state, ["wizard"]);
      expect(state.subclassByClass.fighter).toBe("champion");

      const locked = state;
      state = characterReducer(state, { type: "SET_SUBCLASS", key: "battle-master", classKey: "fighter" });
      expect(state).toBe(locked);
      expect(state.subclassByClass.fighter).toBe("champion");
    });

    it("2/2 split has no ASI grant at either class level", () => {
      const character = levelUpPath(
        withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" }), {
          str: 14,
          int: 14,
        }),
        ["fighter", "wizard", "wizard"],
      );
      expect(character.levelPath).toEqual(["fighter", "fighter", "wizard", "wizard"]);
      expect(resolvedClassLevels(character.levelPath)).toEqual([
        { classKey: "fighter", classLevel: 2 },
        { classKey: "wizard", classLevel: 2 },
      ]);

      for (const { classKey, classLevel } of resolvedClassLevels(character.levelPath)) {
        expect(classHasFeatGrantAtLevel(findByKey(CLASSES, classKey)!, classLevel)).toBe(false);
      }
    });
  });

  describe("level path lifecycle and legacy saves", () => {
    it("REVERT_LAST_LEVEL pops the last class level from the path", () => {
      let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" }), {
        int: 14,
        dex: 13,
      });
      state = characterReducer(state, { type: "LEVEL_UP_CLASS", classKey: "fighter" });
      state = characterReducer(state, { type: "REVERT_LAST_LEVEL" });
      expect(state.levelPath).toEqual(["wizard"]);
      expect(state.level).toBe(1);
      expect(computeDerivedStats(state).hitDiceMaxByDie).toEqual({ 6: 1 });
    });

    it("round-trips legacy single-class saves without levelPath", () => {
      const legacy = hydrateCharacter({
        name: "Legacy Cleric",
        classKey: "cleric",
        level: 3,
        abilityScores: INITIAL_CHARACTER.abilityScores,
      });
      expect(legacy.levelPath).toEqual(["cleric", "cleric", "cleric"]);
      expect(legacy.level).toBe(3);

      const json = serializeCharacterFile(legacy);
      const parsed = parseCharacterFile(json);
      expect(parsed.levelPath).toEqual(["cleric", "cleric", "cleric"]);
      expect(characterForSave(parsed)).toEqual(characterForSave(legacy));
    });
  });

  describe("single-class compatibility", () => {
    it("keeps deriveCharacter correct for a path of length 1", () => {
      const state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" }), {
        str: 16,
        con: 14,
      });
      expect(state.levelPath).toEqual(["fighter"]);
      expect(state.level).toBe(1);

      const derived = computeDerivedStats(state);
      expect(derived.hitPoints).toBe(12);
      expect(derived.spellcasting).toBeNull();
      expect(derived.pactMagic).toBeNull();
      expect(derived.hitDiceMaxByDie).toEqual({ 10: 1 });
    });
  });
});
