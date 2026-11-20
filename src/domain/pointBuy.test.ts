import { describe, expect, it } from "vitest";
import { clampPointBuyScores, pointBuyCost, totalPointBuyCost } from "./pointBuy";

describe("pointBuyCost", () => {
  it.each([
    [8, 0],
    [9, 1],
    [10, 2],
    [11, 3],
    [12, 4],
    [13, 5],
    [14, 7],
    [15, 9],
  ])("score %s costs %s", (score, cost) => {
    expect(pointBuyCost(score)).toBe(cost);
  });
});

describe("totalPointBuyCost", () => {
  it("costs 12 for all tens", () => {
    expect(totalPointBuyCost({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 })).toBe(12);
  });

  it("costs 27 for a standard point-buy spread", () => {
    expect(totalPointBuyCost({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 })).toBe(27);
  });
});

describe("clampPointBuyScores", () => {
  it("clamps scores below 8 and above 15", () => {
    expect(clampPointBuyScores({ str: 7, dex: 16, con: 10, int: 1, wis: 30, cha: 8 })).toEqual({
      str: 8,
      dex: 15,
      con: 10,
      int: 8,
      wis: 15,
      cha: 8,
    });
  });
});
