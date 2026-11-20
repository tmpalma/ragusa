import { describe, expect, it } from "vitest";
import { usesPerRestLabelKey } from "./combatUseTrackers";

describe("usesPerRestLabelKey", () => {
  it("maps short and shortOne recovery to short-rest label", () => {
    expect(usesPerRestLabelKey("short")).toBe("combat.usesPerShortRest");
    expect(usesPerRestLabelKey("shortOne")).toBe("combat.usesPerShortRest");
  });

  it("maps long recovery and missing values to long-rest label", () => {
    expect(usesPerRestLabelKey("long")).toBe("combat.usesPerLongRest");
    expect(usesPerRestLabelKey(undefined)).toBe("combat.usesPerLongRest");
  });
});
