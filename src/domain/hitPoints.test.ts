import { describe, expect, it } from "vitest";
import {
  combatHitPointsMutationForDisplayTarget,
  computeHitPoints,
  computeHitPointsFromLevelPath,
  concentrationSaveDc,
  displayHitPointsAfterBulkChange,
  averageHitDieGainPerLevel,
  overviewHitPointsDisplay,
} from "./hitPoints";
import { CLASSES, findByKey } from "../data";

describe("overviewHitPointsDisplay", () => {
  it("returns null when max HP is unknown", () => {
    expect(
      overviewHitPointsDisplay({
        maxHitPoints: null,
        currentHitPoints: null,
        temporaryHitPointsMax: null,
        temporaryHitPointsRemaining: null,
      }),
    ).toBeNull();
  });

  it("defaults current to max when unset", () => {
    expect(
      overviewHitPointsDisplay({
        maxHitPoints: 17,
        currentHitPoints: null,
        temporaryHitPointsMax: null,
        temporaryHitPointsRemaining: null,
      }),
    ).toEqual({ current: 17, max: 17, tempSuffix: "" });
  });

  it("adds remaining temp HP to the displayed current total and suffix", () => {
    expect(
      overviewHitPointsDisplay({
        maxHitPoints: 17,
        currentHitPoints: 11,
        temporaryHitPointsMax: 2,
        temporaryHitPointsRemaining: 2,
      }),
    ).toEqual({ current: 13, max: 17, tempSuffix: "+2" });
  });

  it("includes partial temp HP in the displayed current total", () => {
    expect(
      overviewHitPointsDisplay({
        maxHitPoints: 17,
        currentHitPoints: 11,
        temporaryHitPointsMax: 5,
        temporaryHitPointsRemaining: 2,
      }),
    ).toEqual({ current: 13, max: 17, tempSuffix: "+2" });
  });

  it("omits temp suffix when temp HP is cleared", () => {
    expect(
      overviewHitPointsDisplay({
        maxHitPoints: 12,
        currentHitPoints: 8,
        temporaryHitPointsMax: null,
        temporaryHitPointsRemaining: null,
      }),
    ).toEqual({ current: 8, max: 12, tempSuffix: "" });
  });
});

describe("combatHitPointsMutationForDisplayTarget", () => {
  it("returns damage when lowering display total", () => {
    expect(
      combatHitPointsMutationForDisplayTarget({
        maxHitPoints: 20,
        baseCurrent: 15,
        temporaryHitPointsMax: null,
        temporaryHitPointsRemaining: null,
        displayTarget: 10,
      }),
    ).toEqual({ kind: "damage", amount: 5 });
  });

  it("spends temp HP first via damage amount on display total", () => {
    expect(
      combatHitPointsMutationForDisplayTarget({
        maxHitPoints: 20,
        baseCurrent: 15,
        temporaryHitPointsMax: 5,
        temporaryHitPointsRemaining: 3,
        displayTarget: 16,
      }),
    ).toEqual({ kind: "damage", amount: 2 });
  });

  it("returns null base when healed to max", () => {
    expect(
      combatHitPointsMutationForDisplayTarget({
        maxHitPoints: 20,
        baseCurrent: 10,
        temporaryHitPointsMax: null,
        temporaryHitPointsRemaining: null,
        displayTarget: 20,
      }),
    ).toEqual({ kind: "heal", baseValue: null });
  });

  it("clamps heal base below max", () => {
    expect(
      combatHitPointsMutationForDisplayTarget({
        maxHitPoints: 20,
        baseCurrent: 10,
        temporaryHitPointsMax: null,
        temporaryHitPointsRemaining: null,
        displayTarget: 14,
      }),
    ).toEqual({ kind: "heal", baseValue: 14 });
  });
});

describe("concentrationSaveDc", () => {
  it("uses minimum DC 10 for small damage", () => {
    expect(concentrationSaveDc(0)).toBe(10);
    expect(concentrationSaveDc(19)).toBe(10);
  });

  it("uses half damage rounded down when above 10", () => {
    expect(concentrationSaveDc(20)).toBe(10);
    expect(concentrationSaveDc(22)).toBe(11);
    expect(concentrationSaveDc(50)).toBe(25);
  });

  it("caps at 30", () => {
    expect(concentrationSaveDc(100)).toBe(30);
    expect(concentrationSaveDc(1000)).toBe(30);
  });
});

describe("displayHitPointsAfterBulkChange", () => {
  it("caps healing at display cap", () => {
    expect(
      displayHitPointsAfterBulkChange({
        displayCurrent: 10,
        displayCap: 20,
        mode: "heal",
        amount: 100,
      }),
    ).toBe(20);
  });

  it("does not go below zero on damage", () => {
    expect(
      displayHitPointsAfterBulkChange({
        displayCurrent: 5,
        displayCap: 20,
        mode: "damage",
        amount: 100,
      }),
    ).toBe(0);
  });
});

describe("computeHitPoints", () => {
  it("sums hit die and CON modifier at level 1", () => {
    expect(computeHitPoints(10, 2, 1, [])).toBe(12);
  });

  it("adds average per-level gains at higher levels", () => {
    expect(averageHitDieGainPerLevel(10)).toBe(6);
    expect(computeHitPoints(10, 2, 2, [])).toBe(12 + 6 + 2);
  });

  it("handles a negative CON modifier", () => {
    expect(computeHitPoints(8, -1, 1, [])).toBe(7);
    expect(computeHitPoints(8, -1, 2, [])).toBe(11);
  });

  it("adds class HP per level from subclass effects", () => {
    expect(computeHitPoints(6, 0, 1, [], 0, 1)).toBe(7);
    expect(computeHitPoints(6, 0, 3, [], 0, 1)).toBe(17);
  });

  it("ignores feats with no registered HP effect", () => {
    expect(computeHitPoints(12, 2, 1, ["savage-attacker"])).toBe(14);
  });
});

describe("computeHitPointsFromLevelPath", () => {
  const resolveHitDie = (classKey: string) => (classKey === "wizard" ? 6 : 10);

  it("uses max HD only at character level 1, then each class die average", () => {
    expect(computeHitPointsFromLevelPath(["wizard", "fighter"], resolveHitDie, 0, [])).toBe(12);
    expect(computeHitPointsFromLevelPath(["wizard", "fighter"], resolveHitDie, 2, [])).toBe(16);
  });

  it("does not apply the later class max hit die at character level 2", () => {
    const path = ["wizard", "fighter"];
    const wrongIfMaxTwice = computeHitPoints(10, 0, 2, []);
    expect(computeHitPointsFromLevelPath(path, resolveHitDie, 0, [])).not.toBe(wrongIfMaxTwice);
  });

  it("uses catalog hit dice for wizard then fighter", () => {
    const hitDieFromCatalog = (classKey: string) => findByKey(CLASSES, classKey)!.hitDie;
    expect(computeHitPointsFromLevelPath(["wizard", "fighter"], hitDieFromCatalog, 0, [])).toBe(12);
  });
});
