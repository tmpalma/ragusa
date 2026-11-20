import { describe, expect, it } from "vitest";
import type { SkillId } from "../data/types";
import {
  applyClassSkillPick,
  applyExpertiseSkillPick,
  applySubclassSkillPick,
  availableClassSkillOptions,
  availableExpertiseSkillOptions,
  availableSubclassSkillOptions,
  collectTakenSkills,
  mergeSkillProficiencies,
  retainValidClassSkillPicks,
  retainValidExpertiseSkillPicks,
} from "./skillPicks";

const paladinOptions: SkillId[] = [
  "athletics",
  "insight",
  "intimidation",
  "medicine",
  "persuasion",
  "religion",
];

describe("mergeSkillProficiencies", () => {
  it("marks background and class skills proficient and leaves the rest none", () => {
    const skills = mergeSkillProficiencies(["athletics", "intimidation"], ["insight", null]);

    expect(skills.athletics).toBe("proficient");
    expect(skills.intimidation).toBe("proficient");
    expect(skills.insight).toBe("proficient");
    expect(skills.medicine).toBe("none");
  });

  it("upgrades chosen proficient skills to expert", () => {
    const skills = mergeSkillProficiencies(["athletics"], ["stealth", null], [], ["athletics", "stealth"]);

    expect(skills.athletics).toBe("expert");
    expect(skills.stealth).toBe("expert");
  });

  it("ignores expertise picks that are not proficient", () => {
    const skills = mergeSkillProficiencies([], ["athletics", null], [], ["medicine", null]);

    expect(skills.athletics).toBe("proficient");
    expect(skills.medicine).toBe("none");
  });

  it("marks subclass fixed skills proficient without picker slots", () => {
    const skills = mergeSkillProficiencies([], [], [], [], [], [], [], ["insight", "medicine"]);

    expect(skills.insight).toBe("proficient");
    expect(skills.medicine).toBe("proficient");
    expect(skills.athletics).toBe("none");
  });
});

describe("retainValidClassSkillPicks", () => {
  it("keeps picks that remain on the class list, drops the rest, and resizes to count", () => {
    expect(
      retainValidClassSkillPicks(
        ["athletics", "deception", "insight", "stealth"],
        2,
        paladinOptions,
        [],
      ),
    ).toEqual(["athletics", "insight"]);
  });

  it("drops picks already granted by another source", () => {
    expect(retainValidClassSkillPicks(["athletics", "insight"], 2, paladinOptions, ["athletics"])).toEqual([
      "insight",
      null,
    ]);
  });

  it("drops picks granted by species skill choices", () => {
    expect(
      retainValidClassSkillPicks(
        ["persuasion", "insight"],
        3,
        ["arcana", "deception", "insight", "performance", "persuasion"],
        ["persuasion", "insight"],
      ),
    ).toEqual([null, null, null]);
  });

  it("drops picks granted by feat skill choices", () => {
    expect(
      retainValidClassSkillPicks(
        ["athletics", "insight"],
        2,
        paladinOptions,
        ["athletics"],
      ),
    ).toEqual(["insight", null]);
  });
});

describe("applyClassSkillPick", () => {
  it("sets a valid unused skill in a slot", () => {
    expect(applyClassSkillPick([null, null], 0, "athletics", paladinOptions, [])).toEqual(["athletics", null]);
  });

  it("rejects a duplicate of another slot", () => {
    expect(applyClassSkillPick(["athletics", null], 1, "athletics", paladinOptions, [])).toBeNull();
  });

  it("rejects a skill already granted by another source", () => {
    expect(applyClassSkillPick([null, null], 0, "athletics", paladinOptions, ["athletics"])).toBeNull();
  });

  it("rejects a skill granted by species choices", () => {
    expect(
      applyClassSkillPick(
        [null, null, null],
        0,
        "persuasion",
        ["arcana", "deception", "insight", "performance", "persuasion"],
        ["persuasion", "insight"],
      ),
    ).toBeNull();
  });

  it("rejects a skill granted by feat choices", () => {
    expect(applyClassSkillPick([null, null], 0, "athletics", paladinOptions, ["athletics"])).toBeNull();
  });

  it("rejects a skill not on the class list", () => {
    expect(applyClassSkillPick([null, null], 0, "stealth", paladinOptions, [])).toBeNull();
  });

  it("clears a slot", () => {
    expect(applyClassSkillPick(["athletics", "insight"], 0, null, paladinOptions, [])).toEqual([null, "insight"]);
  });
});

describe("collectTakenSkills", () => {
  it("combines other-source skills with sibling slots in the same picker", () => {
    expect(collectTakenSkills(["athletics", "intimidation"], ["athletics", "insight"], 0)).toEqual([
      "athletics",
      "intimidation",
      "insight",
    ]);
  });
});

describe("availableClassSkillOptions", () => {
  it("omits taken skills and other slots, but keeps the current slot's value", () => {
    expect(
      availableClassSkillOptions(paladinOptions, ["insight", null], ["athletics", "intimidation"], 0),
    ).toEqual(["insight", "medicine", "persuasion", "religion"]);
  });

  it("omits feat-granted skills", () => {
    expect(
      availableClassSkillOptions(paladinOptions, [null, null], ["athletics"], 0),
    ).toEqual(["insight", "intimidation", "medicine", "persuasion", "religion"]);
  });
});

describe("subclass skill picks", () => {
  const feyOptions: SkillId[] = ["deception", "performance", "persuasion"];

  it("keeps the current slot's pick in combobox options", () => {
    expect(
      availableSubclassSkillOptions(["deception"], ["deception"], 0, feyOptions),
    ).toEqual(["deception", "performance", "persuasion"]);
  });

  it("rejects a skill already taken elsewhere", () => {
    expect(applySubclassSkillPick([null], 0, "deception", [])).toEqual(["deception"]);
    expect(applySubclassSkillPick(["deception"], 0, "deception", ["deception"])).toBeNull();
  });
});

describe("expertise skill picks", () => {
  const proficient = ["athletics", "stealth", "insight"] as const;

  it("retains valid expertise picks and resizes to count", () => {
    expect(retainValidExpertiseSkillPicks(["athletics", "medicine"], 2, proficient)).toEqual(["athletics", null]);
  });

  it("sets a valid proficient skill in a slot", () => {
    expect(applyExpertiseSkillPick([null, null], 0, "athletics", proficient)).toEqual(["athletics", null]);
  });

  it("rejects a duplicate of another slot", () => {
    expect(applyExpertiseSkillPick(["athletics", null], 1, "athletics", proficient)).toBeNull();
  });

  it("rejects a skill that is not proficient", () => {
    expect(applyExpertiseSkillPick([null, null], 0, "medicine", proficient)).toBeNull();
  });

  it("rejects a skill that is already expert in another slot", () => {
    expect(applyExpertiseSkillPick(["athletics", null], 1, "athletics", proficient, ["athletics"])).toBeNull();
  });

  it("offers only proficient skills not taken by other slots or already expert", () => {
    expect(availableExpertiseSkillOptions(proficient, ["athletics", null], 1, ["athletics"])).toEqual([
      "stealth",
      "insight",
    ]);
  });
});
