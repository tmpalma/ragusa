import { describe, expect, it } from "vitest";
import type { SkillId } from "../data/types";
import { EMPTY_FEAT_CHOICES } from "./featEffects";
import { resolveSkillPickConflicts } from "./skillConflicts";

const EMPTY_INPUT = {
  backgroundKey: null,
  backgroundSkillPicks: [] as (SkillId | null)[],
  classKey: "bard",
  subclassKey: null,
  level: 1,
  classSkillPicks: [] as (SkillId | null)[],
  featChoices: { ...EMPTY_FEAT_CHOICES },
  extraFeatChoices: [],
  speciesSkillPicks: [] as (SkillId | null)[],
  subclassSkillPicks: [] as (SkillId | null)[],
  classFeatureSkillPicks: {},
};

describe("resolveSkillPickConflicts", () => {
  it("clears overlapping class skill picks when a catalog background grants the same skill", () => {
    const result = resolveSkillPickConflicts({
      ...EMPTY_INPUT,
      backgroundKey: "criminal",
      classSkillPicks: ["stealth", "persuasion", "deception"],
    });

    expect(result.classSkillPicks).toEqual([null, "persuasion", "deception"]);
    expect(result.removedSkills).toEqual(["stealth"]);
  });

  it("clears species picks before class picks when both choose the same skill", () => {
    const result = resolveSkillPickConflicts({
      ...EMPTY_INPUT,
      classSkillPicks: ["arcana", "deception", "performance"],
      speciesSkillPicks: ["deception", "insight"],
    });

    expect(result.speciesSkillPicks).toEqual([null, "insight"]);
    expect(result.classSkillPicks).toEqual(["arcana", "deception", "performance"]);
    expect(result.removedSkills).toEqual(["deception"]);
  });

  it("clears feat skill picks when a catalog background already grants the skill", () => {
    const result = resolveSkillPickConflicts({
      ...EMPTY_INPUT,
      backgroundKey: "soldier",
      featChoices: {
        ...EMPTY_FEAT_CHOICES,
        proficiencyPicks: [{ kind: "skill", id: "athletics" }, null, null],
      },
    });

    expect(result.featChoices.proficiencyPicks).toEqual([null, null, null]);
    expect(result.removedSkills).toEqual(["athletics"]);
  });
});
