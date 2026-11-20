import { afterEach, describe, expect, it, vi } from "vitest";
import type { AbilityId } from "../data/types";
import * as characterLevel from "./characterLevel";
import { evaluateMulticlassAction, satisfiesPrimaryAbility, type MulticlassClassRecord } from "./multiclass";
import { RAW_TABLE_RULES, type TableRules } from "./tableRules";

const TEST_CLASSES: Record<string, MulticlassClassRecord> = {
  barbarian: { key: "barbarian", primaryAbility: [{ str: 13 }] },
  druid: { key: "druid", primaryAbility: [{ wis: 13 }] },
  fighter: { key: "fighter", primaryAbility: [{ str: 13 }, { dex: 13 }] },
  wizard: { key: "wizard", primaryAbility: [{ int: 13 }] },
  rogue: { key: "rogue", primaryAbility: [{ dex: 13 }] },
};

function resolveClass(classKey: string): MulticlassClassRecord | null {
  return TEST_CLASSES[classKey] ?? null;
}

function scores(overrides: Partial<Record<AbilityId, number>>): Record<AbilityId, number> {
  return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...overrides };
}

function evaluate(
  rules: TableRules,
  targetClassKey: string,
  currentLevelPath: string[],
  abilityScores: Record<AbilityId, number>,
) {
  return evaluateMulticlassAction(rules, {
    targetClassKey,
    currentLevelPath,
    abilityScores,
    resolveClass,
  });
}

describe("satisfiesPrimaryAbility", () => {
  it("treats array entries as OR and keys within an entry as AND", () => {
    const fighterPrimary = TEST_CLASSES.fighter.primaryAbility;
    expect(satisfiesPrimaryAbility(scores({ str: 13, dex: 8 }), fighterPrimary, 13)).toBe(true);
    expect(satisfiesPrimaryAbility(scores({ str: 8, dex: 13 }), fighterPrimary, 13)).toBe(true);
    expect(satisfiesPrimaryAbility(scores({ str: 12, dex: 12 }), fighterPrimary, 13)).toBe(false);
  });
});

describe("evaluateMulticlassAction", () => {
  it("blocks Barbarian dipping Druid without 13 WIS (needs WIS on Druid, STR on Barbarian)", () => {
    const result = evaluate(
      RAW_TABLE_RULES,
      "druid",
      ["barbarian"],
      scores({ str: 15, wis: 12 }),
    );

    expect(result).toEqual({
      ok: false,
      code: "ability_prerequisite",
      messageKey: "character.multiclass.error.abilityPrerequisite",
      enforcement: "enforce",
    });
  });

  it("allows Fighter with DEX 13 / STR 10 when continuing a Wizard (OR primary)", () => {
    const result = evaluate(
      RAW_TABLE_RULES,
      "fighter",
      ["wizard"],
      scores({ int: 14, dex: 13, str: 10 }),
    );

    expect(result).toEqual({
      ok: true,
      code: "ok",
      messageKey: "",
    });
  });

  it("rejects a third distinct class when maxDistinctClasses is 2", () => {
    const result = evaluate(
      RAW_TABLE_RULES,
      "rogue",
      ["fighter", "wizard"],
      scores({ int: 14, dex: 14, str: 14 }),
    );

    expect(result).toEqual({
      ok: false,
      code: "max_distinct_classes",
      messageKey: "character.multiclass.error.maxDistinctClasses",
    });
  });

  it("allows a third distinct class when maxDistinctClasses is null", () => {
    const rules: TableRules = { ...RAW_TABLE_RULES, maxDistinctClasses: null };
    const result = evaluate(
      rules,
      "rogue",
      ["fighter", "wizard"],
      scores({ int: 14, dex: 14, str: 14 }),
    );

    expect(result).toEqual({
      ok: true,
      code: "ok",
      messageKey: "",
    });
  });

  it("allows ability prereq violations in warn mode with enforcement warn", () => {
    const rules: TableRules = {
      ...RAW_TABLE_RULES,
      abilityPrerequisite: { mode: "warn", minimum: 13 },
    };
    const result = evaluate(rules, "druid", ["barbarian"], scores({ str: 15, wis: 12 }));

    expect(result).toEqual({
      ok: true,
      code: "ability_prerequisite",
      messageKey: "character.multiclass.warn.abilityPrerequisite",
      enforcement: "warn",
    });
  });

  it("allows ability prereq violations in ignore mode with enforcement ignore", () => {
    const rules: TableRules = {
      ...RAW_TABLE_RULES,
      abilityPrerequisite: { mode: "ignore", minimum: 13 },
    };
    const result = evaluate(rules, "druid", ["barbarian"], scores({ str: 15, wis: 12 }));

    expect(result).toEqual({
      ok: true,
      code: "ability_prerequisite",
      messageKey: "",
      enforcement: "ignore",
    });
  });

  it("rejects when total character level is already at the cap", () => {
    const result = evaluate(
      RAW_TABLE_RULES,
      "fighter",
      ["wizard", "wizard", "wizard", "wizard", "wizard", "wizard"],
      scores({ int: 14, str: 14 }),
    );

    expect(result).toEqual({
      ok: false,
      code: "max_character_level",
      messageKey: "character.multiclass.error.maxCharacterLevel",
    });
  });

  it("allows the fourth level in the same class when under both caps", () => {
    const result = evaluate(
      RAW_TABLE_RULES,
      "wizard",
      ["wizard", "wizard", "wizard"],
      scores({ int: 14 }),
    );

    expect(result).toEqual({
      ok: true,
      code: "ok",
      messageKey: "",
    });
  });

  it("skips ability prereqs when leveling the only class (single-class progression)", () => {
    const result = evaluate(RAW_TABLE_RULES, "wizard", ["wizard"], scores({ int: 10 }));

    expect(result).toEqual({
      ok: true,
      code: "ok",
      messageKey: "",
    });
  });

  it("rejects when the per-class level cap would be exceeded", () => {
    vi.spyOn(characterLevel, "maxCharacterLevelFor").mockReturnValue(2);
    const result = evaluate(
      RAW_TABLE_RULES,
      "wizard",
      ["wizard", "wizard"],
      scores({ int: 14 }),
    );

    expect(result).toEqual({
      ok: false,
      code: "max_class_level",
      messageKey: "character.multiclass.error.maxClassLevel",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
