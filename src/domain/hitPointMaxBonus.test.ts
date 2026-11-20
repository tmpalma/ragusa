import { describe, expect, it } from "vitest";
import { applyHitPointMaxBonus, clearHitPointMaxBonus, effectiveMaxHitPoints } from "./hitPointMaxBonus";

describe("hitPointMaxBonus", () => {
  it("adds effective max HP", () => {
    expect(effectiveMaxHitPoints(30, 5)).toBe(35);
    expect(effectiveMaxHitPoints(30, 0)).toBe(30);
    expect(effectiveMaxHitPoints(null, 5)).toBeNull();
  });

  it("applies Aid-style bonus to current and max (7/30 -> 12/35)", () => {
    const result = applyHitPointMaxBonus({
      baseMaxHitPoints: 30,
      currentBonus: 0,
      newBonus: 5,
      currentHitPoints: 7,
    });
    expect(result).toEqual({ hitPointMaxBonus: 5, currentHitPoints: 12 });
  });

  it("raises current when at full health", () => {
    const result = applyHitPointMaxBonus({
      baseMaxHitPoints: 30,
      currentBonus: 0,
      newBonus: 5,
      currentHitPoints: null,
    });
    expect(result).toEqual({ hitPointMaxBonus: 5, currentHitPoints: null });
  });

  it("replaces bonus and adds delta to current (5 -> 10)", () => {
    const result = applyHitPointMaxBonus({
      baseMaxHitPoints: 30,
      currentBonus: 5,
      newBonus: 10,
      currentHitPoints: 12,
    });
    expect(result).toEqual({ hitPointMaxBonus: 10, currentHitPoints: 17 });
  });

  it("clears bonus and removes it from current HP", () => {
    expect(
      clearHitPointMaxBonus({
        baseMaxHitPoints: 31,
        currentBonus: 5,
        currentHitPoints: 30,
      }),
    ).toEqual({ hitPointMaxBonus: 0, currentHitPoints: 25 });

    expect(
      clearHitPointMaxBonus({
        baseMaxHitPoints: 30,
        currentBonus: 5,
        currentHitPoints: 12,
      }),
    ).toEqual({ hitPointMaxBonus: 0, currentHitPoints: 7 });

    expect(
      clearHitPointMaxBonus({
        baseMaxHitPoints: 30,
        currentBonus: 5,
        currentHitPoints: null,
      }),
    ).toEqual({ hitPointMaxBonus: 0, currentHitPoints: null });

    expect(
      clearHitPointMaxBonus({
        baseMaxHitPoints: 30,
        currentBonus: 5,
        currentHitPoints: 2,
      }),
    ).toEqual({ hitPointMaxBonus: 0, currentHitPoints: 0 });
  });

  it("treats zero bonus apply as clear", () => {
    const result = applyHitPointMaxBonus({
      baseMaxHitPoints: 30,
      currentBonus: 5,
      newBonus: 0,
      currentHitPoints: null,
    });
    expect(result).toEqual({ hitPointMaxBonus: 0, currentHitPoints: null });
  });
});
