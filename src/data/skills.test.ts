import { describe, expect, it } from "vitest";
import { skillsByAbilityGroups } from "./skills";

describe("skillsByAbilityGroups", () => {
  it("orders groups STR → DEX → INT → WIS → CHA and skips CON", () => {
    const groups = skillsByAbilityGroups();
    expect(groups.map((g) => g.ability)).toEqual(["str", "dex", "int", "wis", "cha"]);
  });

  it("lists skills in catalog order within each group", () => {
    const groups = skillsByAbilityGroups();
    expect(groups[0]!.skills.map((s) => s.id)).toEqual(["athletics"]);
    expect(groups[1]!.skills.map((s) => s.id)).toEqual(["acrobatics", "sleightOfHand", "stealth"]);
    expect(groups[2]!.skills.map((s) => s.id)).toEqual([
      "arcana",
      "history",
      "investigation",
      "nature",
      "religion",
    ]);
    expect(groups[3]!.skills.map((s) => s.id)).toEqual([
      "animalHandling",
      "insight",
      "medicine",
      "perception",
      "survival",
    ]);
    expect(groups[4]!.skills.map((s) => s.id)).toEqual([
      "deception",
      "intimidation",
      "performance",
      "persuasion",
    ]);
  });
});