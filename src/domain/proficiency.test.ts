import { describe, expect, it } from "vitest";
import { proficiencyBonusForLevel } from "./proficiency";

describe("proficiencyBonusForLevel", () => {
  it("is +2 for levels 1–4 and +3 at level 5", () => {
    expect(proficiencyBonusForLevel(1)).toBe(2);
    expect(proficiencyBonusForLevel(4)).toBe(2);
    expect(proficiencyBonusForLevel(5)).toBe(3);
  });
});
