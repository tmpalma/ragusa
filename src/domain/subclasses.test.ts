import { describe, expect, it } from "vitest";
import type { SubclassData } from "../data/types";
import {
  activeSubclassFeatures,
  alwaysPreparedSpellKeysFromSubclass,
  findSubclass,
  initialSubclassSkillPicks,
  initialSubclassToolPicks,
  suggestedSubclassToolId,
  subclassFeatureOptionPickCount,
  subclassFixedSkills,
  subclassSkillGrants,
  subclassSkillProficiencyCount,
  subclassSpellbookPickCount,
  subclassToolChooseCount,
  subclassToolGrants,
  subclassToolIndependentChooseCount,
  subclassToolReplacementChooseCount,
  subclassListedForPicker,
  subclassesForClass,
  subclassStateForSelection,
} from "./subclasses";
import { spellKeyFromName } from "./spellSelection";

const FIXTURE_BARD_SUBCLASS: SubclassData = {
  key: "college-of-valor-fixture",
  classKey: "bard",
  name: "College of Valor (Fixture)",
  desc: "Test-only second bard subclass.",
  srd: false,
  book: "XPHB",
  features: [
    {
      key: "fixture-feature",
      name: "Fixture Feature",
      desc: "A narrative test feature.",
      grantedAtLevel: 3,
      combatSurface: false,
      effects: [{ type: "narrative" }],
    },
  ],
};

const FIXTURE_TOOL_CHOOSE_SUBCLASS: SubclassData = {
  key: "student-of-war-fixture",
  classKey: "fighter",
  name: "Student of War (Fixture)",
  desc: "Test-only fighter subclass with artisan tool choose.",
  srd: false,
  book: "XPHB",
  features: [
    {
      key: "student-of-war",
      name: "Student of War",
      desc: "Gain one artisan tool.",
      grantedAtLevel: 3,
      combatSurface: false,
      effects: [
        {
          type: "grant_tool_proficiencies",
          fixedTools: [],
          choose: { count: 1, categories: ["artisan"] },
        },
      ],
    },
  ],
};

function fixtureSubclass(
  key: string,
  classKey: string,
  features: SubclassData["features"],
): SubclassData {
  return {
    key,
    classKey,
    name: key,
    desc: "Inline subclass fixture.",
    srd: false,
    book: "XPHB",
    features,
  };
}

const FIXTURE_REPLACEMENT_TOOLS_SUBCLASS = fixtureSubclass("replacement-tools-fixture", "fighter", [
  {
    key: "replacement-tools",
    name: "Replacement Tools",
    desc: "Replace tools you already know.",
    grantedAtLevel: 3,
    combatSurface: false,
    effects: [
      {
        type: "grant_tool_proficiencies",
        fixedTools: ["alchemists-supplies", "herbalism-kit"],
        replacementChoose: { categories: ["artisan"] },
      },
      {
        type: "choose_feature_option",
        choiceKey: "experimental-elixir",
        count: 2,
        options: [
          { key: "healing", name: "Healing", desc: "A healing elixir." },
          { key: "swiftness", name: "Swiftness", desc: "A swiftness elixir." },
        ],
      },
    ],
  },
]);

const FIXTURE_FIXED_TOOL_SUBCLASS = fixtureSubclass("fixed-tool-fixture", "fighter", [
  {
    key: "fixed-tool",
    name: "Fixed Tool",
    desc: "One fixed tool with a replacement choose.",
    grantedAtLevel: 3,
    combatSurface: false,
    effects: [
      {
        type: "grant_tool_proficiencies",
        fixedTools: ["smiths-tools"],
        replacementChoose: { categories: ["artisan"] },
      },
    ],
  },
]);

const FIXTURE_TWO_FIXED_TOOLS_SUBCLASS = fixtureSubclass("two-fixed-tools-fixture", "fighter", [
  {
    key: "two-fixed-tools",
    name: "Two Fixed Tools",
    desc: "Two fixed tools with a replacement choose.",
    grantedAtLevel: 3,
    combatSurface: false,
    effects: [
      {
        type: "grant_tool_proficiencies",
        fixedTools: ["calligraphers-supplies", "cartographers-tools"],
        replacementChoose: { categories: ["artisan"] },
      },
    ],
  },
]);

