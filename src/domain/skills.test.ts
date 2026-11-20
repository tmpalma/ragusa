import { describe, expect, it } from "vitest";
import { skillBonus } from "./skills";

describe("skillBonus", () => {
  it("returns just the ability modifier when not proficient", () => {
    expect(skillBonus(3, "none")).toBe(3);
  });

  it("adds the proficiency bonus once when proficient", () => {
    expect(skillBonus(3, "proficient")).toBe(5);
  });

  it("adds the proficiency bonus twice when expert", () => {
    expect(skillBonus(3, "expert")).toBe(7);
  });

  it("handles negative ability modifiers", () => {
    expect(skillBonus(-1, "proficient")).toBe(1);
  });
});
