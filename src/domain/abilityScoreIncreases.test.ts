import { describe, expect, it } from "vitest";
import {
  abilityScoresAfterIncreases,
  maxAbilityScoreIncreaseForAbility,
  sanitizeAbilityScoreIncreases,
  totalAbilityScoreIncreases,
} from "./abilityScoreIncreases";

describe("abilityScoreIncreases", () => {
  const base = { str: 15, dex: 10, con: 13, int: 8, wis: 12, cha: 14 };

  it("adds increases on top of base scores", () => {
    expect(abilityScoresAfterIncreases(base, { cha: 3 })).toEqual({ ...base, cha: 17 });
    expect(abilityScoresAfterIncreases(base, { cha: 2, str: 1 })).toEqual({ ...base, cha: 16, str: 16 });
  });

  it("sanitizes valid increases", () => {
    expect(sanitizeAbilityScoreIncreases({ cha: 3 })).toEqual({
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 3,
    });
  });

  it("rejects increases over budget or per-ability cap", () => {
    expect(sanitizeAbilityScoreIncreases({ cha: 4 })).toBeNull();
    expect(sanitizeAbilityScoreIncreases({ cha: 2, str: 2 })).toBeNull();
    expect(sanitizeAbilityScoreIncreases({ cha: 1.5 })).toBeNull();
  });

  it("computes remaining budget per ability", () => {
    expect(totalAbilityScoreIncreases({ cha: 2, str: 1 })).toBe(3);
    expect(maxAbilityScoreIncreaseForAbility({ cha: 2 }, "str")).toBe(1);
    expect(maxAbilityScoreIncreaseForAbility({ cha: 3 }, "str")).toBe(0);
  });
});