const FIXTURE_NO_REPLACEMENT_TOOL_SUBCLASS = fixtureSubclass("no-replacement-tool-fixture", "fighter", [
  {
    key: "no-replacement-tool",
    name: "No Replacement Tool",
    desc: "A fixed tool with no replacement choose.",
    grantedAtLevel: 3,
    combatSurface: false,
    effects: [
      {
        type: "grant_tool_proficiencies",
        fixedTools: ["woodcarvers-tools"],
      },
    ],
  },
]);

const FIXTURE_RESTRICTED_SKILLS_SUBCLASS = fixtureSubclass("restricted-skills-fixture", "ranger", [
  {
    key: "restricted-skills",
    name: "Restricted Skills",
    desc: "Choose one social skill.",
    grantedAtLevel: 3,
    combatSurface: false,
    effects: [
      {
        type: "grant_skill_proficiencies",
        count: 1,
        options: ["deception", "performance", "persuasion"],
      },
    ],
  },
]);

const FIXTURE_FOUR_SKILL_OPTIONS_SUBCLASS = fixtureSubclass("four-skill-options-fixture", "paladin", [
  {
    key: "four-skill-options",
    name: "Four Skill Options",
    desc: "Choose one of four skills.",
    grantedAtLevel: 3,
    combatSurface: false,
    effects: [
      {
        type: "grant_skill_proficiencies",
        count: 1,
        options: ["acrobatics", "intimidation", "performance", "persuasion"],
      },
    ],
  },
]);

const FIXTURE_BATTLE_SMITH_SUBCLASS = fixtureSubclass("battle-smith", "fighter", [
  {
    key: "tools-of-the-trade",
    name: "Tools of the Trade",
    desc: "Choose an artisan tool.",
    grantedAtLevel: 3,
    combatSurface: false,
    effects: [
      {
        type: "grant_tool_proficiencies",
        fixedTools: [],
        choose: { count: 1, categories: ["artisan"] },
      },
    ],
  },
]);

const FIXTURE_FIXED_SKILLS_SUBCLASS: SubclassData = {
  key: "implements-of-mercy-fixture",
  classKey: "monk",
  name: "Implements of Mercy (Fixture)",
  desc: "Test-only monk subclass with fixed skills.",
  srd: false,
  book: "XPHB",
  features: [
    {
      key: "implements-of-mercy",
      name: "Implements of Mercy",
      desc: "Gain Insight and Medicine.",
      grantedAtLevel: 3,
      combatSurface: false,
      effects: [
        {
          type: "grant_skill_proficiencies",
          count: 0,
          fixedSkills: ["insight", "medicine"],
        },
        {
          type: "grant_tool_proficiencies",
          fixedTools: ["herbalism-kit"],
        },
      ],
    },
  ],
};

describe("subclassesForClass", () => {
  it("returns all bard subclasses from the production catalog", () => {
    const options = subclassesForClass("bard");
    expect(options.length).toBeGreaterThanOrEqual(1);
    expect(options.every((subclass) => subclass.classKey === "bard")).toBe(true);
    expect(options.some((subclass) => subclass.key === "college-of-lore")).toBe(true);
  });

  it("lists multiple options when extra catalog rows exist", () => {
    const options = [...subclassesForClass("bard"), FIXTURE_BARD_SUBCLASS];
    expect(options.length).toBeGreaterThan(1);
    expect(options.some((subclass) => subclass.key === "college-of-lore")).toBe(true);
    expect(options.some((subclass) => subclass.key === "college-of-valor-fixture")).toBe(true);
  });

  it("can be sorted alphabetically by display name", () => {
    const paladinSubclasses = [...subclassesForClass("paladin"), FIXTURE_BARD_SUBCLASS];
    expect(paladinSubclasses.length).toBeGreaterThan(1);
    const names = paladinSubclasses.map((subclass) => subclass.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "en"));
    expect([...names].sort((a, b) => a.localeCompare(b, "en"))).toEqual(sorted);
    for (let index = 1; index < sorted.length; index += 1) {
      expect(sorted[index - 1]!.localeCompare(sorted[index]!, "en")).toBeLessThanOrEqual(0);
    }
  });
});

describe("findSubclass", () => {
  it("returns null for a subclass from another class", () => {
    expect(findSubclass("bard", "hunter")).toBeNull();
  });

  it("returns the subclass when class and key match", () => {
    expect(findSubclass("paladin", "oath-of-devotion")?.key).toBe("oath-of-devotion");
  });
});

