import { describe, expect, it } from "vitest";
import { abilityModifier, formatModifier } from "./modifiers";

describe("abilityModifier", () => {
  it.each([
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [13, 1],
    [17, 3],
    [1, -5],
    [30, 10],
  ])("score %i -> modifier %i", (score, expected) => {
    expect(abilityModifier(score)).toBe(expected);
  });
});

describe("formatModifier", () => {
  it("renders zero as bare '0'", () => {
    expect(formatModifier(0)).toBe("0");
  });

  it("renders positive modifiers with a leading +", () => {
    expect(formatModifier(3)).toBe("+3");
  });

  it("renders negative modifiers with a leading -", () => {
    expect(formatModifier(-1)).toBe("-1");
  });
});
