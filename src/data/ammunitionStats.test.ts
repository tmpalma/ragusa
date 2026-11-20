import { describe, expect, it } from "vitest";
import { AMMUNITION_STATS } from "../data/ammunitionStats";

describe("ammunition stats", () => {
  it("includes all SRD 5.2 ammunition types with pack sizes", () => {
    expect(AMMUNITION_STATS.arrows.packSize).toBe(20);
    expect(AMMUNITION_STATS.bolts.packSize).toBe(20);
    expect(AMMUNITION_STATS.needles.packSize).toBe(50);
    expect(AMMUNITION_STATS["sling-bullets"].packSize).toBe(20);
    expect(AMMUNITION_STATS["firearm-bullets"].packSize).toBe(10);
  });
});