describe("subclass grants", () => {
  it("sizes lore bonus skill picks from effects", () => {
    const lore = findSubclass("bard", "college-of-lore");
    expect(subclassSkillProficiencyCount(lore)).toBe(3);
    expect(initialSubclassSkillPicks(lore)).toEqual([null, null, null]);
  });

  it("grants oath of devotion always-prepared spells at level 3", () => {
    const devotion = findSubclass("paladin", "oath-of-devotion");
    expect(alwaysPreparedSpellKeysFromSubclass(devotion, 3)).toEqual([
      "protection-from-evil-and-good",
      "shield-of-faith",
    ]);
  });

  it("grants circle of the land spells from the selected land type", () => {
    const land = findSubclass("druid", "circle-of-the-land");
    expect(
      alwaysPreparedSpellKeysFromSubclass(land, 3, { "land-type": "temperate" }),
    ).toEqual(["sleep", "misty-step", "shocking-grasp"]);
  });

  it("sizes evoker savant spellbook picks from effects", () => {
    const evoker = findSubclass("wizard", "evoker");
    expect(subclassSpellbookPickCount(evoker, 3)).toBe(2);
  });

  it("includes subclass features only for the selected subclass", () => {
    const lore = findSubclass("bard", "college-of-lore");
    const features = activeSubclassFeatures(lore, 3);
    expect(features.some((feature) => feature.key === "cutting-words")).toBe(true);
    expect(activeSubclassFeatures(findSubclass("ranger", "hunter"), 3).some((f) => f.key === "hunters-prey")).toBe(true);
  });

  it("resets state when switching subclass selection", () => {
    const lore = findSubclass("bard", "college-of-lore")!;
    const next = subclassStateForSelection(lore);
    expect(next.subclassKey).toBe("college-of-lore");
    expect(next.subclassSkillPicks).toHaveLength(3);
    expect(next.subclassFeatureChoices).toEqual({});
    expect(next.subclassFeatureOptionPicks).toEqual({});
    expect(next.subclassToolPicks).toEqual({});
  });

  it("hides RHW subclasses from picker lists while findSubclass still resolves listed subclasses", () => {
    expect(subclassListedForPicker({ book: "RHW" })).toBe(false);
    expect(subclassListedForPicker({ book: "XPHB" })).toBe(true);
    const rangerSubclasses = subclassesForClass("ranger");
    expect(rangerSubclasses.every((subclass) => subclass.book !== "RHW")).toBe(true);
    expect(rangerSubclasses.some((subclass) => subclass.key === "hunter")).toBe(true);
    expect(findSubclass("ranger", "hunter")?.key).toBe("hunter");
    expect(findSubclass("ranger", "hunter")?.book).toBe("XPHB");
  });

  it("lists the SRD subclass keys in picker lists", () => {
    const expected: Record<string, string[]> = {
      barbarian: ["path-of-the-berserker"],
      bard: ["college-of-lore"],
      paladin: ["oath-of-devotion"],
      ranger: ["hunter"],
      cleric: ["life-domain"],
      druid: ["circle-of-the-land"],
      fighter: ["champion"],
      monk: ["warrior-of-the-open-hand"],
      rogue: ["thief"],
      sorcerer: ["draconic-sorcery"],
      warlock: ["fiend-patron"],
      wizard: ["evoker"],
    };
    for (const [classKey, keys] of Object.entries(expected)) {
      const options = subclassesForClass(classKey);
      for (const key of keys) {
        expect(options.some((subclass) => subclass.key === key)).toBe(true);
      }
    }
  });

  it("resolves extra smite spells and subclass always-prepared lists", () => {
    expect(spellKeyFromName("Cure Wounds")).toBe("cure-wounds");
    expect(spellKeyFromName("Lesser Restoration")).toBe("lesser-restoration");
    expect(alwaysPreparedSpellKeysFromSubclass(findSubclass("cleric", "life-domain"), 3)).toEqual([
      "aid",
      "bless",
      "cure-wounds",
      "lesser-restoration",
    ]);
    expect(alwaysPreparedSpellKeysFromSubclass(findSubclass("sorcerer", "draconic-sorcery"), 3)).toEqual([
      "alter-self",
      "chromatic-orb",
      "command",
      "dragons-breath",
    ]);
    expect(alwaysPreparedSpellKeysFromSubclass(findSubclass("warlock", "fiend-patron"), 3)).toEqual([
      "burning-hands",
      "command",
      "scorching-ray",
      "suggestion",
    ]);
  });

  it("sizes replacement tool picks from existing proficiencies", () => {
    const alchemist = FIXTURE_REPLACEMENT_TOOLS_SUBCLASS;
    const grant = subclassToolGrants(alchemist)[0];
    expect(grant?.fixedTools).toEqual(["alchemists-supplies", "herbalism-kit"]);
    expect(subclassToolReplacementChooseCount(grant!, [])).toBe(0);
    expect(subclassToolReplacementChooseCount(grant!, ["herbalism-kit"])).toBe(1);
    expect(subclassToolReplacementChooseCount(grant!, ["alchemists-supplies", "herbalism-kit"])).toBe(2);
    expect(subclassFeatureOptionPickCount(alchemist, "experimental-elixir", 3)).toBe(2);
  });

  it("sizes fixed tool grants and replacement chooses from the subclass", () => {
    const armorerGrant = subclassToolGrants(FIXTURE_FIXED_TOOL_SUBCLASS)[0];
    expect(armorerGrant?.fixedTools).toEqual(["smiths-tools"]);
    expect(subclassToolReplacementChooseCount(armorerGrant!, ["smiths-tools"])).toBe(1);

    const cartographerGrant = subclassToolGrants(FIXTURE_TWO_FIXED_TOOLS_SUBCLASS)[0];
    expect(cartographerGrant?.fixedTools).toEqual(["calligraphers-supplies", "cartographers-tools"]);
    expect(subclassToolReplacementChooseCount(cartographerGrant!, ["calligraphers-supplies"])).toBe(1);

    const artilleristGrant = subclassToolGrants(FIXTURE_NO_REPLACEMENT_TOOL_SUBCLASS)[0];
    expect(artilleristGrant?.fixedTools).toEqual(["woodcarvers-tools"]);
    expect(subclassToolReplacementChooseCount(artilleristGrant!, [])).toBe(0);
  });

  it("sizes skill grants with restricted options", () => {
    const fey = FIXTURE_RESTRICTED_SKILLS_SUBCLASS;
    expect(subclassSkillProficiencyCount(fey)).toBe(1);
    expect(subclassSkillGrants(fey)[0]?.options).toEqual(["deception", "performance", "persuasion"]);

    const genies = FIXTURE_FOUR_SKILL_OPTIONS_SUBCLASS;
    expect(subclassSkillProficiencyCount(genies)).toBe(1);
    expect(subclassSkillGrants(genies)[0]?.options).toEqual(["acrobatics", "intimidation", "performance", "persuasion"]);
  });

  it("sizes independent artisan tool chooses without fixed tools", () => {
    const grant = subclassToolGrants(FIXTURE_TOOL_CHOOSE_SUBCLASS)[0];
    expect(grant?.choose).toEqual({ count: 1, categories: ["artisan"] });
    expect(subclassToolIndependentChooseCount(grant!)).toBe(1);
    expect(subclassToolReplacementChooseCount(grant!, [])).toBe(0);
    expect(subclassToolChooseCount(grant!, [])).toBe(1);
    expect(initialSubclassToolPicks(FIXTURE_TOOL_CHOOSE_SUBCLASS, [])["student-of-war"]).toHaveLength(1);
  });

  it("collects fixed subclass skills without picker slots", () => {
    expect(subclassSkillProficiencyCount(FIXTURE_FIXED_SKILLS_SUBCLASS)).toBe(0);
    expect(subclassFixedSkills(FIXTURE_FIXED_SKILLS_SUBCLASS)).toEqual(["insight", "medicine"]);
    expect(subclassSkillGrants(FIXTURE_FIXED_SKILLS_SUBCLASS)).toEqual([]);
  });

  it("defaults battle smith artisan tool pick to smiths-tools when not already proficient", () => {
    const battleSmith = FIXTURE_BATTLE_SMITH_SUBCLASS;
    const grant = subclassToolGrants(battleSmith)[0];
    expect(grant?.choose).toEqual({ count: 1, categories: ["artisan"] });
    expect(suggestedSubclassToolId(battleSmith, grant!, [])).toBe("smiths-tools");
    expect(initialSubclassToolPicks(battleSmith, [])["tools-of-the-trade"]).toEqual(["smiths-tools"]);
    expect(suggestedSubclassToolId(battleSmith, grant!, ["smiths-tools"])).toBeNull();
    expect(initialSubclassToolPicks(battleSmith, ["smiths-tools"])["tools-of-the-trade"]).toEqual([null]);
  });
});
