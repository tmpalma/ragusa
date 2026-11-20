import { describe, expect, it } from "vitest";
import { xpRemainingForNextLevel, xpThresholdForNextLevel } from "./experience";

describe("experience", () => {
  it("returns XP threshold for the next level", () => {
    expect(xpThresholdForNextLevel(1)).toBe(300);
    expect(xpThresholdForNextLevel(2)).toBe(900);
    expect(xpThresholdForNextLevel(19)).toBe(355000);
  });

  it("returns null at max rules level", () => {
    expect(xpThresholdForNextLevel(20)).toBeNull();
    expect(xpThresholdForNextLevel(0)).toBeNull();
  });

  it("computes remaining XP toward the next level", () => {
    expect(xpRemainingForNextLevel(1, 20)).toBe(280);
    expect(xpRemainingForNextLevel(1, 300)).toBe(0);
    expect(xpRemainingForNextLevel(1, 500)).toBe(0);
  });

  it("returns null remaining XP at max rules level", () => {
    expect(xpRemainingForNextLevel(20, 355000)).toBeNull();
  });
});
