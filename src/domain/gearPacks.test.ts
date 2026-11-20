import { describe, expect, it } from "vitest";
import type { AdventuringGearEntry } from "./adventuringGear";
import {
  adjustPackRemainingForQuantityChange,
  packConsumedValueCp,
  packConsumedWeightLb,
  packContentMax,
  resolvedPackRemaining,
  setPackContentRemaining,
} from "./gearPacks";

describe("gearPacks", () => {
  const explorersPack: AdventuringGearEntry = { key: "explorers-pack", quantity: 1 };

  it("defaults pack remaining to full stock", () => {
    expect(resolvedPackRemaining(explorersPack)).toEqual({
      oil: 2,
      rations: 10,
      torch: 10,
    });
    expect(packContentMax("explorers-pack", "oil", 2)).toBe(4);
  });

  it("tracks consumed weight and value when supplies are spent", () => {
    const spentOil = setPackContentRemaining(explorersPack, "oil", 1)!;
    expect(packConsumedWeightLb(spentOil)).toBe(1);
    expect(packConsumedValueCp(spentOil)).toBe(10);

    const spentRation = setPackContentRemaining(spentOil, "rations", 9)!;
    expect(packConsumedWeightLb(spentRation)).toBe(3);
    expect(packConsumedValueCp(spentRation)).toBe(60);
  });

  it("restocks expendables when pack quantity increases and clamps when it decreases", () => {
    const spent = setPackContentRemaining(explorersPack, "oil", 0)!;
    const doubled = adjustPackRemainingForQuantityChange(spent, 2);
    expect(resolvedPackRemaining(doubled)).toEqual({
      oil: 2,
      rations: 20,
      torch: 20,
    });

    const halved = adjustPackRemainingForQuantityChange(doubled, 1);
    expect(resolvedPackRemaining(halved)).toEqual({
      oil: 2,
      rations: 10,
      torch: 10,
    });
  });

  it("tracks ball bearings as a one-shot bag", () => {
    const burglarsPack: AdventuringGearEntry = { key: "burglars-pack", quantity: 1 };
    const spent = setPackContentRemaining(burglarsPack, "ball-bearings", 0)!;
    expect(packConsumedWeightLb(spent)).toBe(2);
    expect(packConsumedValueCp(spent)).toBe(100);
  });

  it("drops packRemaining when fully restocked", () => {
    const spent = setPackContentRemaining(explorersPack, "oil", 1)!;
    expect(spent.packRemaining).toEqual({ oil: 1, rations: 10, torch: 10 });
    const restocked = setPackContentRemaining(spent, "oil", 2)!;
    expect(restocked.packRemaining).toBeUndefined();
  });

  it("rejects invalid pack content updates", () => {
    expect(setPackContentRemaining(explorersPack, "backpack", 0)).toBeNull();
    expect(setPackContentRemaining({ key: "backpack", quantity: 1 }, "oil", 1)).toBeNull();
  });
});
